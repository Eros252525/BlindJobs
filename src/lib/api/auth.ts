// Registering and signing in.
import { consentRecord } from '@/lib/documents/legal'
import { gmailAddress, gmailProblem } from '@/lib/gmail'
import { normalizeUsername, usernameProblem } from '@/lib/username'
import { nameProblem, passwordProblem } from '@/lib/validation'
import { mobileProblem, phMobile } from '@/lib/phone'
import { t } from '@/lib/i18n'
import { kvDelete, kvGet, kvSet } from './client'
import { sendLoginAlert, sendWelcome } from './email'

async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Auth ──────────────────────────────────────────────────────────────────────

// Users type either "name" or a full "name@domain" into the username box, with
// stray spaces/capitals. Normalize to one canonical lowercase email.
function normalizeEmail(input: string): string {
  const v = (input || '').trim().toLowerCase()
  return v.includes('@') ? v : `${v}@gmail.com`
}

// Older accounts were stored under `${rawInput}@gmail.com` (e.g. "a@b.com@gmail.com",
// "One@gmail.com"), so also try those keys to keep them able to log in.
async function findUserByEmail(input: string): Promise<any> {
  const raw = input || ''
  const candidates = [...new Set([
    normalizeEmail(raw),
    `${raw}@gmail.com`,
    `${raw.trim()}@gmail.com`,
    `${raw.trim().toLowerCase()}@gmail.com`,
  ])]
  for (const email of candidates) {
    const entry = await kvGet(`user_by_email:${email}`)
    if (entry) return { entry, email }
  }
  return null
}

/** False when an account already uses this email. */
export async function emailAvailable(email: string): Promise<boolean> {
  return !(await findUserByEmail(email))
}

/**
 * False when an applicant already has this username, or when it would clash with
 * an older account that signs in by typing only the part of its Gmail before the @.
 */
export async function usernameAvailable(username: string): Promise<boolean> {
  const name = normalizeUsername(username)
  return !(await kvGet(`user_by_username:${name}`)) && !(await kvGet(`user_by_email:${name}@gmail.com`))
}

// What was typed in the sign-in box: an applicant's username, or an email address
// (employers, and applicants who registered before usernames).
async function findUser(input: string): Promise<{ entry: any } | null> {
  const typed = (input || '').trim()
  if (typed && !typed.includes('@')) {
    const entry = await kvGet(`user_by_username:${normalizeUsername(typed)}`)
    if (entry) return { entry }
  }
  return findUserByEmail(input)
}

// The one answer to every failed sign-in, so it never tells whether an account exists
const BAD_SIGN_IN = () => t('Email, username or password is incorrect.')

// A Gmail an account is made with: free, and proved by the email function, through a
// typed-back code or Sign in with Google (it marks the address either way)
async function provedGmail(input: string): Promise<string> {
  if (!input?.trim()) throw new Error('Gmail address is required')
  const problem = gmailProblem(input)
  if (problem) throw new Error(problem)
  const email = gmailAddress(input)
  if (await findUserByEmail(email)) throw new Error('Email already registered')
  if (!(await kvGet(`email_verified:${email}`))) throw new Error('Please confirm your Gmail address first, with the code we emailed to it.')
  return email
}

/**
 * Makes an account. With `google: true` it is made with the Gmail Google proved
 * (`optionalEmail` for applicants, `emailUsername` for employers) and no password:
 * the person signs in with Google, and can set a password later with Forgot password.
 */
export async function register(body: Record<string, any>) {
  const { role, username, emailUsername, optionalEmail, password, firstName, lastName, middleName, suffix, mobile, gender, disabilityType, skills, companyName, consent, google } = body
  if (!google) {
    if (!password) throw new Error(t('Please fill in: {fields}.', { fields: t('Password') }))
    const weak = passwordProblem(password)
    if (weak) throw new Error(weak)
  }
  // No account without consent, whatever the form did (Data Privacy Act, RA 10173)
  if (!consent?.privacy || !consent?.terms) throw new Error('You must agree to the Privacy Notice and the Terms and Conditions')
  const id = crypto.randomUUID()
  const hashed = google ? null : await hashPassword(password)
  const createdAt = new Date().toISOString()

  // Applicants: a username, no email (many blind applicants have none);
  // with Google, their Gmail in place of the username
  if (role === 'applicant') {
    let name = ''
    if (!google) {
      if (!username?.trim()) throw new Error('Username is required')
      // Checked here as well as in the form, so no way of registering gets round it
      const problem = usernameProblem(username)
      if (problem) throw new Error(problem)
      name = normalizeUsername(username)
      if (!(await usernameAvailable(name))) throw new Error('That username is taken. Choose another one.')
    }
    if (!firstName?.trim() || !lastName?.trim()) throw new Error('First name and last name are required')
    const badMobile = mobileProblem(mobile)
    if (badMobile) throw new Error(badMobile)
    // Optional, and only a Gmail (the email service confirms and sends to Gmail only).
    // Saved unconfirmed: it is used for nothing until the applicant types back the emailed code.
    const badEmail = optionalEmail?.trim() ? gmailProblem(optionalEmail) : null
    if (badEmail) throw new Error(badEmail)
    const contactEmail = optionalEmail?.trim() ? gmailAddress(optionalEmail) : ''
    const tooLong = nameProblem('First name', firstName) || nameProblem('Middle name', middleName) || nameProblem('Last name', lastName)
    if (tooLong) throw new Error(tooLong)
    const googleEmail = google ? await provedGmail(optionalEmail) : ''
    // `consent` is the record of what was agreed to: document versions and the time
    if (google) {
      // Signs in with the Gmail, like applicants from before usernames
      await kvSet(`user:${id}`, { id, role, email: googleEmail, password: hashed, createdAt, consent: consentRecord() })
      await kvSet(`user_by_email:${googleEmail}`, { userId: id })
      await kvDelete(`email_verified:${googleEmail}`)
    } else {
      await kvSet(`user:${id}`, { id, role, username: name, email: '', password: hashed, createdAt, consent: consentRecord() })
      await kvSet(`user_by_username:${name}`, { userId: id })
    }
    await kvSet(`applicant_profile:${id}`, {
      userId: id, username: name, firstName: firstName.trim(), lastName: lastName.trim(),
      middleName: (middleName || '').trim(), suffix: suffix || '', email: google ? googleEmail : contactEmail, emailVerified: !!google,
      mobile: phMobile(mobile) ?? '', gender: gender || '', disabilityType: disabilityType || '',
      skills: skills || [], photoUrl: null,
    })
    if (google) sendWelcome(id)
    return { id, role, email: google ? googleEmail : name, name: `${firstName.trim()} ${lastName.trim()}` }
  }

  // Employers: a Gmail address, proved real with an emailed code or by Google
  const email = await provedGmail(emailUsername)
  await kvSet(`user:${id}`, { id, role, email, password: hashed, createdAt, consent: consentRecord() })
  await kvSet(`user_by_email:${email}`, { userId: id })
  await kvDelete(`email_verified:${email}`)
  await kvSet(`employer_profile:${id}`, { userId: id, companyName: companyName || email, email })
  sendWelcome(id)
  return { id, role, email, name: companyName || email }
}

export async function login(emailOrUsername: string, password: string, role: string) {
  if (!emailOrUsername.trim() || !password) throw new Error(t('Please fill in: {fields}.', { fields: `${t('Email or username')}, ${t('Password')}` }))
  // Hashed before the lookup, so an unknown account takes as long to refuse as a wrong password
  const hashed = await hashPassword(password)
  const found = await findUser(emailOrUsername)
  const user = found ? await kvGet(`user:${found.entry.userId}`) : null
  // Support both hashed and legacy plaintext passwords
  if (!user || (user.password !== hashed && user.password !== password)) throw new Error(BAD_SIGN_IN())
  if (user.role !== role) {
    throw new Error(user.role === 'employer'
      ? t('This account is registered as an Employer. Select "Employer" and try again.')
      : t('This account is registered as an Applicant. Select "Applicant" and try again.'))
  }
  // `email` on the signed-in user is what they sign in with: the email, or the username
  const signIn: string = user.email || user.username
  if (role === 'applicant') {
    const p = await kvGet(`applicant_profile:${user.id}`)
    // Only accounts with an email get the sign-in alert: an applicant's once confirmed
    if (p?.email && p.emailVerified) sendLoginAlert(user.id)
    return { id: user.id, role, email: signIn, name: p ? `${p.firstName} ${p.lastName}`.trim() || signIn : signIn }
  } else {
    if (user.email) sendLoginAlert(user.id)
    const p = await kvGet(`employer_profile:${user.id}`)
    return { id: user.id, role, email: signIn, name: p?.companyName || signIn }
  }
}
