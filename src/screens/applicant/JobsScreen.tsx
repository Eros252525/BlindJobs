import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { categoryById } from '@/lib/assessment/work-categories'
import { fitLabel, rankJobs } from '@/lib/job-fit'
import { searchJobs } from '@/lib/job-search'
import { jobSkillList, skillMatches } from '@/lib/matching'
import { toast } from '@/lib/toast'
import { Spinner } from '@/components/ui/Spinner'
import type { ApplicantProfile, Job, User } from '@/types'

const isOpen = (j: Job) => (j.status || 'Active') === 'Active'

export function JobsScreen({ user, initialJobId, onOpenCheck }: {
  user: User; initialJobId?: string | null
  /** Opens the skills check for a kind of work, to take or retake it. */
  onOpenCheck: (categoryId: string) => void
}) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selected, setSelected] = useState<Job | null>(null)
  const [search, setSearch] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')
  const [profile, setProfile] = useState<ApplicantProfile | null>(null)
  const [appliedIds, setAppliedIds] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      api.getJobs(),
      api.getAppliedJobs(user.id).catch(() => [] as string[]),
      api.getProfile(user.id).catch(() => null),
    ]).then(([js, applied, p]: [Job[], string[], ApplicantProfile | null]) => {
      // Paused and closed jobs are not offered, but one the applicant already applied to stays visible
      const visible = js.filter(j => isOpen(j) || applied.includes(j.id))
      setJobs(visible)
      setAppliedIds(applied)
      setProfile(p)
      // Open the job picked on the dashboard; otherwise the best fit so the detail pane isn't empty
      setSelected(visible.find(j => j.id === initialJobId) ?? rankJobs(visible, p)[0]?.job ?? null)
    }).catch(() => {})
  }, [user.id, initialJobId])

  // Best fit first (see job-fit.ts); a search filters the list and orders it by
  // what was asked for as well as fit (see job-search.ts)
  const ranked = rankJobs(jobs, profile)
  const result = search.trim() ? searchJobs(search, ranked) : null
  const filtered = result ? result.hits : ranked
  const selectedFit = selected ? ranked.find(r => r.job.id === selected.id)?.fit : undefined
  const selectedCategory = categoryById(selected?.workCategory)
  // The employer made this job's skills check a condition of applying, and it has not been taken
  const checkNeeded = !!(selected?.requireCheck && selectedCategory && !profile?.categoryScores?.[selectedCategory.id])

  const handleApply = async () => {
    if (!selected) return
    setApplying(true); setApplyMsg('')
    try {
      await api.applyToJob(selected.id, user.id)
      setAppliedIds(prev => [...prev, selected.id])
      setApplyMsg('Applied successfully!')
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

  return (
    <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-72 xl:w-96 shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-base font-bold text-[#1a7a3c] mb-3">Job Listings PH</h1>
          <div className="flex items-center border border-gray-500 rounded-md px-3 py-2 gap-2 bg-white">
            <span aria-hidden="true" className="text-gray-600 text-sm">🔍</span>
            <input className="flex-1 text-sm outline-none placeholder-gray-500" type="search" aria-label="Search jobs in your own words"
              aria-describedby="job-search-hint" placeholder="e.g. remote call center job in QC" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {/* Shows how the search was understood, so a wrong guess can be seen and reworded */}
          <p id="job-search-hint" className="mt-2 text-sm text-gray-700">
            {result?.summary
              ? <>Searching for: <span className="font-semibold text-gray-900">{result.summary}</span></>
              : 'Type what you want in English or Filipino: the kind of work, remote or on-site, a city, your visual category or a salary.'}
          </p>
        </div>
        <div className="px-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-[#1a7a3c]">{search ? 'Search results' : 'All jobs'} ({filtered.length})</h2>
            {search && <button type="button" onClick={() => setSearch('')} className="text-xs text-[#1a7a3c] underline min-h-6 px-1">Clear search</button>}
          </div>
          <p className="text-xs text-gray-600 mb-2">
            {result ? 'Ranked by how well each job matches your search and fits your profile.' : 'Ranked by how well each job fits your profile, best fit first.'}
          </p>
          <p role="status" className="sr-only">
            {result ? `${filtered.length} job${filtered.length === 1 ? '' : 's'} found${result.summary ? ` for ${result.summary}` : ''}` : ''}
          </p>
          {filtered.length === 0 && <p className="text-xs text-gray-600 py-4">{search ? 'No jobs match your search. Try fewer words, or leave out the city or salary.' : 'No jobs posted yet.'}</p>}
          {filtered.map(({ job: j, fit }, i) => {
            const isSelected = selected?.id === j.id
            return (
              <button key={j.id} onClick={() => { setSelected(j); setApplyMsg('') }} aria-pressed={isSelected}
                data-speak={`Number ${i + 1}. ${j.jobTitle} at ${j.companyName}. ${fit.eligible ? `${fitLabel(fit.score)}, ${fit.score} out of 100` : 'Limited to other visual categories'}${appliedIds.includes(j.id) ? '. Applied' : ''}`}
                className={`w-full text-left px-3 py-3 rounded-lg mb-2 transition-colors border ${isSelected ? 'border-[#1a7a3c] bg-green-50' : 'border-transparent hover:bg-gray-50'}`}>
                <div className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-lg shrink-0 mt-0.5">⌨️</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 truncate">{j.jobTitle}</p>
                      {appliedIds.includes(j.id) && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">✓ Applied</span>
                      )}
                      {!isOpen(j) && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold shrink-0">{j.status}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{j.companyName}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">{j.location || 'Remote'}</span>
                      {j.salary && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">₱{j.salary}</span>}
                      <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        {fit.eligible ? `${fitLabel(fit.score)}: ${fit.score}/100` : 'Other visual categories'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Detail panel */}
      <section aria-label="Job details" className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-white">{jobs.length === 0 ? 'No jobs posted yet.' : 'Select a job to view details.'}</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 pb-24 sm:pb-24 grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {/* Header */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="text-2xl">⌨️</span>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{selected.jobTitle}</h2>
                  <p className="text-sm text-gray-600">{selected.companyName} • {selected.location || 'Remote / Work from Home'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {appliedIds.includes(selected.id) ? (
                  <span className="bg-green-100 text-green-700 font-semibold rounded-full px-6 py-2 text-sm flex items-center gap-1">✓ Applied</span>
                ) : checkNeeded && selectedCategory ? (
                  <>
                    <button onClick={() => onOpenCheck(selectedCategory.id)}
                      className="bg-[#1a7a3c] hover:bg-[#155f30] text-white font-semibold rounded-full px-6 py-2 text-sm transition-colors">
                      Take the required skills check
                    </button>
                    <p className="text-xs text-gray-600 max-w-xs text-right">This employer requires the {selectedCategory.name} skills check before you apply. Ten questions, no time limit.</p>
                  </>
                ) : (
                  <button onClick={handleApply} disabled={applying}
                    className="bg-[#1a7a3c] hover:bg-[#155f30] text-white font-semibold rounded-full px-6 py-2 text-sm transition-colors flex items-center gap-2">
                    {applying ? <Spinner label="Applying" /> : 'Apply Now'}
                  </button>
                )}
                {applyMsg && !appliedIds.includes(selected.id) && <p className="text-xs text-red-700">{applyMsg}</p>}
                {!isOpen(selected) && <p className="text-xs text-gray-600">{selected.status}: no longer accepting applications</p>}
              </div>
            </div>

            {/* Why this job fits: the score is never shown without its reasons */}
            {selectedFit && (
              <section aria-labelledby="job-fit-title" className="xl:col-span-2 bg-white rounded-xl border border-gray-200 px-6 py-5">
                <h3 id="job-fit-title" className="text-sm font-bold text-[#1a7a3c]">How well this job fits you</h3>
                {selectedFit.eligible ? (
                  <p className="mt-1 text-lg font-bold text-gray-900">{fitLabel(selectedFit.score)}: {selectedFit.score} out of 100</p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-gray-900">The employer has limited this job to these visual categories: {(selected.disabilityCategories || []).join(', ')}.</p>
                )}
                {selectedFit.meetsMinimum != null && selectedCategory && (
                  <p className="mt-1 text-sm text-gray-800">
                    {selectedFit.meetsMinimum
                      ? `✓ You meet the ${selectedCategory.name} skills-check score this employer asks for (${selected.minCategoryScore}).`
                      : `This employer asks for a ${selectedCategory.name} skills-check score of at least ${selected.minCategoryScore}. You can still apply; the employer reviews every application.`}
                  </p>
                )}
                {selectedCategory && (() => {
                  const mine = profile?.categoryScores?.[selectedCategory.id]
                  return (
                    <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">Your {selectedCategory.name} skills check{selected.requireCheck ? ' (required for this job)' : ' (optional)'}: </span>
                        {mine ? <><span className="text-xl font-bold">{mine.score}</span> out of 100</> : 'not taken yet. It counts towards this score.'}
                      </p>
                      <button type="button" onClick={() => onOpenCheck(selectedCategory.id)}
                        className={mine ? 'min-h-11 px-4 bg-white border border-gray-500 text-gray-800 hover:bg-gray-100 font-semibold rounded-md text-sm' : 'btn-primary min-h-11 px-4'}>
                        {mine ? <><span aria-hidden="true">↻ </span>Retake to raise it</> : 'Take the skills check'}
                      </button>
                    </div>
                  )
                })()}
                <ul className="mt-3 space-y-2">
                  {selectedFit.parts.map(part => (
                    <li key={part.id} className="text-sm text-gray-800">
                      <span className="font-semibold text-gray-900">{part.label}: {part.earned} of {part.max} points.</span> {part.reason}
                      {part.tip && <span className="block text-gray-700">To raise it: {part.tip}</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-gray-600">
                  Your type of visual disability is never part of this score. The employer sees the same score and reasons when you apply.
                </p>
              </section>
            )}

            {/* Employer Details */}
            <div className="xl:col-start-1 xl:row-start-3 bg-white rounded-xl border border-gray-200 px-6 py-5">
              <h3 className="text-sm font-bold text-[#1a7a3c] mb-4">Employer Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-600 block mb-0.5">Company Name</span>
                  <span className="font-medium text-gray-800">{selected.companyName}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-600 block mb-0.5">Location</span>
                  <span className="font-medium text-gray-800">{selected.location || 'Remote / Work from Home'}</span>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="xl:col-start-1 xl:row-start-4 bg-white rounded-xl border border-gray-200 px-6 py-5">
              <h3 className="text-sm font-bold text-[#1a7a3c] mb-4">Job Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-xs text-gray-600 block mb-0.5">Work Mode</span>
                  <span className="font-medium text-gray-800">{selected.jobType}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-600 block mb-0.5">Salary</span>
                  <span className="font-medium text-gray-800">₱{selected.salary}</span>
                </div>
                {selectedCategory && (
                  <div>
                    <span className="text-xs text-gray-600 block mb-0.5">Kind of work</span>
                    <span className="font-medium text-gray-800">{selectedCategory.name}</span>
                  </div>
                )}
                {selected.vacancies && (
                  <div>
                    <span className="text-xs text-gray-600 block mb-0.5">Vacancies</span>
                    <span className="font-medium text-gray-800">{selected.vacancies} Vacancies</span>
                  </div>
                )}
              </div>

              <div className="mb-1">
                <span className="text-xs text-gray-600 block mb-2">Skills Required</span>
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
                {userSkills.length > 0 && <p className="text-[10px] text-gray-600 mt-2">✓ = matches your profile skills</p>}
              </div>

              {selected.disabilityCategories && selected.disabilityCategories.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs text-gray-600 block mb-2 uppercase tracking-wide">Visual Category</span>
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
                  {userDisability && <p className="text-[10px] text-gray-600 mt-2">✓ Suitable for your visual type ({userDisability})</p>}
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="xl:col-start-2 xl:row-start-3 xl:row-span-2 self-stretch bg-white rounded-xl border border-gray-200 px-6 py-5">
              <h3 className="text-sm font-bold text-[#1a7a3c] mb-3">Job Description</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{selected.description?.trim() || 'The employer has not added a description for this job yet.'}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
