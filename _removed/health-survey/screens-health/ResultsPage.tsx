import { useState, type RefObject } from 'react'
import { RAND36_ITEMS, RAND36_SCALES, healthChangeText, scoreBand } from '@/lib/assessment/rand36'
import { ScoreBar } from '@/components/ui/Meter'
import { BTN_SECONDARY, PageCard, STEP_EYEBROW, STEP_HEADING } from '@/components/ui/PageCard'
import { Spinner } from '@/components/ui/Spinner'
import type { HealthAssessment } from '@/types'
import { Credit } from './Credit'

/** The eight scale scores, each with where it sits on the scale, and how to read them. */
export function ResultsPage({ headingRef, assessment, busy, nextLabel, onNext, onRetake, onDelete }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  assessment: HealthAssessment
  busy: boolean; nextLabel: string
  onNext: () => void; onRetake: () => void; onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const change = healthChangeText(assessment.answers)
  const skipped = RAND36_ITEMS.length - Object.keys(assessment.answers).length

  return (
    <PageCard>
      <p className={STEP_EYEBROW}>Health survey · only you can see this page</p>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>Your health survey results</h1>
      <p className="mt-1 text-sm text-gray-700">Taken on {new Date(assessment.takenAt).toLocaleDateString(undefined, { dateStyle: 'long' })}.</p>

      <div className="mt-4 bg-gray-50 rounded-lg border-l-4 border-[#1a4fa0] px-4 py-3 text-sm text-gray-800 space-y-1 max-w-3xl">
        <p>Each of the eight scores runs from 0 to 100. <strong>A higher score always means better health on that scale</strong>: for example, a high pain score means little pain.</p>
        {change && <p>Compared to one year ago, you rated your health: <strong>{change.toLowerCase()}</strong>.</p>}
        {skipped > 0 && <p>You skipped {skipped} question{skipped === 1 ? '' : 's'}. Each score uses only the questions you answered.</p>}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <caption className="text-left text-lg font-bold text-gray-900 mb-2">Your eight health scales</caption>
          <thead>
            <tr className="border-b-2 border-gray-500">
              <th scope="col" className="py-2 pr-4 font-semibold text-gray-900">Scale</th>
              <th scope="col" className="py-2 pr-4 font-semibold text-gray-900">Your score, out of 100</th>
              <th scope="col" className="py-2 pr-4 font-semibold text-gray-900">Study average</th>
              <th scope="col" className="py-2 font-semibold text-gray-900">What it covers</th>
            </tr>
          </thead>
          <tbody>
            {RAND36_SCALES.map(scale => {
              const s = assessment.scales.find(x => x.id === scale.id)
              const score = s?.score ?? null
              return (
                <tr key={scale.id} className="border-b border-gray-200 align-top">
                  <th scope="row" className="py-3 pr-4 font-semibold text-gray-900">{scale.name}</th>
                  <td className="py-3 pr-4 min-w-[11rem]">
                    {score == null ? <span className="text-gray-700">No score: not answered</span> : (
                      <>
                        <span className="text-2xl font-bold text-gray-900 leading-none">{score}</span>
                        {/* the bar repeats the number for sighted users; the number is the accessible value */}
                        <ScoreBar score={score} className="mt-1.5 max-w-44" />
                        <span className="block text-gray-700 mt-1">
                          {scoreBand(score)}{s && s.answered < s.of ? `; from ${s.answered} of ${s.of} questions` : ''}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-800">{Math.round(scale.mosMean)}</td>
                  <td className="py-3 text-gray-800">{scale.about}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="hs-read" className="mt-7 max-w-3xl">
        <h2 id="hs-read" className="text-lg font-bold text-gray-900">How to read this</h2>
        <ul className="mt-2 list-disc pl-6 space-y-2 text-sm text-gray-800">
          <li>These scores describe how you felt when you answered. They are not a diagnosis. If a result worries you, please talk to a doctor or a health worker you trust.</li>
          <li>The study average is from the Medical Outcomes Study, in which 2,471 adult patients in the United States answered the same questions. It is a reference point only: there are no published averages for Filipinos who are blind or have low vision.</li>
          <li>The survey has no pass mark, and RAND gives no cut-off scores. Words such as "upper middle of the scale" only say where a number sits between 0 and 100.</li>
          <li>Employers never see this page, and nothing here changes your job-fit score.</li>
        </ul>
      </section>

      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={onNext} className="btn-primary min-h-11 px-6">{nextLabel}</button>
        <button type="button" onClick={onRetake} className={BTN_SECONDARY}>Take the survey again</button>
        {!confirmDelete && <button type="button" onClick={() => setConfirmDelete(true)} className={BTN_SECONDARY}>Delete my answers and scores</button>}
      </div>
      {confirmDelete && (
        <div role="alert" className="mt-4 rounded-lg border-2 border-red-400 p-4 max-w-3xl">
          <p className="text-sm text-gray-900 font-semibold">Delete your health answers and scores for good? This cannot be undone.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={onDelete} disabled={busy} className="min-h-11 px-5 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-md text-sm flex items-center gap-2 disabled:opacity-70">
              {busy ? <Spinner label="Deleting" /> : 'Yes, delete them'}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={BTN_SECONDARY}>No, keep them</button>
          </div>
        </div>
      )}
      <Credit />
    </PageCard>
  )
}
