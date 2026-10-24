// The RAND-36 health survey was removed on October 24, 2026. Versions before October 23
// saved answers as health_assessment:<userId>; this deletes any copy still there.
// The applicant dashboard calls it on every visit, so old answers go without anyone
// having to do anything.
import { kvDelete } from './client'

export async function deleteOldHealthAnswers(userId: string) {
  await kvDelete(`health_assessment:${userId}`)
}
