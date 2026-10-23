import { useEffect } from 'react'
import * as sr from '@/lib/a11y/screen-reader'
import { SCREEN_LABELS } from '@/constants'
import { t, useLang } from '@/lib/i18n'
import type { Screen } from '@/types'

// Runs on every screen change: sets the tab title (WCAG 2.4.2), announces the
// screen through the built-in reader, and recovers focus lost by the swap.
/** `label` replaces the screen's own name, for a page shown before any screen (the language choice). */
export function useScreenChangeA11y(screen: Screen, label?: string) {
  const lang = useLang()
  useEffect(() => {
    const name = label ?? (SCREEN_LABELS[screen] && t(SCREEN_LABELS[screen]!))
    document.title = name ? `${name.replace(/\.$/, '')} — Blind Jobs` : 'Blind Jobs'

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

    if (name) sr.announce(name)
    return () => cancelAnimationFrame(frame)
  }, [screen, lang, label])
}
