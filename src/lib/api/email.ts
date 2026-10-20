// Emails sent by the blindjobs-email Edge Function (supabase/functions/blindjobs-email):
// the code that proves a Gmail address is real, and the new sign-in alert.
// The Gmail password and the codes stay on the server; the browser only asks.
import { supabase } from './client'

const FUNCTION = 'blindjobs-email'

async function call(action: string, body: Record<string, unknown>) {
  const { error } = await supabase.functions.invoke(FUNCTION, { body: { action, ...body } })
  if (!error) return
  const response: Response | undefined = (error as any).context instanceof Response ? (error as any).context : undefined
  // Supabase's own answer when the function was never deployed (see README, "Email")
  if (response?.status === 404 && !(await response.clone().json().catch(() => null))?.error) {
    throw new Error('Blind Jobs cannot send emails yet: the email service has not been set up on the server. Please try again later.')
  }
  if (!response) throw new Error('Blind Jobs could not reach its email service. Check your internet connection and try again.')
  // The function answers refusals with { error: "words to show the user" }
  let message = ''
  try { message = (await response.json())?.error ?? '' } catch { /* not JSON */ }
  throw new Error(message || 'The email could not be sent right now. Please try again in a minute.')
}

/** Emails a 6-digit code to a Gmail address that has no account yet. */
export const sendEmailCode = (email: string) => call('send-code', { email })

/** Checks the code; on success the address may be used to register. */
export const verifyEmailCode = (email: string, code: string) => call('verify-code', { email, code })

/** Emails "your account was just signed in to". Never blocks signing in: a failure is only logged. */
export function sendLoginAlert(email: string) {
  call('login-alert', { email }).catch(e => console.warn('Sign-in alert not sent:', e.message))
}
