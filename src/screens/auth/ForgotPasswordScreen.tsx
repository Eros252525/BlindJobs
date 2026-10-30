import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { gmailAddress, gmailProblem } from '@/lib/gmail'
import { t, useLang } from '@/lib/i18n'
import { focusFirst, missingFields, missingMessage, PASSWORD_MIN, passwordProblem } from '@/lib/validation'
import { AuthShell } from '@/components/auth/AuthShell'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { BTN_SECONDARY } from '@/components/ui/PageCard'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/Spinner'
import type { Role } from '@/types'

const ERROR_ID = 'fp-error'
const RESEND_SECONDS = 60

/**
 * Forgot password, on one page: the person types their Gmail and a 6-digit code is
 * emailed to it; the code and a new password are then typed in the boxes below. The
 * email function finds the account from the Gmail alone (an employer's, one that signs
 * in with it, or an applicant's confirmed profile Gmail), so no account type or username
 * is asked, and the page says the same whether or not one matched. Codes by text
 * message were removed on 2026-10-28; the email function can still send them, but
 * nothing here asks it to.
 */
export function ForgotPasswordScreen({ onDone, onBack }: {
  /** The password was changed: back to sign in, with the username or email filled in. */
  onDone: (login: string, role: Role) => void
  onBack: () => void
}) {
  useLang()
  const [email, setEmail] = useState('')
  // The address the last code went to; the code boxes show once there is one
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const [wait, setWait] = useState(0)
  // Raised by each code sent; focus then goes to the box the code is typed in
  const [sends, setSends] = useState(0)
  useEffect(() => { if (sends) document.getElementById('fp-code')?.focus() }, [sends])

  // counts down to when a new code may be asked for
  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const fail = (ids: string[], message: string) => {
    setInvalid(new Set(ids)); setError(message)
    document.getElementById(ids[0])?.focus()
  }
  const errorFor = (id: string) => (invalid.has(id) ? ERROR_ID : undefined)

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || wait > 0) return
    if (!email.trim()) { fail(['fp-email'], missingMessage([{ id: 'fp-email', label: t('Gmail address'), value: email }])); return }
    const problem = gmailProblem(email)
    if (problem) { fail(['fp-email'], problem); return }
    const address = gmailAddress(email)
    setBusy(true); setError(''); setInvalid(new Set())
    try {
      await api.sendResetCode(address)
      setSentTo(address); setCode(''); setWait(RESEND_SECONDS); setSends(n => n + 1)
    } catch (e: any) { setError(e.message) }
    finally { setBusy(false) }
  }

  const reset = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const missing = missingFields([
      { id: 'fp-code', label: t('Code'), value: code },
      { id: 'fp-password', label: t('New password'), value: password },
    ])
    if (missing.length) { setInvalid(new Set(missing.map(f => f.id))); setError(missingMessage(missing)); focusFirst(missing); return }
    if (code.length !== 6) { fail(['fp-code'], t('Type all 6 digits of the code.')); return }
    const weak = passwordProblem(password)
    if (weak) { fail(['fp-password'], weak); return }
    setBusy(true); setError(''); setInvalid(new Set())
    try {
      const account = await api.resetPassword(sentTo, code, password)
      onDone(account.login || sentTo, account.role || 'applicant')
    } catch (e: any) { fail(['fp-code'], e.message) }
    finally { setBusy(false) }
  }

  return (
    <AuthShell width="max-w-md" braille showcase={t('Forgot your password?')}>
      <h1 className="text-3xl font-bold text-gray-900">{t('Forgot your password?')}</h1>
      <p className="mt-2 text-gray-700">{t('Type the Gmail on your account. We email it a 6-digit code; type the code below and choose a new password.')}</p>

      <form className="mt-6 space-y-5" onSubmit={send} noValidate>
        <FormField id="fp-email" label={t('Gmail address')} required>
          {/* A changed address needs a new code, so the code boxes go until one is sent */}
          <input id="fp-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required
            placeholder={t('e.g., juan.cruz@gmail.com')} value={email} onChange={(e) => { setEmail(e.target.value); setSentTo(''); setWait(0); setError(''); setInvalid(new Set()) }}
            aria-invalid={invalid.has('fp-email')} aria-describedby={errorFor('fp-email')} />
        </FormField>
        {!sentTo && <ErrorMsg id={ERROR_ID} msg={error} />}
        <button type="submit" disabled={busy || wait > 0} aria-busy={busy && !sentTo}
          className={`${sentTo ? BTN_SECONDARY : 'btn-primary'} w-full flex items-center justify-center gap-2 disabled:opacity-60`}>
          {busy && !sentTo ? <Spinner label={t('Sending the code')} />
            : wait > 0 ? t('Send a new code in {n}s', { n: wait })
            : sentTo ? t('Send a new code') : t('Send me a code')}
        </button>
      </form>

      {sentTo && (
        <form className="mt-6 pt-5 border-t border-gray-200 space-y-5" onSubmit={reset} noValidate>
          <p role="status" className="text-gray-900">
            {t('If an account uses {email}, a 6-digit code was sent to it. It works for 10 minutes. Not in your inbox? Look in Spam.', { email: sentTo })}
          </p>
          <FormField id="fp-code" label={t('Code')} required>
            <input id="fp-code" className="input text-2xl tracking-[0.5em] font-mono" type="text" inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={invalid.has('fp-code')} aria-describedby={errorFor('fp-code')} />
          </FormField>
          <FormField id="fp-password" label={t('New password')} required>
            <p id="fp-password-help" className="text-sm text-gray-600 mb-2">{t('At least {n} characters.', { n: PASSWORD_MIN })}</p>
            <PasswordInput id="fp-password" value={password} onChange={setPassword} autoComplete="new-password"
              invalid={invalid.has('fp-password')} describedBy={['fp-password-help', errorFor('fp-password')].filter(Boolean).join(' ')} />
          </FormField>
          <ErrorMsg id={ERROR_ID} msg={error} />
          <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70">
            {busy ? <Spinner label={t('Saving your new password')} /> : t('Set my new password')}
          </button>
        </form>
      )}

      <p className="mt-5 text-sm text-gray-700">{t('No Gmail on your account? Ask Blind Jobs for help to get back into it.')}</p>
      <button type="button" className="auth-link block mx-auto mt-5" onClick={onBack}>{t('Back to sign in')}</button>
    </AuthShell>
  )
}
