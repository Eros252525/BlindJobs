import type { ReactNode } from 'react'
import { BTN_SECONDARY } from '@/components/ui/PageCard'
import { t, useLang } from '@/lib/i18n'
import { STEPS, STEP_NAMES, stepNumber, type Step } from './steps'

// The frame for every step after the first: the signed-in backdrop without the
// menu, and a line that says where in registration the applicant is.
export function StepFrame({ step, onPrev, children }: { step: Step; onPrev?: () => void; children: ReactNode }) {
  useLang()
  return (
    <main id="main-content" className="portal-backdrop flex-1 flex flex-col min-h-0">
      <div className="px-4 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-3 text-white">
        <p className="text-sm font-semibold">
          {t('Registering as applicant: step {n} of {total}, {name}', { n: stepNumber(step), total: STEPS.length, name: t(STEP_NAMES[step]) })}
        </p>
        {onPrev && <button type="button" onClick={onPrev} className={BTN_SECONDARY}>{t('Previous step')}</button>}
      </div>
      {children}
    </main>
  )
}
