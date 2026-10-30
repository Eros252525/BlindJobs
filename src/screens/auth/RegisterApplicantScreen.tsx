import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { NO_CONSENT } from '@/lib/documents/legal'
import { gmailAddress } from '@/lib/gmail'
import { t, useLang } from '@/lib/i18n'
import { useStepFocus } from '@/hooks/useStepFocus'
import type { GoogleSignUp, User } from '@/types'
import { AccountStep } from './register/AccountStep'
import { FinishStep } from './register/FinishStep'
import { StepFrame } from './register/StepFrame'
import { EMPTY_WORK_PROFILE, WorkProfileStep, type WorkProfile } from './register/WorkProfileStep'
import { accountName, EMPTY_ACCOUNT_FORM, STEPS, STEP_NAMES, stepNumber, type AccountForm, type Step } from './register/steps'

/**
 * Applicant registration as one guided flow: account details, work profile,
 * then the account is created.
 * This file holds what the applicant has entered so far and moves between the
 * steps; each step is its own file in ./register/.
 */
export function RegisterApplicantScreen({ google, onRegistered, onLogin, onBack }: {
  /** Arrived from Sign in with Google: the Gmail is confirmed and is what they sign in with, so no username or password is asked. */
  google?: GoogleSignUp | null
  /** The account exists: off to the sign-in page, where the applicant signs in with it. */
  onRegistered: (username: string) => void
  /** The account made with Google exists: signed in to it at once, as there is no password to try. */
  onLogin: (u: User) => void
  onBack: () => void
}) {
  useLang()
  const [step, setStep] = useState<Step>('account')
  const [form, setForm] = useState<AccountForm>(() => google
    ? { ...EMPTY_ACCOUNT_FORM, firstName: google.firstName, lastName: google.lastName, email: google.email }
    : EMPTY_ACCOUNT_FORM)
  const [consent, setConsent] = useState(NO_CONSENT)
  const [work, setWork] = useState<WorkProfile>(EMPTY_WORK_PROFILE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Set once the account exists, so a retry after a failed save does not register twice
  const created = useRef<User | null>(null)

  // Each step is its own entry in the browser's history (same address), so the
  // browser's Back goes to the step before instead of out of registration, where the
  // answers would be lost; Forward comes back. Previous step uses the same history.
  const go = (s: Step) => { setError(''); setStep(s); window.history.pushState({ regStep: s }, '', window.location.href) }
  const previous = () => window.history.back()
  useEffect(() => {
    window.history.replaceState({ regStep: 'account' }, '', window.location.href)
    const onPop = (e: PopStateEvent) => {
      const s = e.state?.regStep as Step | undefined
      if (s && STEPS.includes(s)) { setError(''); setStep(s) }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // The work profile moves focus itself; this covers the other steps.
  const headingRef = useStepFocus<HTMLHeadingElement>(step, t('Step {n} of {total}. {name}.', { n: stepNumber(step), total: STEPS.length, name: t(STEP_NAMES[step]) }))

  // Nothing is saved until the last step, so warn before a reload or a closed tab throws the answers away
  useEffect(() => {
    if (step === 'account') return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [step])


  const createAccount = async () => {
    if (loading) return
    setError(''); setLoading(true)
    try {
      if (!created.current) {
        created.current = await api.register({
          role: 'applicant', firstName: form.firstName.trim(), middleName: form.middleName.trim(), lastName: form.lastName.trim(), mobile: form.mobile, optionalEmail: form.email,
          ...(google ? { google: true } : { username: form.username, password: form.password }), consent,
          disabilityType: work.disabilityType,
          skills: work.skills,
        }) as User
      }
      const user = created.current
      await api.updateProfile(user.id, {
        location: work.location.trim(), workSetup: work.workSetup, assistiveTech: work.assistiveTech, accommodations: work.accommodations,
        experience: work.jobTitle.trim() ? [{ title: work.jobTitle.trim(), company: work.company.trim(), period: '' }] : [],
      })
      // Not signed in here: the applicant signs in once with what they just chose,
      // so they know it works before they need it. With Google there is nothing to try.
      if (google) onLogin(user)
      else onRegistered(user.email)
    } catch (e: any) {
      setError(created.current
        ? t('Your account was created, but some answers were not saved: {reason}. Choose Create my account to try again.', { reason: e.message })
        : e.message)
    } finally { setLoading(false) }
  }

  if (step === 'account') {
    return <AccountStep headingRef={headingRef} google={!!google} form={form} consent={consent}
      onForm={setForm} onConsent={setConsent} onContinue={() => go('profile')} onBack={onBack} />
  }

  if (step === 'profile') {
    return (
      <StepFrame step={step} onPrev={previous}>
        <WorkProfileStep value={work} onChange={setWork} onContinue={() => go('finish')} />
      </StepFrame>
    )
  }

  return (
    <StepFrame step="finish" onPrev={previous}>
      <FinishStep headingRef={headingRef} google={!!google} name={accountName(form)} mobile={form.mobile} email={form.email.trim() ? gmailAddress(form.email) : ''} username={form.username.trim().toLowerCase()} work={work}
        loading={loading} error={error} onCreate={createAccount} />
    </StepFrame>
  )
}
