import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function getSupabaseServerClient() {
    const cookieStore = await cookies();
    return createServerClient(
		getSupabaseUrl(),
		getSupabasePublishableKey(),
		{
			cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
				},
				set(name: string, value: string, options: any) {
					try {
                        cookieStore.set({ name, value, ...options });
					} catch {
						// ignore set cookie on server action streaming
					}
				},
				remove(name: string, options: any) {
					try {
                        cookieStore.set({ name, value: "", ...options });
					} catch {
						// ignore
					}
				},
			},
		}
	);
}


