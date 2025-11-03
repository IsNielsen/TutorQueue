"use server";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function createRequest(formData: FormData) {
	const student_name = String(formData.get("student_name") || "").trim();
	const topic_areaRaw = formData.get("topic_area");
	const topic_area = topic_areaRaw != null ? String(topic_areaRaw).trim() : null;
	if (!student_name) {
		return { ok: false, error: "Student name is required." } as const;
	}
    const supabase = await getSupabaseServerClient();
	const { error } = await supabase.from("queue_requests").insert({
		student_name,
		topic_area: topic_area && topic_area.length > 0 ? topic_area : null,
		status: "waiting",
	});
	if (error) {
		return { ok: false, error: error.message } as const;
	}
	revalidatePath("/");
	return { ok: true } as const;
}

export async function markSeen(id: string) {
    const supabase = await getSupabaseServerClient();
	const { error } = await supabase
		.from("queue_requests")
		.update({ status: "seen" })
		.eq("id", id);
	if (error) {
		return { ok: false, error: error.message } as const;
	}
	revalidatePath("/tutor");
	return { ok: true } as const;
}

export async function deleteRequest(id: string) {
    const supabase = await getSupabaseServerClient();
	const { error } = await supabase.from("queue_requests").delete().eq("id", id);
	if (error) {
		return { ok: false, error: error.message } as const;
	}
	revalidatePath("/tutor");
	return { ok: true } as const;
}


