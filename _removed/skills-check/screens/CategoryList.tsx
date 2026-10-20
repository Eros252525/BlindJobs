import type { ReactNode } from 'react'
import { scoreLevel } from '@/lib/assessment/question-bank'
import { suggestCategories, type CategorySuggestion, type WorkCategoryId } from '@/lib/assessment/work-categories'
import { ScoreBar } from '@/components/ui/Meter'
import { BTN_SECONDARY } from '@/components/ui/PageCard'
import type { ApplicantProfile } from '@/types'

/**
 * The kinds of work to choose from: the ones the profile points to first, each
 * with its reasons, then the rest. Used on the Assessments page and during
 * registration, so both suggest the same way.
 */
export function CategoryList({ profile, onPick, pickLabel = 'Start the skills check', emptyHint, hideTaken = false }: {
  profile: ApplicantProfile
  onPick: (id: WorkCategoryId) => void
  pickLabel?: string
  /** Shown when nothing on the profile points to any category. */
  emptyHint?: ReactNode
  /** Leave out the kinds of work already checked, when their scores are listed elsewhere on the page. */
  hideTaken?: boolean
}) {
  const all = suggestCategories(profile)
  const suggestions = all.filter(s => !hideTaken || !profile.categoryScores?.[s.category.id])
  if (!suggestions.length) return <p className="mt-4 text-sm text-gray-800">You have taken the skills check for every kind of work. Retake any of them above.</p>
  const suggested = suggestions.filter(s => s.points > 0)
  const others = suggestions.filter(s => s.points === 0)
  const scores = profile.categoryScores || {}


  const renderCategory = ({ category, reasons }: CategorySuggestion) => {
    const mine = scores[category.id]
    return (
      <li key={category.id} className="rounded-xl border border-gray-300 p-5 flex flex-col">
        {reasons.length > 0 && (
          <p className="self-start mb-2 text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Suggested for you</p>
        )}
        <h4 className="text-lg font-bold text-gray-900">{category.name}</h4>
        <p className="mt-1 text-sm text-gray-800">{category.summary}</p>

        {mine && (
          <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">
              Your latest score: <span className="text-xl font-bold">{mine.score}</span> out of 100 · {scoreLevel(mine.score)}
            </p>
            <ScoreBar score={mine.score} className="mt-2" />
          </div>
        )}

        {reasons.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-bold text-[#1a7a3c]">Why it fits you</p>
            <ul className="mt-1 list-disc pl-5 space-y-0.5 text-sm text-gray-800">
              {reasons.map(r => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* The evidence matters, but not on every visit: one press away instead of a paragraph on each card */}
        <details className="mt-3 text-sm">
          <summary className="min-h-6 cursor-pointer font-semibold text-[#1a4fa0]">Why this kind of work is on the list</summary>
          <p className="mt-2 text-gray-800">{category.evidence}</p>
        </details>

        <div className="mt-auto pt-4">
          <button type="button" onClick={() => onPick(category.id)}
            aria-label={`${mine ? 'Take the check again' : pickLabel}: ${category.name}`}
            className={mine ? BTN_SECONDARY : 'btn-primary min-h-11 px-5'}>{mine ? 'Take the check again' : pickLabel}</button>
        </div>
      </li>
    )
  }

  return (
    <>
      {all.every(s => s.points === 0) && emptyHint}
      <h3 className="mt-6 font-bold text-gray-900">
        {suggested.length ? `${suggestions.length} kinds of work, the ${suggested.length} suggested for you first` : `All ${suggestions.length} kinds of work`}
      </h3>
      <ul className="mt-3 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">{[...suggested, ...others].map(renderCategory)}</ul>
    </>
  )
}
