"use client";
import { useActionState } from "react";
import { createRequest } from "@/app/actions";

type ActionState = { ok: boolean; error?: string } | null;

export default function StudentForm() {
	const [state, formAction] = useActionState<ActionState, FormData>(async (_, fd) => {
		const res = await createRequest(fd);
		return res;
	}, null);

	return (
		<form action={formAction} className="space-y-4">
			<div>
				<label htmlFor="student_name" className="block text-sm font-medium text-zinc-900">Your name</label>
				<input id="student_name" name="student_name" required className="mt-1 w-full rounded-md border border-zinc-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-zinc-900 placeholder:text-zinc-500 bg-white" placeholder="Jane Doe" />
			</div>
			<div>
				<label htmlFor="topic_area" className="block text-sm font-medium text-zinc-900">Topic or issue (optional)</label>
				<textarea id="topic_area" name="topic_area" rows={3} className="mt-1 w-full rounded-md border border-zinc-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-zinc-900 placeholder:text-zinc-500 bg-white" placeholder="e.g., Recurrence relations, debugging pointer issue, etc." />
			</div>
			<button type="submit" className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700">
				Submit Request
			</button>
			{state?.ok && <p className="text-sm text-green-800 bg-green-50 border border-green-300 rounded-md px-3 py-2">Your request was submitted. Please wait to be called.</p>}
			{state && !state.ok && state.error && (
				<p className="text-sm text-red-800 bg-red-50 border border-red-300 rounded-md px-3 py-2">{state.error}</p>
			)}
		</form>
	);
}


