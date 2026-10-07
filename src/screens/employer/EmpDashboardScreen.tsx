import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Applicant, Job, Screen, User } from '@/types'

export function EmpDashboardScreen({ user, onNavigate, onViewCandidates }: {
  user: User; onNavigate: (s: Screen) => void; onViewCandidates: (jobId: string) => void
}) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [jobStatuses, setJobStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    api.getEmployerJobs(user.id).then(js => {
      setJobs(js)
      const statuses: Record<string, string> = {}
      js.forEach((j: Job) => { statuses[j.id] = j.status || 'Active' })
      setJobStatuses(statuses)
    }).catch(() => {})
    api.getEmployerApplicants(user.id).then(setApplicants).catch(() => {})
  }, [user.id])

  const uniqueCandidates = new Set(applicants.map(a => a.applicantId)).size
  const activeJobs = jobs.filter(j => (jobStatuses[j.id] || 'Active') === 'Active').length

  const handleStatusChange = async (jobId: string, status: string) => {
    setJobStatuses(prev => ({ ...prev, [jobId]: status }))
    await api.updateJobStatus(jobId, status).catch((e: any) => toast(`Couldn't update status: ${e.message}`, 'error'))
  }

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this job posting?')) return
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
                const postedAgo = j.createdAt ? (() => {
                  const diff = Date.now() - new Date(j.createdAt).getTime()
                  const mins = Math.floor(diff / 60000)
                  const hrs = Math.floor(diff / 3600000)
                  const days = Math.floor(diff / 86400000)
                  if (days > 0) return `Posted ${days}d ago`
                  if (hrs > 0) return `Posted ${hrs}h ago`
                  return `Posted ${mins} mins ago`
                })() : ''
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
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => onViewCandidates(j.id)} aria-label={`Candidates for ${j.jobTitle}: ${count}`}
                        className="text-xs border border-gray-500 rounded px-2 py-1 text-gray-700 hover:bg-gray-50">
                        Candidates ({count})
                      </button>
                      <button onClick={() => handleDelete(j.id)} aria-label={`Delete ${j.jobTitle}`} className="text-xs bg-red-700 hover:bg-red-800 text-white rounded px-3 py-1">Delete</button>
                    </div>
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
