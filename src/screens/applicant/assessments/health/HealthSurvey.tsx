import { useState } from 'react'
import { api } from '@/lib/api'
import { RAND36_STEPS, scoreRand36, type Rand36Answers } from '@/lib/assessment/rand36'
import { toast } from '@/lib/toast'
import { useStepFocus } from '@/hooks/useStepFocus'
import type { HealthAssessment } from '@/types'
import { CONSENT_ID, ConsentPage } from './ConsentPage'
import { QuestionsPage } from './QuestionsPage'
import { ResultsPage } from './ResultsPage'

type Phase = 'consent' | 'results' | number

/** Where the answers are kept. The default is the signed-in applicant's own record. */
export interface HealthStore { save: (a: HealthAssessment) => Promise<unknown>; remove: () => Promise<unknown> }

export interface HealthSurveyLabels {
  /** The way out of the consent page. */
  back: string
  /** The way out of a page of questions. */
  leave: string
  /** The main button on the results page. */
  next: string
  /** Said in a toast once the answers are stored. */
  saved: string
}

const DEFAULT_LABELS: HealthSurveyLabels = {
  back: 'Back to assessments',
  leave: 'Leave without saving',
  next: 'Back to assessments',
  saved: 'Health survey saved. Only you can see it.',
}

/**
 * The RAND 36-Item Health Survey: consent, six pages of questions, then the
 * eight scale scores. No question is required and nothing is timed.
 * This file holds the state and the moves between pages; each page is its own file.
 */
export function HealthSurvey({ userId, existing, onChange, onBack, onNext = onBack, store, labels, required = false }: {
  /** The signed-in applicant; leave out during registration and pass `store` instead. */
  userId?: string
  existing: HealthAssessment | null
  onChange: (a: HealthAssessment | null) => void
  onBack: () => void
  /** Pressed on the results page; defaults to `onBack`. */
  onNext?: () => void
  store?: HealthStore
  labels?: Partial<HealthSurveyLabels>
  /** No way out but through: the Back, Leave and Skip buttons are not shown. */
  required?: boolean
}) {
  const text = { ...DEFAULT_LABELS, ...labels }
  const keep: HealthStore = store ?? {
    save: (a) => api.saveHealthAssessment(userId!, a),
    remove: () => api.deleteHealthAssessment(userId!),
  }
  const [phase, setPhase] = useState<Phase>(existing ? 'results' : 'consent')
  const [saved, setSaved] = useState<HealthAssessment | null>(existing)
  const [answers, setAnswers] = useState<Rand36Answers>({})
  const [consent, setConsent] = useState(false)
  const [consentAt, setConsentAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const step = typeof phase === 'number' ? RAND36_STEPS[phase] : null
  const stepItems = step ? step.groups.flatMap(g => g.items) : []
  const firstIntro = step?.groups[0]?.intro

  const spoken =
    phase === 'consent' ? 'Health survey. Before you start.'
    : phase === 'results' ? 'Your health survey results.'
    : `Page ${phase + 1} of ${RAND36_STEPS.length}. ${step!.title}. Questions ${stepItems[0].n} to ${stepItems[stepItems.length - 1].n} of 36.${firstIntro ? ` ${firstIntro}` : ''}`
  const headingRef = useStepFocus<HTMLHeadingElement>(phase, spoken)

  const start = () => {
    if (!consent) {
      setError('To start the survey, please tick the consent box. You may also go back without taking it.')
      document.getElementById(CONSENT_ID)?.focus()
      return
    }
    setError(''); setConsentAt(new Date().toISOString()); setAnswers({}); setPhase(0)
  }

  const finish = async () => {
    const result = scoreRand36(answers)
    if (!result.answered) { setError('No question has been answered yet. Answer at least one, or go back to leave the survey.'); return }
    setBusy(true); setError('')
    try {
      const assessment: HealthAssessment = {
        instrument: 'RAND-36 1.0', answers, scales: result.scales, healthChange: result.healthChange,
        consentAt, takenAt: new Date().toISOString(),
      }
      await keep.save(assessment)
      setSaved(assessment); onChange(assessment); setPhase('results')
      toast(text.saved, 'success')
    } catch (e: any) { setError(`Your answers could not be saved: ${e.message}`) }
    finally { setBusy(false) }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await keep.remove()
      setSaved(null); onChange(null); setConsent(false); setPhase('consent')
      toast('Your health answers and scores were deleted.', 'info')
      onBack()
    } catch (e: any) { toast(`Could not delete: ${e.message}`, 'error') }
    finally { setBusy(false) }
  }

  if (phase === 'consent') {
    return <ConsentPage headingRef={headingRef} consent={consent} error={error} backLabel={required ? undefined : text.back}
      onConsent={(v) => { setConsent(v); setError('') }} onStart={start} onBack={onBack} />
  }

  if (phase === 'results' && saved) {
    return <ResultsPage headingRef={headingRef} assessment={saved} busy={busy} nextLabel={text.next}
      onNext={onNext} onRetake={() => { setConsent(false); setError(''); setPhase('consent') }} onDelete={remove} />
  }

  if (!step) return null

  const index = phase as number
  return <QuestionsPage headingRef={headingRef} index={index} answers={answers} busy={busy} error={error} leaveLabel={required ? undefined : text.leave}
    onAnswer={(n, v) => { setAnswers(a => ({ ...a, [n]: v })); setError('') }}
    onClear={(n) => setAnswers(a => { const next = { ...a }; delete next[n]; return next })}
    onPrevious={() => { setError(''); setPhase(index - 1) }}
    onNext={() => { setError(''); setPhase(index + 1) }}
    onFinish={finish} onLeave={onBack} />
}
