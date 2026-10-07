import { useEffect, useRef, useState } from 'react'
import * as sr from '@/lib/sr'
import { setToastListener, type Toast } from '@/lib/toast'

// Toasts stay until dismissed (WCAG 2.2.1 Timing Adjustable: no time limit on
// reading them). Announcements go through dedicated live regions that are always
// mounted, so screen readers hear the message once, without the close button.

let nextId = 0
const MAX_TOASTS = 3

const TOAST_STYLE: Record<Toast['type'], string> = {
  success: 'bg-[#1a7a3c]',
  error: 'bg-[#b91c1c]',
  info: 'bg-[#1a4fa0]',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    setToastListener((t) => {
      const id = ++nextId
      setToasts(prev => [...prev, { ...t, id }].slice(-MAX_TOASTS))
      sr.announce(t.msg) // the built-in reader doesn't listen to live regions
    })
    return () => setToastListener(null)
  }, [])
  // WCAG 2.4.11 Focus Not Obscured: toasts persist (2.2.1), so when the focused
  // element sits under the stack's bottom-left home, the stack moves top-right.
  const stackRef = useRef<HTMLElement>(null)
  const [ducked, setDucked] = useState(false)
  useEffect(() => {
    if (!toasts.length) { setDucked(false); return }
    const check = () => {
      const stack = stackRef.current, el = document.activeElement
      if (!stack || !(el instanceof HTMLElement) || el === document.body || stack.contains(el)) { setDucked(false); return }
      // home position, mirroring .toast-stack in toast.css
      const left = 16, right = left + stack.offsetWidth
      const bottom = window.innerHeight - (window.innerWidth <= 640 ? 80 : 16), top = bottom - stack.offsetHeight
      const r = el.getBoundingClientRect()
      setDucked(r.left < right && r.right > left && r.top < bottom && r.bottom > top)
    }
    check()
    document.addEventListener('focusin', check)
    return () => document.removeEventListener('focusin', check)
  }, [toasts])

  const dismiss = (id: number) => setToasts(prev => prev.filter(x => x.id !== id))
  const latest = (urgent: boolean) => [...toasts].reverse().find(t => (t.type === 'error') === urgent)
  const polite = latest(false), assertive = latest(true)

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">{polite && <span key={polite.id}>{polite.msg}</span>}</div>
      <div className="sr-only" role="alert" aria-live="assertive">{assertive && <span key={assertive.id}>{assertive.msg}</span>}</div>
      {toasts.length > 0 && (
        <section ref={stackRef} aria-label="Notifications" className={`toast-stack ${ducked ? 'is-ducked' : ''}`}>
          {toasts.map(t => (
            <div key={t.id} className={`toast ${TOAST_STYLE[t.type]}`}>
              <p className="flex-1">{t.msg}</p>
              <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label={`Dismiss: ${t.msg}`}>
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
