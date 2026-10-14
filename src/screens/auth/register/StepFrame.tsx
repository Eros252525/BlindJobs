import type { ReactNode } from 'react'
import { BTN_SECONDARY } from '@/components/ui/PageCard'
import { STEPS, STEP_NAMES, stepNumber, type Step } from './steps'

// The frame for every step after the first: the signed-in backdrop without the
// menu, and a line that says where in registration the applicant is.
export function StepFrame({ step, onPrev, children }: { step: Step; onPrev?: () => void; children: ReactNode }) {
  return (
    <main id="main-content" className="portal-backdrop flex-1 flex flex-col min-h-0">
      <div className="px-4 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-3 text-white">
        <p className="text-sm font-semibold">
          Registering as applicant: step {stepNumber(step)} of {STEPS.length}, {STEP_NAMES[step]}
        </p>
        {onPrev && <button type="button" onClick={onPrev} className={BTN_SECONDARY}>Previous step</button>}
      </div>
      {children}
    </main>
  )
}
