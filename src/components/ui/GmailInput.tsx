// The email box for registering: the whole Gmail address is typed, as on any
// other site, and the form checks it with gmailProblem (lib/gmail.ts).
export function GmailInput({ id, value, onChange, describedBy, invalid = false }: {
  id: string; value: string; onChange: (v: string) => void; describedBy?: string; invalid?: boolean
}) {
  return (
    <input id={id} className="input" type="email" inputMode="email" autoComplete="email"
      autoCapitalize="none" spellCheck={false} required placeholder="yourname@gmail.com"
      value={value} onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid} aria-describedby={describedBy} />
  )
}
