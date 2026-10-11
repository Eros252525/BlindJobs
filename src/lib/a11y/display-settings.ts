// Display settings for low-vision users: text size, font, colour theme, spacing
// and heavier text. Applied as attributes on <html> (styled in styles/themes.css)
// and saved on this device.
//
// Choices are grounded in low-vision research:
// - Atkinson Hyperlegible (Braille Institute) is designed so letters stay distinct
//   when blurred; Lexend widens letters for reading fluency; Verdana is a large,
//   open system font. APHont is excluded: its licence requires per-user certification.
// - Dark mode helps readers with cloudy media (cataract) but not central field loss,
//   so it is a choice, not a default. Dark uses off-white on dark grey, not pure
//   white on black, to avoid halation.
// - Yellow-on-black and black-on-white are the standard low-vision high-contrast pairs.
// - 150% ≈ 18pt, the threshold for large print.
import { useCallback, useState } from 'react'

export type FontChoice = 'system' | 'atkinson' | 'lexend' | 'verdana'
export type ThemeChoice = 'standard' | 'dark' | 'contrast-light' | 'contrast-dark'
export type SpacingChoice = 'normal' | 'wide'

export interface DisplaySettings {
  size: number
  font: FontChoice
  theme: ThemeChoice
  spacing: SpacingChoice
  bold: boolean
}

export const DEFAULT_DISPLAY: DisplaySettings = { size: 100, font: 'system', theme: 'standard', spacing: 'normal', bold: false }

export const TEXT_SIZES: { value: number; label: string }[] = [
  { value: 100, label: '100% (default)' },
  { value: 125, label: '125%' },
  { value: 150, label: '150% (large print)' },
  { value: 175, label: '175%' },
  { value: 200, label: '200%' },
]

export const FONTS: { value: FontChoice; label: string; hint: string; family?: string; google?: string }[] = [
  { value: 'system', label: 'Standard', hint: 'The font your device normally uses.' },
  {
    value: 'atkinson', label: 'Atkinson Hyperlegible',
    hint: 'Made by the Braille Institute for low vision. Every letter is shaped to stay distinct.',
    family: "'Atkinson Hyperlegible Next', Verdana, sans-serif",
    google: 'Atkinson+Hyperlegible+Next:wght@400;500;600;700;800',
  },
  {
    value: 'lexend', label: 'Lexend',
    hint: 'Wider letters and spacing for smoother reading.',
    family: "'Lexend', Verdana, sans-serif",
    google: 'Lexend:wght@400;500;600;700;800',
  },
  { value: 'verdana', label: 'Verdana', hint: 'Large, open letters. Built into Windows, nothing to download.', family: "Verdana, Tahoma, 'DejaVu Sans', sans-serif" },
]

export const THEMES: { value: ThemeChoice; label: string; hint: string; swatch: { bg: string; fg: string } }[] = [
  { value: 'standard', label: 'Standard', hint: 'Blue and white.', swatch: { bg: '#ffffff', fg: '#1a4fa0' } },
  { value: 'dark', label: 'Dark', hint: 'Soft light text on dark grey. Can ease glare and help with cataracts.', swatch: { bg: '#1b2433', fg: '#eef2f7' } },
  { value: 'contrast-light', label: 'High contrast: black on white', hint: 'Pure black text and thick outlines.', swatch: { bg: '#ffffff', fg: '#000000' } },
  { value: 'contrast-dark', label: 'High contrast: yellow on black', hint: 'Bright yellow on black, a common low-vision choice.', swatch: { bg: '#000000', fg: '#ffff00' } },
]

export const SPACINGS: { value: SpacingChoice; label: string; hint: string }[] = [
  { value: 'normal', label: 'Normal', hint: 'Standard spacing.' },
  { value: 'wide', label: 'Wider', hint: 'More space between letters, words and lines.' },
]

const KEY = 'bj-display-settings'

export function loadDisplaySettings(): DisplaySettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw || typeof raw !== 'object') return DEFAULT_DISPLAY
    return {
      size: TEXT_SIZES.some(s => s.value === raw.size) ? raw.size : DEFAULT_DISPLAY.size,
      font: FONTS.some(f => f.value === raw.font) ? raw.font : DEFAULT_DISPLAY.font,
      theme: THEMES.some(t => t.value === raw.theme) ? raw.theme : DEFAULT_DISPLAY.theme,
      spacing: SPACINGS.some(s => s.value === raw.spacing) ? raw.spacing : DEFAULT_DISPLAY.spacing,
      bold: raw.bold === true,
    }
  } catch {
    return DEFAULT_DISPLAY
  }
}

function saveDisplaySettings(s: DisplaySettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode: settings last for this visit */ }
}

// Web fonts are fetched only when chosen (or previewed), not on every page load.
const requested = new Set<FontChoice>()
export function loadFont(font: FontChoice) {
  const f = FONTS.find(x => x.value === font)
  if (!f?.google || requested.has(font)) return
  requested.add(font)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`
  document.head.appendChild(link)
}

export function applyDisplaySettings(s: DisplaySettings) {
  const root = document.documentElement
  // percentage of the browser's own default, so a user's browser setting still counts
  root.style.fontSize = s.size === DEFAULT_DISPLAY.size ? '' : `${s.size}%`
  root.dataset.size = String(s.size)
  root.dataset.textLarge = s.size >= 150 ? 'on' : 'off'
  root.dataset.font = s.font
  root.dataset.theme = s.theme
  root.dataset.spacing = s.spacing
  root.dataset.bold = s.bold ? 'on' : 'off'
  loadFont(s.font)
}

export function useDisplaySettings() {
  const [settings, setSettings] = useState(loadDisplaySettings)
  const update = useCallback((patch: Partial<DisplaySettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      applyDisplaySettings(next)
      saveDisplaySettings(next)
      return next
    })
  }, [])
  return [settings, update] as const
}

// Lets any control (e.g. the account menu) open the dialog owned by the accessibility bar.
const OPEN_EVENT = 'bj:open-display-settings'
export const openDisplaySettings = () => window.dispatchEvent(new Event(OPEN_EVENT))
export function onOpenDisplaySettings(cb: () => void) {
  window.addEventListener(OPEN_EVENT, cb)
  return () => window.removeEventListener(OPEN_EVENT, cb)
}
