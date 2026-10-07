import type { Screen } from '@/types'

export const APPLICANT_SCREENS: Screen[] = ['dashboard', 'profile', 'jobs', 'messages']

export const EMPLOYER_SCREENS: Screen[] = ['emp-dashboard', 'emp-post-job', 'emp-applicants', 'emp-messages']

export const KANBAN_COLS = ['New', 'Reviewed', 'Interviewing', 'Hired', 'Rejected']

export const SCREEN_LABELS: Partial<Record<Screen, string>> = {
  intro: 'Welcome. Navigation guide.',
  login: 'Sign in.',
  'register-applicant': 'Register as applicant.',
  'register-employer': 'Register as employer.',
  dashboard: 'Applicant dashboard.',
  profile: 'My profile and resume.',
  jobs: 'Job listings.',
  messages: 'Messages.',
  'emp-dashboard': 'Employer dashboard.',
  'emp-post-job': 'Post a new job.',
  'emp-applicants': 'Applicant tracking board.',
  'emp-messages': 'Messages.',
}
