import type { ReactNode } from 'react'
import { initials, stageColor } from '@/lib/format'
import type { InboxThread, MyApplication } from '@/types'
import { ApplicationRow } from './ApplicationRow'

const shortDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** A line of the inbox: a conversation, or an application that has no conversation yet. */
export type InboxRow = { kind: 'thread'; thread: InboxThread; applied?: MyApplication } | { kind: 'application'; app: MyApplication }

export const rowDate = (r: InboxRow) => (r.kind === 'thread' ? r.thread.lastAt : r.app.appliedAt)

/**
 * The rows of one folder, newest first. A conversation row has a tick box to
 * select, a pin, who it is with and how many messages, the job it is about, and
 * when it last changed; one for a job the applicant applied for also shows the
 * application's stage and a button to the job.
 */
export function InboxList({ rows, otherName, selected, onToggleSelect, onTogglePin, onOpen, onOpenJob, empty }: {
  rows: InboxRow[]
  otherName: (t: InboxThread) => string
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onTogglePin: (t: InboxThread) => void
  onOpen: (t: InboxThread) => void
  onOpenJob?: (jobId: string) => void
  empty: ReactNode
}) {
  if (!rows.length) return <>{empty}</>

  return (
    <ul aria-label="Conversations and applications" className="divide-y divide-gray-200">
      {rows.map(r => {
        if (r.kind === 'application') {
          return onOpenJob ? <ApplicationRow key={`app-${r.app.job.id}`} app={r.app} onOpenJob={onOpenJob} /> : null
        }
        const t = r.thread
        const name = otherName(t)
        const unread = t.unread > 0
        const spoken = `${name}, ${t.count} message${t.count === 1 ? '' : 's'}${unread ? `, ${t.unread} unread` : ''}. ${t.jobTitle}${r.applied ? `. You applied, status ${r.applied.stage}` : ''}. ${shortDate(t.lastAt)}${t.pinned ? '. Pinned' : ''}`
        return (
          <li key={t.id} className={`flex items-center gap-3 px-4 sm:px-6 py-3 ${unread ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50`}>
            <input type="checkbox" checked={selected.has(t.id)} onChange={() => onToggleSelect(t.id)}
              aria-label={`Select the conversation with ${name}`} className="w-5 h-5 shrink-0 accent-[#1a4fa0]" />
            <button type="button" onClick={() => onTogglePin(t)} aria-pressed={t.pinned}
              aria-label={`${t.pinned ? 'Unpin' : 'Pin'} the conversation with ${name}`}
              className={`w-9 h-9 shrink-0 grid place-items-center rounded-md hover:bg-gray-100 ${t.pinned ? 'text-[#1a4fa0]' : 'text-gray-600'}`}>
              {/* filled when pinned, outlined when not: the shape changes, not only the colour */}
              <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5" fill={t.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <path d="M9 3h6l-1 6 4 4H6l4-4-1-6zM12 17v5" />
              </svg>
            </button>

            {/* the row's main action: open the conversation */}
            <button type="button" onClick={() => onOpen(t)} data-speak={spoken} aria-label={spoken}
              className="flex-1 min-w-0 flex items-center gap-3 text-left min-h-12 rounded-md">
              <span aria-hidden="true" className="w-11 h-11 shrink-0 rounded-full bg-[#eef3fb] text-[#1a4fa0] font-bold grid place-items-center">
                {initials(name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-base text-gray-900 truncate ${unread ? 'font-bold' : 'font-medium'}`}>
                  {name} <span className="font-normal text-gray-700">({t.count})</span>
                </span>
                <span className={`block text-sm truncate ${unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{t.jobTitle}</span>
                {t.lastText && (
                  <span className="block text-xs text-gray-600 truncate">{t.lastFromMe ? 'You: ' : ''}{t.lastText}</span>
                )}
              </span>
              <span className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-xs text-gray-600 whitespace-nowrap">{shortDate(t.lastAt)}</span>
                {unread && <span className="text-xs font-bold bg-[#1a4fa0] text-white rounded-full px-2 py-0.5">{t.unread} new</span>}
                {r.applied && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageColor(r.applied.stage)}`}>Applied · {r.applied.stage}</span>}
              </span>
            </button>
            {r.applied && onOpenJob && (
              <button type="button" onClick={() => onOpenJob(r.applied!.job.id)} aria-label={`View the job: ${t.jobTitle}`}
                className="hidden sm:inline-flex items-center min-h-9 px-3 rounded-md border border-[#1a7a3c] text-sm font-semibold text-[#1a7a3c] hover:bg-green-50 shrink-0">
                View job
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
