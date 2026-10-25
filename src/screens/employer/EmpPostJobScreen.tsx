import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { WORK_CATEGORIES } from '@/lib/jobs/work-categories'
import { jobPostProblem, needsLocation, workModeProblem } from '@/lib/jobs/job-post'
import { toast } from '@/lib/toast'
import { focusFirst, missingFields, missingMessage } from '@/lib/validation'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { BTN_SECONDARY } from '@/components/ui/PageCard'
import { Spinner } from '@/components/ui/Spinner'
import type { Job, Screen, User } from '@/types'

const ERROR_ID = 'pj-error'

/**
 * Post a new job, or edit one (`editJobId`). A live job is paused while it is
 * edited, so nobody applies to a post that is half changed: saving a valid version
 * puts back the status it had, and so does leaving without saving.
 */
export function EmpPostJobScreen({ user, onNavigate, editJobId }: {
  user: User; onNavigate: (s: Screen) => void
  /** The job to edit; leave out to post a new one. */
  editJobId?: string | null
}) {
  // WCAG 3.3.7 Redundant Entry: the company name was given at registration (it is the
  // employer's account name), so start with it instead of asking again on every post.
  const [form, setForm] = useState({ companyName: user.name.includes('@') ? '' : user.name, jobTitle: '', skills: '', location: '', salary: '', vacancies: '', jobType: 'Remote', experienceLevel: 'Entry Level', description: '', workCategory: '' })
  const [disabilityCategories, setDisabilityCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  // Editing: the job as loaded (null while loading), and its status before it was paused
  const [editing, setEditing] = useState<Job | null>(null)
  const statusBefore = useRef<string | null>(null)
  // Set once the status is settled (saved, or given back), so it is not given back twice
  const settled = useRef(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!editJobId) return
    let live = true
    api.getEmployerJobs(user.id).then(async (js: Job[]) => {
      const job = js.find(j => j.id === editJobId)
      if (!live) return
      if (!job) { setError('This job could not be found. It may have been deleted.'); return }
      setForm({
        companyName: job.companyName || '', jobTitle: job.jobTitle || '', skills: job.skills || '', location: job.location || '',
        salary: job.salary || '', vacancies: job.vacancies || '', jobType: job.jobType || 'Remote',
        experienceLevel: job.experienceLevel || 'Entry Level', description: job.description || '', workCategory: job.workCategory || '',
      })
      setDisabilityCategories(job.disabilityCategories || [])
      statusBefore.current = job.status || 'Active'
      setEditing(job)
      // Stop applications while the post is being changed
      if (statusBefore.current === 'Active') await api.updateJobStatus(job.id, 'Paused')
      // A post saved before the checks existed: say at once what needs fixing
      const problem = jobPostProblem(job)
      if (problem) setError(`This post is hidden from applicants until this is fixed. ${problem}`)
    }).catch((e: any) => { if (live) setError(`Couldn't open the job: ${e.message}`) })
    return () => {
      live = false
      // Left without saving (Cancel, the menu, another screen): give back the status it had
      if (!settled.current && statusBefore.current === 'Active') {
        api.updateJobStatus(editJobId, 'Active').catch(() => toast('The job was left paused. Set it to Active on your dashboard.', 'error'))
      }
    }
  }, [editJobId, user.id])
  // aria-invalid + a pointer to the error message, only on fields that failed
  const errorFor = (id: string) => ({ 'aria-invalid': invalid.has(id), 'aria-describedby': invalid.has(id) ? ERROR_ID : undefined })

  const toggleCat = (cat: string) => setDisabilityCategories(prev =>
    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
  )

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    // The job details screen shows all of these, so a listing without them is incomplete.
    // Same checks as postJob (lib/jobs/job-post.ts), with each field named and focused.
    const missing = missingFields([
      { id: 'pj-companyName', label: 'Company name', value: form.companyName },
      { id: 'pj-jobTitle', label: 'Job title', value: form.jobTitle },
      { id: 'pj-skills', label: 'Required core skills', value: form.skills },
      ...(needsLocation(form.jobType) ? [{ id: 'pj-location', label: 'Location', value: form.location }] : []),
      { id: 'pj-salary', label: 'Salary', value: form.salary },
      { id: 'pj-description', label: 'Job description', value: form.description },
    ])
    setInvalid(new Set(missing.map(f => f.id)))
    if (missing.length) { setError(missingMessage(missing)); focusFirst(missing); return }
    const conflict = workModeProblem(form.jobType, form.location)
    if (conflict) {
      setInvalid(new Set(['pj-location', 'pj-jobType'])); setError(conflict)
      document.getElementById('pj-location')?.focus()
      return
    }
    setError(''); setLoading(true)
    try {
      if (editJobId) {
        await api.updateJob(editJobId, user.id, { ...form, workCategory: form.workCategory || undefined, disabilityCategories, status: statusBefore.current || 'Active' })
        settled.current = true
        toast(statusBefore.current === 'Active' ? 'Job saved. It is open to applicants again.' : 'Job saved.', 'success')
      } else {
        await api.postJob({ ...form, workCategory: form.workCategory || undefined, disabilityCategories, status: 'Active', employerId: user.id, employerName: user.name })
        toast(`${form.jobTitle.trim()} is published. Applicants can see it now.`, 'success')
      }
      onNavigate('emp-dashboard')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Cancel: when editing, the status is given back before the dashboard loads, so it shows the right one
  const cancel = async () => {
    if (editJobId && !settled.current && statusBefore.current === 'Active') {
      settled.current = true
      await api.updateJobStatus(editJobId, 'Active').catch(() => toast('The job was left paused. Set it to Active on your dashboard.', 'error'))
    }
    onNavigate('emp-dashboard')
  }

  if (editJobId && !editing && !error) return <div className="flex-1 flex items-center justify-center text-white" role="status">Loading…</div>

  return (
    <div className="flex-1 flex p-4 sm:p-6 pb-24 sm:pb-24">
      <form onSubmit={handlePublish} noValidate className="bg-white rounded-xl shadow-sm border border-gray-200 w-full p-6 sm:p-8 flex flex-col">
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-[#1a4fa0] mb-1"><span aria-hidden="true">📄</span> {editJobId ? 'Edit Job Post' : 'Post a New Job'}</h1>
          <p className="text-sm text-gray-600">Fill out the role information details below.</p>
          {editing && statusBefore.current === 'Active' && (
            <p role="status" className="mt-3 rounded-lg border-2 border-[#a16207] bg-yellow-50 p-3 text-sm text-gray-900 max-w-3xl">
              <strong>This job is paused while you edit it.</strong> Applicants cannot apply until you save. Saving opens it again; Cancel puts it back as it was.
            </p>
          )}
        </div>
        {/* One column on phones and at high zoom (WCAG 1.4.10 Reflow), two from sm up */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <FormField id="pj-companyName" label="Company name" required>
            <input id="pj-companyName" className="input" autoComplete="organization" required placeholder="e.g., TechCorp" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} {...errorFor('pj-companyName')} />
          </FormField>
          <FormField id="pj-jobTitle" label="Job title" required>
            <input id="pj-jobTitle" className="input" required placeholder="e.g., Data Entry Specialist" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} {...errorFor('pj-jobTitle')} />
          </FormField>
          <FormField id="pj-skills" label="Required core skills, separated by commas" required>
            <input id="pj-skills" className="input" required placeholder="e.g., Typing, Communication, Screen Reader" value={form.skills} onChange={(e) => set('skills', e.target.value)} {...errorFor('pj-skills')} />
          </FormField>
          <FormField id="pj-location" label="Location" required={needsLocation(form.jobType)}>
            <input id="pj-location" className="input" required={needsLocation(form.jobType)}
              placeholder={needsLocation(form.jobType) ? 'e.g., Makati City' : 'e.g., Remote / Work from Home'}
              value={form.location} onChange={(e) => set('location', e.target.value)}
              aria-invalid={invalid.has('pj-location')} aria-describedby={['pj-location-help', invalid.has('pj-location') ? ERROR_ID : ''].filter(Boolean).join(' ')} />
            <p id="pj-location-help" className="mt-1 text-xs text-gray-600">Must agree with the job type: a city for On-site or Hybrid work; empty or "Remote" for Remote.</p>
          </FormField>
          <FormField id="pj-salary" label="Salary in pesos" required>
            <div className="flex">
              <span aria-hidden="true" className="flex items-center justify-center w-10 border border-r-0 border-gray-500 rounded-l-md bg-gray-100 text-gray-600 text-sm font-semibold">₱</span>
              <input id="pj-salary" className="input rounded-l-none flex-1 min-w-0" required placeholder="e.g., 13,000–18,000" value={form.salary} onChange={(e) => set('salary', e.target.value)} {...errorFor('pj-salary')} />
            </div>
          </FormField>
          <FormField id="pj-vacancies" label="Vacancies">
            <input id="pj-vacancies" className="input" type="number" min="1" placeholder="e.g., 5" value={form.vacancies} onChange={(e) => set('vacancies', e.target.value)} />
          </FormField>
          <FormField id="pj-jobType" label="Job type">
            <select id="pj-jobType" className="input" value={form.jobType} onChange={(e) => set('jobType', e.target.value)} {...errorFor('pj-jobType')}>
              <option>Remote</option><option>On-site</option><option>Hybrid</option>
            </select>
          </FormField>
          <FormField id="pj-experience" label="Experience level">
            <select id="pj-experience" className="input" value={form.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}>
              <option>Entry Level</option><option>Intermediate</option><option>Senior Level</option>
            </select>
          </FormField>
          <FormField id="pj-workCategory" label="Kind of work">
            <select id="pj-workCategory" className="input" aria-describedby="pj-workCategory-help" value={form.workCategory} onChange={(e) => set('workCategory', e.target.value)}>
              <option value="">Not one of these</option>
              {WORK_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p id="pj-workCategory-help" className="mt-1 text-xs text-gray-600">Shown on the job post, so applicants can see at a glance what the work is.</p>
          </FormField>
          <fieldset className="sm:col-span-2">
            <legend className="field-label">Visual category, who can apply <span className="font-normal text-gray-600">(optional)</span></legend>
            <div className="flex gap-x-6 gap-y-3 flex-wrap mt-1">
              {['Totally Blind', 'Legally Blind', 'Partially Blind'].map(cat => (
                <label key={cat} className="flex items-center gap-1.5 cursor-pointer min-h-11">
                  <input type="checkbox" checked={disabilityCategories.includes(cat)} onChange={() => toggleCat(cat)} className="accent-[#1a4fa0] w-5 h-5" />
                  <span className="text-sm text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {/* Description grows into the remaining height so the card has no dead space */}
        <div className="flex-1 flex flex-col mt-4 mb-6">
          <FormField id="pj-description" label="Job description" required>
            <textarea id="pj-description" className="input resize-none min-h-28 w-full" required placeholder="Describe the job obligations..." value={form.description} onChange={(e) => set('description', e.target.value)} {...errorFor('pj-description')} />
          </FormField>
        </div>
        <ErrorMsg id={ERROR_ID} msg={error} />
        <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-100">
          <button type="submit" disabled={loading} aria-busy={loading} className="min-h-11 px-6 bg-[#1a7a3c] hover:bg-[#155f30] text-white font-semibold rounded-md py-2 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {loading ? <Spinner label={editJobId ? 'Saving' : 'Publishing'} /> : editJobId ? 'Save Changes' : 'Publish Job Listing'}
          </button>
          {/* plain, not red: Cancel only leaves the form, it does not destroy anything */}
          <button type="button" onClick={cancel} className={BTN_SECONDARY}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
