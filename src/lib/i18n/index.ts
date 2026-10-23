// English and Filipino. Text is written in English in the code, wrapped in t():
//
//   t('Sign in')                       → "Mag-sign in" when Filipino is chosen
//   t('Welcome back, {name}!', { name }) → the {name} is filled in after translating
//
// The English text is the key into the Filipino dictionary (fil.ts); text with no
// entry there shows in English, so a missing translation never breaks a screen.
// A component that shows translated text calls useLang() once, so it redraws when
// the language changes.
//
// Not translated, on purpose: the RAND-36 questions (RAND's wording may not be changed),
// the Privacy Notice and Terms (legal text; a translation needs a lawyer's review), and
// what people type themselves (job posts, messages). Saved values such as skills and
// disability types stay in English in the data and are translated only when shown.
import { useSyncExternalStore } from 'react'
import { FIL } from './fil'

export type Lang = 'en' | 'fil'

const KEY = 'blindjobs.lang'

function load(): Lang {
  try { return localStorage.getItem(KEY) === 'fil' ? 'fil' : 'en' } catch { return 'en' }
}

/** False until the person has picked a language once on this device (the first screen asks). */
export function hasChosenLang(): boolean {
  try { return localStorage.getItem(KEY) !== null } catch { return true }
}

let lang: Lang = load()
const listeners = new Set<() => void>()

// <html lang> tells screen readers which voice and pronunciation to use
const applyToPage = () => { if (typeof document !== 'undefined') document.documentElement.lang = lang === 'fil' ? 'fil' : 'en' }
applyToPage()

export const getLang = () => lang

export function setLang(next: Lang) {
  lang = next
  try { localStorage.setItem(KEY, next) } catch { /* private mode: lasts for this visit */ }
  applyToPage()
  listeners.forEach(f => f())
}

function subscribe(f: () => void) {
  listeners.add(f)
  return () => { listeners.delete(f) }
}

/** The chosen language; calling it makes the component redraw when the language changes. */
export const useLang = () => useSyncExternalStore(subscribe, getLang)

/** `en` in the chosen language, with each {name} filled from `vars`. */
export function t(en: string, vars?: Record<string, string | number>): string {
  const text = lang === 'fil' ? FIL[en] ?? en : en
  return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : text
}

/** The locale for dates and numbers: "Setyembre 18, 2026" in Filipino. */
export const locale = () => (lang === 'fil' ? 'fil-PH' : 'en-PH')

/** The language code for speech, so the built-in reader picks a Filipino voice when there is one. */
export const speechLang = () => (lang === 'fil' ? 'fil-PH' : 'en-US')
