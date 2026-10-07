import { useCallback, useRef, useState } from 'react'
import { useDismiss } from '@/hooks/useDismiss'
import { initials } from '@/lib/format'
import type { Screen, User } from '@/types'
import type { NavLink } from './nav-links'

export function UserMenu({ user, onNavigate, items }: {
  user: User; onNavigate: (s: Screen) => void; items: NavLink[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)
  const roleLabel = user.role === 'employer' ? 'Employer' : 'Applicant'
  const go = (s: Screen) => { setOpen(false); onNavigate(s) }

  return (
    <div ref={ref} className="relative">
      <button data-popover-trigger onClick={() => setOpen(o => !o)}
        aria-expanded={open} aria-controls="account-menu" aria-label={`Account menu, ${user.name}, ${roleLabel}`}
        data-speak={`Account menu, ${user.name}, ${roleLabel}`}
        className={`nav-user ${open ? 'is-open' : ''}`}>
        <span aria-hidden="true" className="nav-avatar">{initials(user.name)}</span>
        <span className="hidden lg:flex flex-col items-start leading-tight text-left">
          <span className="text-sm font-semibold text-gray-800 max-w-[9rem] truncate">{user.name}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">{roleLabel}</span>
        </span>
        <span aria-hidden="true" className={`nav-caret ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div id="account-menu" className="nav-dropdown absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-br from-blue-50 to-white">
            <span aria-hidden="true" className="nav-avatar nav-avatar-lg">{initials(user.name)}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{user.name}</p>
              <p className="text-xs text-gray-600 truncate">{user.email}</p>
            </div>
          </div>
          <div className="py-1">
            {items.map(i => (
              <button key={i.target} data-speak={i.label} onClick={() => go(i.target)} className="nav-menu-item">
                <span aria-hidden="true">{i.icon}</span>{i.label}
              </button>
            ))}
          </div>
          <div className="py-1 border-t border-gray-100">
            <button data-speak="Log out" onClick={() => go('login')} className="nav-menu-item text-red-700 hover:bg-red-50">
              <span aria-hidden="true">⎋</span>Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
