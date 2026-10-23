// What makes a job "match" an applicant. Shared by the Jobs screen (the ✓ on a
// skill), job suggestions and the new-job notifications, so they never disagree.
import { t } from '@/lib/i18n'
import type { ApplicantProfile, Job } from '@/types'

/** A job's skills are typed as one comma-separated line. */
export const jobSkillList = (job: Pick<Job, 'skills'>) =>
  (job.skills || '').split(',').map(s => s.trim()).filter(Boolean)

// Lower-case words, with a plural "s" dropped so "Spreadsheets" meets "Spreadsheet"
const words = (s: string) =>
  s.toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean).map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))

/**
 * "Typing" matches "Fast typing", and the other way round: every word of the
 * shorter name is a word of the longer one. Whole words only, so "IT" never
 * matches "Writing".
 */
export function skillMatches(jobSkill: string, userSkills: string[]): boolean {
  const js = words(jobSkill)
  return userSkills.some(u => {
    const us = words(u || '')
    if (!us.length || !js.length) return false
    const [short, long] = us.length <= js.length ? [us, js] : [js, us]
    return short.every(w => long.includes(w))
  })
}

// Skills that nearly every job asks for and nearly every applicant has. They still
// count, at a quarter of the weight of other skills, but never make a match alone:
// "Typing" is no reason to suggest a web developer job.
const COMMON_SKILLS = new Set([
  'typing', 'communication', 'english communication', 'filipino communication', 'computer literacy',
  'active listening', 'teamwork', 'time management', 'problem solving',
].map(s => words(s).join(' ')))

export const isCommonSkill = (skill: string) => COMMON_SKILLS.has(words(skill).join(' '))

/** How much a skill counts in matching: 1, or 0.25 for a common skill. */
export const skillWeight = (skill: string) => (isCommonSkill(skill) ? 0.25 : 1)

// Words in a job title that say nothing about the work itself
const TITLE_FILLER = new Set([
  'and', 'the', 'for', 'with', 'junior', 'senior', 'lead', 'head', 'chief', 'assistant', 'associate', 'staff', 'officer',
  'specialist', 'representative', 'agent', 'worker', 'clerk', 'manager', 'supervisor', 'trainee', 'intern', 'part', 'time', 'full',
])

/**
 * Past jobs on the profile whose title shares a real word with this job's title
 * or skills: "Data encoder" for a "Data Entry Clerk", "Call centre agent" for a
 * job asking for "Call Handling".
 */
export function relatedExperience(job: Pick<Job, 'jobTitle' | 'skills'>, p: Pick<ApplicantProfile, 'experience'>): string[] {
  const jobWords = new Set([...words(job.jobTitle || ''), ...jobSkillList(job).flatMap(words)].filter(w => w.length > 2 && !TITLE_FILLER.has(w)))
  return (p.experience || []).map(x => x.title?.trim() || '').filter(t => t && words(t).some(w => jobWords.has(w)))
}

export interface SkillMatch {
  /** The job's skills the applicant has. */
  skills: string[]
  /** Past jobs related to this one. */
  experience: string[]
}

/** The job's skills the applicant has, and their past jobs related to it. */
export function skillMatch(job: Job, p: Pick<ApplicantProfile, 'skills' | 'experience'>): SkillMatch {
  const mine = (p.skills || []).filter(Boolean)
  return { skills: jobSkillList(job).filter(s => skillMatches(s, mine)), experience: relatedExperience(job, p) }
}

/**
 * Whether a job is close enough to suggest or announce. Two of its skills must
 * match, at least one of them not a common skill; or one such skill and related
 * past work. A job that names only one skill besides common ones (Transcription,
 * Typing) needs just that one.
 */
export function isGoodMatch(job: Job, m: SkillMatch): boolean {
  const specific = m.skills.filter(s => !isCommonSkill(s)).length
  if (!specific) return false
  const named = jobSkillList(job).filter(s => !isCommonSkill(s)).length
  return m.skills.length >= Math.min(2, Math.max(1, named)) || m.experience.length > 0
}

/** Why a job suits the applicant, in a short line: "Asks for your skills: Data Entry, Excel. Related to your work as Encoder". */
export function matchReason(m: SkillMatch): string {
  return [
    m.skills.length ? t(m.skills.length === 1 ? 'Asks for your skill: {skills}' : 'Asks for your skills: {skills}', { skills: m.skills.join(', ') }) : '',
    m.experience.length ? t('Related to your work as {jobs}', { jobs: m.experience.join(', ') }) : '',
  ].filter(Boolean).join('. ')
}

// Locations are free text ("Quezon City, Metro Manila", "Manila, Remote / Work
// from Home"), so compare them piece by piece.
const places = (s: string) => s.toLowerCase().split(/[,/]/).map(p => p.trim()).filter(p => p.length > 2)

export function sameArea(a: string, b: string): boolean {
  const pa = places(a), pb = places(b)
  return pa.some(x => pb.some(y => x.includes(y) || y.includes(x)))
}

export type JobMatch = SkillMatch & { location: boolean }

/**
 * Why a newly posted job suits this applicant, or null if they should not be told
 * about it. The same test as job suggestions (isGoodMatch); being in the same
 * area is added to the reason but is not enough alone. A job limited to visual
 * categories the applicant is not in is never announced to them.
 */
export function jobMatch(job: Job, p: ApplicantProfile): JobMatch | null {
  const cats = job.disabilityCategories || []
  const mine = (p.disabilityType || '').toLowerCase()
  if (cats.length && !cats.some(c => c.toLowerCase() === mine)) return null
  const m = skillMatch(job, p)
  if (!isGoodMatch(job, m)) return null
  return { ...m, location: sameArea(job.location || '', p.location || '') }
}
