import type { Screen, User } from '@/types'
import { AppNav } from './AppNav'
import { APPLICANT_LINKS, APPLICANT_MENU, EMPLOYER_LINKS, EMPLOYER_MENU } from './nav-links'

export function ApplicantNav({ active, user, onNavigate }: { active: Screen; user: User; onNavigate: (s: Screen) => void }) {
  return <AppNav active={active} user={user} onNavigate={onNavigate} home="dashboard" msgScreen="messages"
    links={APPLICANT_LINKS} menuItems={APPLICANT_MENU} />
}

export function EmployerNav({ active, user, onNavigate }: { active: Screen; user: User; onNavigate: (s: Screen) => void }) {
  return <AppNav active={active} user={user} onNavigate={onNavigate} home="emp-dashboard" msgScreen="emp-messages"
    links={EMPLOYER_LINKS} menuItems={EMPLOYER_MENU} />
}
