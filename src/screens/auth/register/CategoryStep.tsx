import type { RefObject } from 'react'
import type { WorkCategory, WorkCategoryId } from '@/lib/assessment/work-categories'
import { BTN_SECONDARY, PageCard, STEP_HEADING } from '@/components/ui/PageCard'
import { CategoryList } from '@/screens/applicant/assessments/CategoryList'
import type { ApplicantProfile } from '@/types'
import type { CheckSummary } from './steps'

/** Registration step 4: kinds of work suggested from step 3, and the applicant's pick. */
export function CategoryStep({ headingRef, draft, finished, onPick, onKeepScore, onSkip }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  /** What registration knows about the applicant so far, shaped like a saved profile. */
  draft: ApplicantProfile
  /** A skills check already finished in this registration, if the applicant came back to this step. */
  finished?: { category: WorkCategory; check: CheckSummary }
  onPick: (id: WorkCategoryId) => void
  onKeepScore: () => void
  /** Leaves the skills check for later. Not given when registration requires the check. */
  onSkip?: () => void
}) {
  return (
    <PageCard>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>Choose a kind of work</h1>
      <p className="mt-1 text-sm text-gray-800 max-w-3xl">
        Pick one, then answer 10 questions about it. The suggestions come from the skills, experience and preferences you just gave.
        They are suggestions only: every kind of work is open to you, and you can take the others after you sign in.
      </p>
      {onSkip && !finished && (
        <div className="mt-4 rounded-lg border border-gray-300 bg-gray-50 p-4 max-w-3xl">
          <p className="text-sm text-gray-800">
            Not ready now? You can skip this and take a skills check later from the Assessments page. Until you do, jobs are ranked without it, and a job that requires a check cannot be applied to.
          </p>
          <button type="button" onClick={onSkip} className={`${BTN_SECONDARY} mt-3`}>Skip the skills check for now</button>
        </div>
      )}
      {finished && (
        <div className="mt-4 rounded-lg border border-gray-300 p-4 max-w-3xl">
          <p className="text-sm text-gray-900 font-semibold">You have finished the {finished.category.name} skills check: {finished.check.score} out of 100.</p>
          <button type="button" onClick={onKeepScore} className="btn-primary min-h-11 px-5 mt-3">Continue with this score</button>
        </div>
      )}
      <CategoryList profile={draft} pickLabel="Choose and start the 10 questions" onPick={onPick}
        emptyHint={<p className="mt-4 text-sm text-gray-800 max-w-3xl">Nothing you entered points to one kind of work more than another, so all of them are listed.</p>} />
    </PageCard>
  )
}
