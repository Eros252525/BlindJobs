import type { Screen } from '@/types'

export const APPLICANT_SCREENS: Screen[] = ['dashboard', 'profile', 'assessments', 'jobs', 'messages']

export const EMPLOYER_SCREENS: Screen[] = ['emp-dashboard', 'emp-post-job', 'emp-applicants', 'emp-messages']

export const KANBAN_COLS = ['New', 'Reviewed', 'Interviewing', 'Hired', 'Rejected']

// Fired on window by the notification bell when a new update arrives (an
// application changed stage or came in, or a matching job was posted)
export const APPLICATION_UPDATE_EVENT = 'bj:application-update'

// Fired on window after something is marked read outside the bell (Messages screen),
// so the bell's count updates at once instead of at its next 15-second check
export const READ_STATE_EVENT = 'bj:read-state'

export const SCREEN_LABELS: Partial<Record<Screen, string>> = {
  intro: 'Welcome. Navigation guide.',
  login: 'Sign in.',
  'register-applicant': 'Register as applicant.',
  'register-employer': 'Register as employer.',
  dashboard: 'Applicant dashboard.',
  profile: 'My profile and resume.',
  assessments: 'Assessments. Your health survey.',
  'forgot-password': 'Forgot your password.',
  jobs: 'Job listings.',
  messages: 'Messages.',
  'emp-dashboard': 'Employer dashboard.',
  'emp-post-job': 'Post a new job.',
  'emp-applicants': 'Applicant tracking board.',
  'emp-messages': 'Messages.',
}
