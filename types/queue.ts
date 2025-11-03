export type QueueRequest = {
	id: string;
	created_at: string;
	student_name: string;
	topic_area: string | null;
	status: "waiting" | "seen";
};


