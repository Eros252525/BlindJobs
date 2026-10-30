import { useEffect, useState } from 'react'
import { t } from '@/lib/i18n'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { RAND36_CREDIT } from '@/lib/assessment/rand36'
import { useStepFocus } from '@/hooks/useStepFocus'
import { PageCard, STEP_EYEBROW, STEP_HEADING } from '@/components/ui/PageCard'
import type { HealthAssessment, User } from '@/types'
import { HealthSurvey } from './assessments/health/HealthSurvey'

type View = 'hub' | 'health'

// The last results, kept for this browser tab only (never sent anywhere), so they
// survive moving between pages. Cleared on sign-out; a closed tab clears them too.
const KEPT = 'bj-health-results'
const keep = (userId: string, a: HealthAssessment | null) => {
  try { a ? sessionStorage.setItem(KEPT, JSON.stringify({ userId, a })) : sessionStorage.removeItem(KEPT) } catch { /* private mode */ }
}
const kept = (userId: string): HealthAssessment | null => {
  try { const v = JSON.parse(sessionStorage.getItem(KEPT) || 'null'); return v?.userId === userId ? v.a : null } catch { return null }
}
export const clearHealthResults = () => { try { sessionStorage.removeItem(KEPT) } catch { /* nothing kept */ } }

// RAND's own page for the survey: the form, the scoring instructions and the terms of use
const RAND_SURVEY_URL = 'https://www.rand.org/health-care/surveys_tools/mos/36-item-short-form.html'

/**
 * The RAND-36 health survey. Optional: it is never needed to apply for a job,
 * and answering or skipping it changes nothing about applications. Answers are
 * scored here and never saved: the results last until the applicant leaves this
 * page, and they can download a copy to keep.
 */
export function AssessmentsScreen({ user }: { user: User }) {
  const [view, setView] = useState<View>('hub')
  const [health, setHealth] = useState<HealthAssessment | null>(null)
  // A copy saved on the server by an earlier version: shown once, already deleted there
  const [fromBefore, setFromBefore] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.takeOldHealthAssessment(user.id).catch(() => null).then(h => {
      if (cancelled) return
      setHealth(h ?? kept(user.id)); setFromBefore(!!h); setLoaded(true)
    })
    return () => { cancelled = true }
  }, [user.id])

  // Takes focus only on coming back from the survey. On first arrival the page is
  // still loading, so focus stays where the user put it (the menu link).
  const headingRef = useStepFocus<HTMLHeadingElement>(view, 'Assessments. RAND 36-Item Health Survey.')

  if (!loaded) return <div className="flex-1 flex items-center justify-center text-white" role="status">{t('Loading…')}</div>

  if (view === 'health') {
    return <HealthSurvey existing={health} onChange={(a) => { setHealth(a); keep(user.id, a); setFromBefore(false) }} onBack={() => setView('hub')} />
  }

  return (
    <PageCard>
      <p className={STEP_EYEBROW}>{t('Health-related quality of life · optional')}</p>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>{t('RAND 36-Item Health Survey')}</h1>
      <p className="mt-1 text-gray-800">{t('Optional. Separate from your job applications and from how jobs are ranked for you.')}</p>
      <p className="mt-3 text-sm text-gray-700 max-w-3xl">
        {RAND36_CREDIT} Official English form.{' '}
        <a href={RAND_SURVEY_URL} target="_blank" rel="noopener noreferrer" className="text-[#1a4fa0] underline">
          {t("Scoring instructions and terms on RAND's website")}<span className="sr-only"> {t('(opens in a new tab)')}</span>
        </a>.
      </p>

      <section aria-labelledby="as-health" className="mt-6 rounded-xl border border-gray-300 bg-gray-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="as-health" className="text-xl font-bold text-gray-900">
            {health ? t('Your results are ready') : t('Answer the survey for yourself')}
          </h2>
          {health && (
            <p className="text-sm font-semibold rounded-full px-3 py-1 border border-green-700 text-green-800 bg-green-50">
              <span aria-hidden="true">✓ </span>{t('Taken {date}', { date: formatDate(health.takenAt) })}
            </p>
          )}
        </div>
        <ul className="mt-2 list-disc pl-6 space-y-1 text-gray-800 max-w-3xl">
          <li><strong>{t('You do not need it to apply for jobs.')}</strong> {t('Answering it or skipping it has no effect on your applications.')}</li>
          <li><strong>{t('Your answers are never saved.')}</strong> {t('They are scored on your device and shown only to you. Blind Jobs does not receive them, so no employer and nobody on our team can see them.')}</li>
          <li>{t('Your results stay in this browser tab only, until you sign out or close the tab. You can download a copy to keep.')}</li>
          <li>{t('36 questions, about 10 minutes, no time limit, and you may skip any question.')}</li>
        </ul>
        {fromBefore && (
          <p role="status" className="mt-3 rounded-lg border-2 border-[#a16207] bg-yellow-50 p-3 text-sm text-gray-900 max-w-3xl">
            {t('An earlier version of Blind Jobs saved your survey answers on our server. We have now deleted that copy. Your results are shown here one last time: download a copy if you want to keep them.')}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => setView('health')} className="btn-primary min-h-11 px-6">
            {health ? t('See my results') : t('Start the health survey')}
          </button>
        </div>
      </section>
    </PageCard>
  )
}
