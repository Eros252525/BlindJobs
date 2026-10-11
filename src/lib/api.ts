import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { consentRecord } from '@/lib/legal'
import { jobMatch, type JobMatch } from '@/lib/matching'
import type { ApplicantProfile, Job } from '@/types'

type G = typeof globalThis & { __bjSb?: SupabaseClient }
const g = globalThis as G
if (!g.__bjSb) {
  g.__bjSb = createClient(
    'https://twetarrmrxfdrparsxiz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZXRhcnJtcnhmZHJwYXJzeGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjYwMDAsImV4cCI6MjEwNTMwMjAwMH0.tzIPrIeDGb08d77KYJhdt6RlJx6KTfEKhJcEWJWyWPY',
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'bj-auth' } }
  )
}
const supabase = g.__bjSb!

const TABLE = 'kv_store_6ad6397b'

async function kvGet(key: string): Promise<any> {
  const { data, error } = await supabase.from(TABLE).select('value').eq('key', key).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.value ?? null
}

async function kvSet(key: string, value: any): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert({ key, value })
  if (error) throw new Error(error.message)
}

// Every value stored under a key prefix. `newest` keeps only the last N keys, for
// prefixes whose keys carry a timestamp. Supabase returns at most 1000 rows.
async function kvList(prefix: string, newest?: number): Promise<any[]> {
  let query = supabase.from(TABLE).select('value').like('key', `${prefix}%`)
  if (newest) query = query.order('key', { ascending: false }).limit(newest)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []).map(r => r.value)
}

// ── Storage layout ────────────────────────────────────────────────────────────
// One table of key → JSON value. Anything several people add to is stored as one
// row per item under a shared key prefix, so two people saving at the same moment
// can never overwrite each other:
//
//   job:<jobId>                             application:<jobId>:<applicantId>
//   conversation_member:<userId>:<convId>   message:<convId>:<messageId>
//   notification:<userId>:<time>:<id>
//
// These used to be single rows holding a whole list (jobs:list,
// job_applications:<jobId>, conversations:user:<userId>, messages:<convId>).
// Those rows are still read, so data saved before the change keeps showing, but
// they are never written again.
//
// Lists only their owner writes are still single rows: employer_jobs:<employerId>,
// applied_jobs:<applicantId>, notifications_seen:<userId>.

async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Auth ──────────────────────────────────────────────────────────────────────

// Users type either "name" or a full "name@domain" into the username box, with
// stray spaces/capitals. Normalize to one canonical lowercase email.
function normalizeEmail(input: string): string {
  const v = (input || '').trim().toLowerCase()
  return v.includes('@') ? v : `${v}@gmail.com`
}

// Older accounts were stored under `${rawInput}@gmail.com` (e.g. "a@b.com@gmail.com",
// "One@gmail.com"), so also try those keys to keep them able to log in.
async function findUserByEmail(input: string): Promise<any> {
  const raw = input || ''
  const candidates = [...new Set([
    normalizeEmail(raw),
    `${raw}@gmail.com`,
    `${raw.trim()}@gmail.com`,
    `${raw.trim().toLowerCase()}@gmail.com`,
  ])]
  for (const email of candidates) {
    const entry = await kvGet(`user_by_email:${email}`)
    if (entry) return { entry, email }
  }
  return null
}

export async function register(body: Record<string, any>) {
  const { role, emailUsername, password, firstName, lastName, middleName, suffix, mobile, gender, disabilityType, skills, companyName, consent } = body
  if (!emailUsername?.trim()) throw new Error('Email username is required')
  if (!password) throw new Error('Password is required')
  // No account without consent, whatever the form did (Data Privacy Act, RA 10173)
  if (!consent?.privacy || !consent?.terms) throw new Error('You must agree to the Privacy Notice and the Terms and Conditions')
  const email = normalizeEmail(emailUsername)
  if (await findUserByEmail(emailUsername)) throw new Error('Email already registered')
  const id = crypto.randomUUID()
  const hashed = await hashPassword(password)
  // `consent` is the record of what was agreed to: document versions and the time
  await kvSet(`user:${id}`, { id, role, email, password: hashed, createdAt: new Date().toISOString(), consent: consentRecord() })
  await kvSet(`user_by_email:${email}`, { userId: id })
  if (role === 'applicant') {
    await kvSet(`applicant_profile:${id}`, {
      userId: id, firstName: firstName || '', lastName: lastName || '',
      middleName: middleName || '', suffix: suffix || '', email,
      mobile: mobile || '', gender: gender || '', disabilityType: disabilityType || '',
      skills: skills || ['', '', ''], photoUrl: null,
    })
    return { id, role, email, name: `${firstName} ${lastName}`.trim() }
  } else {
    await kvSet(`employer_profile:${id}`, { userId: id, companyName: companyName || email, email })
    return { id, role, email, name: companyName || email }
  }
}

export async function login(emailUsername: string, password: string, role: string) {
  const found = await findUserByEmail(emailUsername)
  if (!found) throw new Error('No account found with that email. Check the spelling or create an account.')
  const { entry, email } = found
  const user = await kvGet(`user:${entry.userId}`)
  if (!user) throw new Error('Invalid credentials')
  // Support both hashed and legacy plaintext passwords
  const hashed = await hashPassword(password)
  if (user.password !== hashed && user.password !== password) throw new Error('Incorrect password')
  if (user.role !== role) {
    const label = user.role === 'employer' ? 'Employer' : 'Applicant'
    throw new Error(`This account is registered as an ${label}. Select "${label}" and try again.`)
  }
  if (role === 'applicant') {
    const p = await kvGet(`applicant_profile:${user.id}`)
    return { id: user.id, role, email, name: p ? `${p.firstName} ${p.lastName}`.trim() || email : email }
  } else {
    const p = await kvGet(`employer_profile:${user.id}`)
    return { id: user.id, role, email, name: p?.companyName || email }
  }
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const p = await kvGet(`applicant_profile:${userId}`)
  if (!p) throw new Error('Not found')
  return p
}

export async function updateProfile(userId: string, body: Record<string, any>) {
  const existing = await kvGet(`applicant_profile:${userId}`) || {}
  const updated = { ...existing, ...body }
  await kvSet(`applicant_profile:${userId}`, updated)
  return updated
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

const isOpen = (job: any) => (job.status || 'Active') === 'Active'

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
  const id = crypto.randomUUID()
  const job = { id, ...body, createdAt: new Date().toISOString(), listed: true }
  await kvSet(`job:${id}`, job)
  const empList = await kvGet(`employer_jobs:${body.employerId}`) || { ids: [] }
  empList.ids.push(id)
  await kvSet(`employer_jobs:${body.employerId}`, empList)
  await notifyJobMatches(job as Job)
  return job
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
  const application = { applicantId, jobId, stage: 'New', appliedAt: new Date().toISOString() }
  await kvSet(`application:${jobId}:${applicantId}`, application)
  // Track applied jobs per applicant
  const applied = await kvGet(`applied_jobs:${applicantId}`) || { jobIds: [] }
  if (!applied.jobIds.includes(jobId)) { applied.jobIds.push(jobId); await kvSet(`applied_jobs:${applicantId}`, applied) }
  await notifyNewApplication(job, applicantId)
  return application
}

export async function getAppliedJobs(applicantId: string): Promise<string[]> {
  const applied = await kvGet(`applied_jobs:${applicantId}`) || { jobIds: [] }
  return applied.jobIds
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
      result.push({ ...app, profile: await kvGet(`applicant_profile:${app.applicantId}`), jobTitle: job?.jobTitle || jobId })
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

async function notifyStageChange(jobId: string, applicantId: string, stage: string) {
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
async function notifyNewApplication(job: Job, applicantId: string) {
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
    m.location ? `your location (${job.location})` : '',
  ].filter(Boolean).join(' and ')
  return `New job: ${job.jobTitle} at ${job.companyName}. It matches ${why}.`
}

// Tells every applicant the new job suits (see jobMatch)
async function notifyJobMatches(job: Job) {
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

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getConversations(userId: string) {
  const [rows, legacy] = await Promise.all([kvList(`conversation_member:${userId}:`), kvGet(`conversations:user:${userId}`)])
  const ids = [...new Set<string>([...(legacy?.ids || []), ...rows.map(r => r.convId)])]
  const convs = await Promise.all(ids.map(id => kvGet(`conversation:${id}`)))
  return convs.filter(Boolean).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
}

export async function createConversation(body: Record<string, any>) {
  const { applicantId, employerId, applicantName, employerName, jobTitle, jobId } = body
  const id = crypto.randomUUID()
  const conv = { id, applicantId, employerId, applicantName, employerName, jobTitle, jobId, createdAt: new Date().toISOString() }
  await kvSet(`conversation:${id}`, conv)
  await Promise.all([applicantId, employerId].map(userId => kvSet(`conversation_member:${userId}:${id}`, { convId: id })))
  return conv
}

export async function getMessages(convId: string) {
  const [rows, legacy] = await Promise.all([kvList(`message:${convId}:`), kvGet(`messages:${convId}`)])
  return [...(legacy?.messages || []), ...rows].sort((a, b) => (a.sentAt || '').localeCompare(b.sentAt || ''))
}

export async function sendMessage(convId: string, senderId: string, senderName: string, text: string) {
  const msg = { id: crypto.randomUUID(), senderId, senderName, text, sentAt: new Date().toISOString() }
  await kvSet(`message:${convId}:${msg.id}`, msg)
  return msg
}

/** Messages from the other person that arrived after the user last opened that conversation. */
export async function getUnreadMessages(userId: string) {
  const convs = await getConversations(userId)
  const perConv = await Promise.all(convs.map(async c => {
    const [msgs, lastSeen] = await Promise.all([getMessages(c.id), kvGet(`last_seen:${userId}:${c.id}`)])
    return msgs
      .filter(m => m.senderId !== userId && new Date(m.sentAt).getTime() > (lastSeen || 0))
      .map(m => ({ ...m, convId: c.id, jobTitle: c.jobTitle }))
  }))
  return perConv.flat()
}

export async function markConversationRead(userId: string, convId: string) {
  await kvSet(`last_seen:${userId}:${convId}`, Date.now())
}

export const api = {
  register, login,
  getProfile, updateProfile,
  getJobs, postJob, getEmployerJobs, updateJobStatus, deleteJob,
  applyToJob, getAppliedJobs, getApplicationStage, getEmployerApplicants, updateStage,
  getConversations, createConversation, getMessages, sendMessage,
  getUnreadMessages, markConversationRead,
  getNotifications, markNotificationsRead,
}
