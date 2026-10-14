import { useEffect, useState } from 'react'
import * as sr from './lib/a11y/screen-reader'
import { useRemoteControl } from './lib/a11y/arrow-navigation'
import { useScreenChangeA11y } from './hooks/useScreenChangeA11y'
import { APPLICANT_SCREENS, EMPLOYER_SCREENS } from './constants'
import type { Screen, User } from './types'
import { ToastContainer } from './components/toast/ToastContainer'
import { AccessibilityBar } from './components/a11y/AccessibilityBar'
import { LegalDialogHost } from './components/legal/LegalDialog'
import { ApplicantNav, EmployerNav } from './components/nav/RoleNav'
import { IntroScreen } from './screens/auth/IntroScreen'
import { LoginScreen } from './screens/auth/LoginScreen'
import { RegisterApplicantScreen } from './screens/auth/RegisterApplicantScreen'
import { RegisterEmployerScreen } from './screens/auth/RegisterEmployerScreen'
import { DashboardScreen } from './screens/applicant/DashboardScreen'
import { ProfileScreen } from './screens/applicant/ProfileScreen'
import { AssessmentsScreen } from './screens/applicant/AssessmentsScreen'
import { JobsScreen } from './screens/applicant/JobsScreen'
import { MessagesScreen } from './screens/shared/MessagesScreen'
import { EmpDashboardScreen } from './screens/employer/EmpDashboardScreen'
import { EmpPostJobScreen } from './screens/employer/EmpPostJobScreen'
import { EmpApplicantsScreen } from './screens/employer/EmpApplicantsScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [user, setUser] = useState<User | null>(null)
  const [srEnabled, setSrEnabled] = useState(false)

  useRemoteControl()

  useEffect(() => {
    const cleanup = sr.init(setSrEnabled)
    return cleanup
  }, [])

  useEffect(() => {
    window.__srEnabled = srEnabled
  }, [srEnabled])

  useScreenChangeA11y(screen)

  const handleLogin = (u: User) => {
    setUser(u)
    setScreen(u.role === 'employer' ? 'emp-dashboard' : 'dashboard')
  }

  const handleLogout = () => { setUser(null); setScreen('login') }

  // Job picked on a dashboard: preselected in Jobs (applicant) or used as the board
  // filter in Applicants (employer). Plain navigation clears it.
  const [jobFocus, setJobFocus] = useState<string | null>(null)
  // Skills check picked on the dashboard or a job (take or retake): opened straight away in Assessments
  const [checkFocus, setCheckFocus] = useState<string | null>(null)

  const navigate = (s: Screen) => {
    if ((s === 'login' || s === 'intro') && user) { handleLogout(); return }
    setJobFocus(null)
    setCheckFocus(null)
    setScreen(s)
  }

  const openJob = (jobId: string) => { setJobFocus(jobId); setScreen('jobs') }
  const openCheck = (categoryId: string) => { setCheckFocus(categoryId); setScreen('assessments') }
  const openCandidates = (jobId: string) => { setJobFocus(jobId); setScreen('emp-applicants') }

  const isApplicant = APPLICANT_SCREENS.includes(screen)
  const isEmployer = EMPLOYER_SCREENS.includes(screen)
  const isLoggedIn = isApplicant || isEmployer

  return (
    // Signed in, from tablet width up, the page is exactly the window: the navbar stays
    // put and only <main> (or a screen's own panes) scrolls, so a long list never
    // carries the navbar or the other half of a two-pane screen out of view.
    <div className={`min-h-screen flex flex-col ${isLoggedIn ? 'md:h-dvh md:overflow-hidden' : ''}`}>
      <ToastContainer />
      {/* WCAG 2.4.1: let keyboard users jump past the navbar on every portal screen */}
      {isLoggedIn && <a href="#main-content" className="skip-link">Skip to main content</a>}
      {isApplicant && user && <ApplicantNav active={screen} user={user} onNavigate={navigate} onOpenJob={openJob} />}
      {isEmployer && user && <EmployerNav active={screen} user={user} onNavigate={navigate} onOpenJob={openCandidates} />}

      {screen === 'intro' && <IntroScreen onContinue={() => setScreen('login')} />}
      {screen === 'login' && <LoginScreen onLogin={handleLogin} onNavigate={setScreen} />}
      {screen === 'register-applicant' && <RegisterApplicantScreen onLogin={handleLogin} onBack={() => setScreen('login')} />}
      {screen === 'register-employer' && <RegisterEmployerScreen onLogin={handleLogin} onBack={() => setScreen('login')} />}

      {isLoggedIn && (
        <main id="main-content" tabIndex={-1} className="portal-backdrop flex-1 flex flex-col min-h-0 md:overflow-y-auto focus:outline-none">
        {screen === 'dashboard' && user && <DashboardScreen user={user} onNavigate={navigate} onOpenJob={openJob} onOpenCheck={openCheck} />}
        {screen === 'profile' && user && <ProfileScreen user={user} />}
        {screen === 'assessments' && user && <AssessmentsScreen user={user} onNavigate={navigate} initialCategory={checkFocus} />}
        {screen === 'jobs' && user && <JobsScreen user={user} initialJobId={jobFocus} onOpenCheck={openCheck} />}
        {screen === 'messages' && user && <MessagesScreen user={user} />}

        {screen === 'emp-dashboard' && user && <EmpDashboardScreen user={user} onNavigate={navigate} onViewCandidates={openCandidates} />}
        {screen === 'emp-post-job' && user && <EmpPostJobScreen user={user} onNavigate={navigate} />}
        {screen === 'emp-applicants' && user && <EmpApplicantsScreen user={user} initialJobId={jobFocus} />}
        {screen === 'emp-messages' && user && <MessagesScreen user={user} />}
        </main>
      )}

      <AccessibilityBar
        srEnabled={srEnabled} onToggleSr={() => sr.toggle()}
      />
      <LegalDialogHost />
    </div>
  )
}
