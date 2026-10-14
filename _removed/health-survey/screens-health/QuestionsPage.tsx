import type { RefObject } from 'react'
import { RAND36_STEPS, type Rand36Answers } from '@/lib/assessment/rand36'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { ProgressBar } from '@/components/ui/Meter'
import { BTN_SECONDARY, PageCard, STEP_EYEBROW, STEP_HEADING } from '@/components/ui/PageCard'
import { Spinner } from '@/components/ui/Spinner'
import { Credit } from './Credit'
import { ItemField } from './ItemField'

const ERROR_ID = 'hs-error'

/** One of the survey's six pages: the questions that share an instruction, shown together. */
export function QuestionsPage({ headingRef, index, answers, busy, error, leaveLabel, onAnswer, onClear, onPrevious, onNext, onFinish, onLeave }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  /** Which page, from 0. */
  index: number
  answers: Rand36Answers
  busy: boolean; error: string
  /** Left out when the survey is required: there is then no button to leave by. */
  leaveLabel?: string
  onAnswer: (item: number, answer: number) => void
  onClear: (item: number) => void
  onPrevious: () => void; onNext: () => void; onFinish: () => void; onLeave: () => void
}) {
  const step = RAND36_STEPS[index]
  const items = step.groups.flatMap(g => g.items)
  const last = index === RAND36_STEPS.length - 1
  const answeredHere = items.filter(i => answers[i.n]).length
  const answeredAll = Object.keys(answers).length

  return (
    <PageCard narrow>
      <p className={STEP_EYEBROW}>Health survey · page {index + 1} of {RAND36_STEPS.length}</p>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>{step.title}</h1>
      <div className="mt-3"><ProgressBar value={index + 1} max={RAND36_STEPS.length} /></div>
      <p className="mt-2 text-sm text-gray-700">
        Questions {items[0].n} to {items[items.length - 1].n} of 36. No time limit. You may skip a question you do not want to answer.
      </p>
      {step.note && (
        <p className="mt-4 text-sm text-gray-800 bg-gray-50 rounded-lg border-l-4 border-[#1a4fa0] px-4 py-3">
          <strong>Note from Blind Jobs, not part of the survey:</strong> {step.note}
        </p>
      )}

      {step.groups.map((group, gi) => {
        const introId = group.intro ? `hs-intro-${index}-${gi}` : undefined
        return (
          <div key={gi} className="mt-7">
            {group.intro && <p id={introId} className="text-base font-semibold text-gray-900">{group.intro}</p>}
            {/* sighted users read the stem once here; each question's legend repeats it for screen readers */}
            {group.stem && <p aria-hidden="true" className="mt-2 text-sm font-semibold text-gray-800">{group.stem}</p>}
            <div className="mt-4 space-y-5">
              {group.items.map(it => (
                <ItemField key={it.n} item={it} stem={group.stem} describedBy={introId} value={answers[it.n]}
                  onChange={(v) => onAnswer(it.n, v)} onClear={() => onClear(it.n)} />
              ))}
            </div>
          </div>
        )
      })}

      <p role="status" className="mt-6 text-sm font-semibold text-gray-800">
        {answeredHere} of {items.length} answered on this page; {answeredAll} of 36 in all.
      </p>
      <ErrorMsg id={ERROR_ID} msg={error} />
      <div className="mt-4 flex flex-wrap gap-3">
        {last ? (
          <button type="button" onClick={onFinish} disabled={busy} aria-busy={busy} className="btn-primary min-h-11 px-6 flex items-center gap-2 disabled:opacity-70">
            {busy ? <Spinner label="Saving" /> : 'Finish and see my results'}
          </button>
        ) : (
          <button type="button" onClick={onNext} className="btn-primary min-h-11 px-6">Next page</button>
        )}
        {index > 0 && <button type="button" onClick={onPrevious} className={BTN_SECONDARY}>Previous page</button>}
        {leaveLabel && <button type="button" onClick={onLeave} className={BTN_SECONDARY}>{leaveLabel}</button>}
      </div>
      <Credit />
    </PageCard>
  )
}
