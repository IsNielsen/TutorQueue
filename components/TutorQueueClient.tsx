"use client";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { QueueRequest } from "@/types/queue";
import { deleteRequest, markSeen } from "@/app/actions";

type Props = { mode: "signin" | "dashboard" };

export default function TutorQueueClient({ mode }: Props) {
	const supabase = useMemo(() => getSupabaseBrowserClient(), []);
	const [isPending, startTransition] = useTransition();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [authError, setAuthError] = useState<string | null>(null);

	const [requests, setRequests] = useState<QueueRequest[]>([]);
	const [loading, setLoading] = useState(mode === "dashboard");
	const [error, setError] = useState<string | null>(null);

	const loadRequests = useCallback(async () => {
		setLoading(true);
		setError(null);
		const { data, error } = await supabase
			.from("queue_requests")
			.select("*")
			.order("created_at", { ascending: true });
		if (error) {
			setError(error.message);
		} else {
			setRequests(data as QueueRequest[]);
		}
		setLoading(false);
	}, [supabase]);

	useEffect(() => {
		if (mode !== "dashboard") return;
		loadRequests();

		// create a channel and subscribe to Postgres changes for queue_requests
		const channel = supabase.channel("queue_requests_changes");

		const handler = (payload: any) => {
			// normalize event type (some transports may differ in casing)
			const evt = (payload?.eventType || payload?.type || "").toString().toUpperCase();
			// try to find new/old rows under several possible keys used by different transports/versions
			const newRow = payload?.new ?? payload?.record ?? payload?.payload?.new ?? payload?.after ?? null;
			const oldRow = payload?.old ?? payload?.old_record ?? payload?.payload?.old ?? payload?.before ?? null;

			// helpful debug output — leave enabled to diagnose missing INSERTs
			console.debug("realtime: table=queue_requests evt=", evt, { newRow, oldRow, raw: payload });
			// If we got an INSERT but no structured newRow, reload list as a fallback
			if (evt === "INSERT" && !newRow) {
				// fire-and-forget refresh
				void loadRequests();
				return;
			}

			setRequests((curr) => {
				if (evt === "INSERT") {
					if (!newRow) return curr; // nothing to add
					// don't duplicate if already present
					if (curr.some((r) => r.id === newRow.id)) {
						// ensure the stored row is up-to-date
						return curr.map((r) => (r.id === newRow.id ? (newRow as QueueRequest) : r)).sort((a, b) =>
							new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
						);
					}
					return [...curr, newRow as QueueRequest].sort(
						(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
					);
				}

				if (evt === "UPDATE") {
					if (!newRow) return curr;
					return curr
						.map((r) => (r.id === (newRow as any).id ? (newRow as QueueRequest) : r))
						.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
				}

				if (evt === "DELETE") {
					// prefer id from oldRow but fallback to payload.old
					const id = (oldRow as any)?.id ?? (payload?.old as any)?.id;
					if (!id) return curr;
					return curr.filter((r) => r.id !== id);
				}

				return curr;
			});
		};

		channel.on("postgres_changes", { event: "*", schema: "public", table: "queue_requests" }, handler);

		// subscribe and ensure we have a proper channel reference
		const subscribed = channel.subscribe();

		return () => {
			// best-effort unsubscribe cleanup
			try {
				// unsubscribe the channel then remove it from the client
				// `unsubscribe` is safe to call on the RealtimeChannel
				// and `removeChannel` will remove it from the client state
				// (some versions of the client return the same object from subscribe)
				// @ts-ignore
				if (subscribed?.unsubscribe) subscribed.unsubscribe();
			} catch (e) {
				// ignore
			}
			try {
				supabase.removeChannel(subscribed);
			} catch (e) {
				// fallback: try removing the original channel
				try {
					supabase.removeChannel(channel);
				} catch {
					// ignore
				}
			}
		};
	}, [mode, supabase, loadRequests]);

	if (mode === "signin") {
		return (
			<form
				onSubmit={async (e) => {
					e.preventDefault();
					setAuthError(null);
					const { error } = await supabase.auth.signInWithPassword({ email, password });
					if (error) setAuthError(error.message);
					else window.location.reload();
				}}
				className="space-y-3"
			>
				<div>
					<label className="block text-sm font-medium text-zinc-900">Email</label>
					<input
						type="email"
						className="mt-1 w-full rounded-md border border-zinc-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-zinc-900 placeholder:text-zinc-500 bg-white"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-zinc-900">Password</label>
					<input
						type="password"
						className="mt-1 w-full rounded-md border border-zinc-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-zinc-900 placeholder:text-zinc-500 bg-white"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				{authError && <p className="text-sm text-red-700">{authError}</p>}
				<button
					type="submit"
					className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 w-full"
				>
					Sign In
				</button>
			</form>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-medium text-zinc-900">Current Requests</h2>
				<button
					onClick={async () => {
						await supabase.auth.signOut();
						window.location.reload();
					}}
					className="text-sm text-zinc-800 hover:text-zinc-900"
				>
					Sign out
				</button>
			</div>
			{loading ? (
				<div className="text-sm text-zinc-800">Loading…</div>
			) : error ? (
				<div className="text-sm text-red-700">{error}</div>
			) : (
				<ul className="space-y-3">
					{requests.map((req) => (
						<li
							key={req.id}
							className={
								"rounded-lg border p-4 flex items-start justify-between gap-4 " +
								(req.status === "waiting"
									? "bg-white border-blue-200"
									: "bg-green-50 border-green-200")
							}
						>
							<div>
								<div className="flex items-center gap-2">
									<span
										className={
											"text-sm px-2 py-0.5 rounded-full border " +
											(req.status === "waiting"
												? "border-blue-300 text-blue-800 bg-blue-50"
												: "border-green-300 text-green-800 bg-green-100")
										}
									>
										{req.status}
									</span>
									<span className="text-zinc-900 font-medium">{req.student_name}</span>
								</div>
								{req.topic_area && (
									<p className="text-sm text-zinc-800 mt-1 whitespace-pre-wrap">{req.topic_area}</p>
								)}
								<p className="text-xs text-zinc-500 mt-1">
									{new Date(req.created_at).toLocaleString()}
								</p>
							</div>
							<div className="flex gap-2">
								<button
									onClick={() =>
										startTransition(async () => {
											// optimistic update
											setRequests((curr) => curr.map((r) => (r.id === req.id ? { ...r, status: "seen" } : r)));
											await markSeen(req.id);
										})
									}
									className="rounded-md border border-zinc-500 px-3 py-1.5 text-sm hover:bg-zinc-100 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-60"
									disabled={isPending || req.status === "seen"}
								>
									Mark Seen
								</button>
								<button
									onClick={() =>
										startTransition(async () => {
											// optimistic update
											setRequests((curr) => curr.filter((r) => r.id !== req.id));
											await deleteRequest(req.id);
										})
									}
									className="rounded-md bg-red-700 text-white px-3 py-1.5 text-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 disabled:opacity-60"
									disabled={isPending}
								>
									Remove
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}


