import StudentForm from "@/components/StudentForm";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white/10 border border-white/20 p-6 backdrop-blur-md text-white">
        <h1 className="text-2xl font-semibold text-white mb-1">Join the Tutor Queue</h1>
        <p className="text-white/80 mb-6">Enter your details and a tutor will help you soon.</p>
        <StudentForm />
        <p className="text-xs text-white/70 mt-4">By submitting, your request will appear in the tutors' queue.</p>
      </div>
    </div>
  );
}
