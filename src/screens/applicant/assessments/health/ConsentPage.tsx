import type { RefObject } from 'react'
import { t } from '@/lib/i18n'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { BTN_SECONDARY, PageCard, STEP_EYEBROW, STEP_HEADING } from '@/components/ui/PageCard'
import { Credit } from './Credit'

export const CONSENT_ID = 'hs-consent'
const ERROR_ID = 'hs-consent-error'

/** What the survey is, who sees it, and the agreement box. The answers are never saved. */
export function ConsentPage({ headingRef, consent, error, backLabel, onConsent, onStart, onBack }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  consent: boolean; error: string
  /** Left out when the survey is required: there is then no button to leave by. */
  backLabel?: string
  onConsent: (v: boolean) => void; onStart: () => void; onBack: () => void
}) {
  return (
    <PageCard narrow>
      <p className={STEP_EYEBROW}>{t('Health survey · private')}</p>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>{t('Before you start')}</h1>
      <div className="mt-4 space-y-3 text-sm text-gray-800 max-w-3xl">
        <p>{t('This is the RAND 36-Item Health Survey, a set of 36 questions used around the world. It asks how your health affects your daily life: moving about, working, pain, energy, mood and time with other people.')}</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>{t('It is optional.')}</strong> {t('You do not need it to apply for any job, and skipping it does not affect your applications in any way.')}</li>
          <li><strong>{t('Your answers are never saved.')}</strong> {t('They are scored on your device and shown only to you. Blind Jobs does not receive them, so no employer and nobody on our team can see them. They do not change how jobs are ranked for you.')}</li>
          <li><strong>{t('It is not a medical test')}</strong> {t('and not a test of your eyesight. There are no right or wrong answers.')}</li>
          <li><strong>{t('There is no time limit.')}</strong> {t('It takes about 10 minutes. You may skip any question, and stop at any time.')}</li>
          <li><strong>{t('Your results disappear')}</strong> {t('when you sign out or close this browser tab. You can download a copy for yourself.')}</li>
        </ul>
        <p>{t('Your answers are health information, which the Data Privacy Act of 2012 treats as sensitive personal information. That is why we do not collect them. The Privacy Notice explains this in its section "The health survey".')}</p>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-lg border border-gray-400 bg-gray-50 p-4">
        <input id={CONSENT_ID} type="checkbox" checked={consent} onChange={(e) => onConsent(e.target.checked)}
          aria-invalid={!!error} aria-describedby={error ? ERROR_ID : undefined}
          className="mt-1 w-6 h-6 shrink-0 accent-[#1a4fa0]" />
        <label htmlFor={CONSENT_ID} className="text-gray-800 cursor-pointer">
          {t('I want to answer this optional health survey. I understand my answers are scored on my device, shown only to me, and not saved or sent to Blind Jobs or to any employer.')}
        </label>
      </div>
      <ErrorMsg id={ERROR_ID} msg={error} />
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onStart} className="btn-primary min-h-11 px-6">{t('Start the survey')}</button>
        {backLabel && <button type="button" onClick={onBack} className={BTN_SECONDARY}>{backLabel}</button>}
      </div>
      <Credit />
    </PageCard>
  )
}
