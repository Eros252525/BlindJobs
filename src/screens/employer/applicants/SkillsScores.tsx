import { scoreLevel } from '@/lib/assessment/question-bank'
import { categoryById } from '@/lib/assessment/work-categories'
import { ScoreFigure } from '@/components/ui/Meter'
import type { Applicant, CategoryScore } from '@/types'

type Taken = { id: string; name: string; result: CategoryScore; forThisJob: boolean }

/** The applicant's skills checks, the one for this job's kind of work first, then by score. */
export function takenChecks(applicant: Applicant): Taken[] {
  const jobCategory = applicant.job?.workCategory
  return Object.entries(applicant.profile?.categoryScores || {})
    .map(([id, result]) => ({ id, name: categoryById(id)?.name ?? id, result, forThisJob: id === jobCategory }))
    .sort((a, b) => Number(b.forThisJob) - Number(a.forThisJob) || b.result.score - a.result.score)
}

/**
 * Every skills check the applicant has taken, for the employer's review: what
 * the applicant has shown they know, in numbers.
 */
export function SkillsScores({ applicant }: { applicant: Applicant }) {
  const checks = takenChecks(applicant)
  const min = Number(applicant.job?.minCategoryScore) || 0

  return (
    <section aria-labelledby="ats-checks" className="rounded-lg border border-gray-200 px-4 py-3">
      <h3 id="ats-checks" className="text-sm font-bold text-[#1a4fa0]">Skills check scores</h3>
      {checks.length === 0 ? (
        <p className="mt-1 text-sm text-gray-800">This applicant has not taken a skills check yet. You can ask them to in a message.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {checks.map(c => (
            <li key={c.id} className={`rounded-lg border p-3 ${c.forThisJob ? 'border-[#1a7a3c] border-l-8' : 'border-gray-300'}`}>
              <p className="font-semibold text-gray-900">{c.name}</p>
              {c.forThisJob && <p className="text-xs font-bold text-[#1a7a3c] mb-1">The kind of work for this job</p>}
              <div className="mt-1"><ScoreFigure score={c.result.score} level={scoreLevel(c.result.score)} /></div>
              <p className="mt-2 text-xs text-gray-600">
                {c.result.correct} of {c.result.total} answers right · {new Date(c.result.takenAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
              {c.forThisJob && min > 0 && (
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {c.result.score >= min ? `✓ Meets your minimum of ${min}` : `Below your minimum of ${min}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-gray-600">
        Ten questions drawn at random for each kind of work, weighted so that safety and privacy questions count most. Not timed. A guide to what the applicant knows, alongside their resume and your interview.
      </p>
    </section>
  )
}
