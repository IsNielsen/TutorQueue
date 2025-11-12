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

	// queue metrics
	const AVERAGE_WAIT_MIN_PER_STUDENT = 15;
	const waitingRequests = useMemo(() => requests.filter((r) => r.status === "waiting"), [requests]);
	const inQueueCount = waitingRequests.length;
	const waitingPositionById = useMemo(() => {
		const map = new Map<string, number>();
		waitingRequests.forEach((r, i) => map.set(r.id, i));
		return map;
	}, [waitingRequests]);

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

			// handle incoming payload
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

	// Auto-refresh the requests list every 10 seconds when on the dashboard.
	// This is a lightweight fallback to ensure the UI stays up-to-date in
	// environments where realtime websocket events may be unreliable.
	useEffect(() => {
		if (mode !== "dashboard") return;
		const id = setInterval(() => {
			void loadRequests();
		}, 10_000);
		return () => clearInterval(id);
	}, [mode, loadRequests]);

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
					<label className="block text-sm font-medium text-grey-900">Email</label>
					<input
						type="email"
						className="mt-1 w-full rounded-md border border-zinc-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-purple-900 placeholder:text-purple-500 bg-white"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-grey-900">Password</label>
					<input
						type="password"
						className="mt-1 w-full rounded-md border border-zinc-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-purple-900 placeholder:text-putple-500 bg-white"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				{authError && <p className="text-sm text-red-700">{authError}</p>}
				<button
					type="submit"
					className="inline-flex items-center justify-center rounded-md bg-purple-700 px-4 py-2 text-white hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-700 w-full"
				>
					Sign In
				</button>
			</form>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="text-center mx-auto">
					<div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
						<span className="text-lg">👥</span>
					</div>
					<h2 className="text-white text-xl font-semibold">Queue Status</h2>
					<p className="text-white/80 text-sm">Real-time position tracking</p>
				</div>
				<button
					onClick={async () => {
						await supabase.auth.signOut();
						window.location.reload();
					}}
					className="text-sm text-white hover:text-white/90"
				>
					Sign out
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="rounded-2xl border border-white/20 bg-white/10 text-white p-4 backdrop-blur-md">
					<p className="text-sm text-white/80">In Queue</p>
					<p className="text-2xl font-semibold mt-1">{inQueueCount}</p>
				</div>
				<div className="rounded-2xl border border-white/20 bg-white/10 text-white p-4 backdrop-blur-md">
					<p className="text-sm text-white/80">Avg Wait</p>
					<p className="text-2xl font-semibold mt-1">{AVERAGE_WAIT_MIN_PER_STUDENT} min</p>
					<p className="text-xs text-white/70 mt-0.5">per student</p>
				</div>
			</div>

			{loading ? (
				<div className="text-sm text-white">Loading…</div>
			) : error ? (
				<div className="text-sm text-red-200">{error}</div>
			) : (
				<ul className="space-y-3">
					{requests.map((req, idx) => {
						const waitingPos = waitingPositionById.get(req.id) ?? 0;
						const estWait = Math.max(0, waitingPos * AVERAGE_WAIT_MIN_PER_STUDENT);
						const isServing = req.status === "seen";
						return (
							<li
								key={req.id}
								className={
									"relative rounded-2xl border p-4 flex items-start justify-between gap-4 " +
									(isServing
										? "bg-white text-zinc-900 border-white/60 shadow-lg"
										: "bg-white/10 text-white border-white/20 backdrop-blur-md")
								}
							>
								<div className="flex items-start gap-3">
									<div className={
										"mt-0.5 h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-sm font-semibold " +
										(isServing ? "bg-green-500 text-white" : "bg-white/20 text-white border border-white/30")
									}>
										#{idx + 1}
									</div>
									<div>
										<div className="flex items-center gap-2">
											<span
												className={
													"text-xs px-2 py-0.5 rounded-full border " +
													(isServing
														? "border-green-600 text-green-800 bg-green-100"
														: "border-white/30 text-white bg-white/10")
												}
											>
												{isServing ? "now serving" : "waiting"}
											</span>
											<span className={isServing ? "text-zinc-900 font-medium" : "text-white font-medium"}>{req.student_name}</span>
										</div>
										{req.topic_area && (
											<p className={isServing ? "text-sm text-zinc-700 mt-1 whitespace-pre-wrap" : "text-sm text-white/90 mt-1 whitespace-pre-wrap"}>{req.topic_area}</p>
										)}
										<p className={isServing ? "text-xs text-zinc-500 mt-1" : "text-xs text-white/80 mt-1"}>
											{isServing ? "0 min wait" : `${estWait} min wait`}
										</p>
									</div>
								</div>
								<div className="flex gap-2">
									<button
										onClick={() =>
											startTransition(async () => {
												setRequests((curr) => curr.map((r) => (r.id === req.id ? { ...r, status: "seen" } : r)));
												await markSeen(req.id);
											})
										}
										className={
											"rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-60 " +
											(isServing
												? "border border-zinc-500 text-zinc-900 hover:bg-zinc-100 focus:ring-zinc-600"
												: "border border-white/40 text-white hover:bg-white/10 focus:ring-white")
										}
										disabled={isPending || req.status === "seen"}
									>
										Mark Seen
									</button>
									<button
										onClick={() =>
											startTransition(async () => {
												setRequests((curr) => curr.filter((r) => r.id !== req.id));
												await deleteRequest(req.id);
											})
										}
										className={
											"rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-60 " +
											(isServing ? "bg-red-700 text-white hover:bg-red-800 focus:ring-red-700" : "bg-red-700 text-white hover:bg-red-800 focus:ring-red-700")
										}
										disabled={isPending}
									>
										Remove
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
