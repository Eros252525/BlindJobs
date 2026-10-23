// The bell: what users are told, and which of it they have seen.
import { jobMatch, type JobMatch } from '@/lib/jobs/matching'
import type { ApplicantProfile, Job } from '@/types'
import { kvGet, kvList, kvSet } from './client'

// ── Notifications ─────────────────────────────────────────────────────────────

// What the applicant is told when an employer moves their application. A stage
// with no entry here (moving back to New) stays silent.
const STAGE_NOTICE: Record<string, (job: string) => string> = {
  Reviewed: job => `Your application for ${job} is now under review.`,
  Interviewing: job => `Your application for ${job} has moved to the interview stage.`,
  Hired: job => `Congratulations! You have been hired for ${job}.`,
  Rejected: job => `Your application for ${job} was not selected.`,
}

const MAX_NOTIFICATIONS = 30

// The time leads the key so the newest can be fetched without loading them all
async function pushNotification(userId: string, n: { type: 'stage' | 'job' | 'application'; jobId: string; text: string; stage?: string }) {
  const item = { id: crypto.randomUUID(), ...n, createdAt: new Date().toISOString() }
  await kvSet(`notification:${userId}:${item.createdAt}:${item.id}`, item)
}

// The notify* functions run after the action they report is already saved, so a
// failure is logged instead of thrown: the screen must not report the action as failed.

export async function notifyStageChange(jobId: string, applicantId: string, stage: string) {
  const notice = STAGE_NOTICE[stage]
  if (!notice) return
  try {
    const job = await kvGet(`job:${jobId}`)
    const jobName = job ? `${job.jobTitle} at ${job.companyName}` : 'a job'
    await pushNotification(applicantId, { type: 'stage', jobId, stage, text: notice(jobName) })
  } catch (e) {
    console.error('Stage saved, but the applicant notification was not:', e)
  }
}

// Tells the employer who posted the job
export async function notifyNewApplication(job: Job, applicantId: string) {
  try {
    const p = await kvGet(`applicant_profile:${applicantId}`)
    const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : ''
    await pushNotification(job.employerId, { type: 'application', jobId: job.id, text: `${name || 'An applicant'} applied for ${job.jobTitle}.` })
  } catch (e) {
    console.error('Application saved, but the employer notification was not:', e)
  }
}

function jobMatchNotice(job: Job, m: JobMatch): string {
  const why = [
    m.skills.length ? `your skills (${m.skills.join(', ')})` : '',
    m.experience.length ? `your work as ${m.experience.join(', ')}` : '',
    m.location ? `your location (${job.location})` : '',
  ].filter(Boolean).join(' and ')
  return `New job: ${job.jobTitle} at ${job.companyName}. It matches ${why}.`
}

// Tells every applicant the new job suits (see jobMatch)
export async function notifyJobMatches(job: Job) {
  try {
    const profiles: ApplicantProfile[] = await kvList('applicant_profile:')
    const sent = await Promise.allSettled(profiles.map(profile => {
      const match = profile?.userId ? jobMatch(job, profile) : null
      return match ? pushNotification(profile.userId!, { type: 'job', jobId: job.id, text: jobMatchNotice(job, match) }) : null
    }))
    const failed = sent.filter(r => r.status === 'rejected').length
    if (failed) console.error(`Job published, but ${failed} applicant notification(s) were not saved`)
  } catch (e) {
    console.error('Job published, but matching applicants were not notified:', e)
  }
}

// Read state is the ids the user has seen, in a row only they write. Ids, not a
// "seen up to" time: notifications are stamped by the sender's device clock.
export async function getNotifications(userId: string) {
  const [items, seen] = await Promise.all([
    kvList(`notification:${userId}:`, MAX_NOTIFICATIONS), // newest first
    kvGet(`notifications_seen:${userId}`),
  ])
  const seenIds = new Set<string>(Array.isArray(seen?.ids) ? seen.ids : [])
  return items.map(n => ({ ...n, read: seenIds.has(n.id) }))
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  const seen = await kvGet(`notifications_seen:${userId}`)
  const merged = [...new Set([...ids, ...(Array.isArray(seen?.ids) ? seen.ids : [])])]
  // only the newest MAX_NOTIFICATIONS are ever shown, so older ids can be dropped
  await kvSet(`notifications_seen:${userId}`, { ids: merged.slice(0, MAX_NOTIFICATIONS * 3) })
}
