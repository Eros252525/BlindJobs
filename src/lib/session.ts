// Who is signed in and which screen is open, kept for this browser tab so that a
// reload puts the user back where they were instead of on the welcome screen.
//
// sessionStorage, not localStorage, on purpose: it survives a reload but ends
// when the tab or browser is closed, so on a shared or borrowed computer the next
// person does not find someone else still signed in.
//
// The password is never kept, only the account's id, role, email and name.
import { APPLICANT_SCREENS, EMPLOYER_SCREENS } from '@/constants'
import type { Screen, User } from '@/types'

const KEY = 'bj-session'

const SIGNED_OUT_SCREENS: Screen[] = ['intro', 'login', 'register-applicant', 'register-employer']

export interface Session { user: User | null; screen: Screen }

const isUser = (u: any): u is User =>
  !!u && typeof u.id === 'string' && (u.role === 'applicant' || u.role === 'employer') && typeof u.email === 'string' && typeof u.name === 'string'

/** The saved session, checked so a stale or edited entry can never open the wrong role's screens. */
export function loadSession(): Session {
  let saved: any = null
  try { saved = JSON.parse(sessionStorage.getItem(KEY) || 'null') } catch { /* blocked or corrupt: start fresh */ }

  const user = isUser(saved?.user) ? saved.user : null
  const screen = saved?.screen as Screen | undefined
  if (user) {
    const allowed = user.role === 'employer' ? EMPLOYER_SCREENS : APPLICANT_SCREENS
    return { user, screen: screen && allowed.includes(screen) ? screen : allowed[0] }
  }
  return { user: null, screen: screen && SIGNED_OUT_SCREENS.includes(screen) ? screen : 'intro' }
}

export function saveSession(s: Session) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ user: s.user && { id: s.user.id, role: s.user.role, email: s.user.email, name: s.user.name }, screen: s.screen }))
  } catch { /* private mode or storage full: reload will just start at the beginning */ }
}
