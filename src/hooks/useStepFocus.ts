import { useEffect, useRef } from 'react'
import * as sr from '@/lib/a11y/screen-reader'

// For screens that change step without changing screen (a survey page, the next
// question): moves focus to the new step's heading and has the built-in reader
// say `spoken`. Without it, focus stays on a button that no longer exists and a
// blind user is left with no sign that anything changed.
// Put the returned ref on the heading, with tabIndex={-1}.
export function useStepFocus<T extends HTMLElement>(step: unknown, spoken: string) {
  const ref = useRef<T>(null)
  const spokenRef = useRef(spoken)
  spokenRef.current = spoken

  useEffect(() => {
    const el = ref.current
    if (!el) return
    window.__quietFocus = true // the announcement below says more than the heading alone
    el.focus({ preventScroll: true })
    window.__quietFocus = false
    el.scrollIntoView({ block: 'start' })
    sr.announce(spokenRef.current)
  }, [step])

  return ref
}
