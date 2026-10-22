import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { RAND36_CREDIT } from '@/lib/assessment/rand36'
import { toast } from '@/lib/toast'
import { useStepFocus } from '@/hooks/useStepFocus'
import { BTN_SECONDARY, PageCard, STEP_EYEBROW, STEP_HEADING } from '@/components/ui/PageCard'
import { Spinner } from '@/components/ui/Spinner'
import type { HealthAssessment, User } from '@/types'
import { HealthSurvey } from './assessments/health/HealthSurvey'

type View = 'hub' | 'health'

// RAND's own page for the survey: the form, the scoring instructions and the terms of use
const RAND_SURVEY_URL = 'https://www.rand.org/health-care/surveys_tools/mos/36-item-short-form.html'

/**
 * The RAND-36 health survey, which an applicant answers once before applying for
 * jobs. Only the applicant sees the answers; withdrawing consent deletes them.
 */
export function AssessmentsScreen({ user }: { user: User }) {
  const [view, setView] = useState<View>('hub')
  const [health, setHealth] = useState<HealthAssessment | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.getHealthAssessment(user.id).catch(() => null).then(h => {
      if (cancelled) return
      setHealth(h); setLoaded(true)
    })
    return () => { cancelled = true }
  }, [user.id])

  // Takes focus only on coming back from the survey. On first arrival the page is
  // still loading, so focus stays where the user put it (the menu link).
  const headingRef = useStepFocus<HTMLHeadingElement>(view, 'Assessments. RAND 36-Item Health Survey.')

  const withdraw = async () => {
    setBusy(true)
    try {
      await api.deleteHealthAssessment(user.id)
      setHealth(null); setConfirmWithdraw(false)
      toast('Consent withdrawn. Your health answers and scores were deleted.', 'info')
    } catch (e: any) { toast(`Could not withdraw: ${e.message}`, 'error') }
    finally { setBusy(false) }
  }

  if (!loaded) return <div className="flex-1 flex items-center justify-center text-white" role="status">Loading…</div>

  if (view === 'health') {
    return <HealthSurvey userId={user.id} existing={health} onChange={setHealth} onBack={() => setView('hub')} />
  }

  const takenOn = health && new Date(health.takenAt).toLocaleDateString(undefined, { dateStyle: 'long' })

  return (
    <PageCard>
      <p className={STEP_EYEBROW}>Health-related quality of life</p>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>RAND 36-Item Health Survey</h1>
      <p className="mt-1 text-gray-800">Separate from how jobs are ranked for you.</p>
      <p className="mt-3 text-sm text-gray-700 max-w-3xl">
        {RAND36_CREDIT} Official English form.{' '}
        <a href={RAND_SURVEY_URL} target="_blank" rel="noopener noreferrer" className="text-[#1a4fa0] underline">
          Scoring instructions and terms on RAND's website<span className="sr-only"> (opens in a new tab)</span>
        </a>.
      </p>

      <section aria-labelledby="as-health" className="mt-6 rounded-xl border border-gray-300 bg-gray-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="as-health" className="text-xl font-bold text-gray-900">
            {health ? 'You have answered RAND-36' : 'RAND-36 is available'}
          </h2>
          <p className={`text-sm font-semibold rounded-full px-3 py-1 border ${health ? 'border-green-700 text-green-800 bg-green-50' : 'border-gray-500 text-gray-800 bg-white'}`}>
            {health ? <><span aria-hidden="true">✓ </span>Completed {takenOn}</> : 'Not answered yet'}
          </p>
        </div>
        <p className="mt-2 text-gray-800 max-w-3xl">
          Your answers stay private and do not affect job ranking. Employers never see them.
        </p>
        <p className="mt-1 text-gray-800 max-w-3xl">
          {health
            ? 'You can now apply for jobs. You can answer it again at any time.'
            : 'Please answer it once before you apply for jobs. 36 questions, about 10 minutes, no time limit, and you may skip any question.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => setView('health')} className="btn-primary min-h-11 px-6">
            {health ? 'See my results' : 'Start Health Assessment'}
          </button>
          {health && !confirmWithdraw && (
            <button type="button" onClick={() => setConfirmWithdraw(true)} className={BTN_SECONDARY}>Withdraw consent</button>
          )}
        </div>

        {confirmWithdraw && (
          <div role="alert" className="mt-4 rounded-lg border-2 border-red-400 bg-white p-4 max-w-3xl">
            <p className="text-sm text-gray-900 font-semibold">Withdraw your consent and delete your health answers and scores for good?</p>
            <p className="mt-1 text-sm text-gray-800">
              Applications you have already sent stay as they are. To apply for another job, you would need to answer the survey again.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={withdraw} disabled={busy} aria-busy={busy}
                className="min-h-11 px-5 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-md text-sm flex items-center gap-2 disabled:opacity-70">
                {busy ? <Spinner label="Withdrawing" /> : 'Yes, withdraw and delete'}
              </button>
              <button type="button" onClick={() => setConfirmWithdraw(false)} className={BTN_SECONDARY}>No, keep them</button>
            </div>
          </div>
        )}
      </section>
    </PageCard>
  )
}
