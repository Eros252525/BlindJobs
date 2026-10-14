import type { RefObject } from 'react'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { BTN_SECONDARY, PageCard, STEP_EYEBROW, STEP_HEADING } from '@/components/ui/PageCard'
import { Credit } from './Credit'

export const CONSENT_ID = 'hs-consent'
const ERROR_ID = 'hs-consent-error'

/** What the survey is, who sees it, and the consent box. Health answers are never saved without it. */
export function ConsentPage({ headingRef, consent, error, backLabel, onConsent, onStart, onBack }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  consent: boolean; error: string
  /** Left out when the survey is required: there is then no button to leave by. */
  backLabel?: string
  onConsent: (v: boolean) => void; onStart: () => void; onBack: () => void
}) {
  return (
    <PageCard narrow>
      <p className={STEP_EYEBROW}>Health survey · optional and private</p>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>Before you start</h1>
      <div className="mt-4 space-y-3 text-sm text-gray-800 max-w-3xl">
        <p>This is the RAND 36-Item Health Survey, a set of 36 questions used around the world. It asks how your health affects your daily life: moving about, working, pain, energy, mood and time with other people.</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>It is your choice.</strong> You can use Blind Jobs, take a skills check and apply for jobs without it.</li>
          <li><strong>Only you see the results.</strong> Employers never see your answers or scores, and they are not part of your job-fit score.</li>
          <li><strong>It is not a medical test</strong> and not a test of your eyesight. There are no right or wrong answers.</li>
          <li><strong>There is no time limit.</strong> It takes about 10 minutes. You may skip any question, and you can delete your answers at any time.</li>
        </ul>
        <p>Your answers are health information, which the Data Privacy Act of 2012 treats as sensitive personal information. We save them only if you agree.</p>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-lg border border-gray-400 bg-gray-50 p-4">
        <input id={CONSENT_ID} type="checkbox" checked={consent} onChange={(e) => onConsent(e.target.checked)}
          aria-invalid={!!error} aria-describedby={error ? ERROR_ID : undefined}
          className="mt-1 w-6 h-6 shrink-0 accent-[#1a4fa0]" />
        <label htmlFor={CONSENT_ID} className="text-gray-800 cursor-pointer">
          I consent to Blind Jobs saving my answers to this health survey and the scores worked out from them, so that I can see my results. I understand they are shown only to me.
        </label>
      </div>
      <ErrorMsg id={ERROR_ID} msg={error} />
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onStart} className="btn-primary min-h-11 px-6">Start the survey</button>
        {backLabel && <button type="button" onClick={onBack} className={BTN_SECONDARY}>{backLabel}</button>}
      </div>
      <Credit />
    </PageCard>
  )
}
