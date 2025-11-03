export function getSupabaseUrl(): string {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!url) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
	return url;
}

export function getSupabasePublishableKey(): string {
	const key =
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // fallback for older setups
	if (!key)
		throw new Error(
			"Missing env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
		);
	return key;
}


