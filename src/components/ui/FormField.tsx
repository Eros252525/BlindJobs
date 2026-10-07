import type { ReactNode } from 'react'

// Visible label with required/optional spelled out in text, not colour or an asterisk.
export function FormField({ id, label, required = false, children }: {
  id: string; label: string; required?: boolean; children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label} <span className="font-normal text-gray-600">({required ? 'required' : 'optional'})</span>
      </label>
      {children}
    </div>
  )
}
