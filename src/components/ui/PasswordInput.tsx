import { useState } from 'react'
import { t, useLang } from '@/lib/i18n'

export function PasswordInput({ id, value, onChange, autoComplete, describedBy, invalid = false }: {
  id: string; value: string; onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'; describedBy?: string; invalid?: boolean
}) {
  useLang()
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input id={id} className="input pr-20" type={visible ? 'text' : 'password'} autoComplete={autoComplete}
        value={value} onChange={(e) => onChange(e.target.value)} required
        aria-invalid={invalid} aria-describedby={describedBy} />
      <button type="button" onClick={() => setVisible(v => !v)}
        aria-label={visible ? t('Hide password') : t('Show password')}
        className="absolute inset-y-1.5 right-1.5 min-w-[3.5rem] px-3 rounded-md text-base font-semibold text-[#1a4fa0] hover:bg-blue-50 cursor-pointer">
        {visible ? t('Hide') : t('Show')}
      </button>
    </div>
  )
}
