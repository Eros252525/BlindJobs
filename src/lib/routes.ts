// Each screen's own address, so the browser's Back and Forward buttons move
// between screens, a reload stays on the same one, and a screen can be bookmarked.
// App.tsx keeps the address bar and the open screen in step (History API, no router).
import { APPLICANT_SCREENS, EMPLOYER_SCREENS } from '@/constants'
import type { Screen, User } from '@/types'

const PATHS: Record<Screen, string> = {
  intro: '/',
  login: '/login',
  'register-applicant': '/register',
  'register-employer': '/register/employer',
  'forgot-password': '/forgot-password',
  dashboard: '/dashboard',
  profile: '/profile',
  jobs: '/jobs',
  messages: '/messages',
  'emp-dashboard': '/employer',
  'emp-post-job': '/employer/post-job',
  'emp-applicants': '/employer/applicants',
  'emp-messages': '/employer/messages',
}

export const SIGNED_OUT_SCREENS: Screen[] = ['intro', 'login', 'register-applicant', 'register-employer', 'forgot-password']

// The app may be served from a sub-folder (vite.config.ts `base`)
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

/** The address of a screen, e.g. "/jobs". */
export const pathFor = (screen: Screen) => BASE + PATHS[screen]

/** The screen at an address, or null for an address the app does not have. */
export function screenAt(pathname: string): Screen | null {
  const path = (pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname).replace(/\/+$/, '') || '/'
  return (Object.keys(PATHS) as Screen[]).find(s => PATHS[s] === path) ?? null
}

/** Where a signed-in user starts. */
export const homeFor = (user: User): Screen => (user.role === 'employer' ? 'emp-dashboard' : 'dashboard')

/**
 * The screen to show for a requested one: signed-out screens only when signed
 * out, and only the user's own role's screens when signed in. Anything else goes
 * to sign in (signed out) or the user's dashboard (signed in).
 */
export function allowedScreen(screen: Screen | null, user: User | null): Screen {
  if (!user) return screen && SIGNED_OUT_SCREENS.includes(screen) ? screen : screen ? 'login' : 'intro'
  const mine = user.role === 'employer' ? EMPLOYER_SCREENS : APPLICANT_SCREENS
  return screen && mine.includes(screen) ? screen : homeFor(user)
}
