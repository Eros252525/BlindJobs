import { useEffect } from 'react'
import * as sr from '@/lib/a11y/screen-reader'
import { SCREEN_LABELS } from '@/constants'
import type { Screen } from '@/types'

// Runs on every screen change: sets the tab title (WCAG 2.4.2), announces the
// screen through the built-in reader, and recovers focus lost by the swap.
export function useScreenChangeA11y(screen: Screen) {
  useEffect(() => {
    const label = SCREEN_LABELS[screen]
    document.title = label ? `${label.replace(/\.$/, '')} — Blind Jobs` : 'Blind Jobs'

    // A new screen starts at its top. <main> is the scroll area from tablet width up
    // and outlives the screen inside it, so it would otherwise keep the old position.
    document.getElementById('main-content')?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })

    // Swapping screens unmounts whatever had focus (e.g. the Sign in button), which
    // drops focus to <body> and leaves NVDA silent. Only then, land on the new
    // screen's heading; focus the user still has (navbar link, autofocus) is left alone.
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement
      if (active && active !== document.body) return
      const heading = document.querySelector<HTMLElement>('h1')
      if (!heading) return
      heading.tabIndex = -1
      window.__quietFocus = true // the announce below already says where we are
      heading.focus({ preventScroll: true })
      window.__quietFocus = false
    })

    if (label) sr.announce(label)
    return () => cancelAnimationFrame(frame)
  }, [screen])
}
