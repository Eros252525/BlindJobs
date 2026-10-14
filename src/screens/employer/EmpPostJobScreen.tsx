import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { WORK_CATEGORIES } from '@/lib/assessment/work-categories'
import { focusFirst, missingFields, missingMessage } from '@/lib/validation'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { Spinner } from '@/components/ui/Spinner'
import type { Screen, User } from '@/types'

const ERROR_ID = 'pj-error'

export function EmpPostJobScreen({ user, onNavigate }: { user: User; onNavigate: (s: Screen) => void }) {
  // WCAG 3.3.7 Redundant Entry: the company name was given at registration (it is the
  // employer's account name), so start with it instead of asking again on every post.
  const [form, setForm] = useState({ companyName: user.name.includes('@') ? '' : user.name, jobTitle: '', skills: '', location: '', salary: '', vacancies: '', jobType: 'Remote', experienceLevel: 'Entry Level', description: '', workCategory: '', minCategoryScore: '' })
  const [disabilityCategories, setDisabilityCategories] = useState<string[]>([])
  const [requireCheck, setRequireCheck] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  // aria-invalid + a pointer to the error message, only on fields that failed
  const errorFor = (id: string) => ({ 'aria-invalid': invalid.has(id), 'aria-describedby': invalid.has(id) ? ERROR_ID : undefined })

  const toggleCat = (cat: string) => setDisabilityCategories(prev =>
    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
  )

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    // The job details screen shows all of these, so a listing without them is incomplete.
    const missing = missingFields([
      { id: 'pj-companyName', label: 'Company name', value: form.companyName },
      { id: 'pj-jobTitle', label: 'Job title', value: form.jobTitle },
      { id: 'pj-skills', label: 'Required core skills', value: form.skills },
      { id: 'pj-salary', label: 'Salary', value: form.salary },
      { id: 'pj-description', label: 'Job description', value: form.description },
    ])
    setInvalid(new Set(missing.map(f => f.id)))
    if (missing.length) { setError(missingMessage(missing)); focusFirst(missing); return }
    // The minimum only means something for a kind of work that has a skills check
    const min = form.workCategory && form.minCategoryScore.trim() ? Number(form.minCategoryScore) : 0
    if (!Number.isInteger(min) || min < 0 || min > 100) {
      setInvalid(new Set(['pj-minScore']))
      setError('Minimum skills-check score must be a whole number from 0 to 100, or left empty.')
      document.getElementById('pj-minScore')?.focus()
      return
    }
    setError(''); setLoading(true)
    try {
      await api.postJob({ ...form, minCategoryScore: min || undefined, workCategory: form.workCategory || undefined, requireCheck: !!form.workCategory && requireCheck, disabilityCategories, status: 'Active', employerId: user.id, employerName: user.name })
      onNavigate('emp-dashboard')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex-1 flex p-4 sm:p-6 pb-24 sm:pb-24">
      <form onSubmit={handlePublish} noValidate className="bg-white rounded-xl shadow-sm border border-gray-200 w-full p-6 sm:p-8 flex flex-col">
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-[#1a4fa0] mb-1"><span aria-hidden="true">📄</span> Post a New Job</h1>
          <p className="text-sm text-gray-600">Fill out the role information details below.</p>
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
          <FormField id="pj-location" label="Location">
            <input id="pj-location" className="input" placeholder="e.g., Manila, Remote / Work from Home" value={form.location} onChange={(e) => set('location', e.target.value)} />
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
            <select id="pj-jobType" className="input" value={form.jobType} onChange={(e) => set('jobType', e.target.value)}>
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
            <p id="pj-workCategory-help" className="mt-1 text-xs text-gray-600">Applicants take a 10-question skills check for each kind of work. Choosing one adds their score to this job's fit score.</p>
          </FormField>
          <FormField id="pj-minScore" label="Minimum skills-check score, 0 to 100">
            <input id="pj-minScore" className="input" type="number" min="0" max="100" step="1" inputMode="numeric" placeholder="e.g., 60"
              value={form.minCategoryScore} onChange={(e) => set('minCategoryScore', e.target.value)}
              aria-invalid={invalid.has('pj-minScore')} aria-describedby={invalid.has('pj-minScore') ? `${ERROR_ID} pj-minScore-help` : 'pj-minScore-help'} />
            <p id="pj-minScore-help" className="mt-1 text-xs text-gray-600">
              Used only when a kind of work is chosen. Applicants below it can still apply; you are shown who meets it, and why each applicant fits.
            </p>
          </FormField>
          <div className="sm:col-span-2">
            <div className="flex items-start gap-3">
              <input id="pj-requireCheck" type="checkbox" checked={requireCheck} onChange={(e) => setRequireCheck(e.target.checked)}
                aria-describedby="pj-requireCheck-help" className="mt-1 w-5 h-5 shrink-0 accent-[#1a4fa0]" />
              <label htmlFor="pj-requireCheck" className="text-sm font-semibold text-gray-800 cursor-pointer">Require the skills check to apply</label>
            </div>
            <p id="pj-requireCheck-help" className="mt-1 ml-8 text-xs text-gray-600">
              Used only when a kind of work is chosen. Left unticked, the skills check is optional and applicants may apply without it. Ticked, an applicant must take it first; any score is accepted, and you see it when you review them.
            </p>
          </div>
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
          <button type="submit" disabled={loading} aria-busy={loading} className="px-6 bg-[#1a7a3c] hover:bg-[#155f30] text-white font-semibold rounded-md py-2 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {loading ? <Spinner label="Publishing" /> : 'Publish Job Listing'}
          </button>
          <button type="button" onClick={() => onNavigate('emp-dashboard')} className="px-6 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-md py-2 text-sm transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  )
}
