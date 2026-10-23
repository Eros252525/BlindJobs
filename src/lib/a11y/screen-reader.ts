// Built-in screen reader (TTS) + voice input (STT) using Web Speech API

declare global {
  interface Window {
    /** Set while code moves focus and announces the place itself, so the focus is not spoken twice. */
    __quietFocus?: boolean
  }
}

import { speechLang, t } from '@/lib/i18n'

const synth = window.speechSynthesis

// Every line is spoken in the page's language, so a Filipino voice is used when the
// device has one; without one the browser reads Filipino with its default voice.
function utter(text: string) {
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = speechLang()
  return utt
}

// ── Screen Reader (TTS) ───────────────────────────────────────────────────────

let enabled = false
let focusHandler: ((e: FocusEvent) => void) | null = null
let keyHandler: ((e: KeyboardEvent) => void) | null = null
let onToggleCb: ((v: boolean) => void) | null = null

export function speak(text: string, interrupt = true) {
  if (!enabled || !text.trim()) return
  if (interrupt) synth.cancel()
  const utt = utter(text.trim())
  utt.rate = 1.0
  utt.pitch = 1.0
  utt.volume = 1.0
  synth.speak(utt)
}

export function announce(text: string) {
  if (!enabled) return
  synth.cancel()
  const utt = utter(text)
  utt.rate = 0.95
  utt.pitch = 1.05
  synth.speak(utt)
}

export function isEnabled() { return enabled }

// The reader starts on for everyone; pressing 2 (mute) or F2 turns it off, and that
// choice is remembered so a reload doesn't read the whole page again.
const MUTED_KEY = 'blindjobs.screenReaderMuted'

function loadMuted() {
  try { return localStorage.getItem(MUTED_KEY) === '1' } catch { return false }
}

function saveMuted(muted: boolean) {
  try { localStorage.setItem(MUTED_KEY, muted ? '1' : '0') } catch { /* private mode: lasts for this visit */ }
}

function setEnabled(on: boolean, offMessage = t('Screen reader off. Press F2 to turn it back on.')) {
  enabled = on
  saveMuted(!on)
  onToggleCb?.(enabled)
  if (on) {
    readScreen(t('Screen reader on.'))
  } else {
    choiceOpen = false
    synth.cancel()
    synth.speak(utter(offMessage))
  }
}

export function toggle() { setEnabled(!enabled) }

// ── Read the whole screen ─────────────────────────────────────────────────────

const prompt = () => t('End of page. To hear this page again, press 1. To mute the screen reader, press 2. Use Tab to move between items. Press F2 at any time to turn the screen reader on or off.')

// After a full read, 1 (repeat) and 2 (mute) are live until the user does anything
// else, so the digits stay free for typing and for other shortcuts (WCAG 2.1.4).
let choiceOpen = false
// Chrome and Edge refuse speech until the user has pressed a key or clicked, so a
// read blocked at page load waits for that first gesture and starts then.
let waitingForGesture = false
let pendingIntro = ''

const SKIP = 'script, style, noscript, template, [hidden], [aria-hidden="true"], .skip-link'
const CONTROL = 'a[href], button, input, select, textarea, summary, [role="button"], [role="link"]'

/** The visible page as lines of speech, in reading order; controls are described like on focus. */
function pageLines(): string[] {
  const lines: string[] = []
  let line = ''
  const flush = () => {
    const text = line.replace(/\s+/g, ' ').trim()
    if (text) lines.push(text)
    line = ''
  }
  const say = (text: string | null | undefined) => {
    flush()
    line = text || ''
    flush()
  }

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) { line += ` ${node.textContent ?? ''}`; return }
    if (!(node instanceof Element) || node.matches(SKIP)) return
    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return

    if (node instanceof HTMLElement && node.matches(CONTROL)) {
      if ((node as HTMLInputElement).type !== 'hidden') say(describeElement(node))
      return
    }
    if (node instanceof HTMLImageElement) { if (node.alt) say(node.alt); return }
    if (node.getAttribute('role') === 'img') { say(node.getAttribute('aria-label')); return }
    if (node instanceof HTMLLabelElement) {
      // Its control already speaks the label text, so don't read it twice
      if (node.htmlFor) return
      const inner = node.querySelectorAll<HTMLElement>(CONTROL)
      if (inner.length) { inner.forEach(c => say(describeElement(c))); return }
    }
    if (node.tagName === 'BR') { flush(); return }

    const block = !style.display.startsWith('inline')
    if (block) flush()
    node.childNodes.forEach(visit)
    if (block) flush()
  }

  visit(document.body)
  flush()
  return lines
}

// A screen can hand over its own spoken script (e.g. the intro's tutorial) to read
// in place of the raw page text; it clears it again when it unmounts.
let script: string[] | null = null

export function setScreenScript(lines: string[] | null) {
  script = lines
}

/** Reads everything on screen, then offers 1 to repeat and 2 to mute. */
export function readScreen(intro = '') {
  if (!enabled) return
  synth.cancel()
  choiceOpen = true
  const parts = [intro, ...(script ?? pageLines()), prompt()].filter(Boolean)
  parts.forEach((text, i) => {
    const utt = utter(text)
    if (i === 0) {
      utt.onerror = (e) => {
        if (e.error === 'not-allowed') { waitingForGesture = true; pendingIntro = intro }
      }
    }
    synth.speak(utt)
  })
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  if (el.tagName !== 'INPUT') return false
  const type = (el as HTMLInputElement).type
  return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file'].includes(type)
}

function startAfterGesture() {
  waitingForGesture = false
  readScreen(pendingIntro)
}

function onPointerDown() {
  choiceOpen = false
  if (waitingForGesture) startAfterGesture()
}

function describeElement(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label')
  if (aria) return aria

  const id = el.id
  const forLabel = id ? document.querySelector<HTMLLabelElement>(`label[for="${id}"]`) : null
  const wrapLabel = el.closest<HTMLLabelElement>('label')
  const labelText = (forLabel || wrapLabel)?.textContent?.trim()

  const tag = el.tagName.toLowerCase()
  const role = el.getAttribute('role')
  const type = (el as HTMLInputElement).type?.toLowerCase()
  const text = el.textContent?.replace(/\s+/g, ' ').trim() || ''
  const placeholder = (el as HTMLInputElement).placeholder || ''
  const value = (el as HTMLInputElement).value || ''

  if (tag === 'input' && (type === 'radio' || type === 'checkbox')) {
    const name = el.getAttribute('aria-labelledby')
      ? document.getElementById(el.getAttribute('aria-labelledby')!)?.textContent?.trim()
      : labelText
    const checked = (el as HTMLInputElement).checked
    return `${name || 'Option'}, ${type === 'radio' ? 'radio button' : 'check box'}, ${checked ? 'checked' : 'not checked'}`
  }

  if (tag === 'input' || tag === 'textarea') {
    const fieldName = labelText || placeholder || 'Input field'
    const typeHint = type === 'password' ? 'password field' : type === 'number' ? 'number field' : tag === 'textarea' ? 'text area' : 'text field'
    const val = value ? `current value: ${type === 'password' ? 'hidden' : value}` : 'empty'
    return `${fieldName}, ${typeHint}, ${val}. ${voiceEnabled ? 'Speak to dictate.' : ''}`
  }

  if (tag === 'select') {
    const sel = el as HTMLSelectElement
    const selected = sel.options[sel.selectedIndex]?.text || ''
    return `${labelText || 'Dropdown'}, ${selected} selected`
  }

  if (tag === 'button' || role === 'button') return `Button: ${text || labelText || 'Button'}`
  if (tag === 'a') return `Link: ${text || labelText}`
  if (tag === 'summary') return `${text}, ${(el.parentElement as HTMLDetailsElement | null)?.open ? 'expanded' : 'collapsed'}. Press Enter to ${(el.parentElement as HTMLDetailsElement | null)?.open ? 'close' : 'open'}.`
  if (/^h[1-6]$/.test(tag)) return `Heading: ${text}`
  if (tag === 'nav') return 'Navigation menu'
  if (labelText) return `${labelText}: ${text}`
  return text
}

/**
 * The question a radio button or check box answers: its group's <legend>, given
 * only when focus arrives from outside the group, so it is heard once and not
 * again for every option.
 */
export function groupQuestion(el: HTMLElement, from: Element | null): string {
  const type = (el as HTMLInputElement).type?.toLowerCase()
  if (el.tagName !== 'INPUT' || (type !== 'radio' && type !== 'checkbox')) return ''
  const group = el.closest('fieldset')
  if (!group || (from && group.contains(from))) return ''
  return group.querySelector('legend')?.textContent?.replace(/\s+/g, ' ').trim() || ''
}

function onFocus(e: FocusEvent) {
  // Skip focus moves whose place was already announced (screen changes, form steps)
  if (window.__quietFocus) return
  const el = e.target as HTMLElement
  if (!el || el.tagName === 'BODY' || el.tagName === 'HTML') return
  const desc = describeElement(el)
  const question = groupQuestion(el, e.relatedTarget as Element | null)
  if (desc) speak(question ? `${question}. ${desc}` : desc)
}

// F2 alone toggles the reader: a single key, no combination to hold.
// Not Ctrl: Ctrl is needed for zoom (Ctrl+scroll, Ctrl+plus), copy/paste, and is
// NVDA's own "stop speech" key. F2 is unclaimed by Chrome, Edge, Firefox and NVDA
// (F5 reload, F7 caret browsing, F9 Edge Immersive Reader, F12 DevTools are not),
// and as a non-character key it is allowed as a single-key shortcut (WCAG 2.1.4).
function onKeyDown(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return

  // Speech was blocked at load: this first key press starts the reading instead of
  // doing its usual job, except while typing in a field.
  if (waitingForGesture && enabled && !isTyping(e.target)) {
    e.preventDefault()
    startAfterGesture()
    return
  }

  if (e.key === 'F2' && !e.shiftKey) {
    e.preventDefault()
    toggle()
    return
  }

  if (choiceOpen && enabled && !e.shiftKey && !isTyping(e.target)) {
    if (e.key === '1') { e.preventDefault(); readScreen(); return }
    if (e.key === '2') { e.preventDefault(); setEnabled(false, t('Screen reader muted. Press F2 to turn it back on.')); return }
  }
  choiceOpen = false
}

function onKey(e: KeyboardEvent) {
  if (e.type !== 'keyup') return
  if (!enabled) return

  if (e.key === 'Enter') {
    const el = document.activeElement as HTMLElement
    if (el) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'button' || el.getAttribute('role') === 'button') {
        speak(`Activating: ${el.textContent?.trim() || 'button'}`)
      }
    }
  }
}

export function init(cb: (v: boolean) => void) {
  onToggleCb = cb
  focusHandler = onFocus
  keyHandler = onKey

  document.addEventListener('focusin', focusHandler)
  document.addEventListener('keyup', keyHandler)
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('pointerdown', onPointerDown)

  // On from the start unless the user muted it last time; give the screen a moment
  // to load its data before reading it.
  enabled = !loadMuted()
  cb(enabled)
  // People who already use NVDA, JAWS or TalkBack would hear two voices at once, so
  // the first thing said is how to mute this one (2 works straight away)
  const start = enabled ? window.setTimeout(() => readScreen(t('Welcome to Blind Jobs. If you already use your own screen reader, such as NVDA or TalkBack, press 2 now to mute this one.')), 1000) : 0

  return () => {
    window.clearTimeout(start)
    if (focusHandler) document.removeEventListener('focusin', focusHandler)
    if (keyHandler) document.removeEventListener('keyup', keyHandler)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('pointerdown', onPointerDown)
    synth.cancel()
    if (voiceEnabled) recognition?.stop()
  }
}

// ── Voice Input (STT) ─────────────────────────────────────────────────────────

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : any

let recognition: SpeechRecognitionType | null = null
let voiceEnabled = false
let onCommandCb: ((cmd: string) => void) | null = null
let onVoiceToggleCb: ((v: boolean) => void) | null = null
let voiceSupported = false

// Commands: [pattern, action]
// action prefixed with "nav:" → screen name; "action:" → special action
const COMMANDS: [RegExp, string][] = [
  [/\b(go to |open |navigate to )?(jobs?|job listings?|job list)\b/i, 'nav:jobs'],
  [/\b(go to |open )?(messages?|inbox|chat)\b/i, 'nav:messages'],
  [/\b(go to |open )?my profile\b/i, 'nav:profile'],
  [/\b(go to |open )?profile\b/i, 'nav:profile'],
  [/\b(go to |open )?(my dashboard|home|dashboard)\b/i, 'nav:dashboard'],
  [/\b(log\s?out|sign\s?out)\b/i, 'action:logout'],
  [/\b(go to |open )?(post ?(a )?job|new job)\b/i, 'nav:emp-post-job'],
  [/\b(go to |open )?(applicants?|tracking|board)\b/i, 'nav:emp-applicants'],
  [/\b(go to |open )?(employer\s+)?dashboard\b/i, 'nav:emp-dashboard'],
  [/\b(clear|delete|erase)\s+(field|input|text)\b/i, 'action:clear'],
  [/\b(submit|send|save)\b/i, 'action:submit'],
  [/\bstop\s+(listening|voice|input)\b/i, 'action:stop-voice'],
  [/\bscroll\s+down\b/i, 'action:scroll-down'],
  [/\bscroll\s+up\b/i, 'action:scroll-up'],
]

export function isVoiceSupported() { return voiceSupported }
export function isVoiceEnabled() { return voiceEnabled }

export function initVoice(onCommand: (cmd: string) => void, onToggle: (v: boolean) => void) {
  onCommandCb = onCommand
  onVoiceToggleCb = onToggle

  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRec) {
    console.warn('SpeechRecognition not supported in this browser')
    return
  }

  voiceSupported = true
  recognition = new SpeechRec()
  recognition.continuous = true
  recognition.interimResults = false
  recognition.lang = 'en-US'

  recognition.onresult = (e: any) => {
    const results = Array.from(e.results as SpeechRecognitionResultList)
    const transcript = results
      .slice(e.resultIndex)
      .filter((r: any) => r.isFinal)
      .map((r: any) => r[0].transcript.trim())
      .join(' ')
      .trim()

    if (!transcript) return

    // Check navigation/action commands first
    for (const [pattern, cmd] of COMMANDS) {
      if (pattern.test(transcript)) {
        const label = cmd.replace(/^(nav|action):/, '')
        speakRaw(`${label}`)
        onCommandCb?.(cmd)
        return
      }
    }

    // Otherwise fill focused input/textarea
    const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      if ((active as HTMLInputElement).type === 'password') {
        speakRaw('Cannot dictate into password fields.')
        return
      }
      const prev = active.value
      active.value = prev ? `${prev} ${transcript}` : transcript
      active.dispatchEvent(new Event('input', { bubbles: true }))
      speakRaw(`${transcript}`)
    } else {
      speakRaw(`Heard: ${transcript}. Focus a text field to dictate, or say a command.`)
    }
  }

  recognition.onerror = (e: any) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return
    if (e.error === 'not-allowed') {
      speakRaw('Microphone access denied. Please allow microphone in your browser settings.')
      voiceEnabled = false
      onVoiceToggleCb?.(false)
    }
  }

  recognition.onend = () => {
    // Auto-restart if still enabled (browser stops after silence)
    if (voiceEnabled) {
      try { recognition?.start() } catch { /* already started */ }
    }
  }
}

// speakRaw: speaks even when SR is off (for voice feedback)
function speakRaw(text: string) {
  synth.cancel()
  const utt = utter(text)
  utt.rate = 1.0
  synth.speak(utt)
}

export function toggleVoice() {
  if (!recognition) {
    speakRaw('Voice input is not supported in this browser. Please use Chrome or Edge.')
    return
  }
  voiceEnabled = !voiceEnabled
  if (voiceEnabled) {
    try {
      recognition.start()
      speakRaw('Voice input on. Say a command like go to jobs, or focus a field to dictate. Say stop listening to turn off.')
    } catch {
      // already running
    }
  } else {
    recognition.stop()
    speakRaw('Voice input off.')
  }
  onVoiceToggleCb?.(voiceEnabled)
}
