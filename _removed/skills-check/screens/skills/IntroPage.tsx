import type { RefObject } from 'react'
import { QUESTIONS_PER_CHECK, scoreLevel } from '@/lib/assessment/question-bank'
import type { WorkCategory } from '@/lib/assessment/work-categories'
import { BTN_SECONDARY, PageCard, STEP_EYEBROW, STEP_HEADING } from '@/components/ui/PageCard'
import type { CategoryScore } from '@/types'

/** The rules of the check, said before the first question so nothing is a surprise. */
export function IntroPage({ headingRef, category, pool, previous, backLabel, onStart, onBack }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  category: WorkCategory
  /** How many approved questions the ten are drawn from. */
  pool: number
  previous?: CategoryScore
  backLabel: string
  onStart: () => void; onBack: () => void
}) {
  return (
    <PageCard narrow>
      <p className={STEP_EYEBROW}>Skills check · before you start</p>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>{category.name}</h1>
      <p className="mt-2 text-sm text-gray-800 max-w-3xl">{category.summary}</p>
      <ul className="mt-4 list-disc pl-6 space-y-2 text-sm text-gray-800 max-w-3xl">
        <li>You get <strong>{QUESTIONS_PER_CHECK} questions</strong>, picked at random from {pool} approved questions about this kind of work. Each has four choices and one right answer.</li>
        <li><strong>There is no time limit.</strong> Take as long as you need to listen to or read each question. You can go back and change an answer before you submit.</li>
        <li>Questions do not all count the same. A <strong>basic</strong> question is worth 1 point, a <strong>core</strong> question 2 points, and a <strong>critical</strong> question, about safety, privacy or a client's trust, 3 points. Your score is the points you earn out of the points possible, as a number out of 100.</li>
        <li>Your score is saved to your profile. Employers you apply to can see it, and it is part of your job-fit score for jobs in this category.</li>
        <li>You can take the check again. Only your latest score is kept.</li>
      </ul>
      {previous && (
        <p className="mt-4 text-sm text-gray-800 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
          Your latest score: <strong>{previous.score} out of 100</strong> ({scoreLevel(previous.score)}), taken {new Date(previous.takenAt).toLocaleDateString(undefined, { dateStyle: 'long' })}.
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onStart} className="btn-primary min-h-11 px-6">{previous ? 'Take the check again' : 'Start the skills check'}</button>
        <button type="button" onClick={onBack} className={BTN_SECONDARY}>{backLabel}</button>
      </div>
    </PageCard>
  )
}
