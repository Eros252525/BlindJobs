import { useEffect, useState } from 'react'
import { t } from '@/lib/i18n'
import { api } from '@/lib/api'
import { formatSalary, stageColor, timeAgo } from '@/lib/format'
import { incompleteProfileMessage, requiredProfileFields } from '@/lib/resume'
import { missingFields } from '@/lib/validation'
import { toast } from '@/lib/toast'
import { useUpdateTick } from '@/hooks/useUpdateTick'
import { useNow } from '@/hooks/useNow'
import { suggestJobs } from '@/lib/jobs/job-fit'
import { jobIsOpen } from '@/lib/jobs/job-post'
import { Spinner } from '@/components/ui/Spinner'
import type { ApplicantProfile, Conversation, Job, Screen, User } from '@/types'

type MyApplication = { job: Job; stage: string }

export function DashboardScreen({ user, onNavigate, onOpenJob, onOpenProfileField }: {
  user: User; onNavigate: (s: Screen) => void; onOpenJob: (jobId: string) => void
  /** Opens the Profile page on one field (its id), from the "complete your profile" banner. */
  onOpenProfileField: (fieldId: string) => void
}) {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const now = useNow() // keeps "posted 5 minutes ago" current
  const [apps, setApps] = useState<MyApplication[] | null>(null)
  const [convCount, setConvCount] = useState(0)
  const [profile, setProfile] = useState<ApplicantProfile | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  // a notification just arrived: reload so the lists below match what it said
  const reload = useUpdateTick()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [allJobs, appliedIds, convs, mine_] = await Promise.all([
        api.getJobs().catch(() => [] as Job[]),
        api.getAppliedJobs(user.id).catch(() => [] as string[]),
        api.getConversations(user.id).catch(() => [] as Conversation[]),
        api.getProfile(user.id).catch(() => null),
      ])
      const byId = new Map(allJobs.map((j: Job) => [j.id, j]))
      const mine = await Promise.all(appliedIds.filter(id => byId.has(id)).map(async id => ({
        job: byId.get(id)!,
        stage: (await api.getApplicationStage(user.id, id).catch(() => null)) || 'New',
      })))
      if (cancelled) return
      setJobs(allJobs)
      setApps(mine.reverse())
      setConvCount(convs.length)
      setProfile(mine_)
    })()
    return () => { cancelled = true }
  }, [user.id, reload])

  const appliedSet = new Set(apps?.map(a => a.job.id))
  const openJobs = (jobs || []).filter(jobIsOpen)
  // Once the profile lists skills, the right-hand list is the jobs suggested for this
  // applicant; before that it is simply the newest jobs, with nothing recommended
  const suggested = suggestJobs(openJobs, profile).slice(0, 8)
  const latest = suggested.length
    ? suggested.map(s => s.job)
    : [...openJobs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 8)
  const reasonFor = (jobId: string) => suggested.find(s => s.job.id === jobId)?.because
  const inProgress = apps?.filter(a => a.stage === 'Reviewed' || a.stage === 'Interviewing').length ?? 0
  const hired = apps?.filter(a => a.stage === 'Hired').length ?? 0
  // Required profile fields still empty; applying needs them, so they are named here before anyone tries
  const profileGaps = profile ? missingFields(requiredProfileFields(profile)) : []

  const handleQuickApply = async (job: Job) => {
    setApplyingId(job.id)
    try {
      await api.applyToJob(job.id, user.id)
      setApps(prev => [{ job, stage: 'New' }, ...(prev || [])])
      toast(t('Applied to {job}', { job: job.jobTitle }), 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally { setApplyingId(null) }
  }

  // `spoken` is the tile's whole label for screen readers: the visible parts are
  // separate lines, which would otherwise run together as "Applications 0 0 in progress"
  const tiles = [
    { icon: '🧑', label: t('My Profile'), value: t('Edit'), sub: t('Update your resume'), target: 'profile' as Screen,
      spoken: t('My Profile: edit, update your resume.') },
    { icon: '📨', label: t('Applications'), value: apps?.length ?? '–', sub: t('{progress} in progress · {hired} hired', { progress: inProgress, hired }), target: 'jobs' as Screen,
      spoken: apps ? t('Applications: {total} total, {progress} in progress, {hired} hired.', { total: apps.length, progress: inProgress, hired }) : t('Applications: loading.') },
    { icon: '🔍', label: t('Open Jobs'), value: jobs ? openJobs.length : '–', sub: t('Browse all listings'), target: 'jobs' as Screen,
      spoken: jobs ? t('Open Jobs: {n}. Browse all listings.', { n: openJobs.length }) : t('Open Jobs: loading.') },
    { icon: '💬', label: t('Messages'), value: convCount, sub: t(convCount === 1 ? 'conversation' : 'conversations'), target: 'messages' as Screen,
      spoken: t(convCount === 1 ? 'Messages: {n} conversation.' : 'Messages: {n} conversations.', { n: convCount }) },
  ]

  return (
    <div className="flex-1 flex flex-col gap-5 p-4 sm:p-6 pb-24 sm:pb-24">
      <header className="flex flex-wrap items-end justify-between gap-2 text-white">
        <div>
          <h1 className="text-2xl font-bold">{t('Welcome back, {name}!', { name: user.name })} <span aria-hidden="true">🦯</span></h1>
          <p className="text-sm">{t('Here\'s what\'s happening with your job search.')}</p>
        </div>
        <p className="text-xs"><strong>{t('Tab')}</strong> {t('moves between tiles and lists ·')} <strong>{t('Enter')}</strong> {t('to open')}</p>
      </header>

      {/* A Gmail given at registration or on the profile, waiting for its emailed code */}
      {profile?.email && profile.username && !profile.emailVerified && (
        <section aria-labelledby="dash-email" className="rounded-xl border-2 border-[#a16207] bg-yellow-50 p-4 sm:p-5">
          <h2 id="dash-email" className="font-bold text-gray-900">{t('Confirm your Gmail address')}</h2>
          <p className="mt-1 text-sm text-gray-800">{t('Your Gmail, {email}, is not confirmed yet, so codes for a forgotten password are not sent to it.', { email: profile.email })}</p>
          <button type="button" onClick={() => onNavigate('profile')}
            className="mt-3 min-h-11 px-4 rounded-md border border-[#1a4fa0] bg-white text-sm font-semibold text-[#1a4fa0] hover:bg-blue-50">
            {t('Confirm my Gmail')}
          </button>
        </section>
      )}

      {profileGaps.length > 0 && (
        <section aria-labelledby="dash-profile-gaps" className="rounded-xl border-2 border-[#a16207] bg-yellow-50 p-4 sm:p-5">
          <h2 id="dash-profile-gaps" className="font-bold text-gray-900">{incompleteProfileMessage(profileGaps)}</h2>
          <p className="mt-1 text-sm text-gray-800">{t('Employers see your profile when you apply, so these are needed first.')}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {profileGaps.map(f => (
              <li key={f.id}>
                <button type="button" onClick={() => onOpenProfileField(f.id)}
                  className="min-h-11 px-4 rounded-md border border-[#1a4fa0] bg-white text-sm font-semibold text-[#1a4fa0] hover:bg-blue-50">
                  {t('Add {field}', { field: f.label.toLowerCase() })}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(item => (
          <button key={item.label} onClick={() => onNavigate(item.target)}
            aria-label={item.spoken} data-speak={item.spoken}
            className="min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 text-left hover:shadow-md hover:border-[#1a7a3c] transition-all">
            <span aria-hidden="true" className="text-3xl w-12 h-12 rounded-xl bg-[#f0f2f5] grid place-items-center shrink-0">{item.icon}</span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wide text-gray-600">{item.label}</span>
              <span className="block text-2xl font-bold text-gray-900 leading-tight">{item.value}</span>
              <span className="block text-xs text-gray-600 truncate">{item.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-0">
        {/* My applications */}
        <section aria-labelledby="dash-apps" className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[18rem]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 id="dash-apps" className="font-bold text-gray-900">{t('My Applications')}</h2>
            <span className="text-xs text-gray-600">{apps ? t('{n} total', { n: apps.length }) : ''}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!apps ? (
              <p className="h-full grid place-items-center text-sm text-gray-600" role="status">{t('Loading…')}</p>
            ) : apps.length === 0 ? (
              <div className="h-full grid place-items-center text-center p-6">
                <div>
                  <p className="text-sm text-gray-600 mb-3">{t('You haven\'t applied to any jobs yet.')}</p>
                  <button onClick={() => onNavigate('jobs')} className="btn-primary">{t('Find jobs')}</button>
                </div>
              </div>
            ) : apps.map(({ job, stage }) => (
              <button key={job.id} onClick={() => onOpenJob(job.id)}
                data-speak={t('{job} at {company}. Status: {stage}', { job: job.jobTitle, company: job.companyName, stage: t(stage) })}
                className="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-[#eef3fb] grid place-items-center text-lg shrink-0">💼</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 truncate">{job.jobTitle}</span>
                  <span className="block text-xs text-gray-600 truncate">{job.companyName} · {job.location || 'Remote'}</span>
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${stageColor(stage)}`}>{t(stage)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Latest openings */}
        <section aria-labelledby="dash-latest" className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[18rem]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 id="dash-latest" className="font-bold text-gray-900">{suggested.length ? 'Suggested Jobs for You' : 'Latest Job Openings'}</h2>
            <button onClick={() => onNavigate('jobs')} className="min-h-6 px-1 text-xs font-semibold text-[#1a4fa0] hover:underline">{t('View all →')}</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!jobs ? (
              <p className="h-full grid place-items-center text-sm text-gray-600" role="status">{t('Loading…')}</p>
            ) : latest.length === 0 ? (
              <p className="h-full grid place-items-center text-sm text-gray-600">{t('No open jobs right now.')}</p>
            ) : latest.map(job => {
              const applied = appliedSet.has(job.id)
              return (
                // wraps so Apply drops below the title when text is very large, instead of squeezing it
                <div key={job.id} className="flex flex-wrap items-center gap-2 px-1 rounded-lg hover:bg-gray-50 transition-colors">
                  <button onClick={() => onOpenJob(job.id)}
                    data-speak={[t('{job} at {company}, {place}', { job: job.jobTitle, company: job.companyName, place: job.location || t('Remote') }),
                      job.salary ? t('salary {amount}', { amount: formatSalary(job.salary) }) : '', t('Posted {when}', { when: timeAgo(job.createdAt, now) }),
                      reasonFor(job.id) ? t('Suggested: {why}', { why: reasonFor(job.id)! }) : ''].filter(Boolean).join('. ')}
                    className="flex-1 min-w-[10rem] text-left px-2 py-3 flex items-center gap-3">
                    <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-green-50 grid place-items-center text-lg shrink-0">⌨️</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900 truncate">{job.jobTitle}</span>
                      <span className="block text-xs text-gray-600 truncate">
                        {job.companyName} · {job.location || t('Remote')}{job.salary ? ` · ${formatSalary(job.salary)}` : ''} · {t('Posted {when}', { when: timeAgo(job.createdAt, now) })}
                      </span>
                      {reasonFor(job.id) && <span className="block text-xs font-semibold text-[#1a7a3c]">{reasonFor(job.id)}</span>}
                    </span>
                  </button>
                  {applied ? (
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-full shrink-0">{t('✓ Applied')}</span>
                  ) : (
                    <button onClick={() => handleQuickApply(job)} disabled={applyingId === job.id}
                      data-speak={t('Apply to {job}', { job: job.jobTitle })} aria-label={t('Apply to {job}', { job: job.jobTitle })}
                      className="text-xs font-semibold text-white bg-[#1a7a3c] hover:bg-[#155f30] px-4 py-1.5 rounded-full shrink-0 transition-colors disabled:opacity-60 flex items-center gap-1">
                      {applyingId === job.id ? <Spinner /> : 'Apply'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
