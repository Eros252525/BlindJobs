import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { openLegal } from '@/lib/documents/legal'
import { AuthShell } from '@/components/auth/AuthShell'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/Spinner'
import type { Role, Screen, User } from '@/types'

export function LoginScreen({ onLogin, onNavigate }: { onLogin: (u: User) => void; onNavigate: (s: Screen) => void }) {
  const [role, setRole] = useState<Role>('applicant')
  const [emailUsername, setEmailUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(''); setLoading(true)
    try {
      const user = await api.login(emailUsername, password, role)
      onLogin(user as User)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const roleLabel = role === 'employer' ? 'employer' : 'applicant'
  const errorId = error ? 'login-error' : undefined

  return (
    <AuthShell width="max-w-md" braille showcase="Sign in">
      <h1 className="text-3xl font-bold text-gray-900">Sign in</h1>
      <p className="mt-2 text-gray-700">Welcome back. Choose your account type to continue.</p>

      <form className="mt-6 space-y-5" onSubmit={handleLogin} noValidate>
        <div role="group" aria-label="Account type" className="role-switch">
          {(['applicant', 'employer'] as const).map(r => (
            <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}
              data-speak={`${r} account${role === r ? ', selected' : ''}`}>
              {r === 'applicant' ? 'Applicant' : 'Employer'}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="login-email" className="field-label">Email or username</label>
          <input id="login-email" className="input" type="text" inputMode="email" autoComplete="username"
            autoCapitalize="none" spellCheck={false} required
            value={emailUsername} onChange={(e) => setEmailUsername(e.target.value)}
            aria-invalid={!!error} aria-describedby={errorId} />
        </div>

        <div>
          <label htmlFor="login-password" className="field-label">Password</label>
          <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password"
            invalid={!!error} describedBy={errorId} />
          <ErrorMsg id="login-error" msg={error} />
        </div>

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70"
          disabled={loading} aria-busy={loading}>
          {loading ? <><Spinner /><span className="sr-only">Signing in</span></> : `Sign in as ${roleLabel}`}
        </button>
      </form>

      <p className="text-center text-gray-700 mt-6 pt-5 border-t border-gray-200">
        New to Blind Jobs?{' '}
        <button type="button" className="auth-link"
          onClick={() => onNavigate(role === 'employer' ? 'register-employer' : 'register-applicant')}>
          Create an {roleLabel} account
        </button>
      </p>
      <p className="text-center mt-1">
        <button type="button" className="auth-link" aria-haspopup="dialog" onClick={() => openLegal('privacy')}>Privacy Notice</button>
        <span aria-hidden="true" className="text-gray-600"> · </span>
        <button type="button" className="auth-link" aria-haspopup="dialog" onClick={() => openLegal('terms')}>Terms and Conditions</button>
        <span aria-hidden="true" className="text-gray-600"> · </span>
        <button type="button" className="auth-link" aria-haspopup="dialog" onClick={() => openLegal('accessibility')}>Accessibility</button>
      </p>
    </AuthShell>
  )
}
