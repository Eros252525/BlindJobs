// The applicant's profile.
import { mobileProblem, phMobile } from '@/lib/phone'
import { emailProblem, nameProblem } from '@/lib/validation'
import type { ApplicantProfile } from '@/types'
import { kvGet, kvSet } from './client'

// ── Profile ───────────────────────────────────────────────────────────────────

// Lists saved as text, text saved as a number, missing fields: profiles saved by
// older versions (or edited by hand) come in many shapes. Every profile is put in
// the one shape the screens expect when it is read, so a stray value can never
// crash a page.
const asText = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : typeof v === 'string' && v.trim() ? v.split(',').map(s => s.trim()).filter(Boolean) : []

export function normalizeProfile(p: any): ApplicantProfile {
  if (!p || typeof p !== 'object') return {}
  const out: ApplicantProfile = { ...p }
  for (const k of ['firstName', 'middleName', 'lastName', 'suffix', 'mobile', 'email', 'username', 'gender', 'disabilityType', 'location', 'about', 'educationLevel', 'school', 'trainings'] as const) {
    if (k in p) out[k] = asText(p[k])
  }
  for (const k of ['skills', 'assistiveTech', 'workSetup', 'languages', 'accommodations'] as const) out[k] = asList(p[k])
  out.experience = (Array.isArray(p.experience) ? p.experience : [])
    .filter((x: any) => x && typeof x === 'object')
    .map((x: any) => ({ title: asText(x.title), company: asText(x.company), period: asText(x.period) }))
  return out
}

export async function getProfile(userId: string) {
  const p = await kvGet(`applicant_profile:${userId}`)
  if (!p) throw new Error('Not found')
  return normalizeProfile(p)
}

export async function updateProfile(userId: string, body: Record<string, any>) {
  const tooLong = nameProblem('First name', body.firstName) || nameProblem('Middle name', body.middleName) || nameProblem('Last name', body.lastName)
  if (tooLong) throw new Error(tooLong)
  // The optional email an applicant adds for password resets: shaped like an address, or empty.
  // A changed address is never saved as confirmed: only EmailConfirm sets that, after the code.
  const badEmail = emailProblem(body.email)
  if (badEmail) throw new Error(badEmail)
  // Philippine mobile numbers only, checked here too so no way of saving gets round it
  if ('mobile' in body && body.mobile) {
    const bad = mobileProblem(body.mobile)
    if (bad) throw new Error(bad)
    body = { ...body, mobile: phMobile(body.mobile) }
  }
  const existing = await kvGet(`applicant_profile:${userId}`) || {}
  if ('email' in body && body.email !== existing.email && body.emailVerified) body = { ...body, emailVerified: false }
  const updated = { ...existing, ...body }
  await kvSet(`applicant_profile:${userId}`, updated)
  return updated
}
