import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import * as sr from '@/lib/a11y/screen-reader'
import { useStepFocus } from '@/hooks/useStepFocus'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { BTN_SECONDARY } from '@/components/ui/PageCard'
import { Spinner } from '@/components/ui/Spinner'

const RESEND_SECONDS = 60
const ERROR_ID = 'email-code-error'

/**
 * "We emailed you a code": the 6-digit code box, Confirm, Send a new code (after a
 * minute), and a way back to change the address. The first code is sent by the
 * form before this one shows, so a wrong or taken address is reported there.
 */
export function EmailCodeForm({ email, onVerified, onChangeEmail }: {
  email: string
  /** Called once the server has accepted the code. */
  onVerified: () => void | Promise<void>
  onChangeEmail: () => void
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [wait, setWait] = useState(RESEND_SECONDS)
  const headingRef = useStepFocus<HTMLHeadingElement>(email,
    `Check your Gmail. We sent a 6-digit code to ${email}. Type it in the code box.`)

  // counts down to when a new code may be asked for
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const fail = (message: string) => {
    setError(message); sr.announce(message)
    document.getElementById('email-code')?.focus()
  }

  const confirm = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (code.length !== 6) { fail('Type all 6 digits of the code from the email.'); return }
    setBusy(true); setError(''); setNote('')
    try {
      await api.verifyEmailCode(email, code)
      await onVerified()
    } catch (e: any) { fail(e.message) }
    finally { setBusy(false) }
  }

  const resend = async () => {
    setBusy(true); setError('')
    try {
      await api.sendEmailCode(email)
      setCode(''); setWait(RESEND_SECONDS)
      setNote(`A new code was sent to ${email}. The old one no longer works.`)
      document.getElementById('email-code')?.focus()
    } catch (e: any) { fail(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 focus:outline-none">Check your Gmail</h1>
      <p className="mt-2 text-gray-700">
        We sent a 6-digit code to <strong className="text-gray-900 break-all">{email}</strong>. Type it below to confirm this Gmail address is yours. It works for 10 minutes.
      </p>
      <p className="mt-2 text-sm text-gray-700">Not in your inbox? Look in Spam or Promotions.</p>

      <form className="mt-6 space-y-5" onSubmit={confirm} noValidate>
        <div>
          <label htmlFor="email-code" className="field-label">Code from the email</label>
          <input id="email-code" className="input text-2xl tracking-[0.5em] font-mono" type="text" inputMode="numeric"
            autoComplete="one-time-code" maxLength={6} required value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
            aria-invalid={!!error} aria-describedby={error ? ERROR_ID : undefined} />
        </div>
        <ErrorMsg id={ERROR_ID} msg={error} />
        <button type="submit" disabled={busy} aria-busy={busy}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70">
          {busy ? <Spinner label="Checking the code" /> : 'Confirm my Gmail'}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={resend} disabled={busy || wait > 0} className={`${BTN_SECONDARY} disabled:opacity-60`}>
          {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
        </button>
        <button type="button" onClick={onChangeEmail} className={BTN_SECONDARY}>Use a different Gmail</button>
      </div>
      <p role="status" className="mt-3 text-sm text-gray-800 min-h-5">{note}</p>
    </div>
  )
}
