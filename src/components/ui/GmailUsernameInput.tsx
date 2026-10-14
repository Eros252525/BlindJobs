// "@gmail.com" is appended by the API, so it's shown as a fixed suffix tied to the field.
// Someone who types a full address ("name@yahoo.com") keeps it: the API leaves an
// address with "@" alone, so the suffix steps aside instead of showing a false ending.
export function GmailUsernameInput({ id, value, onChange, describedBy, invalid = false }: {
  id: string; value: string; onChange: (v: string) => void; describedBy?: string; invalid?: boolean
}) {
  const gmail = !value.includes('@')
  return (
    <div className="flex">
      <input id={id} className={`input flex-1 min-w-0 ${gmail ? 'rounded-r-none' : ''}`} type="text" autoComplete="username"
        autoCapitalize="none" spellCheck={false} required value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid} aria-describedby={[gmail ? `${id}-suffix` : '', describedBy].filter(Boolean).join(' ') || undefined} />
      {gmail && <span id={`${id}-suffix`} className="flex items-center px-3 border border-l-0 border-gray-500 rounded-r-md bg-gray-100 text-gray-700">@gmail.com</span>}
    </div>
  )
}
