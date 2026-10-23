import { fullDateTime, stageColor } from '@/lib/format'
import { t } from '@/lib/i18n'
import type { MyApplication } from '@/types'

/**
 * An application in the inbox, for a job whose employer has no conversation with
 * the applicant yet: "You applied for …", where it stands, and a way to the job.
 */
export function ApplicationRow({ app, onOpenJob }: { app: MyApplication; onOpenJob: (jobId: string) => void }) {
  const { job, stage, appliedAt } = app
  const spoken = t('You applied for {job} at {company}. Status: {stage}. {when}. Open the job.', { job: job.jobTitle, company: job.companyName, stage: t(stage), when: fullDateTime(appliedAt) })
  return (
    <li className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-white hover:bg-gray-50">
      {/* lines up with the tick box and pin of a conversation row */}
      <span aria-hidden="true" className="w-5 shrink-0" />
      <span aria-hidden="true" className="w-9 shrink-0" />
      <button type="button" onClick={() => onOpenJob(job.id)} aria-label={spoken} data-speak={spoken}
        className="flex-1 min-w-0 flex items-center gap-3 text-left min-h-12 rounded-md">
        <span aria-hidden="true" className="w-11 h-11 shrink-0 rounded-full bg-green-50 text-xl grid place-items-center">💼</span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-medium text-gray-900 truncate">You applied for {job.jobTitle}</span>
          <span className="block text-sm text-gray-700 truncate">{job.companyName}{job.location ? ` · ${job.location}` : ''}</span>
          <span className="block text-xs text-[#1a7a3c] font-semibold">{t('View the job you applied for ›')}</span>
        </span>
        <span className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-xs text-gray-600 whitespace-nowrap">{fullDateTime(appliedAt)}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageColor(stage)}`}>{t(stage)}</span>
        </span>
      </button>
    </li>
  )
}
