// The applicant's profile.
import { mobileProblem, phMobile } from '@/lib/phone'
import { emailProblem, nameProblem } from '@/lib/validation'
import { kvGet, kvSet } from './client'

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const p = await kvGet(`applicant_profile:${userId}`)
  if (!p) throw new Error('Not found')
  return p
}

export async function updateProfile(userId: string, body: Record<string, any>) {
  const tooLong = nameProblem('First name', body.firstName) || nameProblem('Middle name', body.middleName) || nameProblem('Last name', body.lastName)
  if (tooLong) throw new Error(tooLong)
  // The optional email an applicant adds for password resets: shaped like an address, or empty
  const badEmail = emailProblem(body.email)
  if (badEmail) throw new Error(badEmail)
  // Philippine mobile numbers only, checked here too so no way of saving gets round it
  if ('mobile' in body && body.mobile) {
    const bad = mobileProblem(body.mobile)
    if (bad) throw new Error(bad)
    body = { ...body, mobile: phMobile(body.mobile) }
  }
  const existing = await kvGet(`applicant_profile:${userId}`) || {}
  const updated = { ...existing, ...body }
  await kvSet(`applicant_profile:${userId}`, updated)
  return updated
}
