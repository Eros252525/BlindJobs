import { useState, type FormEvent, type RefObject } from 'react'
import { api } from '@/lib/api'
import type { Consent } from '@/lib/documents/legal'
import { t, useLang } from '@/lib/i18n'
import { gmailProblem } from '@/lib/gmail'
import { mobileDigits, mobileProblem } from '@/lib/phone'
import { normalizeUsername, usernameProblem } from '@/lib/username'
import { focusFirst, missingFields, missingMessage, NAME_MAX, nameProblem, PASSWORD_MIN, passwordProblem } from '@/lib/validation'
import { AuthShell } from '@/components/auth/AuthShell'
import { ConsentFields, consentMessage, untickedConsent } from '@/components/legal/ConsentFields'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/Spinner'
import { STEPS, type AccountForm } from './steps'

const ERROR_ID = 'reg-app-error'

/**
 * Registration step 1: first, middle and last name, mobile number, username,
 * password, and the two consent boxes. No email: many blind applicants have none.
 * The mobile number is asked now because applying needs it, and a forgotten
 * password is reset with a code texted to it.
 */
export function AccountStep({ headingRef, form, consent, onForm, onConsent, onContinue, onBack }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  form: AccountForm; consent: Consent
  onForm: (f: AccountForm) => void; onConsent: (c: Consent) => void
  onContinue: () => void
  /** Back to the sign-in screen. */
  onBack: () => void
}) {
  useLang()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())

  const set = (k: keyof AccountForm, v: string) => onForm({ ...form, [k]: v })
  // aria-invalid + a pointer to the error message, only on fields that failed
  const describe = (id: string, ...help: string[]) => [...help, invalid.has(id) ? ERROR_ID : ''].filter(Boolean).join(' ') || undefined
  const fail = (id: string, message: string) => {
    setInvalid(new Set([id])); setError(message)
    document.getElementById(id)?.focus()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    const missing = missingFields([
      { id: 'reg-first', label: t('First name'), value: form.firstName },
      { id: 'reg-last', label: t('Last name'), value: form.lastName },
      { id: 'reg-mobile', label: t('Mobile number'), value: form.mobile },
      { id: 'reg-username', label: t('Username'), value: form.username },
      { id: 'reg-password', label: t('Password'), value: form.password },
    ])
    if (!missing.length) {
      // the boxes stop at NAME_MAX characters, so this catches only a pasted-in name
      const tooLong = ([['reg-first', t('First name'), form.firstName], ['reg-middle', t('Middle name'), form.middleName], ['reg-last', t('Last name'), form.lastName]] as const)
        .find(([, label, v]) => nameProblem(label, v))
      if (tooLong) { fail(tooLong[0], nameProblem(tooLong[1], tooLong[2])!); return }
      const badMobile = mobileProblem(form.mobile)
      if (badMobile) { fail('reg-mobile', badMobile); return }
      const badEmail = form.email.trim() ? gmailProblem(form.email) : null
      if (badEmail) { fail('reg-email', badEmail); return }
      const badUsername = usernameProblem(form.username)
      if (badUsername) { fail('reg-username', badUsername); return }
      const weak = passwordProblem(form.password)
      if (weak) { fail('reg-password', weak); return }
    }
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
      else fail('reg-username', t('The username {name} is taken. Choose another one, for example by adding a number.', { name }))
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const nameField = (id: string, key: 'firstName' | 'middleName' | 'lastName', label: string, autoComplete: string, required: boolean) => (
    <FormField id={id} label={label} required={required}>
      <input id={id} className="input" type="text" autoComplete={autoComplete} required={required} maxLength={NAME_MAX}
        value={form[key]} onChange={(e) => set(key, e.target.value)}
        aria-invalid={invalid.has(id)} aria-describedby={describe(id, 'reg-name-help')} />
    </FormField>
  )

  return (
    <AuthShell width="max-w-md" braille showcase={t('Register as applicant')}>
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 focus:outline-none">{t('Register as applicant')}</h1>
      <p className="mt-2 text-gray-700">
        {t('Step 1 of {n}. You sign in with a username you choose; email is optional. After this come your skills and work preferences. Your account is created at the end.', { n: STEPS.length })}
      </p>
      <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
        <fieldset className="space-y-4">
          <legend className="field-label">{t('Your name')}</legend>
          <p id="reg-name-help" className="text-sm text-gray-600 -mt-1">{t('As on your ID. Up to {n} characters each.', { n: NAME_MAX })}</p>
          {nameField('reg-first', 'firstName', t('First name'), 'given-name', true)}
          {nameField('reg-middle', 'middleName', t('Middle name'), 'additional-name', false)}
          {nameField('reg-last', 'lastName', t('Last name'), 'family-name', true)}
        </fieldset>
        <FormField id="reg-mobile" label={t('Mobile number')} required>
          <p id="reg-mobile-help" className="text-sm text-gray-600 mb-2">{t('Employers call you on it. If you forget your password, we text a code to it.')}</p>
          <div className="flex">
            <span id="reg-mobile-prefix" className="flex items-center px-2 border border-r-0 border-gray-500 rounded-l-md bg-gray-50 text-gray-600 text-sm">+63</span>
            <input id="reg-mobile" className="input rounded-l-none flex-1 min-w-0" type="tel" inputMode="numeric" autoComplete="tel-national" required
              placeholder={t('e.g., 9171234567')} value={form.mobile} onChange={(e) => set('mobile', mobileDigits(e.target.value))}
              aria-invalid={invalid.has('reg-mobile')} aria-describedby={describe('reg-mobile', 'reg-mobile-prefix', 'reg-mobile-help')} />
          </div>
        </FormField>
        <FormField id="reg-email" label={t('Gmail address')}>
          <p id="reg-email-help" className="text-sm text-gray-600 mb-2">{t('Leave it empty if you have no email. If you add one, we email you a code to confirm it after you sign in; then it can also reset a forgotten password. You still sign in with your username.')}</p>
          <input id="reg-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            placeholder={t('e.g., juan.cruz@gmail.com')} value={form.email} onChange={(e) => set('email', e.target.value)}
            aria-invalid={invalid.has('reg-email')} aria-describedby={describe('reg-email', 'reg-email-help')} />
        </FormField>
        <FormField id="reg-username" label={t('Username')} required>
          <p id="reg-username-help" className="text-sm text-gray-600 mb-2">{t('You type this to sign in. At least 4 letters or numbers, no spaces; for example juan.cruz.')}</p>
          <input id="reg-username" className="input" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required
            value={form.username} onChange={(e) => set('username', e.target.value)}
            aria-invalid={invalid.has('reg-username')} aria-describedby={describe('reg-username', 'reg-username-help')} />
        </FormField>
        <FormField id="reg-password" label={t('Password')} required>
          <p id="reg-password-help" className="text-sm text-gray-600 mb-2">{t('At least {n} characters.', { n: PASSWORD_MIN })}</p>
          <PasswordInput id="reg-password" value={form.password} onChange={(v) => set('password', v)} autoComplete="new-password"
            invalid={invalid.has('reg-password')} describedBy={describe('reg-password', 'reg-password-help')} />
        </FormField>

        <ConsentFields idPrefix="reg-consent" role="applicant" value={consent} onChange={onConsent} invalid={invalid} errorId={ERROR_ID} />
        <ErrorMsg id={ERROR_ID} msg={error} />

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70" disabled={loading} aria-busy={loading}>
          {loading ? <Spinner label={t('Checking your username')} /> : t('Continue')}
        </button>
      </form>
      <button type="button" className="auth-link block mx-auto mt-5" onClick={onBack}>{t('Back to sign in')}</button>
    </AuthShell>
  )
}
