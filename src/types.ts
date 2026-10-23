export type Role = 'applicant' | 'employer'

export type Screen =
  | 'intro' | 'login' | 'register-applicant' | 'register-employer' | 'forgot-password'
  | 'dashboard' | 'profile' | 'assessments' | 'jobs' | 'messages'
  | 'emp-dashboard' | 'emp-post-job' | 'emp-applicants' | 'emp-messages'

// `email` is what the user signs in with: an email address, or an applicant's username
export interface User { id: string; role: Role; email: string; name: string }

export interface Job { id: string; employerId: string; companyName: string; jobTitle: string; skills: string; location: string; salary: string; jobType: string; experienceLevel: string; description: string; createdAt: string; status?: string; vacancies?: string; disabilityCategories?: string[]; listed?: boolean; deleted?: boolean
  // The kind of work, a WorkCategoryId
  workCategory?: string }

export interface WorkExperience { title: string; company: string; period: string }

// Stored as applicant_profile:<userId>. Everything after `skills` is optional and
// may be missing on profiles saved before those fields existed.
export interface ApplicantProfile {
  userId?: string; email?: string
  // What applicants sign in with; they register without an email (older accounts have one)
  username?: string
  firstName?: string; middleName?: string; lastName?: string; suffix?: string
  mobile?: string; gender?: string; disabilityType?: string; skills?: string[]
  // A small square JPEG as a data URL (see lib/photo.ts); null or missing = no photo
  photoUrl?: string | null
  location?: string
  about?: string
  educationLevel?: string; school?: string; trainings?: string
  experience?: WorkExperience[]
  assistiveTech?: string[]; workSetup?: string[]; languages?: string[]
  // What the applicant asks an employer to arrange (choices in resume.ts)
  accommodations?: string[]
  updatedAt?: string
}

// One go at the RAND-36 health survey. Kept only in the browser while the applicant
// looks at it, never saved (see lib/api/health.ts).
export interface HealthAssessment {
  instrument: 'RAND-36 1.0'
  /** Item number → position of the chosen answer, from 1; skipped items are absent. */
  answers: Record<number, number>
  scales: { id: string; score: number | null; answered: number; of: number }[]
  healthChange: number | null
  /** When the applicant ticked the consent box, and when they finished. */
  consentAt: string
  takenAt: string
}

export interface Applicant { applicantId: string; jobId: string; jobTitle: string; stage: string; appliedAt: string; profile: ApplicantProfile | null; job?: Job | null }

export interface Conversation { id: string; applicantId: string; employerId: string; applicantName: string; employerName: string; jobTitle: string; jobId?: string; createdAt?: string }

// A job the applicant has applied for, with where the application stands
export interface MyApplication { job: Job; stage: string; appliedAt: string }

// One row of the Messages inbox: a conversation with what the list shows about it,
// worked out for the user looking at it (their unread count, their pins).
export interface InboxThread extends Conversation {
  count: number
  lastAt: string
  lastText: string
  lastFromMe: boolean
  unread: number
  sentByMe: boolean
  pinned: boolean
}

// One row each, notification:<userId>:<time>:<id>. `read` is not stored; the API
// works it out from notifications_seen:<userId> on load.
// 'stage' = an employer moved the user's application; 'job' = a new job that matches
// them; 'application' = someone applied to the employer's job.
export interface AppNotification { id: string; type: 'stage' | 'job' | 'application'; jobId: string; stage?: string; text: string; createdAt: string; read: boolean }

// `deleted`: the sender removed it for everyone; the text is gone and only the fact remains
export interface Message { id: string; senderId: string; senderName: string; text: string; sentAt: string; deleted?: boolean }

export interface UnreadMessage extends Message { convId: string; jobTitle: string }
