// The RAND-36 health survey: saved only with the applicant's consent, in its own
// row rather than on the profile, so it never travels with an application.
import type { HealthAssessment } from '@/types'
import { kvDelete, kvGet, kvSet } from './client'

const key = (userId: string) => `health_assessment:${userId}`

export async function getHealthAssessment(userId: string): Promise<HealthAssessment | null> {
  return kvGet(key(userId))
}

export async function saveHealthAssessment(userId: string, assessment: HealthAssessment) {
  await kvSet(key(userId), assessment)
  return assessment
}

/** Deletes the answers and scores for good, when the applicant asks. */
export async function deleteHealthAssessment(userId: string) {
  await kvDelete(key(userId))
}
