// What makes a job "match" an applicant. Shared by the Jobs screen (the ✓ on a
// skill) and the new-job notifications, so the two never disagree.
import type { ApplicantProfile, Job } from '@/types'

/** A job's skills are typed as one comma-separated line. */
export const jobSkillList = (job: Pick<Job, 'skills'>) =>
  (job.skills || '').split(',').map(s => s.trim()).filter(Boolean)

/** Loose on purpose: "Typing" matches "Fast typing", and the other way round. */
export function skillMatches(jobSkill: string, userSkills: string[]): boolean {
  const s = jobSkill.toLowerCase()
  return userSkills.some(u => {
    const us = (u || '').trim().toLowerCase()
    return !!us && (s.includes(us) || us.includes(s))
  })
}

// Locations are free text ("Quezon City, Metro Manila", "Manila, Remote / Work
// from Home"), so compare them piece by piece.
const places = (s: string) => s.toLowerCase().split(/[,/]/).map(p => p.trim()).filter(p => p.length > 2)

export function sameArea(a: string, b: string): boolean {
  const pa = places(a), pb = places(b)
  return pa.some(x => pb.some(y => x.includes(y) || y.includes(x)))
}

export type JobMatch = { skills: string[]; location: boolean }

/**
 * Why a newly posted job suits this applicant, or null if they should not be told
 * about it. A shared skill or the same area is enough. A job limited to visual categories the
 * applicant is not in is never announced to them.
 */
export function jobMatch(job: Job, p: ApplicantProfile): JobMatch | null {
  const cats = job.disabilityCategories || []
  const mine = (p.disabilityType || '').toLowerCase()
  if (cats.length && !cats.some(c => c.toLowerCase() === mine)) return null
  const skills = jobSkillList(job).filter(s => skillMatches(s, p.skills || []))
  const location = sameArea(job.location || '', p.location || '')
  return skills.length || location ? { skills, location } : null
}
