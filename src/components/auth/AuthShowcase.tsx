import { useEffect, useState } from 'react'
import { BRAILLE_DOTS } from '@/lib/braille'

// Right-hand panel on the sign-in and register screens. It mirrors whatever has
// focus in the form the way NVDA would: a speech line, plus the same words on a
// 12-cell refreshable braille display. The live demo is aria-hidden: screen-reader
// users already hear the real thing, so only the short pitch below it is exposed.

const CELLS = 12

// Approximates the speech for the focused element: name, role, state.
function describe(el: Element | null): string {
  if (!(el instanceof HTMLElement) || el === document.body) return ''
  if (el.dataset.speak) return el.dataset.speak
  const input = el as HTMLInputElement
  const name = (el.getAttribute('aria-label') || input.labels?.[0]?.textContent || el.textContent || '')
    .replace(/\s+/g, ' ').trim()
  const tag = el.tagName
  const role =
    tag === 'BUTTON' ? 'button'
    : tag === 'A' ? 'link'
    : tag === 'SELECT' ? 'combo box'
    : tag === 'TEXTAREA' ? 'edit, multi line'
    : tag === 'INPUT' ? (input.type === 'checkbox' ? 'check box' : input.type === 'password' ? 'edit, protected' : 'edit')
    : /^H[1-6]$/.test(tag) ? `heading level ${tag[1]}`
    : ''
  const state =
    el.getAttribute('aria-pressed') === 'true' ? 'pressed'
    : input.type === 'checkbox' ? (input.checked ? 'checked' : 'not checked')
    : el.getAttribute('aria-invalid') === 'true' ? 'invalid entry'
    : ''
  return [name, role, state].filter(Boolean).join(', ')
}

type Line = { id: number; text: string }
let nextLine = 0

export function AuthShowcase({ heading }: { heading: string }) {
  const [lines, setLines] = useState<Line[]>(() => [
    { id: nextLine++, text: 'Blind Jobs, web page' },
    { id: nextLine++, text: `${heading}, heading level 1` },
  ])

  useEffect(() => {
    const push = () => {
      const text = describe(document.activeElement)
      if (!text) return
      setLines(prev => prev[prev.length - 1]?.text === text ? prev : [...prev, { id: nextLine++, text }].slice(-4))
    }
    // Clicking a toggle changes its state without moving focus, so re-read after clicks too.
    const onClick = () => requestAnimationFrame(push)
    document.addEventListener('focusin', push)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('focusin', push)
      document.removeEventListener('click', onClick)
    }
  }, [])

  const current = lines[lines.length - 1]
  const letters = current.text.toLowerCase().replace(/[^a-z ]+/g, '').replace(/\s+/g, ' ').trim()
    .slice(0, CELLS).padEnd(CELLS, ' ').split('')

  return (
    <aside className="auth-showcase" aria-labelledby="showcase-title">
      <p className="auth-showcase-eyebrow">Screen reader ready</p>
      <h2 id="showcase-title" className="auth-showcase-title">Every field speaks.<br />Every word in braille.</h2>

      <div className="sr-panel" aria-hidden="true">
        <div className="sr-panel-head">
          <span className="sr-panel-label">Screen reader</span>
          <span key={current.id} className="sr-wave"><i /><i /><i /><i /><i /></span>
        </div>
        <ol className="sr-log">
          {lines.map(l => (
            <li key={l.id} className={l.id === current.id ? 'is-current' : ''}>“{l.text}”</li>
          ))}
        </ol>

        <div className="bd">
          {letters.map((ch, i) => {
            const raised = BRAILLE_DOTS[ch] ?? []
            return (
              <span key={i} className="bd-cell">
                <span className="bd-dots">
                  {[1, 2, 3, 4, 5, 6].map(d => <span key={d} className={`bd-dot ${raised.includes(d) ? 'is-up' : ''}`} />)}
                </span>
                <span className="bd-letter">{ch.trim()}</span>
              </span>
            )
          })}
        </div>
        <p className="bd-foot">Braille display · {CELLS} cells</p>
      </div>

      <ul className="auth-showcase-points">
        <li><span aria-hidden="true">⌨</span>Every action works with Tab, the arrow keys and Enter.</li>
        <li><span aria-hidden="true">🔊</span>Press F2 to hear the focused item with the built-in reader.</li>
        <li><span aria-hidden="true">⠃</span>Errors name the missing field and take you straight to it.</li>
      </ul>
    </aside>
  )
}
