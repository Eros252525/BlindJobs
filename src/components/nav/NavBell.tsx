import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/format'
import { getOpenConversation } from '@/lib/open-conversation'
import * as sr from '@/lib/a11y/screen-reader'
import { toast } from '@/lib/toast'
import { APPLICATION_UPDATE_EVENT, READ_STATE_EVENT } from '@/constants'
import { useDismiss } from '@/hooks/useDismiss'
import type { AppNotification, Conversation, Screen, UnreadMessage } from '@/types'

export function NavBell({ userId, onNavigate, msgScreen, updatesScreen, onOpenJob }: {
  userId: string; onNavigate: (s: Screen) => void; msgScreen: Screen; updatesScreen: Screen
  onOpenJob?: (jobId: string) => void
}) {
  const [msgCount, setMsgCount] = useState(0)
  const [updates, setUpdates] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const [convs, setConvs] = useState<Conversation[]>([])
  // What screen readers hear when something new arrives. A visually hidden live
  // region instead of a pop-up box: sighted users have the badge on the bell.
  const [spoken, setSpoken] = useState('')
  const [marking, setMarking] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const unreadUpdates = updates.filter(n => !n.read).length
  const count = msgCount + unreadUpdates
  // the newest few, but never hide one that is still unread
  const shown = updates.slice(0, Math.max(5, unreadUpdates))
  const updatesRef = useRef(updates)
  updatesRef.current = updates

  useEffect(() => {
    let live = true
    let firstLoad = true
    let quiet = true
    // A badge on the bell is silent, so each new message or update is also announced
    // to screen readers (live region + built-in reader). Ids are kept so it is said once, not every poll.
    const announced = new Set<string>()
    const unsaid = <T extends { id: string }>(list: T[]) => {
      const fresh = list.filter(x => !announced.has(x.id))
      fresh.forEach(x => announced.add(x.id))
      return fresh
    }
    const refresh = async () => {
      const [msgs, items] = await Promise.all([
        api.getUnreadMessages(userId).catch(() => null) as Promise<UnreadMessage[] | null>,
        api.getNotifications(userId).catch(() => null) as Promise<AppNotification[] | null>,
      ])
      if (!live) return
      const say: string[] = []
      if (msgs) {
        // the conversation on screen announces its own messages and marks them read
        const unread = msgs.filter(m => m.convId !== getOpenConversation())
        setMsgCount(unread.length)
        const fresh = unsaid(unread)
        if (fresh.length === 1) say.push(`New message from ${fresh[0].senderName} about ${fresh[0].jobTitle}.`)
        else if (fresh.length > 1) say.push(`You have ${fresh.length} new messages.`)
      }
      if (items) {
        setUpdates(items)
        const fresh = unsaid(items.filter(n => !n.read))
        if (fresh.length === 1) say.push(fresh[0].text)
        else if (fresh.length > 1) say.push(`You have ${fresh.length} new updates. Open Notifications to read them.`)
        // screens listing jobs and applications reload; right after sign-in they are fresh already
        if (fresh.length && !firstLoad) window.dispatchEvent(new Event(APPLICATION_UPDATE_EVENT))
        firstLoad = false
      }
      // one announcement, so a message and an update arriving together are both heard;
      // nothing on the first check after sign-in, when everything unread would be read out at once
      if (say.length && !quiet) { const text = say.join(' '); setSpoken(text); sr.announce(text) }
      quiet = false
    }
    refresh()
    const t = setInterval(refresh, 15000)
    const onReadElsewhere = () => { refresh() }
    window.addEventListener(READ_STATE_EVENT, onReadElsewhere)
    return () => { live = false; clearInterval(t); window.removeEventListener(READ_STATE_EVENT, onReadElsewhere) }
  }, [userId, refreshTick])

  useEffect(() => {
    if (!open) return
    // the inbox, not every conversation: one the user deleted is not listed here either
    api.getInbox(userId).then(setConvs).catch(() => {})
    // Updates count as read once the panel closes, so "New" stays put while it is open
    return () => {
      const unreadIds = updatesRef.current.filter(n => !n.read).map(n => n.id)
      if (!unreadIds.length) return
      api.markNotificationsRead(userId, unreadIds).catch(() => {})
      setUpdates(list => list.map(n => ({ ...n, read: true })))
    }
  }, [open, userId])

  const markAllRead = async () => {
    setMarking(true)
    try {
      const ids = updates.filter(n => !n.read).map(n => n.id)
      await Promise.all([
        ids.length ? api.markNotificationsRead(userId, ids) : null,
        msgCount ? api.markAllConversationsRead(userId) : null,
      ])
      setUpdates(list => list.map(n => ({ ...n, read: true })))
      setMsgCount(0)
      setSpoken('All notifications and messages marked as read.')
      sr.announce('All notifications and messages marked as read.')
    } catch (e: any) { toast(`Could not mark them as read: ${e.message}`, 'error') }
    finally { setMarking(false); setRefreshTick(t => t + 1) }
  }

  const handleGoToMessages = () => { setOpen(false); onNavigate(msgScreen) }
  // A matched job opens ready to apply, and a new application opens that job's
  // candidates; a stage change opens the applicant's list of applications.
  const handleOpenUpdate = (n: AppNotification) => {
    setOpen(false)
    if (n.type !== 'stage' && onOpenJob) onOpenJob(n.jobId)
    else onNavigate(updatesScreen)
  }

  return (
    <div ref={ref} className="relative">
      <p role="status" className="sr-only">{spoken}</p>
      <button data-popover-trigger onClick={() => setOpen(o => !o)}
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'} aria-expanded={open}
        className={`nav-bell relative text-xl w-9 h-9 rounded-full flex items-center justify-center ${open ? 'bg-blue-50' : ''}`}>
        <span aria-hidden="true" className={count > 0 ? 'bell-ring' : ''}>🔔</span>
        {count > 0 && (
          <span aria-hidden="true" className="absolute top-0 right-0 flex">
            <span className="absolute inset-0 rounded-full bg-red-400 nav-ping opacity-75" />
            <span className="relative bg-red-700 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
              {count > 9 ? '9+' : count}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="nav-dropdown absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">Notifications</span>
            {count > 0 && <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">{count} unread</span>}
          </div>
          {count > 0 && (
            <div className="px-4 py-2 border-b border-gray-100">
              <button type="button" onClick={markAllRead} disabled={marking}
                className="w-full min-h-9 rounded-md border border-[#1a4fa0] text-sm font-semibold text-[#1a4fa0] hover:bg-blue-50 disabled:opacity-60">
                {marking ? 'Marking…' : <><span aria-hidden="true">✓ </span>Mark all as read</>}
              </button>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {shown.length > 0 && (
              <div role="group" aria-labelledby="bell-updates">
                <p id="bell-updates" className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Job and application updates</p>
                {shown.map(n => (
                  <button key={n.id} onClick={() => handleOpenUpdate(n)}
                    data-speak={`${n.read ? '' : 'New. '}${n.text} ${timeAgo(n.createdAt)}`}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors">
                    <p className={`text-sm text-gray-800 ${n.read ? '' : 'font-semibold'}`}>
                      {!n.read && <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">New<span className="sr-only">:</span></span>}
                      {!n.read && ' '}{n.text}
                    </p>
                    <p className="text-xs text-gray-600">{timeAgo(n.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}

            {convs.length > 0 && (
              <div role="group" aria-labelledby="bell-messages">
                <p id="bell-messages" className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Messages</p>
                {convs.map(c => (
                  <button key={c.id} onClick={handleGoToMessages}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {msgScreen === 'messages' ? c.employerName : c.applicantName}
                    </p>
                    <p className="text-xs text-gray-600 truncate">{c.jobTitle}</p>
                  </button>
                ))}
              </div>
            )}

            {shown.length === 0 && convs.length === 0 && (
              <p className="text-sm text-gray-600 text-center py-6">No notifications yet.</p>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100">
            <button onClick={handleGoToMessages}
              className="w-full min-h-6 text-xs font-semibold text-[#1a4fa0] hover:underline text-center">
              View all messages →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
