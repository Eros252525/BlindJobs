// What a job post must have before it is published. The Post a Job form and
// postJob both check it, so no way of posting gets round it.

const REMOTE = /remote|work from home|wfh|home[- ]based/i

// Optional: posts saved by earlier versions may lack any of them
export type JobPostFields = { companyName?: string; jobTitle?: string; skills?: string; salary?: string; description?: string; location?: string; jobType?: string }

/** A location is needed unless the job is done from home. */
export const needsLocation = (jobType: string) => jobType !== 'Remote'

/**
 * Why the location and the work mode disagree, in words for the employer, or
 * null when they agree. A Remote job named after a city ("Manila") reads as
 * on-site; an On-site job "from home" cannot be both.
 */
export function workModeProblem(jobType: string, location: string): string | null {
  const loc = location.trim()
  if (!loc) return null // a missing location is reported as a missing field
  if (jobType === 'Remote' && !REMOTE.test(loc)) {
    return `The job type is Remote, but the location is "${loc}". If people work there, choose On-site or Hybrid. If they work from home, change the location to "Remote / Work from Home", or leave it empty.`
  }
  if (jobType === 'On-site' && REMOTE.test(loc)) {
    return `The job type is On-site, but the location says the work is from home. Choose Remote or Hybrid, or type the city where people work.`
  }
  return null
}

/** The first thing stopping a job from being published, or null. For postJob; the form names each field itself. */
export function jobPostProblem(f: JobPostFields): string | null {
  const missing = [
    ['Company name', f.companyName], ['Job title', f.jobTitle], ['Required core skills', f.skills],
    ['Salary', f.salary], ['Job description', f.description],
    ...(needsLocation(f.jobType || '') ? [['Location', f.location]] : []),
  ].filter(([, v]) => !(v || '').trim()).map(([label]) => label)
  if (missing.length) return `Please fill in: ${missing.join(', ')}.`
  return workModeProblem(f.jobType || '', f.location || '')
}

/**
 * Whether applicants can see a job and apply: it is Active and nothing on the post
 * needs fixing. A post saved before these checks existed, with a missing description
 * or a location that contradicts its work mode, stays hidden until the employer edits it.
 */
export const jobIsOpen = (job: JobPostFields & { status?: string }) =>
  (job.status || 'Active') === 'Active' && !jobPostProblem(job)

/** Why an applicant cannot apply for a job, in one or two words: "Paused", "Closed", or "Being updated". */
export const jobClosedLabel = (job: JobPostFields & { status?: string }) =>
  (job.status || 'Active') === 'Active' ? 'Being updated' : job.status!
