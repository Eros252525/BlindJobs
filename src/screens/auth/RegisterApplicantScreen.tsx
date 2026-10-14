import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { categoryById, type WorkCategoryId } from '@/lib/assessment/work-categories'
import { NO_CONSENT } from '@/lib/legal'
import { useStepFocus } from '@/hooks/useStepFocus'
import { SkillsCheck } from '@/screens/applicant/assessments/skills/SkillsCheck'
import type { ApplicantProfile, CheckAttempt, User } from '@/types'
import { AccountStep } from './register/AccountStep'
import { CategoryStep } from './register/CategoryStep'
import { FinishStep } from './register/FinishStep'
import { StepFrame } from './register/StepFrame'
import { EMPTY_WORK_PROFILE, WorkProfileStep, type WorkProfile } from './register/WorkProfileStep'
import { REQUIRED_AT_REGISTRATION, STEPS, STEP_NAMES, stepNumber, withGmail, type AccountForm, type CheckSummary, type Step } from './register/steps'

/**
 * Applicant registration as one guided flow: account details, work profile,
 * a kind of work, ten questions, then the account is created.
 * This file holds what the applicant has entered so far and moves between the
 * steps; each step is its own file in ./register/.
 */
export function RegisterApplicantScreen({ onLogin, onBack }: { onLogin: (u: User) => void; onBack: () => void }) {
  const [step, setStep] = useState<Step>('account')
  const [form, setForm] = useState<AccountForm>({ fullName: '', email: '', password: '' })
  const [consent, setConsent] = useState(NO_CONSENT)
  const [work, setWork] = useState<WorkProfile>(EMPTY_WORK_PROFILE)
  const [categoryId, setCategoryId] = useState<WorkCategoryId | null>(null)
  const [check, setCheck] = useState<CheckSummary | null>(null)
  // Every check finished here, retakes and other kinds of work included; saved with the account
  const [attempts, setAttempts] = useState<CheckAttempt[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Set once the account exists, so a retry after a failed save does not register twice
  const created = useRef<User | null>(null)

  const go = (s: Step) => { setError(''); setStep(s) }

  // The work profile and skills check move focus themselves; this covers the other steps.
  const headingRef = useStepFocus<HTMLHeadingElement>(step, `Step ${stepNumber(step)} of ${STEPS.length}. ${STEP_NAMES[step]}.`)

  // Nothing is saved until the last step, so warn before a reload or a closed tab throws the answers away
  useEffect(() => {
    if (step === 'account') return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [step])

  const emailAddress = withGmail(form.email)
  const category = categoryById(categoryId)

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
          emailUsername: emailAddress, password: form.password, consent,
          disabilityType: work.disabilityType,
          skills: [...work.skills, '', '', ''].slice(0, 3), // the profile screen edits three slots
        }) as User
      }
      const user = created.current
      await api.updateProfile(user.id, {
        location: work.location.trim(), workSetup: work.workSetup, assistiveTech: work.assistiveTech, accommodations: work.accommodations,
        experience: work.jobTitle.trim() ? [{ title: work.jobTitle.trim(), company: work.company.trim(), period: '' }] : [],
      })
      await Promise.all(attempts.map(a => api.saveCheckAttempt(user.id, a)))
      if (check && categoryId) await api.saveCategoryScore(user.id, categoryId, check)
      onLogin(user)
    } catch (e: any) {
      setError(created.current
        ? `Your account was created, but some answers were not saved: ${e.message}. Choose Create my account to try again.`
        : e.message)
    } finally { setLoading(false) }
  }

  if (step === 'account') {
    return <AccountStep headingRef={headingRef} form={form} consent={consent} onForm={setForm} onConsent={setConsent}
      onContinue={() => go('profile')} onBack={onBack} />
  }

  if (step === 'profile') {
    return (
      <StepFrame step={step} onPrev={() => go('account')}>
        <WorkProfileStep value={work} onChange={setWork} onContinue={() => go('category')} />
      </StepFrame>
    )
  }

  // What the later steps know about the applicant so far, shaped like a saved profile
  const draft: ApplicantProfile = {
    skills: work.skills, workSetup: work.workSetup, assistiveTech: work.assistiveTech,
    experience: work.jobTitle.trim() ? [{ title: work.jobTitle, company: work.company, period: '' }] : [],
    categoryScores: check && categoryId ? { [categoryId]: { ...check, takenAt: new Date().toISOString(), attempts: 1 } } : undefined,
  }

  if (step === 'check' && category) {
    return (
      <StepFrame step={step}>
        <SkillsCheck category={category} previous={draft.categoryScores?.[category.id]} onResult={(summary, attempt) => { setCheck(summary); setAttempts(list => [...list, attempt]) }}
          onBack={() => go('category')} onNext={() => go('finish')}
          labels={{ back: 'Choose a different kind of work', next: 'Continue' }} />
      </StepFrame>
    )
  }

  // without a finished check, this step is only reachable when the check may be skipped
  if (step === 'finish' && (check || !REQUIRED_AT_REGISTRATION.check)) {
    return (
      <StepFrame step={step} onPrev={() => go('category')}>
        <FinishStep headingRef={headingRef} name={form.fullName.trim()} email={emailAddress} work={work}
          category={check ? category : undefined} check={check ?? undefined} loading={loading} error={error} onCreate={createAccount} />
      </StepFrame>
    )
  }

  return (
    <StepFrame step="category" onPrev={() => go('profile')}>
      <CategoryStep headingRef={headingRef} draft={draft}
        finished={category && check ? { category, check } : undefined}
        onPick={(id) => { if (id !== categoryId) setCheck(null); setCategoryId(id); go('check') }}
        onKeepScore={() => go('finish')}
        onSkip={REQUIRED_AT_REGISTRATION.check ? undefined : () => { setCheck(null); setCategoryId(null); go('finish') }} />
    </StepFrame>
  )
}
