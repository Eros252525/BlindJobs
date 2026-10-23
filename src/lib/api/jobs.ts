// Job posts: listing, posting, pausing and deleting.
import { jobIsOpen, jobPostProblem, type JobPostFields } from '@/lib/jobs/job-post'
import type { Job } from '@/types'
import { kvGet, kvList, kvSet } from './client'
import { notifyJobMatches } from './notifications'

// ── Jobs ──────────────────────────────────────────────────────────────────────

// Active, and nothing on the post needs fixing (see job-post.ts)
export const isOpen = (job: any) => jobIsOpen(job)

export async function getJobs() {
  const [rows, legacy] = await Promise.all([kvList('job:'), kvGet('jobs:list')])
  const legacyIds = new Set<string>(legacy?.ids || [])
  // Jobs posted before `listed` existed count only if the old list still names
  // them: deleting one used to just drop it from that list and leave its row behind.
  return rows
    .filter(j => j && !j.deleted && (j.listed || legacyIds.has(j.id)))
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
}

export async function postJob(body: Record<string, any>) {
  const problem = jobPostProblem(body as JobPostFields)
  if (problem) throw new Error(problem)
  const id = crypto.randomUUID()
  const job = { id, ...body, createdAt: new Date().toISOString(), listed: true }
  await kvSet(`job:${id}`, job)
  const empList = await kvGet(`employer_jobs:${body.employerId}`) || { ids: [] }
  empList.ids.push(id)
  await kvSet(`employer_jobs:${body.employerId}`, empList)
  await notifyJobMatches(job as Job)
  return job
}

// What an employer may change on a post. Anything else (id, owner, dates) stays as it was.
const EDITABLE = ['companyName', 'jobTitle', 'skills', 'location', 'salary', 'vacancies', 'jobType', 'experienceLevel', 'description', 'workCategory', 'disabilityCategories', 'status'] as const

/** Saves an edited post. Refused, like a new post, if anything needs fixing. */
export async function updateJob(jobId: string, employerId: string, body: Record<string, any>) {
  const job = await kvGet(`job:${jobId}`)
  if (!job || job.deleted || job.employerId !== employerId) throw new Error('Job not found')
  const changes = Object.fromEntries(EDITABLE.filter(k => k in body).map(k => [k, body[k]]))
  const updated = { ...job, ...changes, updatedAt: new Date().toISOString() }
  const problem = jobPostProblem(updated as JobPostFields)
  if (problem) throw new Error(problem)
  await kvSet(`job:${jobId}`, updated)
  return updated as Job
}

export async function getEmployerJobs(employerId: string) {
  const empList = await kvGet(`employer_jobs:${employerId}`) || { ids: [] }
  const jobs = await Promise.all(empList.ids.map((id: string) => kvGet(`job:${id}`)))
  return jobs.filter(j => j && !j.deleted)
}

export async function updateJobStatus(jobId: string, status: string) {
  const job = await kvGet(`job:${jobId}`)
  if (!job) throw new Error('Not found')
  const updated = { ...job, status }
  await kvSet(`job:${jobId}`, updated)
  return updated
}

export async function deleteJob(jobId: string, employerId: string) {
  // marked on its own row, which every reader skips, instead of edited out of a shared list
  const job = await kvGet(`job:${jobId}`)
  if (job) await kvSet(`job:${jobId}`, { ...job, deleted: true })
  const empList = await kvGet(`employer_jobs:${employerId}`) || { ids: [] }
  empList.ids = empList.ids.filter((id: string) => id !== jobId)
  await kvSet(`employer_jobs:${employerId}`, empList)
}
