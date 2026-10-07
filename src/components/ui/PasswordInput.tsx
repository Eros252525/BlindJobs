import { useState } from 'react'

export function PasswordInput({ id, value, onChange, autoComplete, describedBy, invalid = false }: {
  id: string; value: string; onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'; describedBy?: string; invalid?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input id={id} className="input pr-20" type={visible ? 'text' : 'password'} autoComplete={autoComplete}
        value={value} onChange={(e) => onChange(e.target.value)} required
        aria-invalid={invalid} aria-describedby={describedBy} />
      <button type="button" onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-1.5 right-1.5 min-w-[3.5rem] px-3 rounded-md text-base font-semibold text-[#1a4fa0] hover:bg-blue-50 cursor-pointer">
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
