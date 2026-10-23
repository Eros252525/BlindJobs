// Required-field checks shared by the registration and profile forms. A field
// marked "(required)" must really be checked, and the error must name what is
// missing (WCAG 3.3.1 Error Identification, 3.3.2 Labels, 3.3.3 Error Suggestion).
// Labels are passed in already translated (t('First name')), so messages name a
// field exactly as its label reads in the chosen language.
import { t } from '@/lib/i18n'

export type RequiredField = { id: string; label: string; value: string }

/** Longest first, middle or last name accepted, in characters. */
export const NAME_MAX = 50

/** Why a name is not accepted, or null. `label` is the field's name as its label reads. */
export function nameProblem(label: string, value: string | undefined): string | null {
  return (value || '').trim().length > NAME_MAX ? t('{label} can be at most {n} characters.', { label, n: NAME_MAX }) : null
}

/** The required fields left blank, in form order. */
export function missingFields(fields: RequiredField[]): RequiredField[] {
  return fields.filter(f => !f.value.trim())
}

/** Names each missing field exactly as its label reads, so users can find it. */
export function missingMessage(missing: RequiredField[]): string {
  return t('Please fill in: {fields}.', { fields: missing.map(f => f.label).join(', ') })
}

/** Shortest password accepted for a new account or a reset. */
export const PASSWORD_MIN = 8

/** Why a new password is not accepted, or null. */
export function passwordProblem(value: string): string | null {
  return value && value.length < PASSWORD_MIN ? t('Your password needs at least {n} characters.', { n: PASSWORD_MIN }) : null
}

/** Why an email address is not shaped like one (name@example.com), or null; empty is fine (optional fields). */
export function emailProblem(value: string | undefined): string | null {
  const v = (value || '').trim()
  if (!v) return null
  return v.length <= 254 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i.test(v) ? null
    : t('Check the email address. It should look like juan.cruz@gmail.com, with no spaces.')
}

/** Move focus to the first missing field so keyboard and screen-reader users land on it. */
export function focusFirst(missing: RequiredField[]) {
  if (missing.length) document.getElementById(missing[0].id)?.focus()
}
