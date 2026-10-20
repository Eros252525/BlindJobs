import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { NO_CONSENT } from '@/lib/documents/legal'
import { useStepFocus } from '@/hooks/useStepFocus'
import type { User } from '@/types'
import { AccountStep } from './register/AccountStep'
import { FinishStep } from './register/FinishStep'
import { StepFrame } from './register/StepFrame'
import { EMPTY_WORK_PROFILE, WorkProfileStep, type WorkProfile } from './register/WorkProfileStep'
import { STEPS, STEP_NAMES, stepNumber, type AccountForm, type Step } from './register/steps'

/**
 * Applicant registration as one guided flow: account details, work profile,
 * then the account is created.
 * This file holds what the applicant has entered so far and moves between the
 * steps; each step is its own file in ./register/.
 */
export function RegisterApplicantScreen({ onLogin, onBack }: { onLogin: (u: User) => void; onBack: () => void }) {
  const [step, setStep] = useState<Step>('account')
  const [form, setForm] = useState<AccountForm>({ fullName: '', username: '', password: '' })
  const [consent, setConsent] = useState(NO_CONSENT)
  const [work, setWork] = useState<WorkProfile>(EMPTY_WORK_PROFILE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Set once the account exists, so a retry after a failed save does not register twice
  const created = useRef<User | null>(null)

  const go = (s: Step) => { setError(''); setStep(s) }

  // The work profile moves focus itself; this covers the other steps.
  const headingRef = useStepFocus<HTMLHeadingElement>(step, `Step ${stepNumber(step)} of ${STEPS.length}. ${STEP_NAMES[step]}.`)

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
        // The profile keeps first and last name apart: the last word is the last name,
        // and the profile screen lets the applicant correct the split.
        const words = form.fullName.trim().split(/\s+/)
        const lastName = words.length > 1 ? words.pop()! : ''
        created.current = await api.register({
          role: 'applicant', firstName: words.join(' '), lastName,
          username: form.username, password: form.password, consent,
          disabilityType: work.disabilityType,
          skills: work.skills,
        }) as User
      }
      const user = created.current
      await api.updateProfile(user.id, {
        location: work.location.trim(), workSetup: work.workSetup, assistiveTech: work.assistiveTech, accommodations: work.accommodations,
        experience: work.jobTitle.trim() ? [{ title: work.jobTitle.trim(), company: work.company.trim(), period: '' }] : [],
      })
      onLogin(user)
    } catch (e: any) {
      setError(created.current
        ? `Your account was created, but some answers were not saved: ${e.message}. Choose Create my account to try again.`
        : e.message)
    } finally { setLoading(false) }
  }

  if (step === 'account') {
    return <AccountStep headingRef={headingRef} form={form} consent={consent}
      onForm={setForm} onConsent={setConsent} onContinue={() => go('profile')} onBack={onBack} />
  }

  if (step === 'profile') {
    return (
      <StepFrame step={step} onPrev={() => go('account')}>
        <WorkProfileStep value={work} onChange={setWork} onContinue={() => go('finish')} />
      </StepFrame>
    )
  }

  return (
    <StepFrame step="finish" onPrev={() => go('profile')}>
      <FinishStep headingRef={headingRef} name={form.fullName.trim()} username={form.username.trim().toLowerCase()} work={work}
        loading={loading} error={error} onCreate={createAccount} />
    </StepFrame>
  )
}
