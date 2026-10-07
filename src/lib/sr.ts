// Built-in screen reader (TTS) + voice input (STT) using Web Speech API

const synth = window.speechSynthesis

// ── Screen Reader (TTS) ───────────────────────────────────────────────────────

let enabled = false
let focusHandler: ((e: FocusEvent) => void) | null = null
let keyHandler: ((e: KeyboardEvent) => void) | null = null
let onToggleCb: ((v: boolean) => void) | null = null

export function speak(text: string, interrupt = true) {
  if (!enabled || !text.trim()) return
  if (interrupt) synth.cancel()
  const utt = new SpeechSynthesisUtterance(text.trim())
  utt.rate = 1.0
  utt.pitch = 1.0
  utt.volume = 1.0
  synth.speak(utt)
}

export function announce(text: string) {
  if (!enabled) return
  synth.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.95
  utt.pitch = 1.05
  synth.speak(utt)
}

export function isEnabled() { return enabled }

export function toggle() {
  enabled = !enabled
  if (enabled) {
    announce('Screen reader on. Use Tab to navigate, Enter to activate, F2 to turn off.')
  } else {
    synth.cancel()
    const utt = new SpeechSynthesisUtterance('Screen reader off.')
    synth.speak(utt)
  }
  onToggleCb?.(enabled)
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
  if (/^h[1-6]$/.test(tag)) return `Heading: ${text}`
  if (tag === 'nav') return 'Navigation menu'
  if (labelText) return `${labelText}: ${text}`
  return text
}

function onFocus(e: FocusEvent) {
  // Skip if universal-remote already spoke this focus event
  if (window.__remoteNavFocusing) return
  const el = e.target as HTMLElement
  if (!el || el.tagName === 'BODY' || el.tagName === 'HTML') return
  const desc = describeElement(el)
  if (desc) speak(desc)
}

// F2 alone toggles the reader: a single key, no combination to hold.
// Not Ctrl: Ctrl is needed for zoom (Ctrl+scroll, Ctrl+plus), copy/paste, and is
// NVDA's own "stop speech" key. F2 is unclaimed by Chrome, Edge, Firefox and NVDA
// (F5 reload, F7 caret browsing, F9 Edge Immersive Reader, F12 DevTools are not),
// and as a non-character key it is allowed as a single-key shortcut (WCAG 2.1.4).
function onToggleKey(e: KeyboardEvent) {
  if (e.key === 'F2' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.repeat) {
    e.preventDefault()
    toggle()
  }
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
  document.addEventListener('keydown', onToggleKey)

  return () => {
    if (focusHandler) document.removeEventListener('focusin', focusHandler)
    if (keyHandler) document.removeEventListener('keyup', keyHandler)
    document.removeEventListener('keydown', onToggleKey)
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
  const utt = new SpeechSynthesisUtterance(text)
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
