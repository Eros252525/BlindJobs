import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useDismiss } from '@/hooks/useDismiss'
import type { Conversation, Screen } from '@/types'

export function NavBell({ userId, onNavigate, msgScreen }: { userId: string; onNavigate: (s: Screen) => void; msgScreen: Screen }) {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [convs, setConvs] = useState<Conversation[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  useEffect(() => {
    const refresh = () => api.getUnreadCount(userId).then(setCount).catch(() => {})
    refresh()
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [userId])

  useEffect(() => {
    if (!open) return
    api.getConversations(userId).then(setConvs).catch(() => {})
  }, [open, userId])

  const handleGoToMessages = () => { setOpen(false); onNavigate(msgScreen) }

  return (
    <div ref={ref} className="relative">
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

          <div className="max-h-64 overflow-y-auto">
            {convs.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-6">No conversations yet.</p>
            ) : (
              convs.map(c => (
                <button key={c.id} onClick={handleGoToMessages}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {msgScreen === 'messages' ? c.employerName : c.applicantName}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{c.jobTitle}</p>
                </button>
              ))
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
