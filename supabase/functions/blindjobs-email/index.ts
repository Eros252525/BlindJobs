// Blind Jobs email: proves a Gmail address is real with a 6-digit code, and tells
// people by email when their account is signed in to.
//
// Runs on Supabase (Deno). It sends through a Gmail account made for Blind Jobs,
// using a Google "app password". Secrets, set once with `supabase secrets set`:
//   GMAIL_USER          the Blind Jobs Gmail address that sends the emails
//   GMAIL_APP_PASSWORD  its 16-letter app password (not the normal password)
//   CODE_SECRET         any long random text; codes are stored only as HMACs keyed by it
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase itself.
//
// Actions (POST JSON with an `action` field):
//   send-code    { email }        emails a code, before an account is created
//   verify-code  { email, code }  checks it; on success marks the address as confirmed
//   login-alert  { email }        emails "your account was just signed in to"
import nodemailer from 'npm:nodemailer@6.9.16'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const TABLE = 'kv_store_6ad6397b'
const CODE_MINUTES = 10
const MAX_TRIES = 5
const RESEND_SECONDS = 60
const ALERT_SECONDS = 60

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const FROM = Deno.env.get('GMAIL_USER')!
// Supabase blocks ports 25 and 587 for outgoing mail; 465 (SSL) is allowed
const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 465, secure: true,
  auth: { user: FROM, pass: Deno.env.get('GMAIL_APP_PASSWORD')! },
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
  await mailer.sendMail({
    from: `Blind Jobs <${FROM}>`, to: email,
    subject: `Your Blind Jobs code is ${code}`,
    text: `Your Blind Jobs code is ${spaced}.\n\nType it on the Blind Jobs page to confirm this is your Gmail address. It works for ${CODE_MINUTES} minutes.\n\nIf you did not ask for this, you can ignore this email.`,
    html: page([
      'Your Blind Jobs code is:',
      `<strong style="font-size:32px;letter-spacing:8px">${code}</strong>`,
      `Type it on the Blind Jobs page to confirm this is your Gmail address. It works for ${CODE_MINUTES} minutes.`,
      'If you did not ask for this, you can ignore this email.',
    ]),
  })
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

async function loginAlert(rawEmail: unknown, req: Request) {
  const email = String(rawEmail || '').trim().toLowerCase()
  // Only for real accounts, and at most once a minute, so this cannot be used to flood an inbox
  if (!email || !(await get(`user_by_email:${email}`))) throw new Refusal('No account uses this address.', 404)
  const last = await get(`login_alert:${email}`)
  if (last && Date.now() - last.sentAt < ALERT_SECONDS * 1000) return
  await put(`login_alert:${email}`, { sentAt: Date.now() })

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

function describeDevice(ua: string) {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'a web browser'
  const system = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone or iPad' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'an unknown device'
  return `${browser} on ${system}`
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
      case 'login-alert': await loginAlert(body.email, req); break
      default: throw new Refusal('Unknown action.')
    }
    return reply({ ok: true })
  } catch (e) {
    if (e instanceof Refusal) return reply({ error: e.message }, e.status)
    console.error(e)
    return reply({ error: 'The email could not be sent right now. Please try again in a minute.' }, 500)
  }
})
