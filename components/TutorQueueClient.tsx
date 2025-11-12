"use client"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { QueueRequest } from "@/types/queue"
import { deleteRequest, markSeen } from "@/app/actions"

type Props = { mode: "signin" | "dashboard" }

export default function TutorQueueClient({ mode }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [isPending, startTransition] = useTransition()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)

  const [requests, setRequests] = useState<QueueRequest[]>([])
  const [loading, setLoading] = useState(mode === "dashboard")
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<QueueRequest | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from("queue_requests").select("*").order("created_at", { ascending: true })
    if (error) {
      setError(error.message)
    } else {
      setRequests(data as QueueRequest[])
    }
    setLoading(false)
  }, [supabase])

  const waitingRequests = requests.filter((r) => r.status === "waiting")
  const seenRequests = requests.filter((r) => r.status === "seen")

  const handler = (payload: any) => {
    // normalize event type (some transports may differ in casing)
    const evt = (payload?.eventType || payload?.type || "").toString().toUpperCase()
    // try to find new/old rows under several possible keys used by different transports/versions
    const newRow = payload?.new ?? payload?.record ?? payload?.payload?.new ?? payload?.after ?? null
    const oldRow = payload?.old ?? payload?.old_record ?? payload?.payload?.old ?? payload?.before ?? null

    // handle incoming payload
    // If we got an INSERT but no structured newRow, reload list as a fallback
    if (evt === "INSERT" && !newRow) {
      // fire-and-forget refresh
      void loadRequests()
      return
    }

    setRequests((curr) => {
      if (evt === "INSERT") {
        if (!newRow) return curr // nothing to add
        // don't duplicate if already present
        if (curr.some((r) => r.id === newRow.id)) {
          // ensure the stored row is up-to-date
          return curr
            .map((r) => (r.id === newRow.id ? (newRow as QueueRequest) : r))
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        }
        return [...curr, newRow as QueueRequest].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
      }

      if (evt === "UPDATE") {
        if (!newRow) return curr
        return curr
          .map((r) => (r.id === (newRow as any).id ? (newRow as QueueRequest) : r))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }

      if (evt === "DELETE") {
        // prefer id from oldRow but fallback to payload.old
        const id = (oldRow as any)?.id ?? (payload?.old as any)?.id
        if (!id) return curr
        return curr.filter((r) => r.id !== id)
      }

      return curr
    })
  }

  useEffect(() => {
    if (mode !== "dashboard") return
    loadRequests()

    // create a channel and subscribe to Postgres changes for queue_requests
    const channel = supabase.channel("queue_requests_changes")

    channel.on("postgres_changes", { event: "*", schema: "public", table: "queue_requests" }, handler)

    // subscribe and ensure we have a proper channel reference
    const subscribed = channel.subscribe()

    return () => {
      // best-effort unsubscribe cleanup
      try {
        // unsubscribe the channel then remove it from the client
        // `unsubscribe` is safe to call on the RealtimeChannel
        // and `removeChannel` will remove it from the client state
        // (some versions of the client return the same object from subscribe)
        // @ts-ignore
        if (subscribed?.unsubscribe) subscribed.unsubscribe()
      } catch (e) {
        // ignore
      }
      try {
        supabase.removeChannel(subscribed)
      } catch (e) {
        // fallback: try removing the original channel
        try {
          supabase.removeChannel(channel)
        } catch {
          // ignore
        }
      }
    }
  }, [mode, supabase, loadRequests])

  // Auto-refresh the requests list every 10 seconds when on the dashboard.
  // This is a lightweight fallback to ensure the UI stays up-to-date in
  // environments where realtime websocket events may be unreliable.
  useEffect(() => {
    if (mode !== "dashboard") return
    const id = setInterval(() => {
      void loadRequests()
    }, 10_000)
    return () => clearInterval(id)
  }, [mode, loadRequests])

  if (mode === "signin") {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setAuthError(null)
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) setAuthError(error.message)
          else window.location.reload()
        }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">Email Address</label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        {authError && (
          <div className="rounded-lg bg-red-50 px-4 py-4 text-sm font-medium text-red-700 border border-red-200">
            {authError}
          </div>
        )}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Sign In
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Queue Requests</h2>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-blue-600">{waitingRequests.length}</span> waiting •
            <span className="font-semibold text-green-600 ml-1">{seenRequests.length}</span> seen
          </p>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.reload()
          }}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Sign Out
        </button>
      </div>

      {selectedRequest ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{selectedRequest!.student_name}</h3>
              {selectedRequest!.topic_area && (
                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{selectedRequest!.topic_area}</p>
              )}
              <p className="text-xs text-slate-500 mt-3">Requested: {new Date(selectedRequest!.created_at).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Status: {selectedRequest!.status}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() =>
                  startTransition(async () => {
                    if (!selectedRequest) return
                    const id = selectedRequest.id
                    // optimistic remove
                    setRequests((curr) => curr.filter((r) => r.id !== id))
                    await deleteRequest(id)
                    setSelectedRequest(null)
                  })
                }
                className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={isPending}
              >
                Complete
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg border border-slate-300 text-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Back to queue
              </button>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div
                className="h-2 w-2 rounded-full bg-blue-600 animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="h-2 w-2 rounded-full bg-blue-600 animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
            <span className="text-sm font-medium text-slate-600">Loading requests…</span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 px-4 py-4 text-sm font-medium text-red-700 border border-red-200">
          ⚠️ Error loading requests: {error}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
          <p className="text-slate-600 text-sm font-medium">No requests in the queue</p>
          <p className="text-slate-500 text-xs mt-2">Requests will appear here when students join the queue</p>
        </div>
      ) : (
        <div className="space-y-4">
          {waitingRequests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Waiting for Help</h3>
              <ul className="space-y-3">
                {waitingRequests.map((req) => (
                  <li
                    key={req.id}
                    className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start justify-between gap-4 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                        <span className="font-semibold text-slate-900 truncate">{req.student_name}</span>
                      </div>
                      {req.topic_area && (
                        <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap leading-relaxed">
                          {req.topic_area}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {Math.round((Date.now() - new Date(req.created_at).getTime()) / 60000)} min ago
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() =>
                          startTransition(async () => {
                            // optimistic: mark as seen locally and navigate to detail view
                            setRequests((curr) => curr.map((r) => (r.id === req.id ? { ...r, status: "seen" } : r)))
                            setSelectedRequest(req)
                            await markSeen(req.id)
                          })
                        }
                        className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        disabled={isPending}
                      >
                        Mark Seen
                      </button>
                      <button
                        onClick={() =>
                          startTransition(async () => {
                            setRequests((curr) => curr.filter((r) => r.id !== req.id))
                            await deleteRequest(req.id)
                          })
                        }
                        className="rounded-lg border border-slate-300 text-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        disabled={isPending}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {seenRequests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Already Seen</h3>
              <ul className="space-y-2">
                {seenRequests.map((req) => (
                  <li
                    key={req.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 flex items-start justify-between gap-4 hover:border-slate-300 transition-all opacity-75"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="font-medium text-slate-700 truncate">{req.student_name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{new Date(req.created_at).toLocaleTimeString()}</p>
                    </div>
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          setRequests((curr) => curr.filter((r) => r.id !== req.id))
                          await deleteRequest(req.id)
                        })
                      }
                      className="text-slate-400 hover:text-red-600 transition-colors text-sm font-medium whitespace-nowrap"
                      disabled={isPending}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Detail view when a tutor selects a request to handle */}
          {selectedRequest && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{(selectedRequest as any).student_name}</h3>
                  {(selectedRequest as any).topic_area && (
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{(selectedRequest as any).topic_area}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-3">Requested: {new Date((selectedRequest as any).created_at).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">Status: {(selectedRequest as any).status}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        if (!selectedRequest) return
                        const id = (selectedRequest as any).id
                        // optimistic remove
                        setRequests((curr) => curr.filter((r) => r.id !== id))
                        await deleteRequest(id)
                        setSelectedRequest(null)
                      })
                    }
                    className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={isPending}
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-lg border border-slate-300 text-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    Back to queue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
