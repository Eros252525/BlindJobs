// Blind Jobs email: proves a Gmail address is real with a 6-digit code, welcomes new
// accounts, and tells people by email when their account is signed in to.
//
// Runs on Supabase (Deno). It sends through a Gmail account made for Blind Jobs,
// using a Google "app password". Secrets, set once with `supabase secrets set`:
//   GMAIL_USER          the Blind Jobs Gmail address that sends the emails
//   GMAIL_APP_PASSWORD  its 16-letter app password (not the normal password)
//   CODE_SECRET         any long random text; codes are stored only as HMACs keyed by it
//   SEMAPHORE_API_KEY   (optional) Semaphore SMS API key, for password-reset codes by text
//                       message to applicants' Philippine mobile numbers (semaphore.co)
//   SITE_URL            (optional) the app's address, linked in the welcome email
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase itself.
//
// Actions (POST JSON with an `action` field):
//   send-code    { email }        emails a code, before an account is created
//   verify-code  { email, code }  checks it; on success marks the address as confirmed
//   login-alert  { userId }       emails "your account was just signed in to"
//   welcome      { userId }       emails "your account is ready", once per account
//                (both go only to the account's own address: an employer's Gmail, or an
//                applicant's Gmail once they confirmed it with a code)
//   send-reset   { role, login, channel: 'sms' | 'email', contact }
//                texts or emails a password-reset code, if `contact` is the mobile
//                number or email saved on the account `login` (username or email)
//   reset-password { role, login, code, password }  checks the code, sets the new password
import nodemailer from 'npm:nodemailer@6.9.16'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const TABLE = 'kv_store_6ad6397b'
const CODE_MINUTES = 10
const MAX_TRIES = 5
const RESEND_SECONDS = 60
const ALERT_SECONDS = 60

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
// Spaces removed: Google shows app passwords as "abcd efgh ijkl mnop", and a pasted
// secret easily carries a stray space or line break
const FROM = (Deno.env.get('GMAIL_USER') || '').replace(/\s/g, '')
// Supabase blocks ports 25 and 587 for outgoing mail; 465 (SSL) is allowed
const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 465, secure: true,
  auth: { user: FROM, pass: (Deno.env.get('GMAIL_APP_PASSWORD') || '').replace(/\s/g, '') },
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

class Refusal extends Error { constructor(message: string, public status = 400) { super(message) } }

// ── storage (the same key → JSON table the app uses) ─────────────────────────

async function get(key: string) {
  const { data, error } = await db.from(TABLE).select('value').eq('key', key).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.value ?? null
}
async function put(key: string, value: unknown) {
  const { error } = await db.from(TABLE).upsert({ key, value })
  if (error) throw new Error(error.message)
}
async function drop(key: string) {
  const { error } = await db.from(TABLE).delete().eq('key', key)
  if (error) throw new Error(error.message)
}

// ── Gmail addresses (same rules as src/lib/gmail.ts) ──────────────────────────

function gmail(input: unknown): string {
  const name = String(input || '').trim().toLowerCase().replace(/@(gmail|googlemail)\.com$/, '')
  if (!/^[a-z0-9.]{6,30}$/.test(name) || /^\.|\.$|\.\./.test(name)) throw new Refusal('That is not a Gmail address.')
  return `${name}@gmail.com`
}

// ── codes ─────────────────────────────────────────────────────────────────────

const encoder = new TextEncoder()
const secretKey = crypto.subtle.importKey(
  'raw', encoder.encode(Deno.env.get('CODE_SECRET')!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

// Stored instead of the code, so reading the table does not reveal it
async function seal(email: string, code: string) {
  const mac = await crypto.subtle.sign('HMAC', await secretKey, encoder.encode(`${email}:${code}`))
  return Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function newCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(n).padStart(6, '0')
}

// ── emails: short, plain, large text, the code spaced out for screen readers ──

function page(lines: string[]) {
  return `<div style="font-family:Arial,sans-serif;font-size:18px;line-height:1.6;color:#111;max-width:560px">${
    lines.map(l => `<p>${l}</p>`).join('')}</div>`
}

async function sendCode(email: string) {
  if (await get(`user_by_email:${email}`)) throw new Refusal('An account already uses this Gmail address. Sign in instead.')
  const last = await get(`email_code:${email}`)
  const wait = last ? RESEND_SECONDS - Math.floor((Date.now() - last.sentAt) / 1000) : 0
  if (wait > 0) throw new Refusal(`A code was just sent. You can ask for another in ${wait} seconds.`, 429)

  const code = newCode()
  await put(`email_code:${email}`, { mac: await seal(email, code), sentAt: Date.now(), expiresAt: Date.now() + CODE_MINUTES * 60_000, tries: 0 })
  const spaced = code.split('').join(' ')
  await unlessSent(`email_code:${email}`, () => mailer.sendMail({
    from: `Blind Jobs <${FROM}>`, to: email,
    subject: `Your Blind Jobs code is ${code}`,
    text: `Your Blind Jobs code is ${spaced}.\n\nType it on the Blind Jobs page to confirm this is your Gmail address. It works for ${CODE_MINUTES} minutes.\n\nIf you did not ask for this, you can ignore this email.`,
    html: page([
      'Your Blind Jobs code is:',
      `<strong style="font-size:32px;letter-spacing:8px">${code}</strong>`,
      `Type it on the Blind Jobs page to confirm this is your Gmail address. It works for ${CODE_MINUTES} minutes.`,
      'If you did not ask for this, you can ignore this email.',
    ]),
  }))
}

// A code is stored before it is sent; if sending fails, it is removed again, so the
// next try sends a new one instead of being told (or silently treated as if) one was just sent
async function unlessSent(key: string, send: () => Promise<unknown>) {
  try { await send() } catch (e) { await drop(key).catch(() => {}); throw e }
}

async function verifyCode(email: string, code: unknown) {
  const entry = await get(`email_code:${email}`)
  if (!entry || Date.now() > entry.expiresAt) throw new Refusal('That code has expired. Ask for a new one.')
  if (entry.tries >= MAX_TRIES) throw new Refusal('Too many wrong tries. Ask for a new code.')
  const typed = String(code || '').replace(/\D/g, '')
  if (typed.length !== 6 || (await seal(email, typed)) !== entry.mac) {
    const left = MAX_TRIES - entry.tries - 1
    await put(`email_code:${email}`, { ...entry, tries: entry.tries + 1 })
    throw new Refusal(left > 0
      ? `That code is not right. Check the email and try again (${left} ${left === 1 ? 'try' : 'tries'} left).`
      : 'That code is not right, and that was the last try. Ask for a new code.')
  }
  await drop(`email_code:${email}`)
  await put(`email_verified:${email}`, { verifiedAt: new Date().toISOString() })
}

/**
 * The account `userId` and the address its emails go to, or null when it has none:
 * an employer's Gmail, or an applicant's added Gmail once confirmed with a code.
 */
async function accountAddress(userId: unknown) {
  const id = String(userId || '')
  const user = id && await get(`user:${id}`)
  if (!user) return null
  if (user.email) return { user, email: String(user.email).trim().toLowerCase() }
  const profile = user.role === 'applicant' ? await get(`applicant_profile:${user.id}`) : null
  const email = profile?.emailVerified && profile.email ? String(profile.email).trim().toLowerCase() : ''
  return email ? { user, email } : null
}

async function loginAlert(userId: unknown, req: Request) {
  // Only to the account's own address, and at most once a minute, so this cannot be used to flood an inbox
  const account = await accountAddress(userId)
  if (!account) return
  const { email } = account
  const key = `login_alert:${account.user.id}`
  const last = await get(key)
  if (last && Date.now() - last.sentAt < ALERT_SECONDS * 1000) return
  await put(key, { sentAt: Date.now() })

  const when = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'full', timeStyle: 'short' })
  const device = describeDevice(req.headers.get('user-agent') || '')
  await mailer.sendMail({
    from: `Blind Jobs <${FROM}>`, to: email,
    subject: 'New sign-in to your Blind Jobs account',
    text: `Your Blind Jobs account was just signed in to.\n\nWhen: ${when} (Philippine time)\nDevice: ${device}\n\nIf this was you, there is nothing to do.\nIf it was not you, reply to this email straight away so we can help you secure your account.`,
    html: page([
      'Your Blind Jobs account was just signed in to.',
      `<strong>When:</strong> ${when} (Philippine time)<br><strong>Device:</strong> ${device}`,
      'If this was you, there is nothing to do.',
      'If it was not you, reply to this email straight away so we can help you secure your account.',
    ]),
  })
}

async function welcome(userId: unknown) {
  // Once per account, ever, so asking again sends nothing
  const account = await accountAddress(userId)
  if (!account) return
  const { user, email } = account
  const key = `welcome_sent:${user.id}`
  if (await get(key)) return
  await put(key, { sentAt: Date.now() })

  const signIn = user.email || user.username
  const site = Deno.env.get('SITE_URL') || ''
  await mailer.sendMail({
    from: `Blind Jobs <${FROM}>`, to: email,
    subject: 'Welcome to Blind Jobs',
    text: `Welcome to Blind Jobs. Your account is ready.\n\nYou sign in with: ${signIn}${site ? `\nSign in at: ${site}` : ''}\n\nCodes for a forgotten password, and an alert each time your account is signed in to, will be sent to this address.\n\nIf you did not make this account, reply to this email and we will help.`,
    html: page([
      'Welcome to Blind Jobs. Your account is ready.',
      `<strong>You sign in with:</strong> ${signIn}${site ? `<br><strong>Sign in at:</strong> <a href="${site}">${site}</a>` : ''}`,
      'Codes for a forgotten password, and an alert each time your account is signed in to, will be sent to this address.',
      'If you did not make this account, reply to this email and we will help.',
    ]),
  })
}

function describeDevice(ua: string) {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'a web browser'
  const system = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone or iPad' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'an unknown device'
  return `${browser} on ${system}`
}

// ── password reset ────────────────────────────────────────────────────────────
// A forgotten password is reset with a 6-digit code sent to what the account already
// has: the applicant's Philippine mobile number (most blind applicants have no email),
// or an email address. The person types the number or address themselves, and the
// answer is the same whether or not it matched, so the page never reveals whether an
// account exists or what its number is.

const SMS_KEY = Deno.env.get('SEMAPHORE_API_KEY') || ''
const MIN_PASSWORD = 8

/** The 10 digits after +63 of a Philippine mobile number, or null (same rules as src/lib/phone.ts). */
function phMobile(input: unknown): string | null {
  const raw = String(input || '').trim()
  if (!raw || /[^\d\s()+.-]/.test(raw)) return null
  const digits = raw.replace(/\D/g, '')
  const local = raw.startsWith('+') || digits.startsWith('63')
    ? (digits.startsWith('63') ? digits.slice(2) : null)
    : digits.startsWith('0') ? digits.slice(1) : digits
  return local && /^9\d{9}$/.test(local) ? local : null
}

// The same hash the app stores passwords with (src/lib/api/auth.ts)
async function hashPassword(password: string) {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** The account a reset is asked for, or null. `login` is an applicant's username or an email address. */
async function findAccount(role: unknown, login: unknown) {
  const typed = String(login || '').trim().toLowerCase()
  if (!typed || (role !== 'applicant' && role !== 'employer')) return null
  const ref = (!typed.includes('@') && await get(`user_by_username:${typed}`)) || await get(`user_by_email:${typed}`)
  const user = ref && await get(`user:${ref.userId}`)
  if (!user || user.role !== role) return null
  const profile = role === 'applicant' ? await get(`applicant_profile:${user.id}`) : null
  return { user, profile }
}

async function sendSms(mobile: string, message: string) {
  const res = await fetch('https://api.semaphore.co/api/v4/messages', {
    method: 'POST',
    body: new URLSearchParams({ apikey: SMS_KEY, number: `0${mobile}`, message }),
  })
  if (!res.ok) throw new Error(`Semaphore answered ${res.status}: ${await res.text()}`)
}

async function sendReset(body: Record<string, unknown>) {
  const channel = body.channel === 'sms' ? 'sms' : 'email'
  // Said before any lookup, so it tells nothing about the account
  if (channel === 'sms' && !SMS_KEY) throw new Refusal('Codes by text message are not set up yet. Choose email, or ask Blind Jobs for help.', 503)
  const account = await findAccount(body.role, body.login)
  if (!account) return
  const { user, profile } = account
  let to = ''
  if (channel === 'sms') {
    const typed = phMobile(body.contact)
    if (typed && typed === phMobile(profile?.mobile)) to = typed
  } else {
    const typed = String(body.contact || '').trim().toLowerCase()
    // an applicant's added email only once they confirmed it with a code, so a typo never gets codes
    const known = [user.email, profile?.emailVerified ? profile.email : ''].filter(Boolean).map((e: string) => e.trim().toLowerCase())
    if (typed && known.includes(typed)) to = typed
  }
  if (!to) return

  const key = `reset_code:${user.id}`
  const last = await get(key)
  if (last && Date.now() - last.sentAt < RESEND_SECONDS * 1000) return // one code a minute, silently
  const code = newCode()
  await put(key, { mac: await seal(user.id, code), sentAt: Date.now(), expiresAt: Date.now() + CODE_MINUTES * 60_000, tries: 0 })
  const spaced = code.split('').join(' ')
  await unlessSent(key, () => channel === 'sms'
    ? sendSms(to, `Blind Jobs: your code to reset your password is ${spaced}. It works for ${CODE_MINUTES} minutes. Do not share it with anyone.`)
    : mailer.sendMail({
      from: `Blind Jobs <${FROM}>`, to,
      subject: `Your Blind Jobs password reset code is ${code}`,
      text: `Your code to reset your Blind Jobs password is ${spaced}.\n\nIt works for ${CODE_MINUTES} minutes. Do not share it with anyone.\n\nIf you did not ask for this, you can ignore this email: your password has not changed.`,
      html: page([
        'Your code to reset your Blind Jobs password is:',
        `<strong style="font-size:32px;letter-spacing:8px">${code}</strong>`,
        `It works for ${CODE_MINUTES} minutes. Do not share it with anyone.`,
        'If you did not ask for this, you can ignore this email: your password has not changed.',
      ]),
    }))
}

async function resetPassword(body: Record<string, unknown>) {
  const password = String(body.password || '')
  if (password.length < MIN_PASSWORD) throw new Refusal(`The new password needs at least ${MIN_PASSWORD} characters.`)
  const wrong = 'That code is not right, or it has expired. Check it, or ask for a new code.'
  const account = await findAccount(body.role, body.login)
  if (!account) throw new Refusal(wrong)
  const key = `reset_code:${account.user.id}`
  const entry = await get(key)
  if (!entry || Date.now() > entry.expiresAt) throw new Refusal(wrong)
  if (entry.tries >= MAX_TRIES) throw new Refusal('Too many wrong tries. Ask for a new code.')
  const typed = String(body.code || '').replace(/\D/g, '')
  if (typed.length !== 6 || (await seal(account.user.id, typed)) !== entry.mac) {
    await put(key, { ...entry, tries: entry.tries + 1 })
    throw new Refusal(wrong)
  }
  await drop(key)
  await put(`user:${account.user.id}`, { ...account.user, password: await hashPassword(password), passwordChangedAt: new Date().toISOString() })
}

// ── entry ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'Use POST.' }, 405)
  try {
    const body = await req.json()
    switch (body.action) {
      case 'send-code': await sendCode(gmail(body.email)); break
      case 'verify-code': await verifyCode(gmail(body.email), body.code); break
      case 'login-alert': await loginAlert(body.userId, req); break
      case 'welcome': await welcome(body.userId); break
      case 'send-reset': await sendReset(body); break
      case 'reset-password': await resetPassword(body); break
      default: throw new Refusal('Unknown action.')
    }
    return reply({ ok: true })
  } catch (e) {
    if (e instanceof Refusal) return reply({ error: e.message }, e.status)
    console.error(e)
    return reply({ error: 'The email could not be sent right now. Please try again in a minute.' }, 500)
  }
})
