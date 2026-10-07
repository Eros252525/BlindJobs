import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { stageColor, timeAgo } from '@/lib/format'
import { toast } from '@/lib/toast'
import { Spinner } from '@/components/ui/Spinner'
import type { Conversation, Job, Screen, User } from '@/types'

type MyApplication = { job: Job; stage: string }

export function DashboardScreen({ user, onNavigate, onOpenJob }: {
  user: User; onNavigate: (s: Screen) => void; onOpenJob: (jobId: string) => void
}) {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [apps, setApps] = useState<MyApplication[] | null>(null)
  const [convCount, setConvCount] = useState(0)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [allJobs, appliedIds, convs] = await Promise.all([
        api.getJobs().catch(() => [] as Job[]),
        api.getAppliedJobs(user.id).catch(() => [] as string[]),
        api.getConversations(user.id).catch(() => [] as Conversation[]),
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
    })()
    return () => { cancelled = true }
  }, [user.id])

  const appliedSet = new Set(apps?.map(a => a.job.id))
  const openJobs = (jobs || []).filter(j => (j.status || 'Active') === 'Active')
  const latest = [...openJobs]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 8)
  const inProgress = apps?.filter(a => a.stage === 'Reviewed' || a.stage === 'Interviewing').length ?? 0
  const hired = apps?.filter(a => a.stage === 'Hired').length ?? 0

  const handleQuickApply = async (job: Job) => {
    setApplyingId(job.id)
    try {
      await api.applyToJob(job.id, user.id)
      setApps(prev => [{ job, stage: 'New' }, ...(prev || [])])
      toast(`Applied to ${job.jobTitle}`, 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally { setApplyingId(null) }
  }

  const tiles = [
    { icon: '🧑', label: 'My Profile', value: 'Edit', sub: 'Update your resume', target: 'profile' as Screen },
    { icon: '📨', label: 'Applications', value: apps?.length ?? '–', sub: `${inProgress} in progress · ${hired} hired`, target: 'jobs' as Screen },
    { icon: '🔍', label: 'Open Jobs', value: jobs ? openJobs.length : '–', sub: 'Browse all listings', target: 'jobs' as Screen },
    { icon: '💬', label: 'Messages', value: convCount, sub: `conversation${convCount !== 1 ? 's' : ''}`, target: 'messages' as Screen },
  ]

  return (
    <div className="flex-1 flex flex-col gap-5 p-4 sm:p-6 pb-24 sm:pb-24">
      <header className="flex flex-wrap items-end justify-between gap-2 text-white">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name}! <span aria-hidden="true">🦯</span></h1>
          <p className="text-sm">Here's what's happening with your job search.</p>
        </div>
        <p className="text-xs">Arrow keys move between tiles and lists · ↑ reach nav bar · <strong>Enter</strong> to open</p>
      </header>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(t => (
          <button key={t.label} onClick={() => onNavigate(t.target)}
            data-speak={`${t.label}: ${t.value}. ${t.sub}`}
            className="min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 text-left hover:shadow-md hover:border-[#1a7a3c] transition-all">
            <span aria-hidden="true" className="text-3xl w-12 h-12 rounded-xl bg-[#f0f2f5] grid place-items-center shrink-0">{t.icon}</span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wide text-gray-600">{t.label}</span>
              <span className="block text-2xl font-bold text-gray-900 leading-tight">{t.value}</span>
              <span className="block text-xs text-gray-600 truncate">{t.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-0">
        {/* My applications */}
        <section aria-labelledby="dash-apps" className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[18rem]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 id="dash-apps" className="font-bold text-gray-900">My Applications</h2>
            <span className="text-xs text-gray-600">{apps ? `${apps.length} total` : ''}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!apps ? (
              <p className="h-full grid place-items-center text-sm text-gray-600" role="status">Loading…</p>
            ) : apps.length === 0 ? (
              <div className="h-full grid place-items-center text-center p-6">
                <div>
                  <p className="text-sm text-gray-600 mb-3">You haven't applied to any jobs yet.</p>
                  <button onClick={() => onNavigate('jobs')} className="btn-primary">Find jobs</button>
                </div>
              </div>
            ) : apps.map(({ job, stage }) => (
              <button key={job.id} onClick={() => onOpenJob(job.id)}
                data-speak={`${job.jobTitle} at ${job.companyName}. Status: ${stage}`}
                className="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-[#eef3fb] grid place-items-center text-lg shrink-0">💼</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 truncate">{job.jobTitle}</span>
                  <span className="block text-xs text-gray-600 truncate">{job.companyName} · {job.location || 'Remote'}</span>
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${stageColor(stage)}`}>{stage}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Latest openings */}
        <section aria-labelledby="dash-latest" className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[18rem]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 id="dash-latest" className="font-bold text-gray-900">Latest Job Openings</h2>
            <button onClick={() => onNavigate('jobs')} className="min-h-6 px-1 text-xs font-semibold text-[#1a4fa0] hover:underline">View all →</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!jobs ? (
              <p className="h-full grid place-items-center text-sm text-gray-600" role="status">Loading…</p>
            ) : latest.length === 0 ? (
              <p className="h-full grid place-items-center text-sm text-gray-600">No open jobs right now.</p>
            ) : latest.map(job => {
              const applied = appliedSet.has(job.id)
              return (
                <div key={job.id} className="flex items-center gap-2 px-1 rounded-lg hover:bg-gray-50 transition-colors">
                  <button onClick={() => onOpenJob(job.id)}
                    data-speak={`${job.jobTitle} at ${job.companyName}, ${job.location || 'Remote'}${job.salary ? `, salary ${job.salary} pesos` : ''}. Posted ${timeAgo(job.createdAt)}`}
                    className="flex-1 min-w-0 text-left px-2 py-3 flex items-center gap-3">
                    <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-green-50 grid place-items-center text-lg shrink-0">⌨️</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900 truncate">{job.jobTitle}</span>
                      <span className="block text-xs text-gray-600 truncate">
                        {job.companyName} · {job.location || 'Remote'}{job.salary ? ` · ₱${job.salary}` : ''} · {timeAgo(job.createdAt)}
                      </span>
                    </span>
                  </button>
                  {applied ? (
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-full shrink-0">✓ Applied</span>
                  ) : (
                    <button onClick={() => handleQuickApply(job)} disabled={applyingId === job.id}
                      data-speak={`Apply to ${job.jobTitle}`} aria-label={`Apply to ${job.jobTitle}`}
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
