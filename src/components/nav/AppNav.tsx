import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Screen, User } from '@/types'
import { NavBell } from './NavBell'
import { UserMenu } from './UserMenu'
import type { NavLink } from './nav-links'

export function AppNav({ active, user, onNavigate, home, links, msgScreen, menuItems }: {
  active: Screen; user: User; onNavigate: (s: Screen) => void
  home: Screen; links: NavLink[]; msgScreen: Screen; menuItems: NavLink[]
}) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef(new Map<Screen, HTMLButtonElement>())

  // Elevate the bar once content scrolls beneath it
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Slide a single pill under the active link; re-measure when the track resizes
  // (font load, viewport change, compact-on-scroll padding).
  useLayoutEffect(() => {
    const measure = () => {
      const el = linkRefs.current.get(active)
      setIndicator(el && el.offsetWidth ? { x: el.offsetLeft, w: el.offsetWidth } : null)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (trackRef.current) ro.observe(trackRef.current)
    return () => ro.disconnect()
  }, [active])

  // Alt+1..n jumps straight to a section
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const link = links[Number(e.key) - 1]
      if (!link) return
      e.preventDefault()
      onNavigate(link.target)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [links, onNavigate])

  useEffect(() => { setMobileOpen(false) }, [active])

  return (
    <nav aria-label="Main" data-nav-zone="navbar"
      className={`app-nav w-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shrink-0 sticky top-0 z-40 ${scrolled ? 'is-scrolled' : ''}`}>
      <button type="button" onClick={() => onNavigate(home)} data-speak="blind jobs, home" aria-label="Blind Jobs, home"
        className="nav-logo text-lg font-bold flex items-center gap-2.5 shrink-0">
        <img src="/images/logo.jpg" alt="" className="nav-logo-mark" />
        <span aria-hidden="true"><span className="text-[#1a4fa0]">blind</span><span className="text-gray-900">jobs</span></span>
      </button>

      <div ref={trackRef} className="nav-track hidden md:flex">
        {indicator && (
          <span aria-hidden="true" className="nav-indicator"
            style={{ transform: `translateX(${indicator.x}px)`, width: indicator.w }} />
        )}
        {links.map((l, i) => {
          const isActive = active === l.target
          return (
            <button key={l.target}
              ref={el => { if (el) linkRefs.current.set(l.target, el); else linkRefs.current.delete(l.target) }}
              onClick={() => onNavigate(l.target)}
              aria-current={isActive ? 'page' : undefined}
              aria-keyshortcuts={`Alt+${i + 1}`}
              title={`${l.label} (Alt+${i + 1})`}
              data-speak={isActive ? `${l.label}, current page` : l.label}
              className={`nav-link ${isActive ? 'nav-link-active' : ''}`}>
              <span aria-hidden="true" className="nav-link-icon">{l.icon}</span>{l.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <NavBell userId={user.id} onNavigate={onNavigate} msgScreen={msgScreen} />
        <span className="w-px h-7 bg-gradient-to-b from-transparent via-gray-200 to-transparent mx-1" aria-hidden="true" />
        <UserMenu user={user} onNavigate={onNavigate} items={menuItems} />
        <button onClick={() => setMobileOpen(o => !o)} aria-expanded={mobileOpen} aria-controls="nav-mobile"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          data-speak={mobileOpen ? 'Close menu' : 'Open menu'} className="nav-burger md:hidden">
          <span aria-hidden="true" className={mobileOpen ? 'is-open' : ''}><i /><i /><i /></span>
        </button>
      </div>

      {mobileOpen && (
        <div id="nav-mobile" className="nav-mobile md:hidden">
          {links.map(l => (
            <button key={l.target} onClick={() => onNavigate(l.target)}
              aria-current={active === l.target ? 'page' : undefined} data-speak={l.label}
              className={`nav-mobile-link ${active === l.target ? 'is-active' : ''}`}>
              <span aria-hidden="true">{l.icon}</span>{l.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}
