import { useEffect, useState } from 'react'
import { timeAgo } from '@/lib/format'
import { api } from '@/lib/api'
import { jobIsOpen, jobPostProblem } from '@/lib/jobs/job-post'
import { toast } from '@/lib/toast'
import { useUpdateTick } from '@/hooks/useUpdateTick'
import type { Applicant, Job, Screen, User } from '@/types'

export function EmpDashboardScreen({ user, onNavigate, onViewCandidates, onEditJob }: {
  user: User; onNavigate: (s: Screen) => void; onViewCandidates: (jobId: string) => void
  /** Opens the job in the Post a Job form to change it. */
  onEditJob: (jobId: string) => void
}) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [jobStatuses, setJobStatuses] = useState<Record<string, string>>({})
  // The job whose Delete was pressed, waiting for "Yes, delete" (in the page, not a browser pop-up)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    api.getEmployerJobs(user.id).then(js => {
      setJobs(js)
      const statuses: Record<string, string> = {}
      js.forEach((j: Job) => { statuses[j.id] = j.status || 'Active' })
      setJobStatuses(statuses)
    }).catch(() => {})
  }, [user.id])

  // reloads when the bell reports a new application, so the counts match what it said
  const reload = useUpdateTick()
  useEffect(() => {
    api.getEmployerApplicants(user.id).then(setApplicants).catch(() => {})
  }, [user.id, reload])

  const uniqueCandidates = new Set(applicants.map(a => a.applicantId)).size
  // Open to applicants: Active, and nothing on the post needs fixing
  const activeJobs = jobs.filter(j => jobIsOpen({ ...j, status: jobStatuses[j.id] })).length

  const handleStatusChange = async (jobId: string, status: string) => {
    setJobStatuses(prev => ({ ...prev, [jobId]: status }))
    await api.updateJobStatus(jobId, status).catch((e: any) => toast(`Couldn't update status: ${e.message}`, 'error'))
  }

  const handleDelete = async (jobId: string) => {
    setConfirmDelete(null)
    try {
      await api.deleteJob(jobId, user.id)
      setJobs(prev => prev.filter(j => j.id !== jobId))
      toast('Job posting deleted.', 'info')
    } catch (e: any) { toast(`Couldn't delete the job: ${e.message}`, 'error') }
  }

  const candidateCount = (jobId: string) => applicants.filter(a => a.jobId === jobId).length

  return (
    <div className="flex-1 p-4 sm:p-6 pb-24 sm:pb-24 overflow-y-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Employer <span className="text-[#bfdbfe]">Dashboard</span></h1>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-5">
          <p className="text-sm text-gray-600 mb-1">Active Job Openings</p>
          <p className="text-3xl font-bold text-gray-900">{activeJobs}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-5">
          <p className="text-sm text-gray-600 mb-1">Total Unique Candidates</p>
          <p className="text-3xl font-bold text-[#1a7a3c]">{uniqueCandidates}</p>
        </div>
      </div>

      {/* Quick action + job list */}
      <div className="flex flex-col md:flex-row gap-4 md:items-start">
        <div className="bg-white border border-gray-200 rounded-xl p-5 w-full md:w-48 shrink-0">
          <h2 className="font-bold text-gray-900 mb-4">Quick Action</h2>
          <button onClick={() => onNavigate('emp-post-job')} className="btn-primary w-full text-sm mb-2 flex items-center justify-center gap-1">
            + Post a New Job
          </button>
          <button onClick={() => onNavigate('emp-applicants')} className="w-full text-sm border border-gray-500 rounded-md px-3 py-2 bg-white hover:bg-gray-50 flex items-center gap-1 text-gray-700">
            <span aria-hidden="true">📋</span> View All Applicants
          </button>
        </div>

        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Manage Job Postings ({jobs.length})</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-8">No job postings yet. Click "Post a New Job" to begin.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map(j => {
                const status = jobStatuses[j.id] || 'Active'
                const count = candidateCount(j.id)
                const postedAgo = j.createdAt ? `Posted ${timeAgo(j.createdAt)}` : ''
                const problem = jobPostProblem(j)
                return (
                  <div key={j.id} className="flex flex-wrap items-center gap-3 border border-gray-100 rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{j.jobTitle}</p>
                        <div className="relative">
                          <select value={status} onChange={(e) => handleStatusChange(j.id, e.target.value)} aria-label={`Status of ${j.jobTitle}`}
                            className={`text-xs font-semibold border rounded px-2 py-0.5 pr-5 appearance-none cursor-pointer ${status === 'Active' ? 'border-green-400 text-green-700 bg-green-50' : status === 'Paused' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : 'border-red-400 text-red-700 bg-red-50'}`}>
                            <option>Active</option>
                            <option>Paused</option>
                            <option>Closed</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{j.location} · {j.jobType} · {j.experienceLevel} · {count} Applicant{count !== 1 ? 's' : ''} · {postedAgo}</p>
                      {problem && (
                        <p className="mt-1.5 text-sm text-red-800 font-medium">
                          <span aria-hidden="true">⚠ </span>Hidden from applicants until you fix it. {problem}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => onViewCandidates(j.id)} aria-label={`Candidates for ${j.jobTitle}: ${count}`}
                        className="min-h-11 text-sm border border-gray-500 rounded-md px-3 text-gray-700 hover:bg-gray-50">
                        Candidates ({count})
                      </button>
                      <button onClick={() => onEditJob(j.id)} aria-label={`${problem ? 'Fix' : 'Edit'} ${j.jobTitle}`}
                        className={`min-h-11 text-sm rounded-md px-4 font-semibold ${problem ? 'bg-[#1a4fa0] hover:bg-[#153f80] text-white' : 'border border-[#1a4fa0] text-[#1a4fa0] hover:bg-blue-50'}`}>
                        {problem ? 'Fix' : 'Edit'}
                      </button>
                      {confirmDelete !== j.id && (
                        <button onClick={() => setConfirmDelete(j.id)} aria-label={`Delete ${j.jobTitle}`}
                          className="min-h-11 text-sm border border-red-700 text-red-700 hover:bg-red-50 rounded-md px-4 font-semibold">Delete</button>
                      )}
                    </div>
                    {confirmDelete === j.id && (
                      <div role="alert" className="w-full flex flex-wrap items-center gap-2 rounded-lg border-2 border-red-400 bg-white p-3">
                        <span className="text-sm font-semibold text-gray-900">Delete {j.jobTitle} for good? Applicants can no longer see it.</span>
                        <button onClick={() => handleDelete(j.id)} className="min-h-11 text-sm bg-red-700 hover:bg-red-800 text-white rounded-md px-4 font-semibold">Yes, delete</button>
                        <button onClick={() => setConfirmDelete(null)} className="min-h-11 text-sm border border-gray-500 text-gray-800 hover:bg-gray-50 rounded-md px-4 font-semibold">No, keep it</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
