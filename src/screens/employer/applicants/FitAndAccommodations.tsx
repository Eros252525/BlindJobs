import { fitLabel, jobFit } from '@/lib/jobs/job-fit'
import type { Applicant } from '@/types'

// What the employer reviews before deciding: the explained fit score, and what
// the applicant has asked for.
export function FitAndAccommodations({ applicant }: { applicant: Applicant }) {
  const fit = applicant.job ? jobFit(applicant.job, applicant.profile) : null
  const asked = applicant.profile?.accommodations || []

  return (
    <div className="mb-4 space-y-4">
      {fit && (
        <section aria-labelledby="ats-fit" className="rounded-lg border border-gray-200 px-4 py-3">
          <h3 id="ats-fit" className="text-sm font-bold text-[#1a4fa0]">Job fit: {fitLabel(fit.score)}, {fit.score} out of 100</h3>
          <ul className="mt-2 space-y-1">
            {fit.parts.map(part => (
              <li key={part.id} className="text-sm text-gray-800">
                <span className="font-semibold text-gray-900">{part.label}: {part.earned} of {part.max} points.</span> {part.reason}
              </li>
            ))}
          </ul>
          {fit.cap && <p className="mt-2 text-sm font-semibold text-gray-900">{fit.cap}</p>}
          <p className="mt-2 text-xs text-gray-600">
            A guide for your review, not a decision. The score leaves out the applicant's type of visual disability, which may not be used against them (Republic Act No. 7277).
          </p>
        </section>
      )}

      <section aria-labelledby="ats-acc" className="rounded-lg border border-gray-200 px-4 py-3">
        <h3 id="ats-acc" className="text-sm font-bold text-[#1a4fa0]">Accommodations to discuss</h3>
        {asked.length ? (
          <ul className="mt-2 list-disc pl-6 text-sm text-gray-800 space-y-1">
            {asked.map(x => <li key={x}>{x}</li>)}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-gray-800">The applicant has not listed any. Ask what would help; do not assume.</p>
        )}
        <p className="mt-2 text-xs text-gray-600">
          Many of these cost little: NVDA is a free screen reader, and Windows, Android and iPhone each have one built in. Republic Act No. 7277, as amended by Republic Act No. 10524, gives private employers of persons with disability tax deductions; check the current rules with the BIR.
        </p>
      </section>
    </div>
  )
}
