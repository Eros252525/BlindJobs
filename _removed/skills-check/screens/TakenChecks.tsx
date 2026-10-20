import { scoreLevel } from '@/lib/assessment/question-bank'
import { categoryById, type WorkCategoryId } from '@/lib/assessment/work-categories'
import { ScoreFigure } from '@/components/ui/Meter'
import { BTN_SECONDARY } from '@/components/ui/PageCard'
import type { ApplicantProfile } from '@/types'

const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' })

/**
 * The skills checks the applicant has finished: each score, when it was taken,
 * and a button to take that check again. Highest score first.
 */
export function TakenChecks({ profile, onRetake }: { profile: ApplicantProfile; onRetake: (id: WorkCategoryId) => void }) {
  const taken = Object.entries(profile.categoryScores || {})
    .map(([id, result]) => ({ category: categoryById(id), result }))
    .filter(x => x.category)
    .sort((a, b) => b.result.score - a.result.score)

  if (!taken.length) return null

  return (
    <ul className="mt-3 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
      {taken.map(({ category, result }) => (
        <li key={category!.id} className="rounded-xl border border-gray-300 p-5 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{category!.name}</h3>
          <ScoreFigure score={result.score} level={scoreLevel(result.score)} />
          <p className="mt-2 text-sm text-gray-700">
            {result.correct} of {result.total} answers right · taken {longDate(result.takenAt)}
            {result.attempts > 1 ? ` · attempt ${result.attempts}` : ''}
          </p>
          <div className="mt-auto pt-4">
            <button type="button" onClick={() => onRetake(category!.id)} aria-label={`Retake the ${category!.name} skills check`} className={BTN_SECONDARY}>
              <span aria-hidden="true">↻ </span>Retake this check
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
