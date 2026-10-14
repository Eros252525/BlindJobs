import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { scoreLevel } from '@/lib/assessment/question-bank'
import { categoryById, type WorkCategoryId } from '@/lib/assessment/work-categories'
import { useStepFocus } from '@/hooks/useStepFocus'
import { BTN_SECONDARY, PageCard, STEP_HEADING } from '@/components/ui/PageCard'
import type { ApplicantProfile, Screen, User } from '@/types'
import { CategoryList } from './assessments/CategoryList'
import { SkillsCheck } from './assessments/skills/SkillsCheck'
import { TakenChecks } from './assessments/TakenChecks'

type View = { name: 'hub' } | { name: 'skills'; category: WorkCategoryId }

/**
 * The skills checks after registration: an applicant's scores, a retake of any
 * of them, and a first check for another kind of work. Someone who skipped the
 * check while registering takes it here.
 */
export function AssessmentsScreen({ user, onNavigate, initialCategory }: {
  user: User; onNavigate: (s: Screen) => void
  /** A skills check to open at once: set when Retake or Take is pressed on another page. */
  initialCategory?: string | null
}) {
  const [view, setView] = useState<View>(() => {
    const wanted = categoryById(initialCategory)
    return wanted ? { name: 'skills', category: wanted.id } : { name: 'hub' }
  })
  const [profile, setProfile] = useState<ApplicantProfile | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.getProfile(user.id).catch(() => null).then(p => {
      if (cancelled) return
      setProfile(p); setLoaded(true)
    })
    return () => { cancelled = true }
  }, [user.id])

  // Takes focus only on coming back from a survey or a check. On first arrival the
  // list is still loading, so focus stays where the user put it (the menu link).
  const headingRef = useStepFocus<HTMLHeadingElement>(view.name, 'Assessments. Your skills checks.')

  if (!loaded) return <div className="flex-1 flex items-center justify-center text-white" role="status">Loading…</div>

  const picked = view.name === 'skills' ? categoryById(view.category) : undefined
  if (picked) {
    return <SkillsCheck userId={user.id} category={picked} previous={profile?.categoryScores?.[picked.id]}
      onSaved={setProfile} onBack={() => setView({ name: 'hub' })} />
  }

  const taken = Object.entries(profile?.categoryScores || {})
    .map(([id, result]) => ({ category: categoryById(id), result }))
    .filter(x => x.category)
    .sort((a, b) => b.result.score - a.result.score)
  const best = taken[0]

  return (
    <PageCard>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>Assessments</h1>
      <p className="mt-1 text-sm text-gray-700 max-w-3xl">
        Your skills checks. They are not timed, and you can leave and come back.
      </p>

      {/* Where things stand, before any detail */}
      <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Stat label="Skills checks taken" value={String(taken.length)} note={taken.length ? 'Shown to employers you apply to' : 'Take one below'} />
        <Stat label="Best score" value={best ? `${best.result.score} out of 100` : 'None yet'} note={best ? `${best.category!.name} · ${scoreLevel(best.result.score)}` : 'Ten questions, no time limit'} />
      </dl>

      {taken.length > 0 && (
        <section aria-labelledby="as-scores" className="mt-8">
          <h2 id="as-scores" className="text-xl font-bold text-gray-900">Your skills check scores</h2>
          <p className="mt-1 text-sm text-gray-800 max-w-3xl">
            Employers you apply to see these. You can retake a check at any time: you get a new set of 10 questions, and your latest score replaces the old one.
          </p>
          <TakenChecks profile={profile || {}} onRetake={(category) => setView({ name: 'skills', category })} />
        </section>
      )}

      <section aria-labelledby="as-skills" className="mt-8">
        <h2 id="as-skills" className="text-xl font-bold text-gray-900">{taken.length ? 'Take another skills check' : 'Skills check'}</h2>
        <p className="mt-1 text-sm text-gray-800 max-w-3xl">
          Choose a kind of work and answer 10 questions about it. Your score goes on your profile and ranks jobs of that kind for you.
          Suggestions come from your profile and are suggestions only: every kind of work is open to you.
        </p>
        <CategoryList hideTaken profile={profile || {}} onPick={(category) => setView({ name: 'skills', category })}
          emptyHint={
            <div className="mt-4 rounded-lg border border-gray-300 bg-gray-50 p-4 max-w-3xl">
              <p className="text-sm text-gray-800">
                There is not enough on your profile yet to suggest a kind of work. Add your skills, work experience and preferred work setup, and suggestions will appear here.
              </p>
              <button type="button" onClick={() => onNavigate('profile')} className={`${BTN_SECONDARY} mt-3`}>Go to my profile</button>
            </div>
          } />
      </section>

      <section aria-labelledby="as-next" className="mt-4 rounded-xl border border-gray-300 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1 basis-80">
          <h2 id="as-next" className="text-xl font-bold text-gray-900">See your ranked jobs</h2>
          <p className="mt-1 text-sm text-gray-800">The Jobs page lists open jobs by how well they fit you, and tells you the reasons for each score.</p>
        </div>
        <button type="button" onClick={() => onNavigate('jobs')} className="btn-primary min-h-11 px-5">Go to jobs</button>
      </section>
    </PageCard>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</dt>
      <dd className="text-2xl font-bold text-gray-900 leading-tight">{value}</dd>
      <dd className="text-xs text-gray-600">{note}</dd>
    </div>
  )
}
