import { useEffect, useRef, useState } from 'react'
import * as sr from './lib/a11y/screen-reader'
import { useScreenChangeA11y } from './hooks/useScreenChangeA11y'
import { APPLICANT_SCREENS, EMPLOYER_SCREENS } from './constants'
import { loadSession, saveSession } from './lib/session'
import { allowedScreen, homeFor, pathFor, screenAt } from './lib/routes'
import { hasChosenLang, t, useLang } from './lib/i18n'
import { LanguageScreen } from './screens/auth/LanguageScreen'
import type { Screen, User } from './types'
import { ToastContainer } from './components/toast/ToastContainer'
import { AccessibilityBar } from './components/a11y/AccessibilityBar'
import { LegalDialogHost } from './components/legal/LegalDialog'
import { ApplicantNav, EmployerNav } from './components/nav/RoleNav'
import { IntroScreen } from './screens/auth/IntroScreen'
import { LoginScreen, type SignInWelcome } from './screens/auth/LoginScreen'
import { ForgotPasswordScreen } from './screens/auth/ForgotPasswordScreen'
import { RegisterApplicantScreen } from './screens/auth/RegisterApplicantScreen'
import { RegisterEmployerScreen } from './screens/auth/RegisterEmployerScreen'
import { DashboardScreen } from './screens/applicant/DashboardScreen'
import { ProfileScreen } from './screens/applicant/ProfileScreen'
import { AssessmentsScreen, clearHealthResults } from './screens/applicant/AssessmentsScreen'
import { JobsScreen } from './screens/applicant/JobsScreen'
import { MessagesScreen } from './screens/shared/MessagesScreen'
import { EmpDashboardScreen } from './screens/employer/EmpDashboardScreen'
import { EmpPostJobScreen } from './screens/employer/EmpPostJobScreen'
import { EmpApplicantsScreen } from './screens/employer/EmpApplicantsScreen'

// Read once, before the first render, so a reload never flashes the welcome screen.
// The address picks the screen (see lib/routes.ts); the bare "/" falls back to the
// screen this tab was last on.
const restored = loadSession()
const atAddress = screenAt(window.location.pathname)
const firstScreen = allowedScreen(atAddress && atAddress !== 'intro' ? atAddress : restored.screen, restored.user)

export default function App() {
  // Redraws everything when the language changes (see lib/i18n)
  useLang()
  // A new device starts by asking English or Filipino, before anything else
  const [langChosen, setLangChosen] = useState(hasChosenLang)
  const [screen, setScreenState] = useState<Screen>(firstScreen)
  const [user, setUser] = useState<User | null>(restored.user)
  const [srEnabled, setSrEnabled] = useState(false)
  // How the next screen change reaches the address bar: a new history entry (push),
  // in place of the current one (replace), or not at all (it came from Back/Forward)
  const historyMode = useRef<'push' | 'replace' | 'none'>('replace')
  const userRef = useRef(user)
  userRef.current = user

  const setScreen = (s: Screen, mode: 'push' | 'replace' = 'push') => { historyMode.current = mode; setScreenState(s) }

  // Keep the address in step with the screen. The first run puts the canonical
  // address in place of whatever was typed (e.g. "/jobs" while signed out → "/login").
  useEffect(() => {
    const mode = historyMode.current
    historyMode.current = 'push'
    const path = pathFor(screen)
    if (mode === 'none' || window.location.pathname === path) return
    if (mode === 'replace') window.history.replaceState(null, '', path)
    else window.history.pushState(null, '', path)
  }, [screen])

  // Back and Forward: show the screen at the new address, if this user may see it;
  // otherwise the screen they may see, with the address corrected to match.
  useEffect(() => {
    const onPop = () => {
      const s = allowedScreen(screenAt(window.location.pathname), userRef.current)
      if (window.location.pathname !== pathFor(s)) window.history.replaceState(null, '', pathFor(s))
      historyMode.current = 'none'
      setJobFocus(null); setFieldFocus(null)
      setScreenState(s)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const cleanup = sr.init(setSrEnabled)
    return cleanup
  }, [])

  useScreenChangeA11y(screen, !langChosen && !user ? 'Choose your language. Piliin ang iyong wika.' : undefined)

  // Remember where the user is, so a reload comes back here (see lib/session.ts)
  useEffect(() => { saveSession({ user, screen }) }, [user, screen])

  // Replaces the sign-in page in the history, so Back from the dashboard does not land on it
  const handleLogin = (u: User) => {
    setUser(u)
    setScreen(homeFor(u), 'replace')
  }

  const handleLogout = () => { clearHealthResults(); setUser(null); setScreen('login') }

  // Just registered, or just reset the password: the sign-in page fills in the sign-in
  // name and says why. In place of the page before, so Back does not return to it.
  const [welcome, setWelcome] = useState<SignInWelcome | null>(null)
  const handleRegistered = (username: string) => { setWelcome({ kind: 'registered', role: 'applicant', login: username }); setScreen('login', 'replace') }
  const handlePasswordReset = (login: string, role: SignInWelcome['role']) => { setWelcome({ kind: 'reset', role, login }); setScreen('login', 'replace') }

  // Job picked on a dashboard: preselected in Jobs (applicant) or used as the board
  // filter in Applicants (employer). Plain navigation clears it.
  const [jobFocus, setJobFocus] = useState<string | null>(null)
  // A Profile field to open on (its id), from "Mobile number missing" on the dashboard or Jobs
  const [fieldFocus, setFieldFocus] = useState<string | null>(null)

  const navigate = (s: Screen) => {
    if ((s === 'login' || s === 'intro') && user) { handleLogout(); return }
    setJobFocus(null); setFieldFocus(null)
    setScreen(s)
  }

  const openProfileField = (fieldId: string) => { setFieldFocus(fieldId); setScreen('profile') }

  const openJob = (jobId: string) => { setJobFocus(jobId); setScreen('jobs') }
  const openCandidates = (jobId: string) => { setJobFocus(jobId); setScreen('emp-applicants') }
  const editJob = (jobId: string) => { setJobFocus(jobId); setScreen('emp-post-job') }

  const isApplicant = APPLICANT_SCREENS.includes(screen)
  const isEmployer = EMPLOYER_SCREENS.includes(screen)
  const isLoggedIn = isApplicant || isEmployer

  return (
    <div className="min-h-screen flex flex-col">
      <ToastContainer />
      {/* WCAG 2.4.1: let keyboard users jump past the navbar on every portal screen */}
      {isLoggedIn && <a href="#main-content" className="skip-link">{t('Skip to main content')}</a>}
      {isApplicant && user && <ApplicantNav active={screen} user={user} onNavigate={navigate} onOpenJob={openJob} />}
      {isEmployer && user && <EmployerNav active={screen} user={user} onNavigate={navigate} onOpenJob={openCandidates} />}

      {!langChosen && !user && <LanguageScreen onChosen={() => setLangChosen(true)} />}
      {langChosen && screen === 'intro' && <IntroScreen onContinue={() => setScreen('login')} />}
      {langChosen && screen === 'login' && <LoginScreen key={welcome?.login ?? ''} onLogin={(u) => { setWelcome(null); handleLogin(u) }}
        onNavigate={(s) => { setWelcome(null); setScreen(s) }} welcome={welcome} />}
      {langChosen && screen === 'forgot-password' && <ForgotPasswordScreen onDone={handlePasswordReset} onBack={() => setScreen('login')} />}
      {langChosen && screen === 'register-applicant' && <RegisterApplicantScreen onRegistered={handleRegistered} onBack={() => setScreen('login')} />}
      {langChosen && screen === 'register-employer' && <RegisterEmployerScreen onLogin={handleLogin} onBack={() => setScreen('login')} />}

      {isLoggedIn && (
        <main id="main-content" tabIndex={-1} className="portal-backdrop flex-1 flex flex-col min-h-0 focus:outline-none">
        {screen === 'dashboard' && user && <DashboardScreen user={user} onNavigate={navigate} onOpenJob={openJob} onOpenProfileField={openProfileField} />}
        {screen === 'profile' && user && <ProfileScreen user={user} focusField={fieldFocus} onNameChange={(name) => setUser(u => u && { ...u, name })} />}
        {screen === 'assessments' && user && <AssessmentsScreen user={user} />}
        {screen === 'jobs' && user && <JobsScreen user={user} initialJobId={jobFocus} onGoToProfile={() => navigate('profile')} onGoToProfileField={openProfileField} />}
        {screen === 'messages' && user && <MessagesScreen user={user} onOpenJob={openJob} onFindJobs={() => navigate('jobs')} />}

        {screen === 'emp-dashboard' && user && <EmpDashboardScreen user={user} onNavigate={navigate} onViewCandidates={openCandidates} onEditJob={editJob} />}
        {screen === 'emp-post-job' && user && <EmpPostJobScreen key={jobFocus || 'new'} user={user} onNavigate={navigate} editJobId={jobFocus} />}
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
