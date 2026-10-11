export type Role = 'applicant' | 'employer'

export type Screen =
  | 'intro' | 'login' | 'register-applicant' | 'register-employer'
  | 'dashboard' | 'profile' | 'jobs' | 'messages'
  | 'emp-dashboard' | 'emp-post-job' | 'emp-applicants' | 'emp-messages'

export interface User { id: string; role: Role; email: string; name: string }

export interface Job { id: string; employerId: string; companyName: string; jobTitle: string; skills: string; location: string; salary: string; jobType: string; experienceLevel: string; description: string; createdAt: string; status?: string; vacancies?: string; disabilityCategories?: string[]; listed?: boolean; deleted?: boolean }

export interface WorkExperience { title: string; company: string; period: string }

// Stored as applicant_profile:<userId>. Everything after `skills` is optional and
// may be missing on profiles saved before those fields existed.
export interface ApplicantProfile {
  userId?: string; email?: string
  firstName?: string; middleName?: string; lastName?: string; suffix?: string
  mobile?: string; gender?: string; disabilityType?: string; skills?: string[]
  location?: string
  about?: string
  educationLevel?: string; school?: string; trainings?: string
  experience?: WorkExperience[]
  assistiveTech?: string[]; workSetup?: string[]; languages?: string[]
  updatedAt?: string
}

export interface Applicant { applicantId: string; jobId: string; jobTitle: string; stage: string; appliedAt: string; profile: ApplicantProfile | null }

export interface Conversation { id: string; applicantId: string; employerId: string; applicantName: string; employerName: string; jobTitle: string; jobId?: string }

// One row each, notification:<userId>:<time>:<id>. `read` is not stored; the API
// works it out from notifications_seen:<userId> on load.
// 'stage' = an employer moved the user's application; 'job' = a new job that matches
// them; 'application' = someone applied to the employer's job.
export interface AppNotification { id: string; type: 'stage' | 'job' | 'application'; jobId: string; stage?: string; text: string; createdAt: string; read: boolean }

export interface Message { id: string; senderId: string; senderName: string; text: string; sentAt: string }

export interface UnreadMessage extends Message { convId: string; jobTitle: string }
