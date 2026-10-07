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

const ERROR_ID = 'reg-emp-error'

export function RegisterEmployerScreen({ onLogin, onBack }: { onLogin: (u: User) => void; onBack: () => void }) {
  const [companyName, setCompanyName] = useState('')
  const [emailUsername, setEmailUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const fieldState = (id: string) => ({ invalid: invalid.has(id), describedBy: invalid.has(id) ? ERROR_ID : undefined })

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    const missing = missingFields([
      { id: 'reg-company', label: 'Company name', value: companyName },
      { id: 'reg-emp-email', label: 'Gmail username', value: emailUsername },
      { id: 'reg-emp-password', label: 'Password', value: password },
    ])
    setInvalid(new Set(missing.map(f => f.id)))
    if (missing.length) { setError(missingMessage(missing)); focusFirst(missing); return }
    setError(''); setLoading(true)
    try {
      const user = await api.register({ role: 'employer', companyName, emailUsername, password })
      onLogin(user)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <AuthShell width="max-w-md" braille showcase="Register as employer">
      <h1 className="text-3xl font-bold text-gray-900">Register as employer</h1>
      <form className="mt-6 space-y-5" onSubmit={handleRegister} noValidate>
        <FormField id="reg-company" label="Company name" required>
          <input id="reg-company" className="input" type="text" autoComplete="organization" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
            aria-invalid={invalid.has('reg-company')} aria-describedby={fieldState('reg-company').describedBy} />
        </FormField>
        <FormField id="reg-emp-email" label="Gmail username" required>
          <GmailUsernameInput id="reg-emp-email" value={emailUsername} onChange={setEmailUsername} {...fieldState('reg-emp-email')} />
        </FormField>
        <FormField id="reg-emp-password" label="Password" required>
          <PasswordInput id="reg-emp-password" value={password} onChange={setPassword} autoComplete="new-password" {...fieldState('reg-emp-password')} />
        </FormField>
        <ErrorMsg id={ERROR_ID} msg={error} />
        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70" disabled={loading} aria-busy={loading}>
          {loading ? <><Spinner /><span className="sr-only">Creating your account</span></> : 'Complete registration'}
        </button>
      </form>
      <button type="button" className="auth-link block mx-auto mt-5" onClick={onBack}>Back to sign in</button>
    </AuthShell>
  )
}
