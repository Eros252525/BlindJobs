// Applying for a job, and following each application through its stages.
import { incompleteProfileMessage, requiredProfileFields } from '@/lib/resume'
import { missingFields } from '@/lib/validation'
import type { Job, MyApplication } from '@/types'
import { kvGet, kvList, kvSet } from './client'
import { isOpen } from './jobs'
import { createConversation, getConversations, sendMessage } from './messages'
import { notifyNewApplication, notifyStageChange } from './notifications'

// ── Applications ──────────────────────────────────────────────────────────────

async function getApplication(jobId: string, applicantId: string): Promise<any> {
  return await kvGet(`application:${jobId}:${applicantId}`)
    ?? (await kvGet(`job_applications:${jobId}`))?.applications?.find((a: any) => a.applicantId === applicantId)
    ?? null
}

async function getJobApplications(jobId: string): Promise<any[]> {
  const [rows, legacy] = await Promise.all([kvList(`application:${jobId}:`), kvGet(`job_applications:${jobId}`)])
  const byApplicant = new Map<string, any>()
  // rows come last: an application first saved in the old list gets a row once its stage changes
  for (const a of [...(legacy?.applications || []), ...rows]) byApplicant.set(a.applicantId, a)
  return [...byApplicant.values()].sort((a, b) => (a.appliedAt || '').localeCompare(b.appliedAt || ''))
}

export async function applyToJob(jobId: string, applicantId: string) {
  const job = await kvGet(`job:${jobId}`)
  if (!job || job.deleted) throw new Error('Job not found')
  if (!isOpen(job)) throw new Error('This job is no longer accepting applications')
  if (await getApplication(jobId, applicantId)) throw new Error('Already applied')
  // The employer is sent the profile, so its required fields must be filled in.
  // Checked here as well as on the Jobs screen, so no way of applying gets round it.
  const missing = missingFields(requiredProfileFields((await kvGet(`applicant_profile:${applicantId}`)) || {}))
  if (missing.length) throw new Error(incompleteProfileMessage(missing))
  const application = { applicantId, jobId, stage: 'New', appliedAt: new Date().toISOString() }
  await kvSet(`application:${jobId}:${applicantId}`, application)
  // Track applied jobs per applicant
  const applied = await kvGet(`applied_jobs:${applicantId}`) || { jobIds: [] }
  if (!applied.jobIds.includes(jobId)) { applied.jobIds.push(jobId); await kvSet(`applied_jobs:${applicantId}`, applied) }
  await notifyNewApplication(job, applicantId)
  await startApplicationThread(job, applicantId)
  return application
}

// Every application shows in Messages: it opens a conversation with the employer for
// that job (or continues one already there) with a first message saying what was applied for.
// Like the notifications, a failure here is logged: the application itself is already saved.
async function startApplicationThread(job: Job, applicantId: string) {
  try {
    const p = await kvGet(`applicant_profile:${applicantId}`)
    const name = (p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '') || 'Applicant'
    const convs = await getConversations(applicantId)
    const conv = convs.find((c: any) => c.jobId === job.id) ?? await createConversation({
      applicantId, employerId: job.employerId, applicantName: name, employerName: job.companyName,
      jobTitle: job.jobTitle, jobId: job.id,
    })
    await sendMessage(conv.id, applicantId, name,
      `Hello, I have applied for ${job.jobTitle}. My resume is on my application. Thank you for considering me.`)
  } catch (e) {
    console.error('Application saved, but its conversation was not started:', e)
  }
}

export async function getAppliedJobs(applicantId: string): Promise<string[]> {
  const applied = await kvGet(`applied_jobs:${applicantId}`) || { jobIds: [] }
  return applied.jobIds
}

/** Every job the applicant has applied for, with its stage and date, newest first. Deleted jobs are left out. */
export async function getMyApplications(applicantId: string): Promise<MyApplication[]> {
  const ids = await getAppliedJobs(applicantId)
  const rows = await Promise.all(ids.map(async jobId => {
    const [job, app] = await Promise.all([kvGet(`job:${jobId}`), getApplication(jobId, applicantId)])
    return job && !job.deleted && app ? { job, stage: app.stage || 'New', appliedAt: app.appliedAt || '' } : null
  }))
  return rows.filter((r): r is MyApplication => !!r).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
}

export async function getApplicationStage(applicantId: string, jobId: string): Promise<string | null> {
  return (await getApplication(jobId, applicantId))?.stage ?? null
}

export async function getEmployerApplicants(employerId: string) {
  const empList = await kvGet(`employer_jobs:${employerId}`) || { ids: [] }
  const result: any[] = []
  for (const jobId of empList.ids) {
    const job = await kvGet(`job:${jobId}`)
    for (const app of await getJobApplications(jobId)) {
      result.push({ ...app, profile: await kvGet(`applicant_profile:${app.applicantId}`), jobTitle: job?.jobTitle || jobId, job })
    }
  }
  return result
}

export async function updateStage(jobId: string, applicantId: string, stage: string) {
  const app = await getApplication(jobId, applicantId)
  if (!app) throw new Error('Not found')
  const updated = { ...app, stage }
  await kvSet(`application:${jobId}:${applicantId}`, updated)
  if (app.stage !== stage) await notifyStageChange(jobId, applicantId, stage)
  return updated
}
