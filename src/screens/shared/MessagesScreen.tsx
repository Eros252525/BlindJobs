import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { READ_STATE_EVENT } from '@/constants'
import { useUpdateTick } from '@/hooks/useUpdateTick'
import type { InboxThread, MyApplication, User } from '@/types'
import { FOLDERS, folderLabel, inFolder, type FolderId } from './messages/folders'
import { InboxList, rowDate, type InboxRow } from './messages/InboxList'
import { ThreadView } from './messages/ThreadView'

/**
 * Messages, laid out like a mail inbox: folders on the left (Messages, Unread,
 * Pinned, Sent), the conversations in the chosen folder on the right, and a
 * conversation opening in their place. Applying for a job starts a conversation
 * with its employer, so every application shows here; an application made before
 * that, with no conversation yet, is listed in Messages and Sent as "You applied for…".
 */
export function MessagesScreen({ user, onOpenJob, onFindJobs }: {
  user: User
  /** Applicants: opens a job on the Jobs page. */
  onOpenJob?: (jobId: string) => void
  /** Applicants: goes to the Jobs page, from an empty inbox. */
  onFindJobs?: () => void
}) {
  const [threads, setThreads] = useState<InboxThread[] | null>(null)
  const [apps, setApps] = useState<MyApplication[]>([])
  // jobs whose conversation was deleted: their application must not come back as a row of its own
  const [goneJobs, setGoneJobs] = useState<string[]>([])
  const [folder, setFolder] = useState<FolderId>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  // reloads when the bell reports something new, so the list matches what it said
  const tick = useUpdateTick()
  const load = useCallback(() => {
    api.getInbox(user.id).then(setThreads).catch(() => setThreads([]))
    if (user.role === 'applicant') {
      api.getMyApplications(user.id).then(setApps).catch(() => setApps([]))
      api.getDeletedConversationJobIds(user.id).then(setGoneJobs).catch(() => setGoneJobs([]))
    }
  }, [user.id, user.role])
  useEffect(() => { load() }, [load, tick])

  const otherName = (t: InboxThread) => (user.role === 'applicant' ? t.employerName : t.applicantName)
  const all = threads || []
  const shown = all.filter(t => inFolder(t, folder))
  // Applications: on the conversation for the same job, or as rows of their own in
  // Messages and Sent when the employer has no conversation with the applicant yet
  const appliedFor = (t: InboxThread) => apps.find(a => a.job.id === t.jobId)
  const lone = apps.filter(a => !all.some(t => t.jobId === a.job.id) && !goneJobs.includes(a.job.id))
  const rows: InboxRow[] = [
    ...shown.map(t => ({ kind: 'thread' as const, thread: t, applied: appliedFor(t) })),
    ...(folder === 'all' || folder === 'sent' ? lone.map(app => ({ kind: 'application' as const, app })) : []),
  ].sort((a, b) => rowDate(b).localeCompare(rowDate(a)))
  const counts: Record<FolderId, number> = {
    all: all.length + lone.length, unread: all.filter(t => t.unread > 0).length,
    pinned: all.filter(t => t.pinned).length, sent: all.filter(t => t.sentByMe).length + lone.length,
  }
  const open = all.find(t => t.id === openId)
  const chosen = shown.filter(t => selected.has(t.id))

  const pickFolder = (f: FolderId) => { setFolder(f); setOpenId(null); setSelected(new Set()); setStatus(`${folderLabel(f)}, ${all.filter(t => inFolder(t, f)).length} conversations.`) }
  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(chosen.length === shown.length ? new Set() : new Set(shown.map(t => t.id)))

  const pin = async (ids: string[], on: boolean) => {
    setBusy(true)
    try {
      await api.setConversationsPinned(user.id, ids, on)
      setThreads(ts => (ts || []).map(t => (ids.includes(t.id) ? { ...t, pinned: on } : t)))
      setStatus(`${ids.length} conversation${ids.length === 1 ? '' : 's'} ${on ? 'pinned' : 'unpinned'}.`)
      setSelected(new Set())
    } catch (e: any) { toast(`Could not ${on ? 'pin' : 'unpin'}: ${e.message}`, 'error') }
    finally { setBusy(false) }
  }

  const [confirmDelete, setConfirmDelete] = useState(false)
  // Removed from this user's inbox only; each comes back if the other person writes again
  const removeConversations = async (ids: string[]) => {
    setBusy(true)
    try {
      await api.deleteConversationsForMe(user.id, ids)
      const gone = (threads || []).filter(t => ids.includes(t.id))
      setThreads(ts => (ts || []).filter(t => !ids.includes(t.id)))
      setGoneJobs(js => [...js, ...gone.map(t => t.jobId).filter((j): j is string => !!j)])
      window.dispatchEvent(new Event(READ_STATE_EVENT))
      setStatus(`${ids.length} conversation${ids.length === 1 ? '' : 's'} deleted.`)
      toast(`${ids.length === 1 ? 'Conversation' : `${ids.length} conversations`} deleted.`, 'info')
      setSelected(new Set()); setConfirmDelete(false); setOpenId(null)
    } catch (e: any) { toast(`Could not delete: ${e.message}`, 'error') }
    finally { setBusy(false) }
  }

  const markRead = async (ids: string[]) => {
    setBusy(true)
    try {
      await Promise.all(ids.map(id => api.markConversationRead(user.id, id)))
      setThreads(ts => (ts || []).map(t => (ids.includes(t.id) ? { ...t, unread: 0 } : t)))
      window.dispatchEvent(new Event(READ_STATE_EVENT))
      setStatus(`${ids.length} conversation${ids.length === 1 ? '' : 's'} marked as read.`)
      setSelected(new Set())
    } catch (e: any) { toast(`Could not mark as read: ${e.message}`, 'error') }
    finally { setBusy(false) }
  }

  const ACTION = 'min-h-9 px-3 rounded-md border border-[#1a4fa0] text-sm font-semibold text-[#1a4fa0] hover:bg-blue-50 disabled:opacity-50'

  return (
    // fills the page below the menu bar, however few conversations there are
    <div className="flex-1 flex flex-col p-4 sm:p-6 pb-24 sm:pb-24">
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
        {/* folders */}
        <nav aria-label="Message folders" className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-gray-200 py-2">
          <ul className="flex md:flex-col overflow-x-auto">
            {FOLDERS.map(f => {
              const active = f.id === folder && !open
              return (
                <li key={f.id} className="shrink-0">
                  <button type="button" onClick={() => pickFolder(f.id)} aria-current={f.id === folder ? 'page' : undefined}
                    className={`w-full min-h-12 px-5 flex items-center gap-3 text-left text-sm font-semibold border-l-4 ${f.id === folder ? 'border-[#1a4fa0] bg-[#eef3fb] text-[#1a4fa0]' : 'border-transparent text-gray-800 hover:bg-gray-50'}`}>
                    <span aria-hidden="true">{f.icon}</span>
                    <span className="flex-1">{f.label}</span>
                    {counts[f.id] > 0 && (
                      <span className={`text-xs rounded-full px-2 py-0.5 ${f.id === 'unread' ? 'bg-[#1a4fa0] text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {counts[f.id]}<span className="sr-only"> conversations</span>
                      </span>
                    )}
                    {active && <span className="sr-only">, current folder</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* the folder, or the conversation opened from it */}
        <section aria-labelledby="msg-folder" className="flex-1 min-w-0 flex flex-col">
          {open ? (
            <ThreadView user={user} thread={open} otherName={otherName(open)} backLabel={`Back to ${folderLabel(folder)}`}
              applied={appliedFor(open)} onOpenJob={onOpenJob} onBack={() => { setOpenId(null); load() }}
              onDeleteConversation={() => removeConversations([open.id])} />
          ) : (
            <>
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
                {shown.length > 0 && (
                  <input type="checkbox" checked={chosen.length === shown.length} onChange={toggleAll}
                    aria-label={`Select all ${shown.length} conversations`} className="w-5 h-5 accent-[#1a4fa0]" />
                )}
                <h1 id="msg-folder" className="text-xl font-bold text-gray-900">
                  {folder === 'all' ? 'Inbox' : folderLabel(folder)}
                </h1>
                <div className="flex flex-wrap gap-2 ml-auto">
                  {chosen.length > 0 ? (
                    <>
                      <span className="self-center text-sm text-gray-700">{chosen.length} selected</span>
                      <button type="button" disabled={busy} onClick={() => markRead(chosen.map(t => t.id))} className={ACTION}>Mark as read</button>
                      <button type="button" disabled={busy} onClick={() => pin(chosen.map(t => t.id), true)} className={ACTION}>Pin</button>
                      <button type="button" disabled={busy} onClick={() => pin(chosen.map(t => t.id), false)} className={ACTION}>Unpin</button>
                      <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} aria-expanded={confirmDelete}
                        className="min-h-9 px-3 rounded-md border border-red-700 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete</button>
                    </>
                  ) : counts.unread > 0 && (
                    <button type="button" disabled={busy} onClick={() => markRead(all.filter(t => t.unread > 0).map(t => t.id))} className={ACTION}>
                      <span aria-hidden="true">✓ </span>Mark all as read
                    </button>
                  )}
                </div>
              </div>
              {confirmDelete && chosen.length > 0 && (
                <div role="alert" className="mx-4 sm:mx-6 mt-4 rounded-lg border-2 border-red-400 p-4">
                  <p className="text-sm font-semibold text-gray-900">Delete {chosen.length} conversation{chosen.length === 1 ? '' : 's'} from your inbox?</p>
                  <p className="text-sm text-gray-700 mt-1">The other person keeps their copy. A conversation comes back if they write again.</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" disabled={busy} onClick={() => removeConversations(chosen.map(t => t.id))}
                      className="min-h-11 px-5 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-md text-sm disabled:opacity-60">Yes, delete</button>
                    <button type="button" onClick={() => setConfirmDelete(false)}
                      className="min-h-11 px-5 bg-white border border-gray-500 text-gray-800 hover:bg-gray-100 font-semibold rounded-md text-sm">Cancel</button>
                  </div>
                </div>
              )}
              {threads === null
                ? <p role="status" className="px-6 py-10 text-center text-sm text-gray-600">Loading…</p>
                : <InboxList rows={rows} otherName={otherName} selected={selected} onToggleSelect={toggleSelect}
                    onTogglePin={(t) => pin([t.id], !t.pinned)} onOpen={(t) => setOpenId(t.id)} onOpenJob={onOpenJob}
                    empty={
                      // an empty folder still fills the space, and says what will appear and how
                      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
                        <span aria-hidden="true" className="text-6xl mb-4">{FOLDERS.find(f => f.id === folder)!.icon}</span>
                        <p className="text-lg font-semibold text-gray-900">{folder === 'all' ? 'Your inbox is empty' : `No ${folderLabel(folder).toLowerCase()} conversations`}</p>
                        <p className="mt-1 text-sm text-gray-700 max-w-md">{FOLDERS.find(f => f.id === folder)!.empty}</p>
                        {onFindJobs && (folder === 'all' || folder === 'sent') && (
                          <button type="button" onClick={onFindJobs} className="btn-primary min-h-11 px-6 mt-5">Find jobs to apply for</button>
                        )}
                      </div>
                    } />}
            </>
          )}
          <p role="status" className="sr-only">{status}</p>
        </section>
      </div>
    </div>
  )
}
