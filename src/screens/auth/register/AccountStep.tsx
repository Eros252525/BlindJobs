import { useState, type FormEvent, type RefObject } from 'react'
import { api } from '@/lib/api'
import type { Consent } from '@/lib/documents/legal'
import { normalizeUsername, usernameProblem } from '@/lib/username'
import { focusFirst, missingFields, missingMessage } from '@/lib/validation'
import { AuthShell } from '@/components/auth/AuthShell'
import { ConsentFields, consentMessage, untickedConsent } from '@/components/legal/ConsentFields'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/Spinner'
import { STEPS, type AccountForm } from './steps'

const ERROR_ID = 'reg-app-error'

/** Registration step 1: full name, username, password, and the two consent boxes. No email: many blind applicants have none. */
export function AccountStep({ headingRef, form, consent, onForm, onConsent, onContinue, onBack }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  form: AccountForm; consent: Consent
  onForm: (f: AccountForm) => void; onConsent: (c: Consent) => void
  onContinue: () => void
  /** Back to the sign-in screen. */
  onBack: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())

  const set = (k: keyof AccountForm, v: string) => onForm({ ...form, [k]: v })
  // aria-invalid + a pointer to the error message, only on fields that failed
  const fieldState = (id: string) => ({ invalid: invalid.has(id), describedBy: invalid.has(id) ? ERROR_ID : undefined })
  const badUsername = (message: string) => {
    setInvalid(new Set(['reg-username'])); setError(message)
    document.getElementById('reg-username')?.focus()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    const missing = missingFields([
      { id: 'reg-name', label: 'Full name', value: form.fullName },
      { id: 'reg-username', label: 'Username', value: form.username },
      { id: 'reg-password', label: 'Password', value: form.password },
    ])
    const problem = missing.length ? null : usernameProblem(form.username)
    if (problem) { badUsername(problem); return }
    // consent is checked once the fields are complete, so the error names one thing at a time
    const unticked = missing.length ? [] : untickedConsent('reg-consent', consent)
    setInvalid(new Set([...missing, ...unticked].map(f => f.id)))
    if (missing.length) { setError(missingMessage(missing)); focusFirst(missing); return }
    if (unticked.length) { setError(consentMessage(unticked)); focusFirst(unticked); return }
    setError(''); setLoading(true)
    try {
      // Asked now, not at the end: nobody should answer every question to learn the name is taken
      const name = normalizeUsername(form.username)
      if (await api.usernameAvailable(name)) onContinue()
      else badUsername(`The username ${name} is taken. Choose another one, for example by adding a number.`)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const name = fieldState('reg-name')

  return (
    <AuthShell width="max-w-md" braille showcase="Register as applicant">
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 focus:outline-none">Register as applicant</h1>
      <p className="mt-2 text-gray-700">
        Step 1 of {STEPS.length}. No email needed: you choose a username to sign in with. After this come your skills and work preferences. Your account is created at the end.
      </p>
      <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
        <FormField id="reg-name" label="Full name" required>
          <input id="reg-name" className="input" type="text" autoComplete="name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)}
            aria-invalid={name.invalid} aria-describedby={name.describedBy} />
        </FormField>
        <FormField id="reg-username" label="Username" required>
          <p id="reg-username-help" className="text-sm text-gray-600 mb-2">You type this to sign in. At least 4 letters or numbers, no spaces; for example juan.cruz.</p>
          <input id="reg-username" className="input" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required
            value={form.username} onChange={(e) => set('username', e.target.value)}
            aria-invalid={invalid.has('reg-username')}
            aria-describedby={['reg-username-help', invalid.has('reg-username') ? ERROR_ID : ''].filter(Boolean).join(' ')} />
        </FormField>
        <FormField id="reg-password" label="Password" required>
          <PasswordInput id="reg-password" value={form.password} onChange={(v) => set('password', v)} autoComplete="new-password" {...fieldState('reg-password')} />
        </FormField>

        <ConsentFields idPrefix="reg-consent" role="applicant" value={consent} onChange={onConsent} invalid={invalid} errorId={ERROR_ID} />
        <ErrorMsg id={ERROR_ID} msg={error} />

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70" disabled={loading} aria-busy={loading}>
          {loading ? <><Spinner /><span className="sr-only">Checking your username</span></> : 'Continue'}
        </button>
      </form>
      <button type="button" className="auth-link block mx-auto mt-5" onClick={onBack}>Back to sign in</button>
    </AuthShell>
  )
}
