// The applicant's profile.
import { kvGet, kvSet } from './client'

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const p = await kvGet(`applicant_profile:${userId}`)
  if (!p) throw new Error('Not found')
  return p
}

export async function updateProfile(userId: string, body: Record<string, any>) {
  const existing = await kvGet(`applicant_profile:${userId}`) || {}
  const updated = { ...existing, ...body }
  await kvSet(`applicant_profile:${userId}`, updated)
  return updated
}
