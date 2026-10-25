import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { t, useLang } from '@/lib/i18n'
import { toast } from '@/lib/toast'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { BTN_SECONDARY } from '@/components/ui/PageCard'
import { Spinner } from '@/components/ui/Spinner'

const RESEND_SECONDS = 60
const ERROR_ID = 'ec-error'

/**
 * Confirms the Gmail an applicant added to their profile: a 6-digit code is emailed
 * to it and typed back here. Until then the address is saved but not used, so a
 * mistyped address never receives password-reset codes meant for this person.
 * Shown on the Profile page while the address is unconfirmed.
 */
export function EmailConfirm({ userId, email, sendNow, onConfirmed }: {
  userId: string; email: string
  /** Send the first code as soon as this appears (straight after the address was saved). */
  sendNow: boolean
  onConfirmed: () => void
}) {
  useLang()
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [wait, setWait] = useState(0)
  const started = useRef(false)

  // counts down to when a new code may be asked for
  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const send = async () => {
    setBusy(true); setError('')
    try {
      await api.sendEmailCode(email)
      setSent(true); setCode(''); setWait(RESEND_SECONDS)
      requestAnimationFrame(() => document.getElementById('ec-code')?.focus())
    } catch (e: any) { setError(e.message) }
    finally { setBusy(false) }
  }

  useEffect(() => {
    if (sendNow && !started.current) { started.current = true; send() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendNow])

  const confirm = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (code.length !== 6) { setError(t('Type all 6 digits of the code.')); document.getElementById('ec-code')?.focus(); return }
    setBusy(true); setError('')
    try {
      await api.verifyEmailCode(email, code)
      await api.updateProfile(userId, { emailVerified: true })
      // the server's "this address was proved" mark is meant for registering employers; not needed here
      await api.clearEmailVerified(email).catch(() => {})
      // first confirmed Gmail only; the server sends it once per account
      api.sendWelcome(userId)
      toast(t('{email} is confirmed. Codes for a forgotten password can be sent to it.', { email }), 'success')
      onConfirmed()
    } catch (e: any) { setError(e.message); document.getElementById('ec-code')?.focus() }
    finally { setBusy(false) }
  }

  return (
    <section aria-labelledby="ec-title" className="mb-4 rounded-xl border-2 border-[#a16207] bg-yellow-50 p-4 sm:p-5">
      <h2 id="ec-title" className="font-bold text-gray-900">{t('Confirm your Gmail address')}</h2>
      <p className="mt-1 text-sm text-gray-800">
        {sent
          ? t('We sent a 6-digit code to {email}. Type it below. It works for 10 minutes. Not in your inbox? Look in Spam.', { email })
          : t('Your Gmail, {email}, is not confirmed yet, so codes for a forgotten password are not sent to it.', { email })}
      </p>
      {sent ? (
        <form onSubmit={confirm} noValidate className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="ec-code" className="field-label">{t('Code from the email')}</label>
            <input id="ec-code" className="input w-40 text-xl tracking-[0.4em] font-mono" type="text" inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
              aria-invalid={!!error} aria-describedby={error ? ERROR_ID : undefined} />
          </div>
          <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary min-h-11 px-5 flex items-center gap-2 disabled:opacity-70">
            {busy ? <Spinner label={t('Checking the code')} /> : t('Confirm')}
          </button>
          <button type="button" onClick={send} disabled={busy || wait > 0} className={`${BTN_SECONDARY} disabled:opacity-60`}>
            {wait > 0 ? t('Send a new code in {n}s', { n: wait }) : t('Send a new code')}
          </button>
        </form>
      ) : (
        <button type="button" onClick={send} disabled={busy} aria-busy={busy} className="btn-primary min-h-11 px-5 mt-3 flex items-center gap-2 disabled:opacity-70">
          {busy ? <Spinner label={t('Sending the code')} /> : t('Send me a code')}
        </button>
      )}
      <ErrorMsg id={ERROR_ID} msg={error} />
    </section>
  )
}
