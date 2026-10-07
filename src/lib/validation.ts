// Required-field checks shared by the registration and profile forms. A field
// marked "(required)" must really be checked, and the error must name what is
// missing (WCAG 3.3.1 Error Identification, 3.3.2 Labels, 3.3.3 Error Suggestion).

export type RequiredField = { id: string; label: string; value: string }

/** The required fields left blank, in form order. */
export function missingFields(fields: RequiredField[]): RequiredField[] {
  return fields.filter(f => !f.value.trim())
}

/** Names each missing field exactly as its label reads, so users can find it. */
export function missingMessage(missing: RequiredField[]): string {
  return `Please fill in: ${missing.map(f => f.label).join(', ')}.`
}

/** Move focus to the first missing field so keyboard and screen-reader users land on it. */
export function focusFirst(missing: RequiredField[]) {
  if (missing.length) document.getElementById(missing[0].id)?.focus()
}
