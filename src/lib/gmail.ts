// Accounts use Gmail addresses only. These are Google's rules for a Gmail
// username, so an address that could never exist is refused before sign-up.
// They check the form of the address, not that the account exists: only an
// email sent to it and answered can prove that.

const SUFFIX = /@(gmail|googlemail)\.com$/

/** What was typed, without a trailing @gmail.com, trimmed and in lower case. */
export function gmailUsername(input: string): string {
  return (input || '').trim().toLowerCase().replace(SUFFIX, '')
}

/** The full address for a typed username or address. */
export const gmailAddress = (input: string) => `${gmailUsername(input)}@gmail.com`

/** Why this is not a whole Gmail address, in words to show the user; null when it is one. */
export function gmailProblem(input: string): string | null {
  const raw = (input || '').trim().toLowerCase()
  if (!raw) return null // "required" is reported by the form's own check
  if (!raw.includes('@')) return `Type your whole Gmail address, for example ${raw.replace(/[^a-z0-9.]/g, '') || 'juan.cruz'}@gmail.com.`
  if (!SUFFIX.test(raw)) return 'Only Gmail addresses can be used. Type an address that ends in @gmail.com.'
  const name = gmailUsername(raw)
  if (/[^a-z0-9.]/.test(name)) return 'A Gmail username has only letters, numbers and periods. Check for spaces or other symbols.'
  if (name.length < 6 || name.length > 30) return `A Gmail username is 6 to 30 characters long. "${name}" has ${name.length}.`
  if (/^\.|\.$|\.\./.test(name)) return 'A Gmail username cannot start or end with a period, or have two periods in a row.'
  return null
}
