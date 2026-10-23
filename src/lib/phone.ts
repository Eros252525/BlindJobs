// Mobile numbers are Philippine mobile numbers only: +63, then 10 digits starting
// with 9 (e.g. +63 917 123 4567). Numbers from other countries, and landlines,
// are refused. People type them many ways, so all of these are accepted:
// 9171234567, 09171234567, 639171234567, +63 917 123 4567, 0917-123-4567.
import { t } from '@/lib/i18n'

/** The 10 digits after +63 ("9171234567"), or null when it is not a Philippine mobile number. */
export function phMobile(input: string | undefined): string | null {
  const raw = (input || '').trim()
  if (!raw || /[^\d\s()+.-]/.test(raw)) return null
  const digits = raw.replace(/\D/g, '')
  const local = raw.startsWith('+') || digits.startsWith('63')
    ? (digits.startsWith('63') ? digits.slice(2) : null)
    : digits.startsWith('0') ? digits.slice(1) : digits
  return local && /^9\d{9}$/.test(local) ? local : null
}

/** Why this is not a Philippine mobile number, in words for the user; null when it is one (or empty). */
export function mobileProblem(input: string | undefined): string | null {
  if (!(input || '').trim()) return null // "required" is reported by the form's own check
  return phMobile(input) ? null
    : t('Enter a Philippine mobile number: 10 digits starting with 9, e.g., 9171234567.')
}

/** "+63 917 123 4567" for a saved number; anything else as it was. */
export function formatMobile(saved: string | undefined): string {
  const n = phMobile(saved)
  return n ? `+63 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : saved || ''
}

/**
 * What the mobile box keeps as the user types or pastes: digits only, at most the
 * 10 after +63. A leading 0 ("0917…") or country code ("+63 917…") is dropped.
 */
export function mobileDigits(typed: string): string {
  let d = typed.replace(/\D/g, '')
  if (d.startsWith('63') && d.length > 10) d = d.slice(2)
  else if (d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}
