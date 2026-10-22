// Applicants sign in with a username they choose, not an email: many blind
// applicants have no email address. Kept simple to type and to say aloud.

/** The username as stored and looked up: trimmed, lower case. */
export const normalizeUsername = (input: string) => (input || '').trim().toLowerCase()

/** Why this cannot be a username, in words to show the user; null when it can be. */
export function usernameProblem(input: string): string | null {
  const name = normalizeUsername(input)
  if (!name) return null // "required" is reported by the form's own check
  if (name.includes('@')) return 'A username is not an email address. Choose a name without @, for example juan.cruz.'
  if (/\s/.test(name)) return 'A username cannot have spaces. Use a period or underscore instead, for example juan.cruz.'
  if (/[^a-z0-9._]/.test(name)) return 'A username can have only letters, numbers, periods and underscores.'
  if (name.length < 4 || name.length > 30) return `A username is 4 to 30 characters long. "${name}" has ${name.length}.`
  if (!/[a-z]/.test(name)) return 'A username needs at least one letter.'
  return null
}
