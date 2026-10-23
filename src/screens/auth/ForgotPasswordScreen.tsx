import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { gmailAddress, gmailProblem } from '@/lib/gmail'
import { t, useLang } from '@/lib/i18n'
import { mobileDigits, mobileProblem } from '@/lib/phone'
import { focusFirst, missingFields, missingMessage, PASSWORD_MIN, passwordProblem } from '@/lib/validation'
import { useStepFocus } from '@/hooks/useStepFocus'
import { AuthShell } from '@/components/auth/AuthShell'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { BTN_SECONDARY } from '@/components/ui/PageCard'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/Spinner'
import type { Role } from '@/types'

const ERROR_ID = 'fp-error'
const RESEND_SECONDS = 60

type Channel = 'sms' | 'email'

/**
 * Forgot password: a 6-digit code is sent to what the account already has, then a
 * new password is chosen. Applicants get it by text message to their Philippine
 * mobile number (most have no email), or by email if they added one to their
 * profile; employers get it at their Gmail. The person types the number or address
 * themselves, and the page says the same whether or not it matched an account.
 */
export function ForgotPasswordScreen({ onDone, onBack }: {
  /** The password was changed: back to sign in, with the username or email filled in. */
  onDone: (login: string, role: Role) => void
  onBack: () => void
}) {
  useLang()
  const [role, setRole] = useState<Role>('applicant')
  const [step, setStep] = useState<'ask' | 'code'>('ask')
  const [login, setLogin] = useState('')
  const [channel, setChannel] = useState<Channel>('sms')
  const [contact, setContact] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const [wait, setWait] = useState(0)
  const headingRef = useStepFocus<HTMLHeadingElement>(step, step === 'ask' ? t('Forgot your password?') : t('Type the code we sent.'))

  // counts down to when a new code may be asked for
  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const employer = role === 'employer'
  const via: Channel = employer ? 'email' : channel
  // Employers sign in with their Gmail, so it is both the account and where the code goes
  const account = employer ? gmailAddress(contact) : login.trim().toLowerCase()
  const fail = (ids: string[], message: string) => {
    setInvalid(new Set(ids)); setError(message)
    document.getElementById(ids[0])?.focus()
  }
  const errorFor = (id: string) => (invalid.has(id) ? ERROR_ID : undefined)

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy) return
    const contactLabel = via === 'sms' ? t('Mobile number') : employer ? t('Gmail address') : t('Email address')
    const missing = missingFields([
      ...(employer ? [] : [{ id: 'fp-login', label: t('Username'), value: login }]),
      { id: 'fp-contact', label: contactLabel, value: contact },
    ])
    if (missing.length) { setInvalid(new Set(missing.map(f => f.id))); setError(missingMessage(missing)); focusFirst(missing); return }
    const problem = via === 'sms' ? mobileProblem(contact) : employer ? gmailProblem(contact) : null
    if (problem) { fail(['fp-contact'], problem); return }
    setBusy(true); setError(''); setInvalid(new Set())
    try {
      await api.sendResetCode(role, account, via, employer ? account : contact)
      setCode(''); setPassword(''); setWait(RESEND_SECONDS); setStep('code')
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
      await api.resetPassword(role, account, code, password)
      onDone(account, role)
    } catch (e: any) { fail(['fp-code'], e.message) }
    finally { setBusy(false) }
  }

  const where = via === 'sms' ? t('your mobile number') : t('your email')

  return (
    <AuthShell width="max-w-md" braille showcase={t('Forgot your password?')}>
      {step === 'ask' ? (
        <>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 focus:outline-none">{t('Forgot your password?')}</h1>
          <p className="mt-2 text-gray-700">
            {employer
              ? t('We will email a 6-digit code to your Gmail. You then choose a new password.')
              : t('We will send a 6-digit code to the mobile number or email on your profile. You then choose a new password.')}
          </p>
          <form className="mt-6 space-y-5" onSubmit={send} noValidate>
            <div role="group" aria-label={t('Account type')} className="role-switch">
              {(['applicant', 'employer'] as const).map(r => (
                <button key={r} type="button" aria-pressed={role === r} onClick={() => { setRole(r); setContact(''); setError(''); setInvalid(new Set()) }}>
                  {r === 'applicant' ? t('Applicant') : t('Employer')}
                </button>
              ))}
            </div>

            {!employer && (
              <>
                <FormField id="fp-login" label={t('Username')} required>
                  <input id="fp-login" className="input" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required
                    value={login} onChange={(e) => setLogin(e.target.value)}
                    aria-invalid={invalid.has('fp-login')} aria-describedby={errorFor('fp-login')} />
                </FormField>
                <fieldset>
                  <legend className="field-label">{t('Send the code by')}</legend>
                  <div className="flex flex-col gap-2">
                    {([['sms', t('Text message to my mobile number')], ['email', t('Email, if I added one to my profile')]] as const).map(([value, label]) => (
                      <label key={value} className="flex items-center gap-3 min-h-11 cursor-pointer text-gray-800">
                        <input type="radio" name="fp-channel" value={value} checked={channel === value}
                          onChange={() => { setChannel(value); setContact(''); setError(''); setInvalid(new Set()) }}
                          className="w-5 h-5 accent-[#1a4fa0]" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {via === 'sms' ? (
              <FormField id="fp-contact" label={t('Mobile number on your profile')} required>
                <div className="flex">
                  <span id="fp-contact-prefix" className="flex items-center px-2 border border-r-0 border-gray-500 rounded-l-md bg-gray-50 text-gray-600 text-sm">+63</span>
                  <input id="fp-contact" className="input rounded-l-none flex-1 min-w-0" type="tel" inputMode="numeric" autoComplete="tel-national" required
                    placeholder={t('e.g., 9171234567')} value={contact} onChange={(e) => setContact(mobileDigits(e.target.value))}
                    aria-invalid={invalid.has('fp-contact')} aria-describedby={['fp-contact-prefix', errorFor('fp-contact')].filter(Boolean).join(' ')} />
                </div>
              </FormField>
            ) : (
              <FormField id="fp-contact" label={employer ? t('Gmail address') : t('Email address on your profile')} required>
                <input id="fp-contact" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required
                  placeholder={employer ? 'yourname@gmail.com' : t('e.g., juan.cruz@gmail.com')} value={contact} onChange={(e) => setContact(e.target.value)}
                  aria-invalid={invalid.has('fp-contact')} aria-describedby={errorFor('fp-contact')} />
              </FormField>
            )}

            <ErrorMsg id={ERROR_ID} msg={error} />
            <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70">
              {busy ? <Spinner label={t('Sending the code')} /> : t('Send me a code')}
            </button>
          </form>
          <p className="mt-5 text-sm text-gray-700">
            {t('No mobile number or email on your account? Ask Blind Jobs for help to get back into it.')}
          </p>
        </>
      ) : (
        <>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 focus:outline-none">{t('Type the code we sent')}</h1>
          <p role="status" className="mt-2 text-gray-700">
            {t('If the details match an account, a 6-digit code was sent to {where}. It works for 10 minutes.', { where })}
          </p>
          <form className="mt-6 space-y-5" onSubmit={reset} noValidate>
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
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => send()} disabled={busy || wait > 0} className={`${BTN_SECONDARY} disabled:opacity-60`}>
              {wait > 0 ? t('Send a new code in {n}s', { n: wait }) : t('Send a new code')}
            </button>
            <button type="button" onClick={() => { setStep('ask'); setError(''); setInvalid(new Set()) }} className={BTN_SECONDARY}>{t('Start again')}</button>
          </div>
        </>
      )}
      <button type="button" className="auth-link block mx-auto mt-5" onClick={onBack}>{t('Back to sign in')}</button>
    </AuthShell>
  )
}
