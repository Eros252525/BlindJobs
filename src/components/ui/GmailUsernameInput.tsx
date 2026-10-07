// "@gmail.com" is appended by the API, so it's shown as a fixed suffix tied to the field.
export function GmailUsernameInput({ id, value, onChange, describedBy, invalid = false }: {
  id: string; value: string; onChange: (v: string) => void; describedBy?: string; invalid?: boolean
}) {
  return (
    <div className="flex">
      <input id={id} className="input rounded-r-none flex-1 min-w-0" type="text" autoComplete="username"
        autoCapitalize="none" spellCheck={false} required value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid} aria-describedby={[`${id}-suffix`, describedBy].filter(Boolean).join(' ')} />
      <span id={`${id}-suffix`} className="flex items-center px-3 border border-l-0 border-gray-500 rounded-r-md bg-gray-100 text-gray-700">@gmail.com</span>
    </div>
  )
}
