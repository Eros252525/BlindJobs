import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { stageColor } from '@/lib/format'
import { toast } from '@/lib/toast'
import { KANBAN_COLS } from '@/constants'
import { ModalDialog } from '@/components/ui/ModalDialog'
import { Spinner } from '@/components/ui/Spinner'
import type { Applicant, Conversation, Job, User } from '@/types'

export function EmpApplicantsScreen({ user, initialJobId }: { user: User; initialJobId?: string | null }) {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [filter, setFilter] = useState('All Posted Jobs')
  const [jobs, setJobs] = useState<Job[]>([])
  const [modal, setModal] = useState<Applicant | null>(null)
  const [modalStep, setModalStep] = useState<'main' | 'hire' | 'reject'>('main')
  const [responseMsg, setResponseMsg] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    api.getEmployerApplicants(user.id).then(setApplicants).catch(() => {})
    api.getEmployerJobs(user.id).then((js: Job[]) => {
      setJobs(js)
      // opened from a job's "Candidates" button: start filtered to that job
      const picked = js.find(j => j.id === initialJobId)
      if (picked) setFilter(picked.jobTitle)
    }).catch(() => {})
  }, [user.id, initialJobId])

  const filtered = filter === 'All Posted Jobs' ? applicants : applicants.filter(a => a.jobTitle === filter)

  const openModal = (a: Applicant) => { setModal(a); setModalStep('main'); setResponseMsg('') }
  const closeModal = () => { setModal(null); setModalStep('main'); setResponseMsg('') }

  const handleStageChange = async (a: Applicant, stage: string) => {
    setUpdating(true)
    try {
      await api.updateStage(a.jobId, a.applicantId, stage)
      setApplicants(prev => prev.map(x => x.applicantId === a.applicantId && x.jobId === a.jobId ? { ...x, stage } : x))
      if (modal?.applicantId === a.applicantId && modal?.jobId === a.jobId) {
        setModal(m => m ? { ...m, stage } : m)
      }
      toast(`Moved to ${stage}.`, 'info')
    } catch (e: any) { toast(`Couldn't change the stage: ${e.message}`, 'error') }
    finally { setUpdating(false) }
  }

  const handleSendAndFinalize = async (stage: 'Hired' | 'Rejected') => {
    if (!modal) return
    setUpdating(true)
    try {
      await api.updateStage(modal.jobId, modal.applicantId, stage)
      setApplicants(prev => prev.map(x => x.applicantId === modal.applicantId && x.jobId === modal.jobId ? { ...x, stage } : x))
      if (responseMsg.trim()) {
        const convs = await api.getConversations(user.id)
        let conv = convs.find((c: Conversation) => c.applicantId === modal.applicantId && c.jobId === modal.jobId)
        if (!conv) {
          conv = await api.createConversation({
            applicantId: modal.applicantId, employerId: user.id,
            applicantName: fullName(modal), employerName: user.name,
            jobTitle: modal.jobTitle, jobId: modal.jobId,
          })
        }
        await api.sendMessage(conv.id, user.id, user.name, responseMsg.trim())
      }
      toast(stage === 'Hired' ? 'Applicant hired and notified!' : 'Application rejected and applicant notified.', stage === 'Hired' ? 'success' : 'info')
      closeModal()
    } catch (e: any) { toast(`Couldn't finish: ${e.message}`, 'error') }
    finally { setUpdating(false) }
  }

  const fullName = (a: Applicant) =>
    a.profile ? `${a.profile.firstName || ''} ${a.profile.lastName || ''}`.trim() || 'Applicant' : 'Applicant'

  return (
    <div className="flex-1 p-4 sm:p-6 pb-24 sm:pb-24 overflow-y-auto">
      {/* Header (sits on the blue backdrop, so white text) */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5 text-white">
        <div>
          <h1 className="text-2xl font-bold">Applicant Tracking Board</h1>
          <p className="text-sm mt-0.5">Manage candidate pipelines and stages.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="ats-filter" className="text-sm font-medium whitespace-nowrap">Filter by Job:</label>
          <select id="ats-filter" className="input w-44 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All Posted Jobs</option>
            {jobs.map(j => <option key={j.id}>{j.jobTitle}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {KANBAN_COLS.map(col => {
          const colApps = filtered.filter(a => a.stage === col)
          return (
            <section key={col} aria-labelledby={`col-${col}`} className="flex flex-col bg-[#f1f5f9] rounded-xl p-3 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b-2 border-[#1a4fa0] mb-3">
                <h2 id={`col-${col}`} className="text-sm font-semibold text-gray-800">
                  {col}<span className="sr-only">, {colApps.length} candidate{colApps.length === 1 ? '' : 's'}</span>
                </h2>
                <span aria-hidden="true" className="bg-[#1a4fa0] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{colApps.length}</span>
              </div>
              {colApps.length === 0
                ? <p className="text-xs text-gray-600 text-center py-6">No candidates</p>
                : colApps.map(a => (
                  <button key={`${a.jobId}:${a.applicantId}`} data-card={`${a.jobId}:${a.applicantId}`}
                    onClick={() => openModal(a)}
                    className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 shadow-sm mb-2 hover:shadow-md hover:border-[#1a4fa0] transition-all">
                    <p className="text-sm font-semibold text-gray-900">{fullName(a)}</p>
                    <p className="text-xs text-gray-600 mb-2">{a.jobTitle}</p>
                    {a.profile?.disabilityType && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full border border-blue-200">
                        <span aria-hidden="true">♿</span> {a.profile.disabilityType}
                      </span>
                    )}
                  </button>
                ))
              }
            </section>
          )
        })}
      </div>

      {/* Modal */}
      {modal && (
        <ModalDialog labelledBy="ats-dialog-title" onClose={closeModal} returnFocusTo={`[data-card="${modal.jobId}:${modal.applicantId}"]`}>
            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div>
                <h2 id="ats-dialog-title" className="text-lg font-bold text-[#1a4fa0]">{fullName(modal)}</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Candidate for: <span className="font-semibold text-gray-700">
                    {applicants.filter(a => a.applicantId === modal.applicantId).map(a => a.jobTitle).join(', ')}
                  </span>
                </p>
              </div>
              <button onClick={closeModal} aria-label="Close" className="w-9 h-9 -mr-2 -mt-1 grid place-items-center rounded-md text-gray-600 hover:text-gray-600 hover:bg-gray-100 text-xl leading-none"><span aria-hidden="true">✕</span></button>
            </div>

            {/* Candidate info */}
            <div className="px-6 pb-4">
              {modal.profile?.about?.trim() && (
                <p className="text-sm text-gray-800 whitespace-pre-line mb-3 border-l-4 border-[#1a4fa0] pl-3">{modal.profile.about}</p>
              )}
              <div className="bg-gray-50 rounded-lg px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                <div><span className="font-semibold">Email:</span> <span className="text-gray-700">{modal.profile?.email || '—'}</span></div>
                <div><span className="font-semibold">Disability:</span> <span className="text-gray-700">{modal.profile?.disabilityType || '—'}</span></div>
                <div><span className="font-semibold">Phone:</span> <span className="text-gray-700">{modal.profile?.mobile || '—'}</span></div>
                <div><span className="font-semibold">Location:</span> <span className="text-gray-700">{modal.profile?.location || '—'}</span></div>
                <div className="sm:col-span-2"><span className="font-semibold">Skills:</span> <span className="text-gray-700">{(modal.profile?.skills || []).filter(Boolean).join(', ') || '—'}</span></div>
                <div className="sm:col-span-2"><span className="font-semibold">Education:</span> <span className="text-gray-700">{[modal.profile?.educationLevel, modal.profile?.school].filter(Boolean).join(', ') || '—'}</span></div>
                <div className="sm:col-span-2"><span className="font-semibold">Experience:</span> <span className="text-gray-700">
                  {(modal.profile?.experience || []).filter(x => x.title).map(x => [x.title, x.company, x.period].filter(Boolean).join(', ')).join('; ') || 'None listed'}
                </span></div>
                <div className="sm:col-span-2"><span className="font-semibold">Assistive technology:</span> <span className="text-gray-700">{(modal.profile?.assistiveTech || []).join(', ') || '—'}</span></div>
                <div><span className="font-semibold">Work setup:</span> <span className="text-gray-700">{(modal.profile?.workSetup || []).join(', ') || '—'}</span></div>
                <div><span className="font-semibold">Languages:</span> <span className="text-gray-700">{(modal.profile?.languages || []).join(', ') || '—'}</span></div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Current Pipeline:</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${stageColor(modal.stage)}`}>{modal.stage}</span>
                </div>
              </div>

              {/* Step: main */}
              {modalStep === 'main' && (
                <>
                  <div className="mb-4">
                    <label htmlFor="ats-stage" className="text-sm font-semibold text-gray-800 block mb-2">Change Pipeline Stage:</label>
                    <select id="ats-stage" value={modal.stage} disabled={updating}
                      onChange={(e) => handleStageChange(modal, e.target.value)}
                      className="input w-full">
                      {KANBAN_COLS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setModalStep('hire')}
                      className="flex-1 bg-[#1a7a3c] hover:bg-[#155f30] text-white font-semibold rounded-full py-2.5 text-sm flex items-center justify-center gap-2 transition-colors">
                      <span aria-hidden="true">✅</span> Accept &amp; Hire
                    </button>
                    <button onClick={() => setModalStep('reject')}
                      className="flex-1 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-full py-2.5 text-sm flex items-center justify-center gap-2 transition-colors">
                      <span aria-hidden="true">✕</span> Reject Application
                    </button>
                  </div>
                </>
              )}

              {/* Step: hire */}
              {modalStep === 'hire' && (
                <>
                  <div className="mb-4">
                    <label htmlFor="ats-msg-hire" className="text-sm font-semibold text-gray-800 block mb-2">Write message for Acceptance</label>
                    <textarea id="ats-msg-hire" className="input resize-none h-28 font-mono text-sm"
                      placeholder="Type response details here..."
                      value={responseMsg} onChange={(e) => setResponseMsg(e.target.value)} />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => handleSendAndFinalize('Hired')} disabled={updating}
                      className="bg-[#1a7a3c] hover:bg-[#155f30] text-white font-semibold rounded-full px-6 py-2.5 text-sm flex items-center gap-2 transition-colors disabled:opacity-60">
                      {updating ? <Spinner label="Hiring" /> : 'Send & Hire'}
                    </button>
                    <button onClick={() => setModalStep('main')}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-full px-6 py-2.5 text-sm transition-colors">
                      Back
                    </button>
                  </div>
                </>
              )}

              {/* Step: reject */}
              {modalStep === 'reject' && (
                <>
                  <div className="mb-4">
                    <label htmlFor="ats-msg-reject" className="text-sm font-semibold text-gray-800 block mb-2">Write message for Rejection</label>
                    <textarea id="ats-msg-reject" className="input resize-none h-28 font-mono text-sm"
                      placeholder="Type response details here..."
                      value={responseMsg} onChange={(e) => setResponseMsg(e.target.value)} />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => handleSendAndFinalize('Rejected')} disabled={updating}
                      className="bg-red-700 hover:bg-red-800 text-white font-semibold rounded-full px-6 py-2.5 text-sm flex items-center gap-2 transition-colors disabled:opacity-60">
                      {updating ? <Spinner label="Rejecting" /> : 'Send & Reject'}
                    </button>
                    <button onClick={() => setModalStep('main')}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-full px-6 py-2.5 text-sm transition-colors">
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
        </ModalDialog>
      )}
    </div>
  )
}
