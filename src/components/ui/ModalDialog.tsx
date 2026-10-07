import { useEffect, useRef, type ReactNode } from 'react'

// Focus moves into the dialog, Tab/Shift+Tab stay inside it, Escape closes it, and
// focus returns to the opener on close (or to `returnFocusTo` if the opener was
// re-rendered away, e.g. a kanban card that moved column).

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ModalDialog({ labelledBy, onClose, returnFocusTo, children }: {
  labelledBy: string; onClose: () => void; returnFocusTo?: string; children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    items()[0]?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); return }
      if (e.key !== 'Tab') return
      const list = items()
      if (!list.length) return
      const first = list[0], last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const target = opener?.isConnected ? opener : returnFocusTo ? document.querySelector<HTMLElement>(returnFocusTo) : null
      target?.focus()
    }
  }, [returnFocusTo])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
