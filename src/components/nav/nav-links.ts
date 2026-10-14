import type { Screen } from '@/types'

export type NavLink = { label: string; icon: string; target: Screen }

export const APPLICANT_LINKS: NavLink[] = [
  { label: 'Profile', icon: '👤', target: 'profile' },
  { label: 'Assessments', icon: '📝', target: 'assessments' },
  { label: 'Jobs', icon: '💼', target: 'jobs' },
  { label: 'Messages', icon: '💬', target: 'messages' },
]

export const APPLICANT_MENU: NavLink[] = [
  { label: 'Dashboard', icon: '🏠', target: 'dashboard' },
  { label: 'My profile', icon: '👤', target: 'profile' },
]

export const EMPLOYER_LINKS: NavLink[] = [
  { label: 'Dashboard', icon: '📊', target: 'emp-dashboard' },
  { label: 'Post a Job', icon: '➕', target: 'emp-post-job' },
  { label: 'Applicants', icon: '👥', target: 'emp-applicants' },
  { label: 'Messages', icon: '💬', target: 'emp-messages' },
]

export const EMPLOYER_MENU: NavLink[] = [
  { label: 'Dashboard', icon: '📊', target: 'emp-dashboard' },
  { label: 'Post a Job', icon: '➕', target: 'emp-post-job' },
]
