import { scoreLevel } from '@/lib/assessment/question-bank'
import { categoryById } from '@/lib/assessment/work-categories'
import type { ApplicantProfile } from '@/types'

const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' })

/**
 * The applicant's skills-check scores on their dashboard, each with a button to
 * take that check again.
 */
export function ScoresCard({ profile, onOpen, onRetake }: {
  profile: ApplicantProfile
  /** Opens the Assessments page, for the full results or a retake. */
  onOpen: () => void
  /** Opens one skills check to take again. */
  onRetake: (categoryId: string) => void
}) {
  const checks = Object.entries(profile.categoryScores || {})
    .map(([id, result]) => ({ category: categoryById(id), result }))
    .filter(x => x.category)
    .sort((a, b) => b.result.score - a.result.score)

  return (
    <section aria-labelledby="dash-scores" className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <h2 id="dash-scores" className="font-bold text-gray-900">My Skills Check Scores</h2>
        <button onClick={onOpen} className="min-h-6 px-1 text-xs font-semibold text-[#1a4fa0] hover:underline">Full results and retakes →</button>
      </div>

      <div className="p-5">
        <div>
          <h3 className="sr-only">Skills check</h3>
          {checks.length === 0 ? (
            <>
              <p className="mt-2 text-sm text-gray-700">No skills check taken yet. Ten questions, no time limit. Your score ranks jobs for you and shows employers what you know.</p>
              <button onClick={onOpen} className="btn-primary min-h-11 px-5 mt-3">Take a skills check</button>
            </>
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
              {checks.map(({ category, result }) => (
                <li key={category!.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">{category!.name}</p>
                    <p className="text-2xl font-bold text-gray-900 leading-tight">
                      {result.score}<span className="text-sm font-semibold text-gray-700"> out of 100 · {scoreLevel(result.score)}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      {result.correct} of {result.total} right · taken {longDate(result.takenAt)}{result.attempts > 1 ? ` · attempt ${result.attempts}` : ''}
                    </p>
                  </div>
                  <button onClick={() => onRetake(category!.id)} aria-label={`Retake the ${category!.name} skills check`}
                    data-speak={`Retake the ${category!.name} skills check. Latest score ${result.score} out of 100.`}
                    className="min-h-11 px-4 bg-white border border-gray-500 text-gray-800 hover:bg-gray-100 font-semibold rounded-md text-sm shrink-0">
                    <span aria-hidden="true">↻ </span>Retake
                  </button>
                </li>
              ))}
            </ul>
          )}
          {checks.length > 0 && <p className="mt-3 text-xs text-gray-600">Employers you apply to see these scores.</p>}
        </div>

      </div>
    </section>
  )
}
