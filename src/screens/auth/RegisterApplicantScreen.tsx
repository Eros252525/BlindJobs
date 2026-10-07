import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { focusFirst, missingFields, missingMessage } from '@/lib/validation'
import { AuthShell } from '@/components/auth/AuthShell'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { GmailUsernameInput } from '@/components/ui/GmailUsernameInput'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/Spinner'
import type { User } from '@/types'

const ERROR_ID = 'reg-app-error'

export function RegisterApplicantScreen({ onLogin, onBack }: { onLogin: (u: User) => void; onBack: () => void }) {
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', suffix: '', emailUsername: '', mobile: '', gender: '', disabilityType: 'Legally Blind', password: '' })
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  // aria-invalid + a pointer to the error message, only on fields that failed
  const fieldState = (id: string) => ({ invalid: invalid.has(id), describedBy: invalid.has(id) ? ERROR_ID : undefined })

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    // Same required set as the profile screen, so the two never disagree.
    const missing = missingFields([
      { id: 'reg-first', label: 'First name', value: form.firstName },
      { id: 'reg-last', label: 'Last name', value: form.lastName },
      { id: 'reg-email', label: 'Gmail username', value: form.emailUsername },
      { id: 'reg-mobile', label: 'Mobile number', value: form.mobile },
      { id: 'reg-disability', label: 'Disability type', value: form.disabilityType },
      { id: 'reg-password', label: 'Password', value: form.password },
    ])
    setInvalid(new Set(missing.map(f => f.id)))
    if (missing.length) { setError(missingMessage(missing)); focusFirst(missing); return }
    if (!agreed) { setError('You must agree to the Terms and Conditions'); document.getElementById('reg-terms')?.focus(); return }
    setError(''); setLoading(true)
    try {
      const user = await api.register({ role: 'applicant', ...form })
      onLogin(user)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const first = fieldState('reg-first'), last = fieldState('reg-last'), mobile = fieldState('reg-mobile'), disability = fieldState('reg-disability')

  return (
    <AuthShell width="max-w-md" braille showcase="Register as applicant">
      <h1 className="text-3xl font-bold text-gray-900">Register as applicant</h1>
      <form className="mt-6 space-y-5" onSubmit={handleRegister} noValidate>
        <FormField id="reg-first" label="First name" required>
          <input id="reg-first" className="input" type="text" autoComplete="given-name" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
            aria-invalid={first.invalid} aria-describedby={first.describedBy} />
        </FormField>
        <FormField id="reg-middle" label="Middle name">
          <input id="reg-middle" className="input" type="text" autoComplete="additional-name" value={form.middleName} onChange={(e) => set('middleName', e.target.value)} />
        </FormField>
        <FormField id="reg-last" label="Last name" required>
          <input id="reg-last" className="input" type="text" autoComplete="family-name" required value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
            aria-invalid={last.invalid} aria-describedby={last.describedBy} />
        </FormField>
        <FormField id="reg-suffix" label="Suffix, e.g. Jr or III">
          <input id="reg-suffix" className="input" type="text" autoComplete="honorific-suffix" value={form.suffix} onChange={(e) => set('suffix', e.target.value)} />
        </FormField>
        <FormField id="reg-email" label="Gmail username" required>
          <GmailUsernameInput id="reg-email" value={form.emailUsername} onChange={(v) => set('emailUsername', v)} {...fieldState('reg-email')} />
        </FormField>
        <FormField id="reg-mobile" label="Mobile number" required>
          <input id="reg-mobile" className="input" type="tel" autoComplete="tel" required value={form.mobile} onChange={(e) => set('mobile', e.target.value)}
            aria-invalid={mobile.invalid} aria-describedby={mobile.describedBy} />
        </FormField>
        <FormField id="reg-gender" label="Gender">
          <select id="reg-gender" className="input" autoComplete="sex" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option>
          </select>
        </FormField>
        <FormField id="reg-disability" label="Disability type" required>
          <select id="reg-disability" className="input" required value={form.disabilityType} onChange={(e) => set('disabilityType', e.target.value)}
            aria-invalid={disability.invalid} aria-describedby={disability.describedBy}>
            <option value="">Select disability type</option><option>Legally Blind</option><option>Partially Blind</option><option>Totally Blind</option>
          </select>
        </FormField>
        <FormField id="reg-password" label="Password" required>
          <PasswordInput id="reg-password" value={form.password} onChange={(v) => set('password', v)} autoComplete="new-password" {...fieldState('reg-password')} />
        </FormField>

        {/* No Terms page exists yet, so this is plain text rather than a link that goes nowhere. */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input id="reg-terms" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required
            className="w-6 h-6 shrink-0 accent-[#1a4fa0]" />
          <span className="text-gray-800">I agree to the Terms and Conditions.</span>
        </label>
        <ErrorMsg id={ERROR_ID} msg={error} />

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70" disabled={loading} aria-busy={loading}>
          {loading ? <><Spinner /><span className="sr-only">Creating your account</span></> : 'Complete registration'}
        </button>
      </form>
      <button type="button" className="auth-link block mx-auto mt-5" onClick={onBack}>Back to sign in</button>
    </AuthShell>
  )
}
