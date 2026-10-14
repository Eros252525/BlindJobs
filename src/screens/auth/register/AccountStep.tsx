import { useState, type FormEvent, type RefObject } from 'react'
import { api } from '@/lib/api'
import type { Consent } from '@/lib/legal'
import { focusFirst, missingFields, missingMessage } from '@/lib/validation'
import { AuthShell } from '@/components/auth/AuthShell'
import { ConsentFields, consentMessage, untickedConsent } from '@/components/legal/ConsentFields'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { GmailUsernameInput } from '@/components/ui/GmailUsernameInput'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/Spinner'
import { REQUIRED_AT_REGISTRATION, STEPS, withGmail, type AccountForm } from './steps'

const ERROR_ID = 'reg-app-error'

/** Registration step 1: full name, email, password, and the two consent boxes. */
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
  const badEmail = (message: string) => {
    setInvalid(new Set(['reg-email'])); setError(message)
    document.getElementById('reg-email')?.focus()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    const emailAddress = withGmail(form.email)
    const missing = missingFields([
      { id: 'reg-name', label: 'Full name', value: form.fullName },
      { id: 'reg-email', label: 'Email', value: form.email },
      { id: 'reg-password', label: 'Password', value: form.password },
    ])
    if (!missing.length && !/^\S+@\S+\.\S+$/.test(emailAddress)) {
      badEmail('That email address is not complete. Type your Gmail username, or a full address such as juan@yahoo.com.')
      return
    }
    // consent is checked once the fields are complete, so the error names one thing at a time
    const unticked = missing.length ? [] : untickedConsent('reg-consent', consent)
    setInvalid(new Set([...missing, ...unticked].map(f => f.id)))
    if (missing.length) { setError(missingMessage(missing)); focusFirst(missing); return }
    if (unticked.length) { setError(consentMessage(unticked)); focusFirst(unticked); return }
    setError(''); setLoading(true)
    try {
      // Asked now, not at the end: nobody should answer every question to learn the email is taken
      if (await api.emailAvailable(emailAddress)) onContinue()
      else badEmail('An account already uses this email. Sign in instead, or use another email.')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const name = fieldState('reg-name')

  return (
    <AuthShell width="max-w-md" braille showcase="Register as applicant">
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 focus:outline-none">Register as applicant</h1>
      <p className="mt-2 text-gray-700">
        Step 1 of {STEPS.length}. After this come your skills and a 10-question skills check{REQUIRED_AT_REGISTRATION.check ? '' : ', which you may skip and take later'}. Your account is created at the end.
      </p>
      <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
        <FormField id="reg-name" label="Full name" required>
          <input id="reg-name" className="input" type="text" autoComplete="name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)}
            aria-invalid={name.invalid} aria-describedby={name.describedBy} />
        </FormField>
        <FormField id="reg-email" label="Email" required>
          <GmailUsernameInput id="reg-email" value={form.email} onChange={(v) => set('email', v)} {...fieldState('reg-email')} />
        </FormField>
        <FormField id="reg-password" label="Password" required>
          <PasswordInput id="reg-password" value={form.password} onChange={(v) => set('password', v)} autoComplete="new-password" {...fieldState('reg-password')} />
        </FormField>

        <ConsentFields idPrefix="reg-consent" role="applicant" value={consent} onChange={onConsent} invalid={invalid} errorId={ERROR_ID} />
        <ErrorMsg id={ERROR_ID} msg={error} />

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70" disabled={loading} aria-busy={loading}>
          {loading ? <><Spinner /><span className="sr-only">Checking your email</span></> : 'Continue to the assessment'}
        </button>
      </form>
      <button type="button" className="auth-link block mx-auto mt-5" onClick={onBack}>Back to sign in</button>
    </AuthShell>
  )
}
