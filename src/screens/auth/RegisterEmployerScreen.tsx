import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { NO_CONSENT } from '@/lib/documents/legal'
import { gmailAddress, gmailProblem } from '@/lib/gmail'
import { focusFirst, missingFields, missingMessage } from '@/lib/validation'
import { AuthShell } from '@/components/auth/AuthShell'
import { EmailCodeForm } from '@/components/auth/EmailCodeForm'
import { ConsentFields, consentMessage, untickedConsent } from '@/components/legal/ConsentFields'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { GmailInput } from '@/components/ui/GmailInput'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/Spinner'
import type { User } from '@/types'

const ERROR_ID = 'reg-emp-error'

export function RegisterEmployerScreen({ onLogin, onBack }: { onLogin: (u: User) => void; onBack: () => void }) {
  const [companyName, setCompanyName] = useState('')
  const [emailUsername, setEmailUsername] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(NO_CONSENT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  // After the form: the code emailed to the Gmail address is asked for before the account is made
  const [awaitingCode, setAwaitingCode] = useState(false)
  const email = gmailAddress(emailUsername)
  const fieldState = (id: string) => ({ invalid: invalid.has(id), describedBy: invalid.has(id) ? ERROR_ID : undefined })

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    const missing = missingFields([
      { id: 'reg-company', label: 'Company name', value: companyName },
      { id: 'reg-emp-email', label: 'Gmail address', value: emailUsername },
      { id: 'reg-emp-password', label: 'Password', value: password },
    ])
    const emailProblem = missing.length ? null : gmailProblem(emailUsername)
    if (emailProblem) {
      setInvalid(new Set(['reg-emp-email'])); setError(emailProblem)
      document.getElementById('reg-emp-email')?.focus()
      return
    }
    // consent is checked once the fields are complete, so the error names one thing at a time
    const unticked = missing.length ? [] : untickedConsent('reg-emp-consent', consent)
    setInvalid(new Set([...missing, ...unticked].map(f => f.id)))
    if (missing.length) { setError(missingMessage(missing)); focusFirst(missing); return }
    if (unticked.length) { setError(consentMessage(unticked)); focusFirst(unticked); return }
    setError(''); setLoading(true)
    try {
      if (!(await api.emailAvailable(email))) {
        setInvalid(new Set(['reg-emp-email']))
        setError('An account already uses this Gmail address. Sign in instead, or use another one.')
        document.getElementById('reg-emp-email')?.focus()
        return
      }
      await api.sendEmailCode(email)
      setAwaitingCode(true)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Runs once the code is accepted; a failure here goes back to the form to show it
  const createAccount = async () => {
    try {
      onLogin(await api.register({ role: 'employer', companyName, emailUsername: email, password, consent }))
    } catch (e: any) { setAwaitingCode(false); setError(e.message) }
  }

  if (awaitingCode) {
    return (
      <AuthShell width="max-w-md" braille showcase="Confirm your Gmail">
        <EmailCodeForm email={email} onVerified={createAccount} onChangeEmail={() => setAwaitingCode(false)} />
      </AuthShell>
    )
  }

  return (
    <AuthShell width="max-w-md" braille showcase="Register as employer">
      <h1 className="text-3xl font-bold text-gray-900">Register as employer</h1>
      <form className="mt-6 space-y-5" onSubmit={handleRegister} noValidate>
        <FormField id="reg-company" label="Company name" required>
          <input id="reg-company" className="input" type="text" autoComplete="organization" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
            aria-invalid={invalid.has('reg-company')} aria-describedby={fieldState('reg-company').describedBy} />
        </FormField>
        <FormField id="reg-emp-email" label="Gmail address" required>
          <GmailInput id="reg-emp-email" value={emailUsername} onChange={setEmailUsername} {...fieldState('reg-emp-email')} />
        </FormField>
        <FormField id="reg-emp-password" label="Password" required>
          <PasswordInput id="reg-emp-password" value={password} onChange={setPassword} autoComplete="new-password" {...fieldState('reg-emp-password')} />
        </FormField>
        <ConsentFields idPrefix="reg-emp-consent" role="employer" value={consent} onChange={setConsent} invalid={invalid} errorId={ERROR_ID} />
        <ErrorMsg id={ERROR_ID} msg={error} />
        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70" disabled={loading} aria-busy={loading}>
          {loading ? <><Spinner /><span className="sr-only">Checking your Gmail and sending a code</span></> : 'Continue'}
        </button>
      </form>
      <button type="button" className="auth-link block mx-auto mt-5" onClick={onBack}>Back to sign in</button>
    </AuthShell>
  )
}
