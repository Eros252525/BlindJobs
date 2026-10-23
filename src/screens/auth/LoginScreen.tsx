import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { openLegal } from '@/lib/documents/legal'
import { t, useLang } from '@/lib/i18n'
import { focusFirst, missingFields, missingMessage } from '@/lib/validation'
import { AuthShell } from '@/components/auth/AuthShell'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/Spinner'
import type { Role, Screen, User } from '@/types'

/** Why someone arrives at sign in with their details half filled in. */
export interface SignInWelcome {
  kind: 'registered' | 'reset'
  role: Role
  /** The username or email they sign in with. */
  login: string
}

export function LoginScreen({ onLogin, onNavigate, welcome }: {
  onLogin: (u: User) => void; onNavigate: (s: Screen) => void
  /** Set right after registering or resetting the password: the sign-in name is filled in and the page says why. */
  welcome?: SignInWelcome | null
}) {
  useLang()
  const [role, setRole] = useState<Role>(welcome?.role ?? 'applicant')
  const [emailUsername, setEmailUsername] = useState(welcome?.login || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())

  // The sign-in name is already filled in, so start in the Password box
  useEffect(() => { if (welcome) document.getElementById('login-password')?.focus() }, [welcome])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    // Empty boxes are named here, as on the registration forms, before anything is sent
    const missing = missingFields([
      { id: 'login-email', label: t('Email or username'), value: emailUsername },
      { id: 'login-password', label: t('Password'), value: password },
    ])
    if (missing.length) {
      setInvalid(new Set(missing.map(f => f.id))); setError(missingMessage(missing)); focusFirst(missing)
      return
    }
    setError(''); setInvalid(new Set()); setLoading(true)
    try {
      const user = await api.login(emailUsername, password, role)
      onLogin(user as User)
    } catch (e: any) {
      // The server's answer does not say which of the two was wrong, so both are marked
      setInvalid(new Set(['login-email', 'login-password'])); setError(e.message)
      document.getElementById('login-password')?.focus()
    }
    finally { setLoading(false) }
  }

  const errorFor = (id: string) => (invalid.has(id) ? 'login-error' : undefined)
  const forgot = (
    <button type="button" className="auth-link" onClick={() => onNavigate('forgot-password')}>{t('Forgot your password?')}</button>
  )

  return (
    <AuthShell width="max-w-md" braille showcase={t('Sign in')}>
      <h1 className="text-3xl font-bold text-gray-900">{t('Sign in')}</h1>
      {welcome ? (
        <p id="login-welcome" role="status" className="mt-3 rounded-lg border-2 border-green-700 bg-green-50 p-3 text-gray-900">
          <strong>{welcome.kind === 'registered' ? t('Your account is created.') : t('Your password was changed.')}</strong>{' '}
          {welcome.kind === 'registered'
            ? t('Sign in with your username, {login}, and the password you chose.', { login: welcome.login })
            : t('Sign in with {login} and your new password.', { login: welcome.login })}
        </p>
      ) : (
        <p className="mt-2 text-gray-700">{t('Welcome back. Choose your account type to continue.')}</p>
      )}

      <form className="mt-6 space-y-5" onSubmit={handleLogin} noValidate>
        <div role="group" aria-label={t('Account type')} className="role-switch">
          {(['applicant', 'employer'] as const).map(r => (
            <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>
              {r === 'applicant' ? t('Applicant') : t('Employer')}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="login-email" className="field-label">{t('Email or username')}</label>
          <input id="login-email" className="input" type="text" inputMode="email" autoComplete="username"
            autoCapitalize="none" spellCheck={false} required
            value={emailUsername} onChange={(e) => setEmailUsername(e.target.value)}
            aria-invalid={invalid.has('login-email')} aria-describedby={errorFor('login-email')} />
        </div>

        <div>
          <label htmlFor="login-password" className="field-label">{t('Password')}</label>
          <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password"
            invalid={invalid.has('login-password')}
            describedBy={[welcome && !error ? 'login-welcome' : '', errorFor('login-password')].filter(Boolean).join(' ') || undefined} />
          <ErrorMsg id="login-error" msg={error} />
          {/* Right after the password box, so Tab reaches it at the moment it is needed,
              before the Sign in button */}
          <p className="mt-2">{forgot}</p>
        </div>

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70"
          disabled={loading} aria-busy={loading}>
          {loading ? <Spinner label={t('Signing in')} /> : role === 'employer' ? t('Sign in as employer') : t('Sign in as applicant')}
        </button>
      </form>

      <p className="text-center text-gray-700 mt-6 pt-5 border-t border-gray-200">
        {t('New to Blind Jobs?')}{' '}
        <button type="button" className="auth-link"
          onClick={() => onNavigate(role === 'employer' ? 'register-employer' : 'register-applicant')}>
          {role === 'employer' ? t('Create an employer account') : t('Create an applicant account')}
        </button>
      </p>
      <p className="text-center mt-1">
        <button type="button" className="auth-link" aria-haspopup="dialog" onClick={() => openLegal('privacy')}>{t('Privacy Notice')}</button>
        <span aria-hidden="true" className="text-gray-600"> · </span>
        <button type="button" className="auth-link" aria-haspopup="dialog" onClick={() => openLegal('terms')}>{t('Terms and Conditions')}</button>
        <span aria-hidden="true" className="text-gray-600"> · </span>
        <button type="button" className="auth-link" aria-haspopup="dialog" onClick={() => openLegal('accessibility')}>{t('Accessibility')}</button>
      </p>
    </AuthShell>
  )
}
