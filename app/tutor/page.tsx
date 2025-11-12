import { getSupabaseServerClient } from "@/lib/supabase/server";
import TutorQueueClient from "@/components/TutorQueueClient";

export default async function TutorPage() {
	const supabase = await getSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return (
			<div className="min-h-screen w-full flex items-center justify-center p-6">
				<div className="w-full max-w-md rounded-2xl bg-white/10 border border-white/20 p-6 backdrop-blur-md text-white">
					<h1 className="text-xl font-semibold text-white mb-2">Tutor Sign In</h1>
					<p className="text-sm text-white/80 mb-4">Sign in to manage the queue.</p>
					<TutorQueueClient mode="signin" />
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen w-full p-6 bg-gradient-to-br from-purple-600 via-fuchsia-600 to-indigo-600">
			<div className="max-w-5xl mx-auto">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-semibold text-white">Tutor Queue</h1>
					<div className="text-sm text-white/90">Signed in as {user.email}</div>
				</div>
				<TutorQueueClient mode="dashboard" />
			</div>
		</div>
	);
}
