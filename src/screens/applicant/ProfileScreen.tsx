import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { focusFirst, missingFields, missingMessage, type RequiredField } from '@/lib/validation'
import { ACCOMMODATIONS, ASSISTIVE_TECH, EDUCATION_LEVELS, LANGUAGES, MAX_EXPERIENCE, WORK_SETUPS } from '@/lib/resume'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { PhotoField } from '@/components/ui/PhotoField'
import { SkillPicker } from '@/components/ui/SkillPicker'
import { Spinner } from '@/components/ui/Spinner'
import type { ApplicantProfile, User, WorkExperience } from '@/types'
import { ResumeView } from './profile/ResumeView'

type P = ApplicantProfile
type ListKey = 'assistiveTech' | 'workSetup' | 'languages' | 'accommodations'

const ERROR_ID = 'pf-error'

// The parts of the edit form, in order: [heading id, label]
const FORM_SECTIONS: [string, string][] = [
  ['pf-sec-personal', 'Personal'], ['pf-sec-contact', 'Contact'], ['pf-sec-about', 'About me'], ['pf-sec-skills', 'Skills'],
  ['pf-sec-education', 'Education'], ['pf-sec-experience', 'Experience'], ['pf-sec-tools', 'Tools and preferences'],
]

// Same required set as registration, so the two screens never disagree.
const requiredFields = (p: P, skills: string[]): RequiredField[] => [
  { id: 'pf-firstName', label: 'First name', value: p.firstName || '' },
  { id: 'pf-lastName', label: 'Last name', value: p.lastName || '' },
  { id: 'pf-mobile', label: 'Mobile number', value: p.mobile || '' },
  { id: 'pf-disability', label: 'Disability type', value: p.disabilityType || '' },
  { id: 'pf-skill-0', label: 'Skills (at least one)', value: skills.join('') },
]

// A saved resume is shown as a resume, not as a form: read-only, with one clear
// way back into editing. A profile missing required details opens straight in edit.
export function ProfileScreen({ user }: { user: User }) {
  const [profile, setProfile] = useState<P | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [mode, setMode] = useState<'view' | 'edit'>('edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  // last saved version, so Cancel can discard unsaved edits
  const saved = useRef<{ profile: P; skills: string[] }>({ profile: {}, skills: [] })
  // element to focus after the next render (mode switch, added/removed experience)
  const pendingFocus = useRef<string | null>(null)

  useEffect(() => {
    api.getProfile(user.id).then((p: P) => {
      // older profiles kept three slots, some of them blank
      const s = (p.skills || []).filter(Boolean)
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
    <div className="flex-1 p-4 sm:p-6 pb-24 sm:pb-24">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full p-6 sm:p-8">
        <div className="mb-6 pb-6 border-b border-gray-200 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1 basis-96">
          <h1 className="text-2xl font-bold text-[#1a4fa0]">{hasSavedResume ? 'Edit your resume' : 'Build your resume'}</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-3xl">
            Fields marked required are needed to apply. Everything else is optional, but a fuller resume helps employers understand your skills.
          </p>
          {/* A long form: links to each part, so nobody has to walk through all of it to reach the last */}
          <nav aria-label="Sections of this form" className="mt-4">
            <ul className="flex flex-wrap gap-2">
              {FORM_SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="inline-flex items-center min-h-9 px-3 rounded-full border border-gray-500 bg-white text-sm font-medium text-gray-700 hover:border-[#1a4fa0] hover:text-[#1a4fa0]">{label}</a>
                </li>
              ))}
            </ul>
          </nav>
          </div>
          {/* top-right on wide screens; under the heading on a phone. In the DOM after the
              heading and section links, so Tab reaches it before the form fields */}
          <PhotoField id="pf-photo" stacked name={[profile.firstName, profile.lastName].filter(Boolean).join(' ') || user.name}
            value={profile.photoUrl} onChange={(v) => set('photoUrl', v)} />
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
              {/* Applicants sign in with a username (older accounts with an email address) */}
              <label htmlFor="pf-email" className="field-label">{profile.email ? 'Email address' : 'Username'} <span className="font-normal text-gray-600">(used to sign in, can't be changed)</span></label>
              <input id="pf-email" className="input bg-gray-50" value={profile.email || profile.username || ''} readOnly />
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
          {/* the same picker as registration: common skills to tap, or any skill typed in */}
          <SkillPicker inputId="pf-skill-0" value={skills} invalid={invalid.has('pf-skill-0')} errorId={ERROR_ID}
            onChange={setSkills} />
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
            <ChipGroup id="pf-acc" label="What I would ask an employer to arrange" options={ACCOMMODATIONS}
              selected={profile.accommodations ?? []} onToggle={(v) => toggleIn('accommodations', v)} />
            <ChipGroup id="pf-lang" label="Languages I speak" options={LANGUAGES}
              selected={profile.languages ?? []} onToggle={(v) => toggleIn('languages', v)} />
          </div>
        </EditSection>

        <div className="mt-6"><ErrorMsg id={ERROR_ID} msg={error} /></div>
        <div className="flex flex-wrap items-center gap-3 pt-2 mt-4">
          <button type="button" onClick={handleSave} disabled={saving} aria-busy={saving}
            className="min-h-11 bg-[#1a7a3c] hover:bg-[#155f30] text-white font-semibold rounded-md px-6 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-70">
            {saving ? <Spinner label="Saving" /> : 'Save resume'}
          </button>
          <button type="button" onClick={handleCancel} disabled={saving}
            className="min-h-11 border border-gray-500 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-md px-5 py-2.5 text-sm transition-colors">
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
    <section aria-labelledby={id} className="py-7 border-b border-gray-200 first-of-type:pt-0">
      <h2 id={id} tabIndex={-1} className="text-xl font-bold text-gray-900 scroll-mt-24 focus:outline-none">{title}</h2>
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
