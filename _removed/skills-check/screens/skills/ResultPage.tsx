import type { RefObject } from 'react'
import { scoreLevel, type CheckResult } from '@/lib/assessment/question-bank'
import type { WorkCategory } from '@/lib/assessment/work-categories'
import { ScoreFigure } from '@/components/ui/Meter'
import { BTN_SECONDARY, PageCard, STEP_EYEBROW, STEP_HEADING } from '@/components/ui/PageCard'

/** The weighted score, and each missed question with the right answer and why. */
export function ResultPage({ headingRef, category, result, answers, nextLabel, onNext, onRetake }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  category: WorkCategory
  result: CheckResult
  /** Question id → position of the option the applicant chose. */
  answers: Record<string, number>
  nextLabel: string
  onNext: () => void; onRetake: () => void
}) {
  return (
    <PageCard narrow>
      <p className={STEP_EYEBROW}>{category.name} · skills check</p>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>Your result: {result.score} out of 100</h1>

      <div className="mt-5 rounded-xl border border-gray-300 bg-gray-50 p-5 grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
        {/* the heading above already says the score; this is the same number drawn large */}
        <div aria-hidden="true"><ScoreFigure score={result.score} level={scoreLevel(result.score)} size="xl" /></div>
        <dl className="grid grid-cols-2 sm:grid-cols-1 gap-3 text-sm">
          <div className="sr-only"><dt>Level</dt><dd>{scoreLevel(result.score)}</dd></div>
          <div><dt className="text-gray-700">Right answers</dt><dd className="font-bold text-gray-900 text-base">{result.correct} of {result.total}</dd></div>
          <div><dt className="text-gray-700">Weighted points</dt><dd className="font-bold text-gray-900 text-base">{result.earned} of {result.possible}</dd></div>
        </dl>
      </div>
      <p className="mt-4 text-sm text-gray-800">
        This score goes on your profile. On the Jobs page, jobs in this category are ranked with it, and each job shows whether you meet the score its employer asks for.
      </p>

      <section aria-labelledby="sc-review" className="mt-7">
        <h2 id="sc-review" className="text-lg font-bold text-gray-900">
          {result.missed.length ? `Questions to review (${result.missed.length})` : 'Every answer was right'}
        </h2>
        {result.missed.length > 0 && (
          <ol className="mt-3 space-y-4">
            {result.missed.map(x => (
              <li key={x.id} className="rounded-lg border border-gray-300 p-4 text-sm">
                <p className="text-base font-semibold text-gray-900">{x.text}</p>
                <dl className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-semibold text-red-700"><span aria-hidden="true">✕ </span>Your answer:</dt>
                    <dd className="text-gray-800">{answers[x.id] == null ? 'not answered' : x.options[answers[x.id]]}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-semibold text-[#1a7a3c]"><span aria-hidden="true">✓ </span>Right answer:</dt>
                    <dd className="text-gray-900 font-semibold">{x.options[x.answer]}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-gray-800 bg-gray-50 rounded-md px-3 py-2"><span className="font-semibold">Why:</span> {x.why}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={onNext} className="btn-primary min-h-11 px-6">{nextLabel}</button>
        <button type="button" onClick={onRetake} className={BTN_SECONDARY}>Take the check again</button>
      </div>
    </PageCard>
  )
}
