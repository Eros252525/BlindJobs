// The job-fit score: how well one job suits one applicant, as a number from 0 to
// 100 and, more importantly, the reasons behind it. The applicant's Jobs screen
// and the employer's applicant view both read it from here, so the two always
// show the same number for the same pair.
//
// What goes in: skills, the skills-check score for the job's kind of work, work
// setup, location and experience. What never goes in: the type of visual
// disability, which may not count against an applicant (Magna Carta for Persons
// with Disability, RA 7277).
import { categoryById } from '@/lib/assessment/work-categories'
import { jobSkillList, sameArea, skillMatches } from '@/lib/matching'
import type { ApplicantProfile, Job } from '@/types'

export type FitPartId = 'skills' | 'category' | 'setup' | 'location' | 'experience'

export interface FitPart {
  id: FitPartId
  label: string
  /** Points earned and points possible; the possible points of all parts add up to 100. */
  earned: number
  max: number
  /** Why, in a sentence the applicant or employer can read. */
  reason: string
  /** What the applicant could do to raise this part, when there is something. */
  tip?: string
}

export interface JobFit {
  score: number
  parts: FitPart[]
  /** False when the employer limited the job to visual categories the applicant is not in. */
  eligible: boolean
  /** Set when the job asks for a minimum skills-check score: whether the applicant has reached it. */
  meetsMinimum?: boolean
  summary: string
}

// Share of the score each part carries. A part that does not apply to a job (no
// work category chosen, no skills listed) is left out and the rest are scaled up
// to 100, so a job is never marked down for something it did not ask for.
const WEIGHTS: Record<FitPartId, number> = { skills: 35, category: 30, setup: 15, location: 10, experience: 10 }

const isRemote = (job: Job) => /remote|work from home|wfh/i.test(`${job.jobType || ''} ${job.location || ''}`)

// Past jobs the applicant listed, as a stand-in for the level a job asks for
const NEEDED_JOBS: Record<string, number> = { 'Entry Level': 0, Intermediate: 1, 'Senior Level': 2 }

export function jobFit(job: Job, p: ApplicantProfile | null | undefined): JobFit {
  const profile = p || {}
  const raw: (Omit<FitPart, 'earned' | 'max'> & { share: number })[] = []

  // Skills: the share of the job's listed skills that the applicant has
  const wanted = jobSkillList(job)
  const mine = (profile.skills || []).filter(Boolean)
  if (wanted.length) {
    const hits = wanted.filter(s => skillMatches(s, mine))
    const lacking = wanted.filter(s => !hits.includes(s))
    raw.push({
      id: 'skills', label: 'Skills', share: hits.length / wanted.length,
      reason: hits.length
        ? `${hits.length} of ${wanted.length} required skills match: ${hits.join(', ')}.`
        : `None of the ${wanted.length} required skills are on the profile yet.`,
      tip: lacking.length ? `Not on the profile: ${lacking.join(', ')}.` : undefined,
    })
  }

  // Skills check: the weighted score in the job's work category
  const category = categoryById(job.workCategory)
  let meetsMinimum: boolean | undefined
  if (category) {
    const result = profile.categoryScores?.[category.id]
    const min = Number(job.minCategoryScore) || 0
    if (result) {
      if (min) meetsMinimum = result.score >= min
      raw.push({
        id: 'category', label: `${category.name} skills check`, share: result.score / 100,
        reason: `Scored ${result.score} out of 100` + (min ? `; this job asks for at least ${min}, which is ${meetsMinimum ? 'met' : 'not met yet'}.` : '.'),
        tip: min && !meetsMinimum ? 'The skills check can be taken again.' : undefined,
      })
    } else {
      if (min) meetsMinimum = false
      raw.push({
        id: 'category', label: `${category.name} skills check`, share: 0,
        reason: 'Skills check not taken yet' + (min ? `; this job asks for at least ${min} out of 100.` : '.'),
        tip: `Take the ${category.name} skills check on the Assessments page.`,
      })
    }
  }

  // Work setup: the job's setup is one the applicant said they want
  const setups = profile.workSetup || []
  if (job.jobType) {
    const ok = setups.includes(job.jobType)
    raw.push({
      id: 'setup', label: 'Work setup', share: ok ? 1 : 0,
      reason: !setups.length ? `The job is ${job.jobType}; no preferred work setup is on the profile.`
        : ok ? `The job is ${job.jobType}, a preferred setup.`
        : `The job is ${job.jobType}; the profile prefers ${setups.join(', ')}.`,
      tip: !setups.length ? 'Add a preferred work setup to the profile.' : undefined,
    })
  }

  // Location: a remote job suits anywhere; otherwise the same city or province
  if (isRemote(job)) {
    raw.push({ id: 'location', label: 'Location', share: 1, reason: 'The job can be done from home, so location does not matter.' })
  } else if (job.location?.trim()) {
    const near = sameArea(job.location, profile.location || '')
    raw.push({
      id: 'location', label: 'Location', share: near ? 1 : 0,
      reason: !profile.location?.trim() ? `The job is in ${job.location}; no location is on the profile.`
        : near ? `The job is in ${job.location}, the same area as ${profile.location}.`
        : `The job is in ${job.location}; the profile says ${profile.location}.`,
      tip: !profile.location?.trim() ? 'Add a location to the profile.' : undefined,
    })
  }

  // Experience: past jobs listed, against the level the job asks for
  if (job.experienceLevel && job.experienceLevel in NEEDED_JOBS) {
    const need = NEEDED_JOBS[job.experienceLevel]
    const have = (profile.experience || []).filter(x => x.title?.trim()).length
    raw.push({
      id: 'experience', label: 'Experience', share: need === 0 ? 1 : Math.min(1, have / need),
      reason: need === 0 ? 'An entry-level job: no past experience is required.'
        : `A ${job.experienceLevel.toLowerCase()} job; ${have} past job${have === 1 ? ' is' : 's are'} listed on the profile.`,
      tip: need > have ? 'Add past work to the profile, if there is more.' : undefined,
    })
  }

  // The score is the sum of the parts as shown, so the reasons always add up to it.
  const maxes = shareOut(raw.map(part => WEIGHTS[part.id]), 100)
  const parts: FitPart[] = raw.map(({ share, ...part }, i) => ({ ...part, max: maxes[i], earned: Math.round(share * maxes[i]) }))
  const score = parts.reduce((sum, part) => sum + part.earned, 0)

  const cats = job.disabilityCategories || []
  const eligible = !cats.length || cats.some(c => c.toLowerCase() === (profile.disabilityType || '').toLowerCase())

  return { score, parts, eligible, meetsMinimum, summary: fitSummary(score, parts, eligible, meetsMinimum) }
}

/** Splits `total` whole points in proportion to `weights`; leftover points go to the largest remainders. */
function shareOut(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!sum) return weights.map(() => 0)
  const exact = weights.map(w => (w / sum) * total)
  const out = exact.map(Math.floor)
  const byRemainder = exact.map((x, i) => ({ i, rest: x - out[i] })).sort((a, b) => b.rest - a.rest)
  const left = total - out.reduce((a, b) => a + b, 0)
  for (let k = 0; k < left; k++) out[byRemainder[k].i]++
  return out
}

export function fitLabel(score: number): string {
  if (score >= 75) return 'Strong fit'
  if (score >= 50) return 'Good fit'
  if (score >= 25) return 'Partial fit'
  return 'Low fit'
}

function fitSummary(score: number, parts: FitPart[], eligible: boolean, meetsMinimum?: boolean): string {
  if (!eligible) return 'The employer has limited this job to other visual categories.'
  const best = [...parts].filter(part => part.earned > 0).sort((a, b) => b.earned - a.earned)[0]
  return `${fitLabel(score)}, ${score} out of 100.` +
    (best ? ` Strongest part: ${best.label.toLowerCase()}.` : '') +
    (meetsMinimum === false ? ' Below the skills-check score this employer asks for.' : '')
}

/**
 * Jobs in the order to show an applicant: the ones they may apply to first, by
 * score, with the newest first among equal scores.
 */
export function rankJobs(jobs: Job[], p: ApplicantProfile | null | undefined): { job: Job; fit: JobFit }[] {
  return jobs
    .map(job => ({ job, fit: jobFit(job, p) }))
    .sort((a, b) =>
      Number(b.fit.eligible) - Number(a.fit.eligible) ||
      b.fit.score - a.fit.score ||
      (b.job.createdAt || '').localeCompare(a.job.createdAt || ''))
}
