import StudentForm from "@/components/StudentForm";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-sm border border-zinc-200 p-6">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Join the Tutor Queue</h1>
        <p className="text-zinc-800 mb-6">Enter your details and a tutor will help you soon.</p>
        <StudentForm />
        <p className="text-xs text-zinc-700 mt-4">By submitting, your request will appear in the tutors' queue.</p>
      </div>
    </div>
  );
}

 
