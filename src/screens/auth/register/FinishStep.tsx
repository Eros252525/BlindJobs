import type { RefObject } from 'react'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { PageCard, STEP_HEADING } from '@/components/ui/PageCard'
import { Spinner } from '@/components/ui/Spinner'
import type { WorkProfile } from './WorkProfileStep'

const ERROR_ID = 'reg-finish-error'

/** The last registration step: what will be saved, and the button that creates the account. */
export function FinishStep({ headingRef, name, username, work, loading, error, onCreate }: {
  headingRef: RefObject<HTMLHeadingElement | null>
  name: string; username: string
  work: WorkProfile
  loading: boolean; error: string
  onCreate: () => void
}) {
  return (
    <PageCard narrow>
      <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>Create your account</h1>
      <p className="mt-1 text-sm text-gray-700 max-w-3xl">This is what will be saved. You can change your profile after you sign in.</p>
      <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm rounded-xl bg-gray-50 border border-gray-200 p-5">
        <Fact label="Name" value={name} />
        <Fact label="Username (to sign in)" value={username} />
        <Fact label="Disability type" value={work.disabilityType} />
        <Fact label="Skills" value={work.skills.join(', ')} />
      </dl>
      <ErrorMsg id={ERROR_ID} msg={error} />
      <div className="mt-6">
        <button type="button" onClick={onCreate} disabled={loading} aria-busy={loading} aria-describedby={error ? ERROR_ID : undefined}
          className="btn-primary min-h-11 px-6 flex items-center gap-2 disabled:opacity-70">
          {loading ? <Spinner label="Creating your account" /> : 'Create my account'}
        </button>
      </div>
    </PageCard>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-700">{label}</dt>
      <dd className="font-semibold text-gray-900">{value || 'Not given'}</dd>
    </div>
  )
}
