import { useState, type RefObject } from 'react'
import { t } from '@/lib/i18n'
import { formatDate } from '@/lib/format'
import { RAND36_ITEMS, RAND36_SCALES, healthChangeText, scoreBand } from '@/lib/assessment/rand36'
import { ScoreBar } from '@/components/ui/Meter'
import { BTN_SECONDARY, PageCard, STEP_EYEBROW, STEP_HEADING } from '@/components/ui/PageCard'
import type { HealthAssessment } from '@/types'
import { Credit } from './Credit'

/** The results as plain text, for the applicant's own copy: easy to read aloud, print or keep. */
function resultsText(a: HealthAssessment): string {
  const change = healthChangeText(a.answers)
  return [
    'RAND 36-Item Health Survey: my results',
    `Taken on ${formatDate(a.takenAt)}.`,
    'Each score runs from 0 to 100. A higher score means better health on that scale.',
    '',
    ...RAND36_SCALES.map(scale => {
      const score = a.scales.find(x => x.id === scale.id)?.score
      return score == null ? `${scale.name}: no score, not answered.` : `${scale.name}: ${score} out of 100 (${scoreBand(score)}). Study average ${Math.round(scale.mosMean)}.`
    }),
    ...(change ? ['', `Compared to one year ago, I rated my health: ${change.toLowerCase()}.`] : []),
    '',
    'These scores are not a diagnosis. Blind Jobs did not save these answers.',
  ].join('\r\n')
}

function download(a: HealthAssessment) {
  const url = URL.createObjectURL(new Blob([resultsText(a)], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `health-survey-results-${a.takenAt.slice(0, 10)}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

/** The eight scale scores, each with where it sits on the scale, and how to read them. They are not saved. */
export function ResultsPage({ headingRef, assessment, onNext, onRetake, onClear }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  assessment: HealthAssessment
  onNext: () => void; onRetake: () => void
  /** Forgets the results now. */
  onClear: () => void
}) {
  const [note, setNote] = useState('')
  const change = healthChangeText(assessment.answers)
  const skipped = RAND36_ITEMS.length - Object.keys(assessment.answers).length

  return (
    <PageCard>
      <p className={STEP_EYEBROW}>{t('Health survey · only you can see this page')}</p>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>{t('Your health survey results')}</h1>
      <p className="mt-1 text-sm text-gray-700">{t('Taken on {date}.', { date: formatDate(assessment.takenAt) })}</p>
      <p className="mt-2 rounded-lg border-2 border-[#a16207] bg-yellow-50 p-3 text-sm text-gray-900 max-w-3xl">
        <strong>{t('These results are not saved.')}</strong> {t('They stay in this browser tab only, until you sign out or close the tab. To keep them, choose Download a copy of my results.')}
      </p>

      <div className="mt-4 bg-gray-50 rounded-lg border-l-4 border-[#1a4fa0] px-4 py-3 text-sm text-gray-800 space-y-1 max-w-3xl">
        <p>{t('Each of the eight scores runs from 0 to 100.')} <strong>{t('A higher score always means better health on that scale')}</strong>{t(': for example, a high pain score means little pain.')}</p>
        {change && <p>{t('Compared to one year ago, you rated your health:')} <strong>{change.toLowerCase()}</strong>.</p>}
        {skipped > 0 && <p>{t(skipped === 1 ? 'You skipped {n} question. Each score uses only the questions you answered.' : 'You skipped {n} questions. Each score uses only the questions you answered.', { n: skipped })}</p>}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <caption className="text-left text-lg font-bold text-gray-900 mb-2">{t('Your eight health scales')}</caption>
          <thead>
            <tr className="border-b-2 border-gray-500">
              <th scope="col" className="py-2 pr-4 font-semibold text-gray-900">{t('Scale')}</th>
              <th scope="col" className="py-2 pr-4 font-semibold text-gray-900">{t('Your score, out of 100')}</th>
              <th scope="col" className="py-2 pr-4 font-semibold text-gray-900">{t('Study average')}</th>
              <th scope="col" className="py-2 font-semibold text-gray-900">{t('What it covers')}</th>
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
                    {score == null ? <span className="text-gray-700">{t('No score: not answered')}</span> : (
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
        <h2 id="hs-read" className="text-lg font-bold text-gray-900">{t('How to read this')}</h2>
        <ul className="mt-2 list-disc pl-6 space-y-2 text-sm text-gray-800">
          <li>{t('These scores describe how you felt when you answered. They are not a diagnosis. If a result worries you, please talk to a doctor or a health worker you trust.')}</li>
          <li>{t('The study average is from the Medical Outcomes Study, in which 2,471 adult patients in the United States answered the same questions. It is a reference point only: there are no published averages for Filipinos who are blind or have low vision.')}</li>
          <li>{t('The survey has no pass mark, and RAND gives no cut-off scores. Words such as "upper middle of the scale" only say where a number sits between 0 and 100.')}</li>
          <li>{t('Your answers were never sent to Blind Jobs. Employers never see them, and nothing here changes your applications or how jobs are ranked for you.')}</li>
        </ul>
      </section>

      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={() => { download(assessment); setNote(t('Your results were downloaded as a text file. Look in your Downloads folder.')) }}
          className="btn-primary min-h-11 px-6">{t('Download a copy of my results')}</button>
        <button type="button" onClick={onNext} className={BTN_SECONDARY}>{t('Back to assessments')}</button>
        <button type="button" onClick={onRetake} className={BTN_SECONDARY}>{t('Take the survey again')}</button>
        <button type="button" onClick={onClear} className={BTN_SECONDARY}>{t('Clear my results now')}</button>
      </div>
      <p role="status" className="mt-2 text-sm text-gray-800 min-h-5">{note}</p>
      <Credit />
    </PageCard>
  )
}
