import type { RefObject } from 'react'
import { WEIGHT_LABEL, type Question } from '@/lib/assessment/question-bank'
import type { WorkCategory } from '@/lib/assessment/work-categories'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { ProgressBar } from '@/components/ui/Meter'
import { BTN_SECONDARY, PageCard, STEP_EYEBROW, STEP_HEADING } from '@/components/ui/PageCard'
import { Spinner } from '@/components/ui/Spinner'

const ERROR_ID = 'sc-error'

/** One question with its four choices. The last one carries the Submit button. */
export function QuestionPage({ headingRef, category, question, index, total, answer, answered, busy, error, warned, onAnswer, onPrevious, onNext, onSubmit, onLeave }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  category: WorkCategory
  question: Question
  /** Which question, from 0. */
  index: number
  total: number
  /** Position of the chosen option, if one is chosen. */
  answer?: number
  /** How many of the questions have an answer so far. */
  answered: number
  busy: boolean; error: string
  /** True once the applicant has been told some questions are unanswered. */
  warned: boolean
  onAnswer: (option: number) => void
  onPrevious: () => void; onNext: () => void; onSubmit: () => void; onLeave: () => void
}) {
  const last = index === total - 1
  const name = `sc-${question.id}`

  return (
    <PageCard narrow>
      <p className={STEP_EYEBROW}>{category.name} · skills check</p>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>Question {index + 1} of {total}</h1>
      <div className="mt-3"><ProgressBar value={index + 1} max={total} /></div>
      <p className="mt-2 text-sm text-gray-700">
        Topic: {question.topic}. A {WEIGHT_LABEL[question.weight]} question, worth {question.weight} point{question.weight === 1 ? '' : 's'}. No time limit.
      </p>

      <fieldset className="mt-6">
        <legend className="text-lg font-semibold text-gray-900">{question.text}</legend>
        <div className="mt-4 space-y-2.5">
          {question.options.map((option, i) => {
            const id = `${name}-${i}`
            const checked = answer === i
            return (
              <div key={id} className={`flex items-start gap-3 rounded-lg border px-4 min-h-12 ${checked ? 'border-[#1a4fa0] border-l-8 bg-blue-50' : 'border-gray-400 bg-white'}`}>
                <input id={id} type="radio" name={name} value={i} checked={checked} onChange={() => onAnswer(i)}
                  className="mt-3.5 w-5 h-5 shrink-0 accent-[#1a4fa0]" />
                <label htmlFor={id} className={`flex-1 text-sm cursor-pointer py-3 ${checked ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>{option}</label>
              </div>
            )
          })}
        </div>
      </fieldset>

      <p role="status" className="mt-5 text-sm font-semibold text-gray-800">{answered} of {total} answered.</p>
      <ErrorMsg id={ERROR_ID} msg={error} />
      <div className="mt-4 flex flex-wrap gap-3">
        {last ? (
          <button type="button" onClick={onSubmit} disabled={busy} aria-busy={busy} aria-describedby={error ? ERROR_ID : undefined}
            className="btn-primary min-h-11 px-6 flex items-center gap-2 disabled:opacity-70">
            {busy ? <Spinner label="Saving" /> : warned ? 'Submit anyway' : 'Submit my answers'}
          </button>
        ) : (
          <button type="button" onClick={onNext} className="btn-primary min-h-11 px-6">Next question</button>
        )}
        {index > 0 && <button type="button" onClick={onPrevious} className={BTN_SECONDARY}>Previous question</button>}
        <button type="button" onClick={onLeave} className={BTN_SECONDARY}>Leave without saving</button>
      </div>
    </PageCard>
  )
}
