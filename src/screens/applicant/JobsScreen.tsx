import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/i18n'
import { api } from '@/lib/api'
import { categoryById } from '@/lib/jobs/work-categories'
import { rankJobs, suggestJobs, type JobFit } from '@/lib/jobs/job-fit'
import { jobSkillList, skillMatches } from '@/lib/jobs/matching'
import { jobClosedLabel, jobIsOpen } from '@/lib/jobs/job-post'
import { formatSalary, fullDateTime, timeAgo } from '@/lib/format'
import { incompleteProfileMessage, requiredProfileFields } from '@/lib/resume'
import { missingFields } from '@/lib/validation'
import { toast } from '@/lib/toast'
import { useNow } from '@/hooks/useNow'
import { Spinner } from '@/components/ui/Spinner'
import type { ApplicantProfile, Job, User } from '@/types'

// Active, and nothing on the post needs fixing; a job applied to stays listed either way
const isOpen = (j: Job) => jobIsOpen(j)
// Jobs per page
const PAGE_SIZE = 5

const newestFirst = (js: Job[]) => [...js].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

export function JobsScreen({ user, initialJobId, onGoToProfile, onGoToProfileField }: {
  user: User; initialJobId?: string | null
  /** Opens the Profile page, to add the skills that job suggestions come from. */
  onGoToProfile: () => void
  /** Opens the Profile page on one field (its id), when a field needed to apply is empty. */
  onGoToProfileField: (fieldId: string) => void
}) {
  const [jobs, setJobs] = useState<Job[]>([])
  // ticks once a minute, so "Posted 5 minutes ago" keeps counting while the page is open
  const now = useNow()
  const [selected, setSelected] = useState<Job | null>(null)
  const [search, setSearch] = useState('')
  // The page of the job list being shown; a new search starts again at page 1
  const [pageNo, setPageNo] = useState(1)
  useEffect(() => { setPageNo(1) }, [search])
  const [applying, setApplying] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')
  const [profile, setProfile] = useState<ApplicantProfile | null>(null)
  const [appliedIds, setAppliedIds] = useState<string[]>([])
  const detailsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    Promise.all([
      api.getJobs(),
      api.getAppliedJobs(user.id).catch(() => [] as string[]),
      api.getProfile(user.id).catch(() => null),
    ]).then(([js, applied, p]) => {
      // Paused and closed jobs are not offered, but one the applicant already applied to stays visible
      const visible = js.filter(j => isOpen(j) || applied.includes(j.id))
      setJobs(visible)
      setAppliedIds(applied)
      setProfile(p)
      // Open the job picked on the dashboard; otherwise the top suggestion, or the newest job
      setSelected(visible.find(j => j.id === initialJobId) ?? suggestJobs(visible.filter(isOpen), p)[0]?.job ?? newestFirst(visible)[0] ?? null)
    }).catch(() => {})
  }, [user.id, initialJobId])

  // The jobs suggested from the applicant's skills first, best fit first, then all the others.
  const hasSkills = !!profile?.skills?.some(Boolean)
  const ranked = rankJobs(jobs, profile)
  const suggestions = suggestJobs(jobs.filter(isOpen), profile)
  const suggestedIds = new Set(suggestions.map(s => s.job.id))
  const matchesSearch = (j: Job) =>
    !search || j.jobTitle?.toLowerCase().includes(search.toLowerCase()) || j.companyName?.toLowerCase().includes(search.toLowerCase())
  const suggestedList = suggestions.filter(s => matchesSearch(s.job))
  const otherList: { job: Job; fit: JobFit | null }[] = ranked.filter(r => !suggestedIds.has(r.job.id) && matchesSearch(r.job))
  const total = suggestedList.length + otherList.length

  // One list, a page at a time: the suggested jobs first, then the other jobs on the
  // pages after them, so even 100 jobs are never one long scroll. Each group's
  // heading is repeated on every page where that group appears.
  type Entry = { job: Job; fit: JobFit | null; because?: string; group: 'suggested' | 'other' }
  const entries: Entry[] = [
    ...suggestedList.map(x => ({ ...x, group: 'suggested' as const })),
    ...otherList.map(x => ({ ...x, group: 'other' as const })),
  ]
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const page = Math.min(pageNo, pages)
  const first = (page - 1) * PAGE_SIZE
  const onPage = entries.slice(first, first + PAGE_SIZE)
  const groupOnPage = (g: Entry['group']) => onPage.filter(e => e.group === g)
  const otherHeading = suggestedList.length ? t('Other jobs') : t('All jobs')

  // Moving to another page puts focus on its first job, for keyboard and screen reader users
  const goToPage = (n: number) => {
    setPageNo(n)
    const target = entries[(n - 1) * PAGE_SIZE]
    if (target) requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-job-id="${target.job.id}"]`)
      el?.focus(); el?.scrollIntoView({ block: 'nearest' })
    })
  }

  const selectedFit = selected ? ranked.find(r => r.job.id === selected.id)?.fit : undefined
  // Wide screens put the detail cards in rows under the header; the visual-category
  // notice, when shown, takes row 2 and pushes the cards down one
  const limited = !!selectedFit && !selectedFit.eligible
  const rowA = limited ? 'xl:row-start-3' : 'xl:row-start-2'
  const rowB = limited ? 'xl:row-start-4' : 'xl:row-start-3'
  const selectedCategory = categoryById(selected?.workCategory)

  // Required profile fields still empty: the employer is sent the profile, so these are needed to apply
  const profileGaps = profile ? missingFields(requiredProfileFields(profile)) : []

  const handleApply = async () => {
    if (!selected) return
    if (profileGaps.length) {
      setApplyMsg(incompleteProfileMessage(profileGaps))
      document.getElementById('job-profile-gap')?.focus()
      return
    }
    setApplying(true); setApplyMsg('')
    try {
      await api.applyToJob(selected.id, user.id)
      setAppliedIds(prev => [...prev, selected.id])
      setApplyMsg(t('Applied successfully!'))
      toast('Application submitted!', 'success')
    } catch (e: any) {
      setApplyMsg(e.message)
      toast(e.message, 'error')
    }
    finally { setApplying(false) }
  }

  const userSkills: string[] = (profile?.skills || []).filter(Boolean)
  const userDisability: string = profile?.disabilityType || ''

  const getJobSkills = jobSkillList
  const matchesSkill = (skill: string) => skillMatches(skill, userSkills)
  const matchesDisability = (cat: string) => cat.toLowerCase() === userDisability.toLowerCase()

  // Picking a job shows its details. On a phone the details sit below the whole
  // list, so bring them into view; side by side on a wider screen they already are.
  const pick = (j: Job) => {
    setSelected(j); setApplyMsg('')
    if (!window.matchMedia('(min-width: 48rem)').matches) {
      requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  const renderJob = (j: Job, fit: JobFit | null, i: number, because?: string) => {
    const isSelected = selected?.id === j.id
    const posted = j.createdAt ? t('Posted {when}', { when: timeAgo(j.createdAt, now) }) : ''
    // A job limited to visual categories the applicant is not in: say which, in plain words
    const openTo = fit && !fit.eligible ? t('Open to {who}', { who: (j.disabilityCategories || []).map(c => t(c)).join(', ') }) : ''
    return (
      <button key={j.id} data-job-id={j.id} onClick={() => pick(j)} aria-pressed={isSelected}
        data-speak={[t('Number {n}. {job} at {company}', { n: i + 1, job: j.jobTitle, company: j.companyName }), posted, because, openTo, appliedIds.includes(j.id) ? t('Applied') : ''].filter(Boolean).join('. ')}
        className={`w-full text-left px-3 py-3 rounded-lg mb-2 transition-colors border ${isSelected ? 'border-[#1a7a3c] bg-green-50' : 'border-transparent hover:bg-gray-50'}`}>
        <div className="flex items-start gap-2">
          <span aria-hidden="true" className="text-lg shrink-0 mt-0.5">⌨️</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <p className="font-semibold text-sm text-gray-900 truncate">{j.jobTitle}</p>
              {appliedIds.includes(j.id) && (
                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">{t('✓ Applied')}</span>
              )}
              {!isOpen(j) && (
                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold shrink-0">{jobClosedLabel(j)}</span>
              )}
            </div>
            <p className="text-xs text-gray-600 truncate">{j.companyName}</p>
            {because && <p className="text-xs font-semibold text-[#1a7a3c] mt-0.5">{because}</p>}
            {posted && (
              <p className="text-xs text-gray-600 mt-0.5"><time dateTime={j.createdAt} title={fullDateTime(j.createdAt)}>{posted}</time></p>
            )}
            <div className="flex gap-1 mt-1 flex-wrap">
              <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">{j.location || 'Remote'}</span>
              {j.salary && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">{formatSalary(j.salary)}</span>}
              {openTo && (
                <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">{openTo}</span>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="jobs-split flex-1 flex flex-col md:flex-row md:overflow-hidden">
      {/* Sidebar */}
      <aside aria-label={t('Job list')} className="w-full md:w-80 xl:w-96 shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col md:min-h-0">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-base font-bold text-[#1a7a3c] mb-3">{t('Job Listings PH')}</h1>
          <div className="flex items-center border border-gray-500 rounded-md px-3 py-2 gap-2 bg-white">
            <span aria-hidden="true" className="text-gray-600 text-sm">🔍</span>
            <input className="flex-1 text-sm outline-none placeholder-gray-500" type="search" aria-label={t('Search jobs by title or company')}
              placeholder={t('Search jobs...')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="px-4 pb-24 flex-1 md:overflow-y-auto md:min-h-0">
          <p role="status" className="sr-only">{search ? t(total === 1 ? '{n} job found' : '{n} jobs found', { n: total }) : ''}</p>
          {search && (
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-800">{t('{n} found', { n: total })}</p>
              <button type="button" onClick={() => setSearch('')} className="text-xs text-[#1a7a3c] underline min-h-6 px-1">{t('Clear search')}</button>
            </div>
          )}

          {!hasSkills && (
            // Suggestions come from the skills on the profile, so there are none without them
            <div className="mb-4 rounded-lg border border-[#1a4fa0] bg-blue-50 p-3">
              <p className="text-sm font-semibold text-gray-900">{t('Get job suggestions')}</p>
              <p className="text-xs text-gray-700 mt-0.5">{t('Add your skills to your profile and we will suggest the jobs that ask for them.')}</p>
              <button type="button" onClick={onGoToProfile} className="btn-primary min-h-11 px-4 mt-2 w-full">{t('Add my skills')}</button>
            </div>
          )}

          {hasSkills && suggestedList.length === 0 && page === 1 && (
            <p className="text-xs text-gray-600 py-2 mb-2">{search ? t('No suggested job matches your search.') : t('No open job fits your skills yet.')}</p>
          )}

          {groupOnPage('suggested').length > 0 && (
            <section aria-labelledby="jobs-suggested" className="mb-4">
              <h2 id="jobs-suggested" className="text-xs font-semibold text-[#1a7a3c] mb-1">{t('Suggested for you ({n})', { n: suggestedList.length })}</h2>
              {page === 1 && <p className="text-xs text-gray-600 mb-2">{t('From the skills on your profile, best fit first.')}</p>}
              {groupOnPage('suggested').map(e => renderJob(e.job, e.fit, entries.indexOf(e), e.because))}
            </section>
          )}

          {groupOnPage('other').length > 0 && (
            <section aria-labelledby="jobs-other" className="mb-2">
              <h2 id="jobs-other" className="text-xs font-semibold text-[#1a7a3c] mb-2">{otherHeading} ({otherList.length})</h2>
              {groupOnPage('other').map(e => renderJob(e.job, e.fit, entries.indexOf(e)))}
            </section>
          )}

          {entries.length === 0 && (
            <p className="text-xs text-gray-600 py-2">{search ? t('No jobs match your search.') : t('No jobs posted yet.')}</p>
          )}

          {pages > 1 && (
            <nav aria-label={t('Job list pages')} className="flex items-center justify-between gap-2 mt-2 mb-3">
              <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 1} aria-label={t('Previous page of jobs')}
                className="min-h-11 px-3 rounded-lg border border-gray-500 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <span aria-hidden="true">‹ </span>Previous
              </button>
              <p className="text-xs font-semibold text-gray-800 text-center" aria-live="polite">{t('Page {n} of {total}', { n: page, total: pages })}</p>
              <button type="button" onClick={() => goToPage(page + 1)} disabled={page === pages} aria-label={t('Next page of jobs')}
                className="min-h-11 px-3 rounded-lg border border-[#1a7a3c] bg-white text-sm font-semibold text-[#1a7a3c] hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed">
                Next<span aria-hidden="true"> ›</span>
              </button>
            </nav>
          )}
        </div>
      </aside>

      {/* Detail panel */}
      <section ref={detailsRef} aria-label={t('Job details')} className="flex-1 min-w-0 md:overflow-y-auto md:min-h-0 scroll-mt-24">
        {!selected ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-white">{jobs.length === 0 ? t('No jobs posted yet.') : t('Select a job to view details.')}</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 pb-24 sm:pb-24 grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {/* Header */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="text-2xl">⌨️</span>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{selected.jobTitle}</h2>
                  <p className="text-sm text-gray-600">{selected.companyName} • {selected.location || t('Remote / Work from Home')}</p>
                  {selected.createdAt && (
                    <p className="text-sm text-gray-700">
                      <time dateTime={selected.createdAt}>{t('Posted {when}', { when: timeAgo(selected.createdAt, now) })}</time>
                      <span className="text-gray-600"> · {fullDateTime(selected.createdAt)}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {appliedIds.includes(selected.id) ? (
                  <span className="bg-green-100 text-green-700 font-semibold rounded-full px-6 py-2 text-sm flex items-center gap-1">{t('✓ Applied')}</span>
                ) : isOpen(selected) && (
                  <button onClick={handleApply} disabled={applying}
                    className="bg-[#1a7a3c] hover:bg-[#155f30] text-white font-semibold rounded-full px-6 py-2 text-sm transition-colors flex items-center gap-2">
                    {applying ? <Spinner label={t('Applying')} /> : t('Apply Now')}
                  </button>
                )}
                {profileGaps.length > 0 && isOpen(selected) && !appliedIds.includes(selected.id) && (
                  <div className="max-w-xs text-right">
                    <p className="text-sm text-gray-800">{incompleteProfileMessage(profileGaps)}</p>
                    <button id="job-profile-gap" type="button" onClick={() => onGoToProfileField(profileGaps[0].id)}
                      className="mt-1 min-h-11 px-3 text-sm font-semibold text-[#1a4fa0] underline">
                      {t('Add {field}', { field: profileGaps[0].label.toLowerCase() })}
                    </button>
                  </div>
                )}
                <p role="status" className="text-xs text-red-700">{applyMsg && !appliedIds.includes(selected.id) ? applyMsg : ''}</p>
                {!isOpen(selected) && <p className="text-xs text-gray-600">{t('{status}: not accepting applications right now', { status: t(jobClosedLabel(selected)) })}</p>}
              </div>
            </div>

            {/* Who may apply: the one part of the fit that the applicant still needs to know */}
            {limited && (
              <p className="xl:col-span-2 bg-white rounded-xl border border-gray-200 px-6 py-4 text-sm font-semibold text-gray-900">
                {t('The employer has limited this job to these visual categories: {who}.', { who: (selected.disabilityCategories || []).map(c => t(c)).join(', ') })}
              </p>
            )}

            {/* Employer Details */}
            <div className={`xl:col-start-1 ${rowA} bg-white rounded-xl border border-gray-200 px-6 py-5`}>
              <h3 className="text-sm font-bold text-[#1a7a3c] mb-4">{t('Employer Details')}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-600 block mb-0.5">{t('Company Name')}</span>
                  <span className="font-medium text-gray-800">{selected.companyName}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-600 block mb-0.5">{t('Location')}</span>
                  <span className="font-medium text-gray-800">{selected.location || t('Remote / Work from Home')}</span>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className={`xl:col-start-1 ${rowB} bg-white rounded-xl border border-gray-200 px-6 py-5`}>
              <h3 className="text-sm font-bold text-[#1a7a3c] mb-4">{t('Job Details')}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-xs text-gray-600 block mb-0.5">{t('Work Mode')}</span>
                  <span className="font-medium text-gray-800">{selected.jobType}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-600 block mb-0.5">{t('Salary')}</span>
                  <span className="font-medium text-gray-800">{formatSalary(selected.salary) || 'Not given'}</span>
                </div>
                {selectedCategory && (
                  <div>
                    <span className="text-xs text-gray-600 block mb-0.5">{t('Kind of work')}</span>
                    <span className="font-medium text-gray-800">{selectedCategory.name}</span>
                  </div>
                )}
                {selected.vacancies && (
                  <div>
                    <span className="text-xs text-gray-600 block mb-0.5">{t('Vacancies')}</span>
                    <span className="font-medium text-gray-800">{t('{n} vacancies', { n: selected.vacancies })}</span>
                  </div>
                )}
              </div>

              <div className="mb-1">
                <span className="text-xs text-gray-600 block mb-2">{t('Skills Required')}</span>
                <div className="flex flex-wrap gap-2">
                  {getJobSkills(selected).map(skill => {
                    const matched = matchesSkill(skill)
                    return (
                      <span key={skill} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${matched ? 'bg-[#1a4fa0] text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {matched && '✓ '}{skill}
                      </span>
                    )
                  })}
                </div>
                {userSkills.length > 0 && <p className="text-[10px] text-gray-600 mt-2">{t('✓ = matches your profile skills')}</p>}
              </div>

              {selected.disabilityCategories && selected.disabilityCategories.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs text-gray-600 block mb-2 uppercase tracking-wide">{t('Visual Category')}</span>
                  <div className="flex flex-wrap gap-2">
                    {selected.disabilityCategories.map(cat => {
                      const matched = matchesDisability(cat)
                      return (
                        <span key={cat} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${matched ? 'bg-gray-900 text-white border-gray-900' : 'bg-[#1a4fa0] text-white border-[#1a4fa0]'}`}>
                          {matched && '✓ '}{cat}
                        </span>
                      )
                    })}
                  </div>
                  {userDisability && <p className="text-[10px] text-gray-600 mt-2">✓ {t('Suitable for your visual type ({type})', { type: t(userDisability) })}</p>}
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className={`xl:col-start-2 ${rowA} xl:row-span-2 self-stretch bg-white rounded-xl border border-gray-200 px-6 py-5`}>
              <h3 className="text-sm font-bold text-[#1a7a3c] mb-3">{t('Job Description')}</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{selected.description?.trim() || 'The employer has not added a description for this job yet.'}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
