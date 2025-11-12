import StudentForm from "@/components/StudentForm"

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500 text-white mb-4 mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C6.5 6.253 2 10.753 2 16.253s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Join the Queue</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Get personalized tutoring help from our experienced tutors
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-800 shadow-lg p-8">
          <StudentForm />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-6 text-center">
            Your request joins our queue. Tutors will contact you shortly.
          </p>
        </div>
      </div>
    </div>
  )
}
