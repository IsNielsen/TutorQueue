"use client"
import { useActionState } from "react"
import { createRequest } from "@/app/actions"

type ActionState = { ok: boolean; error?: string } | null

export default function StudentForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(async (_, fd) => {
    const res = await createRequest(fd)
    return res
  }, null)

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="student_name" className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
          Your name
        </label>
        <input
          id="student_name"
          name="student_name"
          required
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <label htmlFor="topic_area" className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
          Topic or issue (optional)
        </label>
        <textarea
          id="topic_area"
          name="topic_area"
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
          placeholder="e.g., Recurrence relations, debugging pointer issue, etc."
        />
      </div>
      <button
        type="submit"
        className="w-full py-2.5 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
      >
        Submit Request
      </button>
      {state?.ok && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Your request was submitted. A tutor will reach out shortly.
          </p>
        </div>
      )}
      {state && !state.ok && state.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <p className="text-sm text-red-800 dark:text-red-200">{state.error}</p>
        </div>
      )}
    </form>
  )
}
