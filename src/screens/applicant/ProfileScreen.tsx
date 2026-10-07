import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { initials } from '@/lib/format'
import { focusFirst, missingFields, missingMessage, type RequiredField } from '@/lib/validation'
import { ASSISTIVE_TECH, EDUCATION_LEVELS, LANGUAGES, MAX_EXPERIENCE, SKILL_CHOICES, WORK_SETUPS, fullName, resumeSections } from '@/lib/resume'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { Spinner } from '@/components/ui/Spinner'
import type { ApplicantProfile, User, WorkExperience } from '@/types'

type P = ApplicantProfile
type ListKey = 'assistiveTech' | 'workSetup' | 'languages'

const ERROR_ID = 'pf-error'

// Same required set as registration, so the two screens never disagree.
const requiredFields = (p: P, skills: string[]): RequiredField[] => [
  { id: 'pf-firstName', label: 'First name', value: p.firstName || '' },
  { id: 'pf-lastName', label: 'Last name', value: p.lastName || '' },
  { id: 'pf-mobile', label: 'Mobile number', value: p.mobile || '' },
  { id: 'pf-disability', label: 'Disability type', value: p.disabilityType || '' },
  { id: 'pf-skill-0', label: 'Skills (at least one)', value: skills.join('') },
]

function formatUpdated(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString()
    ? `today at ${time}`
    : `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${time}`
}

// A saved resume is shown as a resume, not as a form: read-only, with one clear
// way back into editing. A profile missing required details opens straight in edit.
export function ProfileScreen({ user }: { user: User }) {
  const [profile, setProfile] = useState<P | null>(null)
  const [skills, setSkills] = useState(['', '', ''])
  const [mode, setMode] = useState<'view' | 'edit'>('edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  // last saved version, so Cancel can discard unsaved edits
  const saved = useRef<{ profile: P; skills: string[] }>({ profile: {}, skills: ['', '', ''] })
  // element to focus after the next render (mode switch, added/removed experience)
  const pendingFocus = useRef<string | null>(null)

  useEffect(() => {
    api.getProfile(user.id).then((p: P) => {
      const s = p.skills?.length ? p.skills : ['', '', '']
      saved.current = { profile: p, skills: s }
      setProfile(p)
      setSkills(s)
      setMode(missingFields(requiredFields(p, s)).length ? 'edit' : 'view')
    }).catch(() => setProfile({}))
  }, [user.id])

  useEffect(() => {
    const id = pendingFocus.current
    if (!id) return
    pendingFocus.current = null
    document.getElementById(id)?.focus()
  })

  const switchTo = (next: 'view' | 'edit') => {
    pendingFocus.current = next === 'view' ? 'pf-view-title' : 'pf-firstName'
    setMode(next)
  }

  const handleSave = async () => {
    if (!profile) return
    const missing = missingFields(requiredFields(profile, skills))
    setInvalid(new Set(missing.map(f => f.id)))
    if (missing.length) { setError(missingMessage(missing)); focusFirst(missing); return }
    setError(''); setSaving(true)
    try {
      // drop experience rows left completely blank
      const experience = (profile.experience ?? []).filter(x => x.title.trim() || x.company.trim() || x.period.trim())
      const next = { ...profile, experience, skills, updatedAt: new Date().toISOString() }
      await api.updateProfile(user.id, next)
      saved.current = { profile: next, skills }
      setProfile(next)
      toast('Resume saved.', 'success')
      switchTo('view')
    } catch (e: any) { toast(`Couldn't save your resume: ${e.message}`, 'error') }
    finally { setSaving(false) }
  }

  const handleCancel = () => {
    setProfile(saved.current.profile)
    setSkills(saved.current.skills)
    setError(''); setInvalid(new Set())
    if (!missingFields(requiredFields(saved.current.profile, saved.current.skills)).length) switchTo('view')
  }

  if (!profile) return <div className="flex-1 flex items-center justify-center text-white">Loading…</div>

  if (mode === 'view') {
    return <ResumeView profile={profile} skills={skills.filter(Boolean)} onEdit={() => switchTo('edit')} />
  }

  const set = <K extends keyof P>(k: K, v: P[K]) => setProfile(p => ({ ...p, [k]: v }))
  const toggleIn = (k: ListKey, v: string) => setProfile(p => {
    const cur = p?.[k] ?? []
    return { ...p, [k]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }
  })
  const exp = profile.experience ?? []
  const setExp = (i: number, k: keyof WorkExperience, v: string) => set('experience', exp.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const addExp = () => { pendingFocus.current = `pf-exp-${exp.length}-title`; set('experience', [...exp, { title: '', company: '', period: '' }]) }
  const removeExp = (i: number) => { pendingFocus.current = 'pf-exp-add'; set('experience', exp.filter((_, j) => j !== i)) }

  const errorFor = (id: string) => ({ 'aria-invalid': invalid.has(id), 'aria-describedby': invalid.has(id) ? ERROR_ID : undefined })
  const dirty = JSON.stringify({ profile, skills }) !== JSON.stringify(saved.current)
  const hasSavedResume = !missingFields(requiredFields(saved.current.profile, saved.current.skills)).length

  return (
    <div className="flex-1 flex p-4 sm:p-6 pb-24 sm:pb-24">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-5xl mx-auto p-6 sm:p-8 flex flex-col">
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-[#1a4fa0]">{hasSavedResume ? 'Edit your resume' : 'Build your resume'}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Fields marked required are needed to apply. Everything else is optional, but a fuller resume helps employers understand your skills.
          </p>
        </div>

        <EditSection id="pf-sec-personal" title="Personal information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <FormField id="pf-firstName" label="First name" required>
              <input id="pf-firstName" className="input" autoComplete="given-name" required value={profile.firstName || ''} onChange={(e) => set('firstName', e.target.value)} {...errorFor('pf-firstName')} />
            </FormField>
            <FormField id="pf-lastName" label="Last name" required>
              <input id="pf-lastName" className="input" autoComplete="family-name" required value={profile.lastName || ''} onChange={(e) => set('lastName', e.target.value)} {...errorFor('pf-lastName')} />
            </FormField>
            <FormField id="pf-middleName" label="Middle name">
              <input id="pf-middleName" className="input" autoComplete="additional-name" value={profile.middleName || ''} onChange={(e) => set('middleName', e.target.value)} />
            </FormField>
            <FormField id="pf-suffix" label="Suffix">
              <input id="pf-suffix" className="input" autoComplete="honorific-suffix" value={profile.suffix || ''} onChange={(e) => set('suffix', e.target.value)} />
            </FormField>
            <FormField id="pf-gender" label="Gender">
              <select id="pf-gender" className="input" autoComplete="sex" value={profile.gender || ''} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </FormField>
            <FormField id="pf-disability" label="Disability type" required>
              <select id="pf-disability" className="input" required value={profile.disabilityType || ''} onChange={(e) => set('disabilityType', e.target.value)} {...errorFor('pf-disability')}>
                <option value="">Select disability type</option><option>Legally Blind</option><option>Partially Blind</option><option>Totally Blind</option>
              </select>
            </FormField>
          </div>
        </EditSection>

        <EditSection id="pf-sec-contact" title="Contact and location">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              {/* Set at registration and used to sign in, so it can't be edited here */}
              <label htmlFor="pf-email" className="field-label">Gmail username <span className="font-normal text-gray-600">(can't be changed)</span></label>
              <div className="flex">
                <input id="pf-email" className="input rounded-r-none flex-1 min-w-0 bg-gray-50" value={(profile.email || '').replace('@gmail.com', '')} readOnly aria-describedby="pf-email-suffix" />
                <span id="pf-email-suffix" className="flex items-center px-2 border border-l-0 border-gray-500 rounded-r-md bg-gray-50 text-gray-600 text-xs">@gmail.com</span>
              </div>
            </div>
            <FormField id="pf-mobile" label="Mobile number" required>
              <div className="flex">
                <span id="pf-mobile-prefix" className="flex items-center px-2 border border-r-0 border-gray-500 rounded-l-md bg-gray-50 text-gray-600 text-xs">+63</span>
                <input id="pf-mobile" className="input rounded-l-none flex-1 min-w-0" type="tel" autoComplete="tel-national" required
                  value={profile.mobile || ''} onChange={(e) => set('mobile', e.target.value)}
                  aria-invalid={invalid.has('pf-mobile')} aria-describedby={['pf-mobile-prefix', invalid.has('pf-mobile') ? ERROR_ID : ''].filter(Boolean).join(' ')} />
              </div>
            </FormField>
            <FormField id="pf-location" label="City or province">
              <input id="pf-location" className="input" autoComplete="address-level2" placeholder="e.g., Quezon City, Metro Manila"
                value={profile.location || ''} onChange={(e) => set('location', e.target.value)} />
            </FormField>
          </div>
        </EditSection>

        <EditSection id="pf-sec-about" title="About me">
          <FormField id="pf-about" label="Short introduction">
            <p id="pf-about-hint" className="text-sm text-gray-600 mb-2">Two or three sentences: the work you are looking for and what you are good at.</p>
            <textarea id="pf-about" className="input min-h-28 resize-y" maxLength={500} aria-describedby="pf-about-hint pf-about-count"
              value={profile.about || ''} onChange={(e) => set('about', e.target.value)} />
            <p id="pf-about-count" className="mt-1 text-xs text-gray-600 text-right">{(profile.about || '').length} of 500 characters</p>
          </FormField>
        </EditSection>

        <EditSection id="pf-sec-skills" title="Skills">
          <p id="pf-skills" className="field-label">Top 3 skills <span className="text-gray-600 font-normal normal-case">(required, at least one — pick up to 3)</span></p>
          <div role="group" aria-labelledby="pf-skills" className="flex flex-wrap gap-2 mb-2">
            {SKILL_CHOICES.map(s => {
              const idx = skills.indexOf(s)
              const selected = idx !== -1
              const full = !selected && skills.filter(Boolean).length >= 3
              return (
                <button type="button" key={s} disabled={full} aria-pressed={selected}
                  onClick={() => setSkills(prev => {
                    if (selected) { const n = [...prev]; n[idx] = ''; return n }
                    const empty = prev.findIndex(x => !x)
                    if (empty === -1) return prev
                    const n = [...prev]; n[empty] = s; return n
                  })}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors
                    ${selected ? 'bg-[#1a4fa0] text-white border-[#1a4fa0]' : full ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-600 border-gray-500 hover:border-[#1a4fa0] hover:text-[#1a4fa0]'}`}>
                  {selected ? '✓ ' : ''}{s}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative">
                <input id={`pf-skill-${i}`} className="input pr-9 text-xs" aria-label={`Skill ${i + 1}`}
                  placeholder={`Custom skill ${i + 1}`} {...(i === 0 ? errorFor('pf-skill-0') : {})}
                  value={skills[i] || ''} onChange={(e) => setSkills(s => { const n = [...s]; n[i] = e.target.value; return n })} />
                {skills[i] && (
                  <button type="button" onClick={() => setSkills(s => { const n = [...s]; n[i] = ''; return n })}
                    aria-label={`Clear skill ${i + 1}: ${skills[i]}`}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded text-gray-600 hover:bg-gray-100 text-xs"><span aria-hidden="true">✕</span></button>
                )}
              </div>
            ))}
          </div>
        </EditSection>

        <EditSection id="pf-sec-education" title="Education and training">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <FormField id="pf-education" label="Highest education">
              <select id="pf-education" className="input" value={profile.educationLevel || ''} onChange={(e) => set('educationLevel', e.target.value)}>
                <option value="">Select level</option>
                {EDUCATION_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </FormField>
            <FormField id="pf-school" label="School and course">
              <input id="pf-school" className="input" placeholder="e.g., PUP, BS Information Technology"
                value={profile.school || ''} onChange={(e) => set('school', e.target.value)} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="pf-trainings" label="Trainings and certifications">
                <p id="pf-trainings-hint" className="text-sm text-gray-600 mb-2">One per line, e.g. TESDA Contact Center Services NC II.</p>
                <textarea id="pf-trainings" className="input min-h-24 resize-y" aria-describedby="pf-trainings-hint"
                  value={profile.trainings || ''} onChange={(e) => set('trainings', e.target.value)} />
              </FormField>
            </div>
          </div>
        </EditSection>

        <EditSection id="pf-sec-experience" title="Work experience" hint="Optional. No work experience yet is fine; leave this empty.">
          <div className="space-y-4">
            {exp.map((x, i) => (
              <fieldset key={i} className="rounded-lg border border-gray-300 p-4">
                <legend className="px-1 text-sm font-semibold text-gray-800">Work experience {i + 1}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <div>
                    <label htmlFor={`pf-exp-${i}-title`} className="field-label">Job title</label>
                    <input id={`pf-exp-${i}-title`} className="input" value={x.title} onChange={(e) => setExp(i, 'title', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor={`pf-exp-${i}-company`} className="field-label">Company or employer</label>
                    <input id={`pf-exp-${i}-company`} className="input" value={x.company} onChange={(e) => setExp(i, 'company', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor={`pf-exp-${i}-period`} className="field-label">Years</label>
                    <input id={`pf-exp-${i}-period`} className="input" placeholder="e.g., 2021–2023" value={x.period} onChange={(e) => setExp(i, 'period', e.target.value)} />
                  </div>
                </div>
                <button type="button" onClick={() => removeExp(i)}
                  aria-label={`Remove work experience ${i + 1}${x.title ? `: ${x.title}` : ''}`}
                  className="mt-3 min-h-9 px-3 rounded-md border border-gray-500 text-sm font-semibold text-red-700 hover:bg-red-50">
                  Remove
                </button>
              </fieldset>
            ))}
            {exp.length < MAX_EXPERIENCE ? (
              <button id="pf-exp-add" type="button" onClick={addExp}
                className="min-h-10 px-4 rounded-md border-2 border-dashed border-[#1a4fa0] text-[#1a4fa0] font-semibold text-sm hover:bg-blue-50">
                <span aria-hidden="true">+ </span>Add work experience
              </button>
            ) : (
              <p className="text-sm text-gray-600">You can add up to {MAX_EXPERIENCE} jobs. Remove one to add another.</p>
            )}
          </div>
        </EditSection>

        <EditSection id="pf-sec-tools" title="Tools and preferences">
          <div className="space-y-5">
            <ChipGroup id="pf-at" label="Assistive technology I use" options={ASSISTIVE_TECH}
              selected={profile.assistiveTech ?? []} onToggle={(v) => toggleIn('assistiveTech', v)} />
            <ChipGroup id="pf-setup" label="Preferred work setup" options={WORK_SETUPS}
              selected={profile.workSetup ?? []} onToggle={(v) => toggleIn('workSetup', v)} />
            <ChipGroup id="pf-lang" label="Languages I speak" options={LANGUAGES}
              selected={profile.languages ?? []} onToggle={(v) => toggleIn('languages', v)} />
          </div>
        </EditSection>

        <div className="mt-6"><ErrorMsg id={ERROR_ID} msg={error} /></div>
        <div className="flex flex-wrap items-center gap-3 pt-6 mt-4 border-t border-gray-100">
          <button type="button" onClick={handleSave} disabled={saving} aria-busy={saving}
            className="bg-[#1a7a3c] hover:bg-[#155f30] text-white font-semibold rounded-md px-5 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-70">
            {saving ? <Spinner label="Saving" /> : 'Save resume'}
          </button>
          <button type="button" onClick={handleCancel} disabled={saving}
            className="border border-gray-500 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-md px-5 py-2.5 text-sm transition-colors">
            {hasSavedResume ? 'Cancel' : 'Clear changes'}
          </button>
          {/* always mounted so the screen reader hears "Unsaved changes" when it appears (WCAG 4.1.3) */}
          <span role="status" className="flex items-center gap-2 text-sm font-medium text-[#713f12]">
            {dirty && <><span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-[#a16207]" />Unsaved changes</>}
          </span>
        </div>
      </div>
    </div>
  )
}

// Each form section is a headed region, so screen-reader users can jump with H.
function EditSection({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="py-6 border-b border-gray-100 first-of-type:pt-0">
      <h2 id={id} className="text-lg font-bold text-gray-900">{title}</h2>
      {hint && <p className="text-sm text-gray-600 mt-1">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ChipGroup({ id, label, options, selected, onToggle }: {
  id: string; label: string; options: string[]; selected: string[]; onToggle: (v: string) => void
}) {
  return (
    <div>
      <p id={id} className="field-label">{label} <span className="font-normal text-gray-600">(optional, choose any)</span></p>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map(o => {
          const on = selected.includes(o)
          return (
            <button type="button" key={o} aria-pressed={on} onClick={() => onToggle(o)}
              className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-colors ${on ? 'bg-[#1a4fa0] text-white border-[#1a4fa0]' : 'bg-white text-gray-700 border-gray-500 hover:border-[#1a4fa0] hover:text-[#1a4fa0]'}`}>
              {on ? '✓ ' : ''}{o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── read-only resume ─────────────────────────────────────────────────────────

function ResumeView({ profile, skills, onEdit }: { profile: P; skills: string[]; onEdit: () => void }) {
  const name = fullName(profile) || 'Your name'
  const updated = formatUpdated(profile.updatedAt)
  const sections = resumeSections(profile)
  const done = sections.filter(s => s.done).length
  const missing = sections.filter(s => !s.done).map(s => s.label)
  const experience = (profile.experience ?? []).filter(x => x.title.trim() || x.company.trim())
  const trainings = (profile.trainings || '').split('\n').map(t => t.trim()).filter(Boolean)

  return (
    <div className="flex-1 p-4 sm:p-6 pb-24 sm:pb-24">
      <article aria-labelledby="pf-view-title" className="max-w-5xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <header className="px-6 sm:px-8 py-6 flex flex-wrap items-center gap-5 border-b border-gray-200">
          <span aria-hidden="true" className="w-16 h-16 shrink-0 rounded-full bg-[#1a4fa0] text-white text-xl font-bold grid place-items-center">
            {initials(name)}
          </span>
          <div className="flex-1 min-w-[12rem]">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">My resume</p>
            <h1 id="pf-view-title" tabIndex={-1} className="text-2xl font-bold text-gray-900 leading-tight">{name}</h1>
            {profile.location && <p className="text-base text-gray-700">{profile.location}</p>}
            <p className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 text-sm font-medium text-[#1a7a3c]">
              <span aria-hidden="true" className="w-5 h-5 rounded-full bg-[#1a7a3c] text-white text-xs grid place-items-center">✓</span>
              Saved{updated && <span className="text-gray-600 font-normal">· last updated {updated}</span>}
            </p>
          </div>
          <button type="button" onClick={onEdit} className="btn-primary flex items-center gap-2 px-5 py-2.5">
            <span aria-hidden="true">✎</span> Edit resume
          </button>
        </header>

        {/* Resume strength: words carry it, the bar is decoration */}
        <div className="px-6 sm:px-8 py-4 bg-[#eff6ff] border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="font-semibold text-gray-900">
              {missing.length ? `Resume strength: ${done} of ${sections.length} sections added` : 'Your resume is complete'}
            </p>
            <div aria-hidden="true" className="flex-1 min-w-[8rem] h-2.5 rounded-full bg-white border border-[#1a4fa0] overflow-hidden">
              <div className="h-full bg-[#1a4fa0]" style={{ width: `${(done / sections.length) * 100}%` }} />
            </div>
          </div>
          {missing.length > 0 && (
            <p className="mt-1 text-sm text-gray-700">Still to add: {missing.join(', ')}. A fuller resume helps employers understand your skills.</p>
          )}
        </div>

        <div className="px-6 sm:px-8 py-7 space-y-8">
          {profile.about?.trim() && (
            <ResumeSection id="pf-v-about" title="About me">
              <p className="text-base text-gray-900 whitespace-pre-line">{profile.about}</p>
            </ResumeSection>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
            <ResumeSection id="pf-v-contact" title="Contact">
              <dl className="space-y-3">
                <ResumeItem label="Gmail" value={profile.email} />
                <ResumeItem label="Mobile number" value={profile.mobile ? `+63 ${profile.mobile}` : ''} />
                <ResumeItem label="City or province" value={profile.location} />
              </dl>
            </ResumeSection>
            <ResumeSection id="pf-v-personal" title="Personal details">
              <dl className="space-y-3">
                <ResumeItem label="Disability type" value={profile.disabilityType} />
                <ResumeItem label="Gender" value={profile.gender} />
              </dl>
            </ResumeSection>
          </div>

          <ResumeSection id="pf-v-skills" title="Top skills">
            <ChipList items={skills} empty="No skills added yet." />
          </ResumeSection>

          <ResumeSection id="pf-v-exp" title="Work experience">
            {experience.length ? (
              <ul className="space-y-3">
                {experience.map((x, i) => (
                  <li key={i} className="border-l-4 border-[#1a4fa0] pl-4">
                    <p className="font-semibold text-gray-900">{x.title || 'Untitled role'}</p>
                    <p className="text-sm text-gray-700">{[x.company, x.period].filter(Boolean).join(' · ')}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-600">No work experience added.</p>}
          </ResumeSection>

          <ResumeSection id="pf-v-edu" title="Education and training">
            <dl className="space-y-3">
              <ResumeItem label="Highest education" value={profile.educationLevel} />
              <ResumeItem label="School and course" value={profile.school} />
              <div>
                <dt className="text-sm text-gray-600">Trainings and certifications</dt>
                <dd className="text-base font-medium text-gray-900">
                  {trainings.length
                    ? <ul className="list-disc pl-5 space-y-0.5">{trainings.map(t => <li key={t}>{t}</li>)}</ul>
                    : <span className="text-gray-600 font-normal">Not provided</span>}
                </dd>
              </div>
            </dl>
          </ResumeSection>

          <ResumeSection id="pf-v-tools" title="Tools and preferences">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm text-gray-600 mb-2">Assistive technology</h3>
                <ChipList items={profile.assistiveTech ?? []} empty="Not provided" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600 mb-2">Preferred work setup</h3>
                <ChipList items={profile.workSetup ?? []} empty="Not provided" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600 mb-2">Languages</h3>
                <ChipList items={profile.languages ?? []} empty="Not provided" />
              </div>
            </div>
          </ResumeSection>
        </div>

        <footer className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-700">
          Employers see this resume when you apply for a job.
        </footer>
      </article>
    </div>
  )
}

function ResumeSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-sm font-bold uppercase tracking-wider text-[#1a4fa0] mb-3">{title}</h2>
      {children}
    </section>
  )
}

function ResumeItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-base font-medium text-gray-900 break-words">{value || <span className="text-gray-600 font-normal">Not provided</span>}</dd>
    </div>
  )
}

function ChipList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-gray-600">{empty}</p>
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map(s => (
        <li key={s} className="px-4 py-1.5 rounded-full border border-[#1a4fa0] text-[#1a4fa0] font-semibold text-sm">{s}</li>
      ))}
    </ul>
  )
}
