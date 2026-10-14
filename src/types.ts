export type Role = 'applicant' | 'employer'

export type Screen =
  | 'intro' | 'login' | 'register-applicant' | 'register-employer'
  | 'dashboard' | 'profile' | 'assessments' | 'jobs' | 'messages'
  | 'emp-dashboard' | 'emp-post-job' | 'emp-applicants' | 'emp-messages'

export interface User { id: string; role: Role; email: string; name: string }

export interface Job { id: string; employerId: string; companyName: string; jobTitle: string; skills: string; location: string; salary: string; jobType: string; experienceLevel: string; description: string; createdAt: string; status?: string; vacancies?: string; disabilityCategories?: string[]; listed?: boolean; deleted?: boolean
  // The kind of work (a WorkCategoryId) and the lowest skills-check score the employer asks for in it
  workCategory?: string; minCategoryScore?: number
  // True when the employer will only take applications from people who have taken that skills check
  requireCheck?: boolean }

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
  // What the applicant asks an employer to arrange (choices in resume.ts)
  accommodations?: string[]
  // Latest skills-check result per work category, keyed by WorkCategoryId
  categoryScores?: Record<string, CategoryScore>
  updatedAt?: string
}

export interface CategoryScore { score: number; correct: number; total: number; takenAt: string; attempts: number }

// One row per finished skills check, assessment_attempt:<userId>:<takenAt>:<id>,
// so retakes and the answers given are kept. The profile holds only the latest score.
// `chosen` is the option's text, not its position: options are shuffled on every draw.
export interface CheckAnswer { questionId: string; topic: string; weight: number; chosen: string | null; right: boolean }
export interface CheckAttempt {
  id: string; userId?: string; categoryId: string; takenAt: string
  score: number; earned: number; possible: number; correct: number; total: number
  answers: CheckAnswer[]
}

export interface Applicant { applicantId: string; jobId: string; jobTitle: string; stage: string; appliedAt: string; profile: ApplicantProfile | null; job?: Job | null }

export interface Conversation { id: string; applicantId: string; employerId: string; applicantName: string; employerName: string; jobTitle: string; jobId?: string }

// One row each, notification:<userId>:<time>:<id>. `read` is not stored; the API
// works it out from notifications_seen:<userId> on load.
// 'stage' = an employer moved the user's application; 'job' = a new job that matches
// them; 'application' = someone applied to the employer's job.
export interface AppNotification { id: string; type: 'stage' | 'job' | 'application'; jobId: string; stage?: string; text: string; createdAt: string; read: boolean }

export interface Message { id: string; senderId: string; senderName: string; text: string; sentAt: string }

export interface UnreadMessage extends Message { convId: string; jobTitle: string }
