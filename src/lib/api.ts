import { createClient, SupabaseClient } from '@supabase/supabase-js'

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
  const { role, emailUsername, password, firstName, lastName, middleName, suffix, mobile, gender, disabilityType, skills, companyName } = body
  if (!emailUsername?.trim()) throw new Error('Email username is required')
  if (!password) throw new Error('Password is required')
  const email = normalizeEmail(emailUsername)
  if (await findUserByEmail(emailUsername)) throw new Error('Email already registered')
  const id = crypto.randomUUID()
  const hashed = await hashPassword(password)
  await kvSet(`user:${id}`, { id, role, email, password: hashed, createdAt: new Date().toISOString() })
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

export async function getJobs() {
  const list = await kvGet('jobs:list') || { ids: [] }
  const jobs = await Promise.all(list.ids.map((id: string) => kvGet(`job:${id}`)))
  return jobs.filter(Boolean)
}

export async function postJob(body: Record<string, any>) {
  const id = crypto.randomUUID()
  const job = { id, ...body, createdAt: new Date().toISOString() }
  await kvSet(`job:${id}`, job)
  const list = await kvGet('jobs:list') || { ids: [] }
  list.ids.push(id)
  await kvSet('jobs:list', list)
  const empList = await kvGet(`employer_jobs:${body.employerId}`) || { ids: [] }
  empList.ids.push(id)
  await kvSet(`employer_jobs:${body.employerId}`, empList)
  return job
}

export async function getEmployerJobs(employerId: string) {
  const empList = await kvGet(`employer_jobs:${employerId}`) || { ids: [] }
  const jobs = await Promise.all(empList.ids.map((id: string) => kvGet(`job:${id}`)))
  return jobs.filter(Boolean)
}

export async function updateJobStatus(jobId: string, status: string) {
  const job = await kvGet(`job:${jobId}`)
  if (!job) throw new Error('Not found')
  const updated = { ...job, status }
  await kvSet(`job:${jobId}`, updated)
  return updated
}

export async function deleteJob(jobId: string, employerId: string) {
  const empList = await kvGet(`employer_jobs:${employerId}`) || { ids: [] }
  empList.ids = empList.ids.filter((id: string) => id !== jobId)
  await kvSet(`employer_jobs:${employerId}`, empList)
  const list = await kvGet('jobs:list') || { ids: [] }
  list.ids = list.ids.filter((id: string) => id !== jobId)
  await kvSet('jobs:list', list)
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function applyToJob(jobId: string, applicantId: string) {
  const job = await kvGet(`job:${jobId}`)
  if (!job) throw new Error('Job not found')
  const apps = await kvGet(`job_applications:${jobId}`) || { applications: [] }
  if (apps.applications.find((a: any) => a.applicantId === applicantId)) throw new Error('Already applied')
  const application = { applicantId, jobId, stage: 'New', appliedAt: new Date().toISOString() }
  apps.applications.push(application)
  await kvSet(`job_applications:${jobId}`, apps)
  // Track applied jobs per applicant
  const applied = await kvGet(`applied_jobs:${applicantId}`) || { jobIds: [] }
  if (!applied.jobIds.includes(jobId)) { applied.jobIds.push(jobId); await kvSet(`applied_jobs:${applicantId}`, applied) }
  return application
}

export async function getAppliedJobs(applicantId: string): Promise<string[]> {
  const applied = await kvGet(`applied_jobs:${applicantId}`) || { jobIds: [] }
  return applied.jobIds
}

export async function getApplicationStage(applicantId: string, jobId: string): Promise<string | null> {
  const apps = await kvGet(`job_applications:${jobId}`) || { applications: [] }
  const app = apps.applications.find((a: any) => a.applicantId === applicantId)
  return app?.stage ?? null
}

export async function getEmployerApplicants(employerId: string) {
  const empList = await kvGet(`employer_jobs:${employerId}`) || { ids: [] }
  const result: any[] = []
  for (const jobId of empList.ids) {
    const job = await kvGet(`job:${jobId}`)
    const apps = await kvGet(`job_applications:${jobId}`) || { applications: [] }
    for (const app of apps.applications) {
      result.push({ ...app, profile: await kvGet(`applicant_profile:${app.applicantId}`), jobTitle: job?.jobTitle || jobId })
    }
  }
  return result
}

export async function updateStage(jobId: string, applicantId: string, stage: string) {
  const apps = await kvGet(`job_applications:${jobId}`)
  if (!apps) throw new Error('Not found')
  const app = apps.applications.find((a: any) => a.applicantId === applicantId)
  if (app) app.stage = stage
  await kvSet(`job_applications:${jobId}`, apps)
  return app
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getConversations(userId: string) {
  const list = await kvGet(`conversations:user:${userId}`) || { ids: [] }
  const convs = await Promise.all(list.ids.map((id: string) => kvGet(`conversation:${id}`)))
  return convs.filter(Boolean)
}

export async function createConversation(body: Record<string, any>) {
  const { applicantId, employerId, applicantName, employerName, jobTitle, jobId } = body
  const id = crypto.randomUUID()
  const conv = { id, applicantId, employerId, applicantName, employerName, jobTitle, jobId, createdAt: new Date().toISOString() }
  await kvSet(`conversation:${id}`, conv)
  for (const userId of [applicantId, employerId]) {
    const list = await kvGet(`conversations:user:${userId}`) || { ids: [] }
    if (!list.ids.includes(id)) { list.ids.push(id); await kvSet(`conversations:user:${userId}`, list) }
  }
  return conv
}

export async function getMessages(convId: string) {
  const data = await kvGet(`messages:${convId}`) || { messages: [] }
  return data.messages
}

export async function sendMessage(convId: string, senderId: string, senderName: string, text: string) {
  const msg = { id: crypto.randomUUID(), senderId, senderName, text, sentAt: new Date().toISOString() }
  const data = await kvGet(`messages:${convId}`) || { messages: [] }
  data.messages.push(msg)
  await kvSet(`messages:${convId}`, data)
  return msg
}

export async function getUnreadCount(userId: string): Promise<number> {
  const list = await kvGet(`conversations:user:${userId}`) || { ids: [] }
  let count = 0
  for (const id of list.ids) {
    const msgs = (await kvGet(`messages:${id}`))?.messages || []
    const lastSeen = await kvGet(`last_seen:${userId}:${id}`) || 0
    count += msgs.filter((m: any) => m.senderId !== userId && new Date(m.sentAt).getTime() > lastSeen).length
  }
  return count
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
  getUnreadCount, markConversationRead,
}
