import { consentLabel, openLegal, type Consent, type ConsentDocId } from '@/lib/documents/legal'
import { t, useLang } from '@/lib/i18n'
import type { RequiredField } from '@/lib/validation'
import type { Role } from '@/types'

const DOCS: { doc: ConsentDocId; name: string }[] = [
  { doc: 'privacy', name: 'Privacy Notice' },
  { doc: 'terms', name: 'Terms and Conditions' },
]

/** The consent boxes left unticked, in form order (same shape as `missingFields`, so `focusFirst` works). */
export function untickedConsent(idPrefix: string, consent: Consent): RequiredField[] {
  return DOCS.filter(d => !consent[d.doc]).map(d => ({ id: `${idPrefix}-${d.doc}`, label: t(d.name), value: '' }))
}

export function consentMessage(unticked: RequiredField[]): string {
  return t('To create your account, please tick the box for: {docs}.', { docs: unticked.map(f => f.label).join(', ') })
}

// The two boxes a new user must tick, each with a button that opens the full text.
// The button sits beside the label, not inside it: a control nested in a <label>
// would be read as part of the checkbox's name and is invalid HTML.
export function ConsentFields({ idPrefix, role, value, onChange, invalid, errorId }: {
  idPrefix: string; role: Role; value: Consent; onChange: (c: Consent) => void
  invalid: Set<string>; errorId: string
}) {
  useLang()
  return (
    <fieldset className="space-y-2">
      <legend className="field-label">{t('Privacy and terms')} <span className="font-normal text-gray-600">({t('required')})</span></legend>
      {DOCS.map(({ doc, name }) => {
        const id = `${idPrefix}-${doc}`
        const bad = invalid.has(id)
        return (
          <div key={doc}>
            <div className="flex items-start gap-3">
              <input id={id} type="checkbox" required checked={value[doc]}
                onChange={(e) => onChange({ ...value, [doc]: e.target.checked })}
                aria-invalid={bad} aria-describedby={bad ? errorId : undefined}
                className="mt-1 w-6 h-6 shrink-0 accent-[#1a4fa0]" />
              <label htmlFor={id} className="text-gray-800 cursor-pointer">{t(consentLabel(doc, role))}</label>
            </div>
            <button type="button" className="auth-link ml-8" aria-haspopup="dialog" onClick={() => openLegal(doc)}>
              {t('Read the {name}', { name: t(name) })}
            </button>
          </div>
        )
      })}
    </fieldset>
  )
}
