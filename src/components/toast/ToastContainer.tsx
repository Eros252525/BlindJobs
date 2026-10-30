import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/i18n'
import * as sr from '@/lib/a11y/screen-reader'
import { setToastListener, type Toast } from '@/lib/toast'

// Success and info toasts fade by themselves, after a time that grows with the
// message; errors stay until dismissed. For WCAG 2.2.1 Timing Adjustable, the time
// starts again while the pointer is over the stack or focus is inside it, so
// nobody loses a message they are reading, and each is also announced.
// Announcements go through dedicated live regions that are always mounted, so
// screen readers hear the message once, without the close button.

let nextId = 0
const MAX_TOASTS = 3
// About 10 seconds for "Applied to Customer Care Agent (Healthcare Account)"
const showFor = (msg: string) => Math.max(8000, 5000 + msg.length * 100)
// The fade in toast.css (.toast.is-leaving); the toast is removed when it ends
const FADE_MS = 400

const TOAST_STYLE: Record<Toast['type'], string> = {
  success: 'bg-[#1a7a3c]',
  error: 'bg-[#b91c1c]',
  info: 'bg-[#1a4fa0]',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    setToastListener((item) => {
      const id = ++nextId
      setToasts(prev => [...prev, { ...item, id }].slice(-MAX_TOASTS))
      sr.announce(item.msg) // the built-in reader doesn't listen to live regions
    })
    return () => setToastListener(null)
  }, [])
  // WCAG 2.4.11 Focus Not Obscured: errors persist and the rest stay a while, so
  // when the focused element sits under the stack's bottom-left home, the stack moves top-right.
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
  const latest = (urgent: boolean) => [...toasts].reverse().find(item => (item.type === 'error') === urgent)
  const polite = latest(false), assertive = latest(true)

  // Pointer over the stack, or focus inside it: no toast fades
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const held = hovered || focused
  useEffect(() => { if (!toasts.length) { setHovered(false); setFocused(false) } }, [toasts.length])

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">{polite && <span key={polite.id}>{polite.msg}</span>}</div>
      <div className="sr-only" role="alert" aria-live="assertive">{assertive && <span key={assertive.id}>{assertive.msg}</span>}</div>
      {toasts.length > 0 && (
        <section ref={stackRef} aria-label={t('Notifications')} className={`toast-stack ${ducked ? 'is-ducked' : ''}`}
          onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false) }}>
          {toasts.map(item => <ToastItem key={item.id} item={item} held={held} onDismiss={() => dismiss(item.id)} />)}
        </section>
      )}
    </>
  )
}

/** One toast. Fades by itself unless it is an error or `held`; held, its time starts again. */
function ToastItem({ item, held, onDismiss }: { item: Toast; held: boolean; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false)
  // the parent passes a new function each render; this keeps the fade timer from restarting
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss
  useEffect(() => {
    if (item.type === 'error' || held) { setLeaving(false); return }
    const timer = setTimeout(() => setLeaving(true), showFor(item.msg))
    return () => clearTimeout(timer)
  }, [item, held])
  // removed once faded; a timer, not transitionend, so it also goes when motion is reduced
  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => dismiss.current(), FADE_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  return (
    <div className={`toast ${TOAST_STYLE[item.type]} ${leaving ? 'is-leaving' : ''}`}>
      <p className="flex-1">{item.msg}</p>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label={t('Dismiss: {msg}', { msg: item.msg })}>
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  )
}
