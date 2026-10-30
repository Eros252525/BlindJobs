import { useState } from 'react'
import { RAND36_STEPS, scoreRand36, type Rand36Answers } from '@/lib/assessment/rand36'
import { useStepFocus } from '@/hooks/useStepFocus'
import { t } from '@/lib/i18n'
import type { HealthAssessment } from '@/types'
import { CONSENT_ID, ConsentPage } from './ConsentPage'
import { QuestionsPage } from './QuestionsPage'
import { ResultsPage } from './ResultsPage'

type Phase = 'consent' | 'results' | number

/**
 * The RAND 36-Item Health Survey: consent, six pages of questions, then the
 * eight scale scores. No question is required and nothing is timed.
 * Nothing is saved: the scores are worked out here and handed to `onChange`,
 * which keeps them only while the Assessments page is open.
 * This file holds the state and the moves between pages; each page is its own file.
 */
export function HealthSurvey({ existing, onChange, onBack }: {
  existing: HealthAssessment | null
  onChange: (a: HealthAssessment | null) => void
  onBack: () => void
}) {
  const [phase, setPhase] = useState<Phase>(existing ? 'results' : 'consent')
  const [result, setResult] = useState<HealthAssessment | null>(existing)
  const [answers, setAnswers] = useState<Rand36Answers>({})
  const [consent, setConsent] = useState(false)
  const [consentAt, setConsentAt] = useState('')
  const [error, setError] = useState('')

  const step = typeof phase === 'number' ? RAND36_STEPS[phase] : null
  const stepItems = step ? step.groups.flatMap(g => g.items) : []
  const firstIntro = step?.groups[0]?.intro

  const spoken =
    phase === 'consent' ? t('Health survey. Before you start.')
    : phase === 'results' ? t('Your health survey results. They are not saved.')
    : t('Page {n} of {total}. {title}. Questions {from} to {to} of 36.', { n: phase + 1, total: RAND36_STEPS.length, title: step!.title, from: stepItems[0].n, to: stepItems[stepItems.length - 1].n }) + (firstIntro ? ` ${firstIntro}` : '')
  const headingRef = useStepFocus<HTMLHeadingElement>(phase, spoken)

  const start = () => {
    if (!consent) {
      setError(t('To start the survey, please tick the box. You may also go back without taking it.'))
      document.getElementById(CONSENT_ID)?.focus()
      return
    }
    setError(''); setConsentAt(new Date().toISOString()); setAnswers({}); setPhase(0)
  }

  const finish = () => {
    const scored = scoreRand36(answers)
    if (!scored.answered) { setError(t('No question has been answered yet. Answer at least one, or go back to leave the survey.')); return }
    setError('')
    const assessment: HealthAssessment = {
      instrument: 'RAND-36 1.0', answers, scales: scored.scales, healthChange: scored.healthChange,
      consentAt, takenAt: new Date().toISOString(),
    }
    setResult(assessment); onChange(assessment); setPhase('results')
  }

  // Forgets the results now, instead of when the page is left
  const clear = () => {
    setResult(null); onChange(null); setConsent(false); setAnswers({})
    onBack()
  }

  if (phase === 'consent') {
    return <ConsentPage headingRef={headingRef} consent={consent} error={error} backLabel={t('Back to assessments')}
      onConsent={(v) => { setConsent(v); setError('') }} onStart={start} onBack={onBack} />
  }

  if (phase === 'results' && result) {
    return <ResultsPage headingRef={headingRef} assessment={result}
      onNext={onBack} onRetake={() => { setConsent(false); setError(''); setPhase('consent') }} onClear={clear} />
  }

  if (!step) return null

  const index = phase as number
  return <QuestionsPage headingRef={headingRef} index={index} answers={answers} busy={false} error={error} leaveLabel={t('Leave the survey')}
    onAnswer={(n, v) => { setAnswers(a => ({ ...a, [n]: v })); setError('') }}
    onClear={(n) => setAnswers(a => { const next = { ...a }; delete next[n]; return next })}
    onPrevious={() => { setError(''); setPhase(index - 1) }}
    onNext={() => { setError(''); setPhase(index + 1) }}
    onFinish={finish} onLeave={onBack} />
}
