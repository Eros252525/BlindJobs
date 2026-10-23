import { isGoodMatch, skillMatch } from '@/lib/jobs/matching'
import { jobIsOpen } from '@/lib/jobs/job-post'
import { t, useLang } from '@/lib/i18n'
import type { Job } from '@/types'
import type { WorkProfile } from './WorkProfileStep'

/**
 * Beside the skills form: what the answers so far add up to, updated as the
 * applicant picks. How many open jobs fit their skills and last job, by the same
 * test as job suggestions (a count only: jobs
 * are suggested once the account exists), and why each question is asked.
 */
export function ProfilePreview({ value, jobs }: { value: WorkProfile; jobs: Job[] | null }) {
  useLang()
  const skills = value.skills.filter(Boolean)
  const open = (jobs || []).filter(jobIsOpen)
  const past = value.jobTitle.trim() ? [{ title: value.jobTitle.trim(), company: '', period: '' }] : []
  const asking = skills.length ? open.filter(j => isGoodMatch(j, skillMatch(j, { skills, experience: past }))).length : 0

  return (
    <aside aria-labelledby="wp-preview" className="rounded-xl bg-gray-50 border border-gray-200 p-5 space-y-6 lg:sticky lg:top-24">
      <h2 id="wp-preview" className="text-lg font-bold text-gray-900">{t('Your answers so far')}</h2>

      <section aria-labelledby="wp-preview-jobs">
        <h3 id="wp-preview-jobs" className="text-sm font-bold text-[#1a7a3c]">{t('Open jobs that fit your skills')}</h3>
        {jobs === null ? (
          <p className="mt-1 text-sm text-gray-700">{t('Counting…')}</p>
        ) : !skills.length ? (
          <p className="mt-1 text-sm text-gray-700">{t('Add your skills to see how many of the {n} open jobs fit them.', { n: open.length })}</p>
        ) : (
          <>
            <p className="mt-1"><span className="text-3xl font-bold text-gray-900">{asking}</span> <span className="text-sm text-gray-700">{t('of {n} open jobs', { n: open.length })}</span></p>
            <p className="text-xs text-gray-600 mt-1">{t('Once you sign in, we suggest the ones that fit you best.')}</p>
          </>
        )}
      </section>

      <section aria-labelledby="wp-preview-why">
        <h3 id="wp-preview-why" className="text-sm font-bold text-[#1a7a3c]">{t('Why we ask')}</h3>
        <ul className="mt-2 space-y-2 text-sm text-gray-800 list-disc pl-5">
          <li><strong>{t('Disability type')}</strong> {t('only decides which jobs you can see when an employer limits a job to certain visual categories. It never lowers your job-fit score.')}</li>
          <li><strong>{t('Skills')}</strong> {t('are the biggest part of matching. Use the words employers use; the recommended skills come straight from their job posts.')}</li>
          <li><strong>{t('Assistive technology and accommodations')}</strong> {t('tell an employer what to set up for you before your first day.')}</li>
        </ul>
      </section>
    </aside>
  )
}
