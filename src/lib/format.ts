import { locale, t } from '@/lib/i18n'

export function initials(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function stageColor(stage: string) {
  if (stage === 'Hired') return 'bg-[#1a4fa0] text-white'
  if (stage === 'Rejected') return 'bg-red-700 text-white'
  if (stage === 'Interviewing') return 'bg-yellow-100 text-yellow-700'
  return 'bg-blue-100 text-blue-700'
}

/** "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago", then the date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const minutes = Math.floor((now - then) / 60_000)
  if (minutes < 1) return t('just now')
  if (minutes < 60) return t(minutes === 1 ? '{n} minute ago' : '{n} minutes ago', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t(hours === 1 ? '{n} hour ago' : '{n} hours ago', { n: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return t('yesterday')
  if (days < 30) return t('{n} days ago', { n: days })
  return formatDate(iso)
}

// One date style everywhere: "September 18, 2026", with the time after it when
// the time matters. Never "9/18/2026", which reads differently from country to country.

/** "September 18, 2026". */
export const formatDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(locale(), { dateStyle: 'long' })
}

/** "September 18, 2026 at 3:05 PM": for a tooltip or a screen reader beside a "3 hours ago", and for messages. */
export const fullDateTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(locale(), { dateStyle: 'long', timeStyle: 'short' })
}

/**
 * A salary as employers typed it, written one way: "₱20,000", "₱17,000–21,000".
 * Employers type "20000", "17,000-21,000" or "13000 to 18000"; numbers get commas
 * and a range gets one dash. Words ("Negotiable") are left as they are.
 */
export function formatSalary(raw: string | null | undefined): string {
  const s = (raw || '').trim().replace(/^(₱|php\b|p(?=\d))\s*/i, '')
  if (!s) return ''
  const withCommas = s.replace(/\d[\d,]*(\.\d+)?/g, n => {
    const v = Number(n.replace(/,/g, ''))
    return Number.isFinite(v) ? v.toLocaleString('en-PH', { maximumFractionDigits: 2 }) : n
  })
  const ranged = withCommas.replace(/(\d)\s*(?:-|–|—|\bto\b)\s*(?=\d)/g, '$1–')
  return /^\d/.test(ranged) ? `₱${ranged}` : ranged
}
