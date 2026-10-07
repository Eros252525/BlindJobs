import { useEffect } from 'react'

declare global {
  interface Window {
    __srEnabled?: boolean
    __remoteNavFocusing?: boolean
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function srSpeak(text: string) {
  if (!window.__srEnabled) return
  const t = String(text || '').trim()
  if (!t) return
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(t))
}

function findLabel(el: HTMLElement): string {
  // 1. explicit aria-label
  const aria = el.getAttribute('aria-label')
  if (aria) return aria

  // 2. <label for="id">
  if (el.id) {
    const forLabel = document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)
    if (forLabel) return forLabel.textContent?.trim() || ''
  }

  // 3. wrapping <label>
  const wrap = el.closest('label')
  if (wrap) return wrap.textContent?.trim() || ''

  // 4. previous sibling label (common pattern: <label>…</label><input>)
  let prev = el.previousElementSibling as HTMLElement | null
  while (prev) {
    if (prev.tagName === 'LABEL') return prev.textContent?.trim() || ''
    // stop if sibling is another interactive element
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(prev.tagName)) break
    prev = prev.previousElementSibling as HTMLElement | null
  }

  // 5. parent's first label child
  const parentLabel = el.parentElement?.querySelector('label')
  if (parentLabel) return parentLabel.textContent?.trim() || ''

  return ''
}

function readEl(el: HTMLElement) {
  const tag = el.tagName
  const isField = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'

  if (isField) {
    const label = findLabel(el)
    const placeholder = (el as HTMLInputElement).placeholder || ''
    const value = (el as HTMLInputElement).value || ''
    const inputType = (el as HTMLInputElement).type?.toLowerCase()
    const typeHint =
      inputType === 'password' ? 'password field' :
      inputType === 'number' ? 'number field' :
      tag === 'SELECT' ? 'dropdown' :
      tag === 'TEXTAREA' ? 'text area' : 'text field'
    const valHint = value
      ? (inputType === 'password' ? 'has a value' : `current value: ${value}`)
      : (placeholder ? `placeholder: ${placeholder}` : 'empty')
    const parts = [label, typeHint, valHint].filter(Boolean)
    srSpeak(parts.join(', '))
    return
  }

  const text =
    el.getAttribute('data-speak') ||
    el.getAttribute('aria-label') ||
    (['BUTTON', 'A', 'H1', 'H2', 'H3', 'H4', 'SPAN'].includes(tag)
      ? el.textContent?.trim()
      : '') ||
    ''
  srSpeak(text)
}

// Works for both normal and fixed/sticky elements
function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return false
  const style = getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false
  return true
}

const FOCUSABLE_SEL =
  'a[href]:not([tabindex="-1"]),' +
  'button:not([disabled]):not([tabindex="-1"]),' +
  'input:not([disabled]):not([tabindex="-1"]),' +
  'select:not([disabled]):not([tabindex="-1"]),' +
  'textarea:not([disabled]):not([tabindex="-1"]),' +
  '[tabindex]:not([tabindex="-1"]):not([disabled])'

// While a modal is open, arrows stay inside it instead of wandering behind it
function navScope(): ParentNode {
  const modals = document.querySelectorAll<HTMLElement>('[aria-modal="true"]')
  return modals.length ? modals[modals.length - 1] : document
}

// The accessibility bar (screen reader / voice toggles) has its own shortcuts
// (F2), so arrow navigation skips it; Tab and mouse still reach it.
function isA11yBarEl(el: HTMLElement): boolean {
  return !!el.closest('[data-a11y-bar]')
}

// Every visible focusable element, in DOM (reading) order
function getAllFocusable(): HTMLElement[] {
  return Array.from(navScope().querySelectorAll<HTMLElement>(FOCUSABLE_SEL))
    .filter(el => isVisible(el) && !isA11yBarEl(el))
}

function moveTo(el: HTMLElement | null) {
  if (!el) return
  window.__remoteNavFocusing = true
  el.focus({ preventScroll: true })
  // 'nearest' is a no-op when already fully visible, and also reveals elements
  // clipped inside inner scroll areas (lists, panels). The sticky navbar is
  // accounted for by `scroll-padding-top` on <html>.
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  readEl(el)
  setTimeout(() => { window.__remoteNavFocusing = false }, 250)
}

type Dir = 'up' | 'down' | 'left' | 'right'

// Whether an arrow key should leave a text field rather than move its caret:
// only once the caret is already at the edge in that direction.
function caretAtEdge(el: HTMLInputElement | HTMLTextAreaElement, dir: Dir): boolean {
  if (el.readOnly) return true
  let start: number | null, end: number | null
  try { start = el.selectionStart; end = el.selectionEnd } catch { return true }
  // Types like email/number expose no caret position — treat as always at the edge
  if (start == null || end == null) return true
  if (start !== end) return false
  const v = el.value
  if (dir === 'left') return start === 0
  if (dir === 'right') return start === v.length
  if (dir === 'up') return !v.slice(0, start).includes('\n')
  return !v.slice(start).includes('\n')
}

// Spatial scoring: strict "beam" prioritization.
// Elements almost perfectly aligned on the primary axis beat distant but
// slightly-off-axis elements. Uses a "sector" check: reject anything whose
// perpendicular offset is more than 3× the primary-axis distance — keeps
// navigation feeling like moving in a straight line.
function spatialFind(
  active: HTMLElement,
  dir: Dir,
  candidates: HTMLElement[],
  strict = true,
): HTMLElement | null {
  const ar = active.getBoundingClientRect()
  const ax = ar.left + ar.width / 2
  const ay = ar.top + ar.height / 2

  type Scored = { el: HTMLElement; score: number }
  const scored: Scored[] = []

  for (const el of candidates) {
    if (el === active) continue
    const r = el.getBoundingClientRect()
    const rx = r.left + r.width / 2
    const ry = r.top + r.height / 2
    const dx = rx - ax
    const dy = ry - ay

    const inDir =
      (dir === 'up'    && dy < -2) ||
      (dir === 'down'  && dy > 2)  ||
      (dir === 'left'  && dx < -2) ||
      (dir === 'right' && dx > 2)
    if (!inDir) continue

    const primary   = (dir === 'up' || dir === 'down') ? Math.abs(dy) : Math.abs(dx)
    const perp      = (dir === 'up' || dir === 'down') ? Math.abs(dx) : Math.abs(dy)

    // Sector gate: discard elements that are mostly sideways
    if (strict && perp > primary * 3) continue

    // Score: primary distance + heavy penalty for perpendicular drift
    const score = primary + perp * 5
    scored.push({ el, score })
  }

  if (!scored.length) return null
  return scored.reduce((best, s) => s.score < best.score ? s : best).el
}

// Never a dead end: straight-line match first, then anything in that direction,
// then the next/previous element in reading order (wrapping around). Walking
// reading order alone visits every element, so everything stays reachable.
function findNext(active: HTMLElement, dir: Dir, all: HTMLElement[]): HTMLElement | null {
  const hit = spatialFind(active, dir, all) ?? spatialFind(active, dir, all, false)
  if (hit) return hit
  if (!all.length) return null
  const i = all.indexOf(active)
  const forward = dir === 'down' || dir === 'right'
  if (i === -1) return forward ? all[0] : all[all.length - 1]
  return all[(i + (forward ? 1 : -1) + all.length) % all.length]
}

// ── key-repeat throttle ───────────────────────────────────────────────────────

let _lastNavAt = 0
const NAV_THROTTLE_MS = 120 // min ms between arrow-key moves

// ── hook ─────────────────────────────────────────────────────────────────────

export function useRemoteControl() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      const active = document.activeElement as HTMLElement
      if (!active) return

      if (!ARROWS.includes(e.key)) return
      if (e.defaultPrevented) return

      const tag = active.tagName
      const inputType = (active as HTMLInputElement).type?.toLowerCase()
      const dirMap: Record<string, Dir> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      }
      const dir = dirMap[e.key]

      // ── Radio buttons: browser cycles the group natively; just speak result ─
      if (tag === 'INPUT' && inputType === 'radio') {
        setTimeout(() => {
          const name = (active as HTMLInputElement).name
          const checked = document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)
          if (checked) {
            const lbl = document.querySelector<HTMLLabelElement>(`label[for="${checked.id}"]`)
            srSpeak(lbl?.textContent?.trim() || checked.value)
          }
        }, 50)
        return
      }

      // ── SELECT: ↑↓ changes option natively; speak result. At the first/last
      //    option ↑/↓ leaves the dropdown instead. ←→ = spatial nav ──────────
      if (tag === 'SELECT' && (dir === 'up' || dir === 'down')) {
        const sel = active as HTMLSelectElement
        const atEdge = dir === 'up' ? sel.selectedIndex <= 0 : sel.selectedIndex >= sel.options.length - 1
        if (!atEdge) {
          setTimeout(() => srSpeak(sel.options[sel.selectedIndex]?.text || ''), 50)
          return
        }
      }

      // ── Text fields: arrows move the caret until it reaches the edge, then
      //    the next press leaves the field ────────────────────────────────────
      if (tag === 'TEXTAREA' || (tag === 'INPUT' && (dir === 'left' || dir === 'right'))) {
        if (!caretAtEdge(active as HTMLInputElement | HTMLTextAreaElement, dir)) return
      }

      // ── Throttle key-repeat ───────────────────────────────────────────────
      const now = Date.now()
      if (now - _lastNavAt < NAV_THROTTLE_MS) { e.preventDefault(); return }
      _lastNavAt = now

      const all = getAllFocusable()

      // ── Body / invisible / outside an open modal — jump to first content ──
      const scope = navScope()
      if (active === document.body || !isVisible(active) || (scope !== document && !(scope as HTMLElement).contains(active))) {
        e.preventDefault()
        const first = all.find(el => !el.closest('[data-nav-zone="navbar"]')) || all[0]
        moveTo(first)
        return
      }

      e.preventDefault()

      // ── Navbar: a fixed, predictable path instead of spatial guessing ───────
      //    ←/→ step through the bar in reading order (logo, links, bell, account),
      //    ↑ from the page lands on the current page's link ("↑ reach nav bar"),
      //    ↓ from the bar returns to the page.
      const navbar = document.querySelector<HTMLElement>('[data-nav-zone="navbar"]')
      if (navbar && scope === document) {
        const inBar = (el: HTMLElement) => navbar.contains(el)
        const barItems = all.filter(inBar)
        if (inBar(active)) {
          if (dir === 'left' || dir === 'right') {
            const i = barItems.indexOf(active)
            const next = barItems[i + (dir === 'right' ? 1 : -1)]
            // at either end, stay put and repeat where we are
            moveTo(next ?? active)
            return
          }
          if (dir === 'down') {
            const content = all.filter(el => !inBar(el))
            moveTo(spatialFind(active, 'down', content) ?? spatialFind(active, 'down', content, false) ?? content[0] ?? active)
            return
          }
        } else if (dir === 'up') {
          const target = findNext(active, dir, all)
          if (target && inBar(target)) {
            // on phones the links are behind the menu button, so fall back to the spatial pick
            const current = barItems.find(el => el.getAttribute('aria-current') === 'page')
            moveTo(current ?? target)
            return
          }
          moveTo(target)
          return
        }
      }

      // ── Spatial move (with fallbacks, see findNext) ─────────────────────────
      moveTo(findNext(active, dir, all))
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
