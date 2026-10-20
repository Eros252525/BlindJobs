import { useState } from 'react'
import { api } from '@/lib/api'
import { approvedQuestions, drawQuestions, scoreCheck, type CheckResult, type Question } from '@/lib/assessment/question-bank'
import type { WorkCategory } from '@/lib/assessment/work-categories'
import { toast } from '@/lib/toast'
import { useStepFocus } from '@/hooks/useStepFocus'
import type { ApplicantProfile, CategoryScore } from '@/types'
import { IntroPage } from './IntroPage'
import { QuestionPage } from './QuestionPage'
import { ResultPage } from './ResultPage'

type Phase = 'intro' | 'result' | number

/**
 * The skills check for one work category: ten approved questions drawn at
 * random, one per page, then a weighted score that is saved to the profile.
 * Nothing is timed, so a screen reader user is not marked down for listening.
 * This file holds the state and the moves between pages; each page is its own file.
 */
export function SkillsCheck({ userId, category, previous, onSaved, onBack, onNext = onBack, onResult, labels }: {
  /** The signed-in applicant; leave out during registration and pass `onResult` instead. */
  userId?: string
  category: WorkCategory
  previous?: CategoryScore
  /** Called with the updated profile once the score is saved to it. */
  onSaved?: (p: ApplicantProfile) => void
  onBack: () => void
  /** Pressed on the result page; defaults to `onBack`. */
  onNext?: () => void
  /** Takes the result instead of saving it to a profile, for when there is no account yet. */
  onResult?: (r: { score: number; correct: number; total: number }) => void
  labels?: { back?: string; next?: string }
}) {
  const backLabel = labels?.back ?? 'Back to assessments'
  const nextLabel = labels?.next ?? 'Back to assessments'
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<CheckResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [warned, setWarned] = useState(false)

  const question = typeof phase === 'number' ? questions[phase] : null

  const spoken =
    phase === 'intro' ? `${category.name} skills check. Before you start.`
    : phase === 'result' ? `Your result: ${result?.score ?? 0} out of 100.`
    : `Question ${phase + 1} of ${questions.length}. ${question?.text ?? ''}`
  const headingRef = useStepFocus<HTMLHeadingElement>(phase, spoken)

  const start = () => {
    setQuestions(drawQuestions(category.id)); setAnswers({}); setResult(null); setError(''); setWarned(false); setPhase(0)
  }

  const submit = async () => {
    const unanswered = questions.map((x, i) => (answers[x.id] == null ? i + 1 : 0)).filter(Boolean)
    if (unanswered.length && !warned) {
      setWarned(true)
      setError(`You have not answered question${unanswered.length === 1 ? '' : 's'} ${unanswered.join(', ')}. An unanswered question earns no points. Go back to answer, or choose Submit anyway.`)
      return
    }
    const scored = scoreCheck(questions, answers)
    setBusy(true); setError('')
    try {
      const summary = { score: scored.score, correct: scored.correct, total: scored.total }
      if (onResult) onResult(summary)
      else onSaved?.(await api.saveCategoryScore(userId!, category.id, summary))
      setResult(scored); setPhase('result')
      toast(`${category.name}: ${scored.score} out of 100.`, 'success')
    } catch (e: any) { setError(`Your result could not be saved: ${e.message}`) }
    finally { setBusy(false) }
  }

  if (phase === 'intro') {
    return <IntroPage headingRef={headingRef} category={category} pool={approvedQuestions(category.id).length} previous={previous}
      backLabel={backLabel} onStart={start} onBack={onBack} />
  }

  if (phase === 'result' && result) {
    return <ResultPage headingRef={headingRef} category={category} result={result} answers={answers} nextLabel={nextLabel}
      onNext={onNext} onRetake={start} />
  }

  if (!question) return null

  const index = phase as number
  return <QuestionPage headingRef={headingRef} category={category} question={question} index={index} total={questions.length}
    answer={answers[question.id]} answered={questions.filter(x => answers[x.id] != null).length}
    busy={busy} error={error} warned={warned}
    onAnswer={(i) => { setAnswers(a => ({ ...a, [question.id]: i })); setError(''); setWarned(false) }}
    onPrevious={() => { setError(''); setPhase(index - 1) }}
    onNext={() => { setError(''); setPhase(index + 1) }}
    onSubmit={submit} onLeave={onBack} />
}
