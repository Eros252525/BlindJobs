// Emails sent by the blindjobs-email Edge Function (supabase/functions/blindjobs-email):
// the code that proves a Gmail address is real, and the new sign-in alert.
// The Gmail password and the codes stay on the server; the browser only asks.
import { t } from '@/lib/i18n'
import { supabase } from './client'

const FUNCTION = 'blindjobs-email'

async function call(action: string, body: Record<string, unknown>) {
  const { error } = await supabase.functions.invoke(FUNCTION, { body: { action, ...body } })
  if (!error) return
  const response: Response | undefined = (error as any).context instanceof Response ? (error as any).context : undefined
  // Supabase's own answer when the function was never deployed (see README, "Email")
  if (response?.status === 404 && !(await response.clone().json().catch(() => null))?.error) {
    throw new Error(t('Blind Jobs cannot send codes yet: this service has not been set up. Please try again later, or ask Blind Jobs for help.'))
  }
  // No answer at all: offline, or the service is not set up (an undeployed function also
  // fails this way in the browser), so the message names both instead of blaming the connection
  if (!response) throw new Error(t('Blind Jobs could not send the code. Check your internet connection and try again. If it keeps happening, this service may not be set up yet: please ask Blind Jobs for help.'))
  // The function answers refusals with { error: "words to show the user" }
  let message = ''
  try { message = (await response.json())?.error ?? '' } catch { /* not JSON */ }
  throw new Error(message || t('The code could not be sent right now. Please try again in a minute.'))
}

/** Emails a 6-digit code to a Gmail address that has no account yet. */
export const sendEmailCode = (email: string) => call('send-code', { email })

/** Checks the code; on success the address may be used to register. */
export const verifyEmailCode = (email: string, code: string) => call('verify-code', { email, code })

/** Emails "your account was just signed in to". Never blocks signing in: a failure is only logged. */
export function sendLoginAlert(email: string) {
  call('login-alert', { email }).catch(e => console.warn('Sign-in alert not sent:', e.message))
}

// ── Forgot password ───────────────────────────────────────────────────────────

export type ResetChannel = 'sms' | 'email'

/**
 * Sends a 6-digit reset code by text message or email, if `contact` is the mobile
 * number or email saved on the account. The server answers the same either way,
 * so this never tells whether the account or the number exists.
 */
export const sendResetCode = (role: string, login: string, channel: ResetChannel, contact: string) =>
  call('send-reset', { role, login, channel, contact })

/** Sets a new password with the code from the text message or email. */
export const resetPassword = (role: string, login: string, code: string, password: string) =>
  call('reset-password', { role, login, code, password })
