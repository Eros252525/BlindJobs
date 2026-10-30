// The RAND-36 health survey is not saved. Answers are scored in the browser and
// shown only to the applicant, who can download a copy (see AssessmentsScreen).
// Nothing reaches the database, so no employer and nobody on our team can see them.
//
// Versions before October 23, 2026 saved them as health_assessment:<userId>.
// This hands such a copy back once, so the applicant can see or save it, and
// deletes it from the database in the same step.
import type { HealthAssessment } from '@/types'
import { kvDelete, kvGet } from './client'

export async function takeOldHealthAssessment(userId: string): Promise<HealthAssessment | null> {
  const key = `health_assessment:${userId}`
  const a: HealthAssessment | null = await kvGet(key)
  if (a) await kvDelete(key)
  return a
}
