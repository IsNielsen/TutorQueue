import { getSupabaseServerClient } from "@/lib/supabase/server";
import TutorQueueClient from "@/components/TutorQueueClient";

export default async function TutorPage() {
	const supabase = await getSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return (
			<div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-50">
				<div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-zinc-200 p-6">
					<h1 className="text-xl font-semibold text-zinc-900 mb-2">Tutor Sign In</h1>
					<p className="text-sm text-zinc-800 mb-4">Sign in to manage the queue.</p>
					<TutorQueueClient mode="signin" />
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen w-full p-4 bg-zinc-50">
			<div className="max-w-5xl mx-auto">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-2xl font-semibold text-zinc-900">Tutor Queue</h1>
					<div className="text-sm text-zinc-800">Signed in as {user.email}</div>
				</div>
				<TutorQueueClient mode="dashboard" />
			</div>
		</div>
	);
}


