import type { ReactNode } from 'react'
import { t, useLang } from '@/lib/i18n'

// Visible label with required/optional spelled out in text, not colour or an asterisk.
export function FormField({ id, label, required = false, children }: {
  id: string; label: string; required?: boolean; children: ReactNode
}) {
  useLang()
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label} <span className="font-normal text-gray-600">({required ? t('required') : t('optional')})</span>
      </label>
      {children}
    </div>
  )
}
