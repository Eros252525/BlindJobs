import { useState, type FormEvent } from 'react'
import { ACCOMMODATIONS, ASSISTIVE_TECH, SKILL_CHOICES, WORK_SETUPS } from '@/lib/resume'
import { focusFirst, missingFields, missingMessage } from '@/lib/validation'
import { useStepFocus } from '@/hooks/useStepFocus'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { PageCard, STEP_HEADING } from '@/components/ui/PageCard'

const ERROR_ID = 'wp-error'
const MAX_SKILLS = 3

/** What registration asks about work: enough to suggest kinds of work and to match jobs. */
export interface WorkProfile {
  disabilityType: string
  skills: string[]
  jobTitle: string
  company: string
  location: string
  workSetup: string[]
  assistiveTech: string[]
  accommodations: string[]
}

export const EMPTY_WORK_PROFILE: WorkProfile = {
  disabilityType: '', skills: [], jobTitle: '', company: '', location: '', workSetup: [], assistiveTech: [], accommodations: [],
}

type ListKey = 'skills' | 'workSetup' | 'assistiveTech' | 'accommodations'

/** Registration step 3: skills, experience and work preferences. */
export function WorkProfileStep({ value, onChange, onContinue }: {
  value: WorkProfile; onChange: (w: WorkProfile) => void; onContinue: () => void
}) {
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const headingRef = useStepFocus<HTMLHeadingElement>('work-profile', 'Your skills and work preferences.')

  const set = <K extends keyof WorkProfile>(k: K, v: WorkProfile[K]) => onChange({ ...value, [k]: v })
  const toggle = (k: ListKey, v: string) => {
    const cur = value[k]
    if (k === 'skills' && !cur.includes(v) && cur.length >= MAX_SKILLS) {
      setNote(`You can pick up to ${MAX_SKILLS} skills. Unselect one to choose ${v}.`)
      return
    }
    setNote('')
    set(k, cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v])
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const missing = missingFields([
      { id: 'wp-disability', label: 'Disability type', value: value.disabilityType },
      { id: 'wp-skills-first', label: 'Skills (at least one)', value: value.skills.join('') },
    ])
    setInvalid(new Set(missing.map(f => f.id)))
    if (missing.length) { setError(missingMessage(missing)); focusFirst(missing); return }
    setError('')
    onContinue()
  }

  return (
    <PageCard>
      <form onSubmit={submit} noValidate>
        <h1 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>Your skills and work preferences</h1>
        <p className="mt-1 text-sm text-gray-700 max-w-3xl">
          We use these to suggest kinds of work for you in the next step, and to match you with jobs. You can change all of it on your profile later.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
          <FormField id="wp-disability" label="Disability type" required>
            <select id="wp-disability" className="input" required value={value.disabilityType} onChange={(e) => set('disabilityType', e.target.value)}
              aria-invalid={invalid.has('wp-disability')} aria-describedby={invalid.has('wp-disability') ? ERROR_ID : undefined}>
              <option value="">Select disability type</option><option>Totally Blind</option><option>Legally Blind</option><option>Partially Blind</option>
            </select>
          </FormField>
          <FormField id="wp-location" label="City or province">
            <input id="wp-location" className="input" type="text" autoComplete="address-level2" placeholder="e.g., Quezon City" value={value.location} onChange={(e) => set('location', e.target.value)} />
          </FormField>
        </div>

        <div className="mt-6 max-w-3xl">
          <p id="wp-skills" className="field-label">Your top skills <span className="font-normal text-gray-600">(required, at least one, up to {MAX_SKILLS})</span></p>
          <div role="group" aria-labelledby="wp-skills" className="flex flex-wrap gap-2">
            {SKILL_CHOICES.map((s, i) => {
              const on = value.skills.includes(s)
              return (
                <button type="button" key={s} id={i === 0 ? 'wp-skills-first' : undefined} aria-pressed={on} onClick={() => toggle('skills', s)}
                  aria-describedby={i === 0 && invalid.has('wp-skills-first') ? ERROR_ID : undefined}
                  className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}>
                  {on ? '✓ ' : ''}{s}
                </button>
              )
            })}
          </div>
          <p role="status" className="mt-2 text-sm text-gray-800">{note}</p>
        </div>

        <fieldset className="mt-4 max-w-3xl">
          <legend className="field-label">Your most recent job <span className="font-normal text-gray-600">(optional)</span></legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="wp-job" className="text-sm text-gray-700 block mb-1">Job title</label>
              <input id="wp-job" className="input" type="text" autoComplete="organization-title" placeholder="e.g., Massage therapist" value={value.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
            </div>
            <div>
              <label htmlFor="wp-company" className="text-sm text-gray-700 block mb-1">Company or employer</label>
              <input id="wp-company" className="input" type="text" autoComplete="organization" value={value.company} onChange={(e) => set('company', e.target.value)} />
            </div>
          </div>
        </fieldset>

        <div className="mt-6 space-y-5 max-w-3xl">
          <ChipGroup id="wp-setup" label="Preferred work setup" options={WORK_SETUPS} selected={value.workSetup} onToggle={(v) => toggle('workSetup', v)} />
          <ChipGroup id="wp-at" label="Assistive technology I use" options={ASSISTIVE_TECH} selected={value.assistiveTech} onToggle={(v) => toggle('assistiveTech', v)} />
          <ChipGroup id="wp-acc" label="What I would ask an employer to arrange" options={ACCOMMODATIONS} selected={value.accommodations} onToggle={(v) => toggle('accommodations', v)} />
        </div>

        <ErrorMsg id={ERROR_ID} msg={error} />
        <div className="mt-6">
          <button type="submit" className="btn-primary min-h-11 px-6">Continue</button>
        </div>
      </form>
    </PageCard>
  )
}

const CHIP = 'text-sm px-3 py-1.5 min-h-9 rounded-full border font-medium transition-colors'
const CHIP_ON = 'bg-[#1a4fa0] text-white border-[#1a4fa0]'
const CHIP_OFF = 'bg-white text-gray-700 border-gray-500 hover:border-[#1a4fa0] hover:text-[#1a4fa0]'

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
            <button type="button" key={o} aria-pressed={on} onClick={() => onToggle(o)} className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}>
              {on ? '✓ ' : ''}{o}
            </button>
          )
        })}
      </div>
    </div>
  )
}
