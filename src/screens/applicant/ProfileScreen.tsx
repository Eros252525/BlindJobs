import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { t, useLang } from '@/lib/i18n'
import { mobileDigits, mobileProblem, phMobile } from '@/lib/phone'
import { toast } from '@/lib/toast'
import { gmailAddress, gmailProblem } from '@/lib/gmail'
import { focusFirst, missingFields, missingMessage, NAME_MAX, type RequiredField } from '@/lib/validation'
import { ACCOMMODATIONS, ASSISTIVE_TECH, DISABILITY_TYPES, EDUCATION_LEVELS, LANGUAGES, MAX_EXPERIENCE, MAX_YEARS, requiredProfileFields, WORK_SETUPS, yearsFromPeriod } from '@/lib/resume'
import { ErrorMsg } from '@/components/ui/ErrorMsg'
import { FormField } from '@/components/ui/FormField'
import { PhotoField } from '@/components/ui/PhotoField'
import { SkillPicker } from '@/components/ui/SkillPicker'
import { Spinner } from '@/components/ui/Spinner'
import type { ApplicantProfile, User, WorkExperience } from '@/types'
import { EmailConfirm } from './profile/EmailConfirm'
import { ResumeView } from './profile/ResumeView'

type P = ApplicantProfile
type ListKey = 'assistiveTech' | 'workSetup' | 'languages' | 'accommodations'

const ERROR_ID = 'pf-error'

// The parts of the edit form, in order: [heading id, label]
const FORM_SECTIONS: [string, string][] = [
  ['pf-sec-personal', 'Personal'], ['pf-sec-contact', 'Contact'], ['pf-sec-about', 'About me'], ['pf-sec-skills', 'Skills'],
  ['pf-sec-education', 'Education'], ['pf-sec-experience', 'Experience'], ['pf-sec-tools', 'Tools and preferences'],
]

const GENDERS = ['Male', 'Female', 'Other']

// The same required set as the dashboard banner and applying (lib/resume.ts)
// While editing, a mobile number that is typed but not Philippine is not "missing": the
// check after this one says what is wrong with it.
const requiredFields = (p: P, skills: string[]) =>
  requiredProfileFields(p, skills).map(f => (f.id === 'pf-mobile' ? { ...f, value: p.mobile || '' } : f))

// Experience rows whose Years is not a number in range, as fields to name in the error
const badYears = (exp: WorkExperience[]): RequiredField[] => exp.flatMap((x, i) => {
  const v = x.period.trim()
  return v && !(Number(v) >= 0 && Number(v) <= MAX_YEARS) ? [{ id: `pf-exp-${i}-period`, label: t('Years in work experience {n}', { n: i + 1 }), value: v }] : []
})

/**
 * Accounts made before registration asked for each part of the name kept the
 * whole name in First name ("Juan Santos Dela Cruz", no last name). Offers the
 * last word as the last name, for the applicant to check, correct and save.
 */
function splitOldName(p: P): P | null {
  const words = (p.firstName || '').trim().split(/\s+/)
  if (p.lastName?.trim() || words.length < 2) return null
  return { ...p, firstName: words.slice(0, -1).join(' '), lastName: words[words.length - 1] }
}

// A saved resume is shown as a resume, not as a form: read-only, with one clear
// way back into editing. A profile missing required details opens straight in edit.
// `focusField` is the id of a box to open on, e.g. from "Mobile number missing" on the dashboard.
export function ProfileScreen({ user, focusField, onNameChange }: {
  user: User; focusField?: string | null
  /** The name was saved: the greeting and account menu show the new one at once. */
  onNameChange?: (name: string) => void
}) {
  useLang()
  const [profile, setProfile] = useState<P | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [mode, setMode] = useState<'view' | 'edit'>('edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  // Said once when an older account's name was split for checking (see splitOldName)
  const [splitLastName, setSplitLastName] = useState('')
  // The work experience whose Remove was pressed, waiting for "Yes, remove"
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)
  // A Gmail just saved: its confirmation code goes out straight away
  const [sendCodeNow, setSendCodeNow] = useState(false)
  // last saved version, so Cancel can discard unsaved edits
  const saved = useRef<{ profile: P; skills: string[] }>({ profile: {}, skills: [] })
  // element to focus after the next render (mode switch, added/removed experience)
  const pendingFocus = useRef<string | null>(null)

  useEffect(() => {
    api.getProfile(user.id).then((p: P) => {
      // older profiles kept three slots, some of them blank
      const s = (p.skills || []).filter(Boolean)
      saved.current = { profile: p, skills: s }
      // older resumes saved Years as a span ("2021–2023"); the box now takes a number
      const exp = p.experience?.map(x => ({ ...x, period: yearsFromPeriod(x.period) }))
      const split = splitOldName(p)
      const shown = { ...(split ?? p), ...(exp && { experience: exp }) }
      setProfile(shown)
      setSkills(s)
      if (split) setSplitLastName(split.lastName || '')
      const edit = !!split || !!focusField || missingFields(requiredFields(shown, s)).length > 0
      if (edit) pendingFocus.current = focusField || (split ? 'pf-firstName' : null)
      setMode(edit ? 'edit' : 'view')
    }).catch(() => setProfile({}))
  }, [user.id, focusField])

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

  // Applicants who registered with a username may add an email; older accounts sign in with theirs
  const signsInWithEmail = !!profile && !profile.username && !!profile.email

  const fail = (id: string, message: string) => {
    setInvalid(new Set([id])); setError(message)
    document.getElementById(id)?.focus()
  }

  const handleSave = async () => {
    if (!profile) return
    const missing = missingFields(requiredFields(profile, skills))
    const years = badYears(profile.experience ?? [])
    setInvalid(new Set([...missing, ...years].map(f => f.id)))
    if (missing.length) { setError(missingMessage(missing)); focusFirst(missing); return }
    const badMobile = mobileProblem(profile.mobile)
    if (badMobile) { fail('pf-mobile', badMobile); return }
    // only Gmail: the email service proves an address with a code, and it sends to Gmail only
    const badEmail = signsInWithEmail || !profile.email?.trim() ? null : gmailProblem(profile.email)
    if (badEmail) { fail('pf-email', badEmail); return }
    if (years.length) {
      setError(t('{fields}: type a number of years from 0 to {max}, such as 2 or 0.5.', { fields: years.map(f => f.label).join(', '), max: MAX_YEARS }))
      focusFirst(years)
      return
    }
    setError(''); setSaving(true)
    try {
      // drop experience rows left completely blank
      const experience = (profile.experience ?? []).filter(x => x.title.trim() || x.company.trim() || x.period.trim())
      // saved as the 10 digits after +63, however it was typed
      const email = signsInWithEmail ? profile.email! : profile.email?.trim() ? gmailAddress(profile.email) : ''
      // a new or changed address must be confirmed again before codes go to it
      const emailVerified = !!email && (signsInWithEmail || (email === saved.current.profile.email && !!saved.current.profile.emailVerified))
      const next = { ...profile, mobile: phMobile(profile.mobile) ?? '', email, emailVerified, experience, skills, updatedAt: new Date().toISOString() }
      await api.updateProfile(user.id, next)
      saved.current = { profile: next, skills }
      setProfile(next)
      setSplitLastName('')
      onNameChange?.(`${next.firstName || ''} ${next.lastName || ''}`.trim())
      toast(t('Resume saved.'), 'success')
      setSendCodeNow(!!email && !emailVerified)
      switchTo('view')
    } catch (e: any) { toast(t("Couldn't save your resume: {reason}", { reason: e.message }), 'error') }
    finally { setSaving(false) }
  }

  const handleCancel = () => {
    setProfile(saved.current.profile)
    setSkills(saved.current.skills)
    setError(''); setInvalid(new Set()); setConfirmRemove(null)
    if (!missingFields(requiredFields(saved.current.profile, saved.current.skills)).length) switchTo('view')
  }

  if (!profile) return <div className="flex-1 flex items-center justify-center text-white" role="status">{t('Loading…')}</div>

  if (mode === 'view') {
    // An added Gmail waits here until it is confirmed with the emailed code
    const confirmEmail = !signsInWithEmail && !!profile.email && !profile.emailVerified
    const confirmed = () => {
      const next = { ...profile, emailVerified: true }
      saved.current = { ...saved.current, profile: next }
      setProfile(next); setSendCodeNow(false)
    }
    return <ResumeView profile={profile} skills={skills.filter(Boolean)} onEdit={() => switchTo('edit')}
      top={confirmEmail ? <EmailConfirm key={profile.email} userId={user.id} email={profile.email!} sendNow={sendCodeNow} onConfirmed={confirmed} /> : undefined} />
  }

  const set = <K extends keyof P>(k: K, v: P[K]) => setProfile(p => ({ ...p, [k]: v }))
  const toggleIn = (k: ListKey, v: string) => setProfile(p => {
    const cur = p?.[k] ?? []
    return { ...p, [k]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }
  })
  const exp = profile.experience ?? []
  const setExp = (i: number, k: keyof WorkExperience, v: string) => set('experience', exp.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const addExp = () => { pendingFocus.current = `pf-exp-${exp.length}-title`; set('experience', [...exp, { title: '', company: '', period: '' }]) }
  const removeExp = (i: number) => { pendingFocus.current = 'pf-exp-add'; setConfirmRemove(null); set('experience', exp.filter((_, j) => j !== i)) }

  const errorFor = (id: string) => ({ 'aria-invalid': invalid.has(id), 'aria-describedby': invalid.has(id) ? ERROR_ID : undefined })
  const describe = (id: string, ...help: string[]) => [...help, invalid.has(id) ? ERROR_ID : ''].filter(Boolean).join(' ') || undefined
  const dirty = JSON.stringify({ profile, skills }) !== JSON.stringify(saved.current)
  const hasSavedResume = !missingFields(requiredFields(saved.current.profile, saved.current.skills)).length

  return (
    <div className="flex-1 p-4 sm:p-6 pb-24 sm:pb-24">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full p-6 sm:p-8">
        <div className="mb-6 pb-6 border-b border-gray-200 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1 basis-96">
          <h1 className="text-2xl font-bold text-[#1a4fa0]">{hasSavedResume ? t('Edit your resume') : t('Build your resume')}</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-3xl">
            {t('Fields marked required are needed to apply. Everything else is optional, but a fuller resume helps employers understand your skills.')}
          </p>
          {/* A long form: links to each part, so nobody has to walk through all of it to reach the last */}
          <nav aria-label={t('Sections of this form')} className="mt-4">
            <ul className="flex flex-wrap gap-2">
              {FORM_SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="inline-flex items-center min-h-9 px-3 rounded-full border border-gray-500 bg-white text-sm font-medium text-gray-700 hover:border-[#1a4fa0] hover:text-[#1a4fa0]">{t(label)}</a>
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

        <EditSection id="pf-sec-personal" title={t('Personal information')} hint={t('Names can be up to {n} characters each.', { n: NAME_MAX })}>
          {splitLastName && (
            <p role="status" className="mb-4 rounded-lg border-2 border-[#a16207] bg-yellow-50 p-3 text-sm text-gray-900">
              {t('Your whole name was saved as your first name. We have put "{last}" as your last name. Check your first, middle and last name, then choose Save resume.', { last: splitLastName })}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <FormField id="pf-firstName" label={t('First name')} required>
              <input id="pf-firstName" className="input" autoComplete="given-name" required maxLength={NAME_MAX} value={profile.firstName || ''} onChange={(e) => set('firstName', e.target.value)} {...errorFor('pf-firstName')} />
            </FormField>
            <FormField id="pf-middleName" label={t('Middle name')}>
              <input id="pf-middleName" className="input" autoComplete="additional-name" maxLength={NAME_MAX} value={profile.middleName || ''} onChange={(e) => set('middleName', e.target.value)} />
            </FormField>
            <FormField id="pf-lastName" label={t('Last name')} required>
              <input id="pf-lastName" className="input" autoComplete="family-name" required maxLength={NAME_MAX} value={profile.lastName || ''} onChange={(e) => set('lastName', e.target.value)} {...errorFor('pf-lastName')} />
            </FormField>
            <FormField id="pf-suffix" label={t('Suffix')}>
              <input id="pf-suffix" className="input" autoComplete="honorific-suffix" maxLength={10} placeholder={t('e.g., Jr.')} value={profile.suffix || ''} onChange={(e) => set('suffix', e.target.value)} />
            </FormField>
            <FormField id="pf-gender" label={t('Gender')}>
              <select id="pf-gender" className="input" autoComplete="sex" value={profile.gender || ''} onChange={(e) => set('gender', e.target.value)}>
                <option value="">{t('Select gender')}</option>
                {GENDERS.map(g => <option key={g} value={g}>{t(g)}</option>)}
              </select>
            </FormField>
            <FormField id="pf-disability" label={t('Disability type')} required>
              <select id="pf-disability" className="input" required value={profile.disabilityType || ''} onChange={(e) => set('disabilityType', e.target.value)} {...errorFor('pf-disability')}>
                <option value="">{t('Select disability type')}</option>
                {DISABILITY_TYPES.map(d => <option key={d} value={d}>{t(d)}</option>)}
              </select>
            </FormField>
          </div>
        </EditSection>

        <EditSection id="pf-sec-contact" title={t('Contact and location')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              {/* Set at registration and used to sign in, so it can't be edited here */}
              <label htmlFor="pf-signin" className="field-label">{signsInWithEmail ? t('Email address') : t('Username')} <span className="font-normal text-gray-600">({t("used to sign in, can't be changed")})</span></label>
              <input id="pf-signin" className="input bg-gray-50" value={profile.username || profile.email || ''} readOnly />
            </div>
            <FormField id="pf-mobile" label={t('Mobile number')} required>
              <div className="flex">
                <span id="pf-mobile-prefix" className="flex items-center px-2 border border-r-0 border-gray-500 rounded-l-md bg-gray-50 text-gray-600 text-sm">+63</span>
                {/* Digits only, at most the 10 after +63: letters and extra digits never get in.
                    A pasted 0917… or +63 917… keeps just those 10. */}
                <input id="pf-mobile" className="input rounded-l-none flex-1 min-w-0" type="tel" inputMode="numeric" autoComplete="tel-national" required
                  placeholder={t('e.g., 9171234567')}
                  value={profile.mobile || ''} onChange={(e) => set('mobile', mobileDigits(e.target.value))}
                  aria-invalid={invalid.has('pf-mobile')} aria-describedby={describe('pf-mobile', 'pf-mobile-prefix', 'pf-mobile-help')} />
              </div>
              <p id="pf-mobile-help" className="mt-1 text-sm text-gray-600">{t('Philippine mobile only: 10 digits, starting with 9. A forgotten password is reset with a code texted here.')}</p>
            </FormField>
            {!signsInWithEmail && (
              <FormField id="pf-email" label={t('Gmail address')}>
                <input id="pf-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                  placeholder={t('e.g., juan.cruz@gmail.com')} value={profile.email || ''} onChange={(e) => set('email', e.target.value)}
                  aria-invalid={invalid.has('pf-email')} aria-describedby={describe('pf-email', 'pf-email-help')} />
                <p id="pf-email-help" className="mt-1 text-sm text-gray-600">
                  {t('Only if you have one. After you save, we email a code to confirm it; then it can be used to reset a forgotten password. You still sign in with your username, and employers do not see it.')}
                  {profile.email && profile.email === saved.current.profile.email && (
                    <strong className="block mt-1">{saved.current.profile.emailVerified ? `✓ ${t('Confirmed')}` : t('Not confirmed yet')}</strong>
                  )}
                </p>
              </FormField>
            )}
            <FormField id="pf-location" label={t('City or province')}>
              <input id="pf-location" className="input" autoComplete="address-level2" placeholder={t('e.g., Quezon City, Metro Manila')}
                value={profile.location || ''} onChange={(e) => set('location', e.target.value)} />
            </FormField>
          </div>
        </EditSection>

        <EditSection id="pf-sec-about" title={t('About me')}>
          <FormField id="pf-about" label={t('Short introduction')}>
            <p id="pf-about-hint" className="text-sm text-gray-600 mb-2">{t('Two or three sentences: the work you are looking for and what you are good at.')}</p>
            <textarea id="pf-about" className="input min-h-28 resize-y" maxLength={500} aria-describedby="pf-about-hint pf-about-count"
              value={profile.about || ''} onChange={(e) => set('about', e.target.value)} />
            <p id="pf-about-count" className="mt-1 text-sm text-gray-600 text-right">{t('{n} of 500 characters', { n: (profile.about || '').length })}</p>
          </FormField>
        </EditSection>

        <EditSection id="pf-sec-skills" title={t('Skills')}>
          {/* the same picker as registration: common skills to tap, or any skill typed in */}
          <SkillPicker inputId="pf-skill-0" value={skills} invalid={invalid.has('pf-skill-0')} errorId={ERROR_ID}
            onChange={setSkills} />
        </EditSection>

        <EditSection id="pf-sec-education" title={t('Education and training')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <FormField id="pf-education" label={t('Highest education')}>
              <select id="pf-education" className="input" value={profile.educationLevel || ''} onChange={(e) => set('educationLevel', e.target.value)}>
                <option value="">{t('Select level')}</option>
                {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{t(l)}</option>)}
              </select>
            </FormField>
            <FormField id="pf-school" label={t('School and course')}>
              <input id="pf-school" className="input" placeholder={t('e.g., PUP, BS Information Technology')}
                value={profile.school || ''} onChange={(e) => set('school', e.target.value)} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="pf-trainings" label={t('Trainings and certifications')}>
                <p id="pf-trainings-hint" className="text-sm text-gray-600 mb-2">{t('One per line, e.g. TESDA Contact Center Services NC II.')}</p>
                <textarea id="pf-trainings" className="input min-h-24 resize-y" aria-describedby="pf-trainings-hint"
                  value={profile.trainings || ''} onChange={(e) => set('trainings', e.target.value)} />
              </FormField>
            </div>
          </div>
        </EditSection>

        <EditSection id="pf-sec-experience" title={t('Work experience')} hint={t('Optional. No work experience yet is fine; leave this empty.')}>
          <div className="space-y-4">
            {exp.map((x, i) => (
              <fieldset key={i} className="rounded-lg border border-gray-300 p-4">
                <legend className="px-1 text-sm font-semibold text-gray-800">{t('Work experience {n}', { n: i + 1 })}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <div>
                    <label htmlFor={`pf-exp-${i}-title`} className="field-label">{t('Job title')}</label>
                    <input id={`pf-exp-${i}-title`} className="input" value={x.title} onChange={(e) => setExp(i, 'title', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor={`pf-exp-${i}-company`} className="field-label">{t('Company or employer')}</label>
                    <input id={`pf-exp-${i}-company`} className="input" value={x.company} onChange={(e) => setExp(i, 'company', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor={`pf-exp-${i}-period`} className="field-label">{t('Years in this job')}</label>
                    <input id={`pf-exp-${i}-period`} className="input" type="number" inputMode="decimal" min={0} max={MAX_YEARS} step={0.5}
                      placeholder={t('e.g., 2')} value={x.period} onChange={(e) => setExp(i, 'period', e.target.value)}
                      aria-invalid={invalid.has(`pf-exp-${i}-period`)} aria-describedby={describe(`pf-exp-${i}-period`, `pf-exp-${i}-period-help`)} />
                    <p id={`pf-exp-${i}-period-help`} className="mt-1 text-sm text-gray-600">{t('A number; 0.5 is six months.')}</p>
                  </div>
                </div>
                {confirmRemove === i ? (
                  <div role="alert" className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{t('Remove work experience {n}?', { n: i + 1 })}</span>
                    <button type="button" onClick={() => removeExp(i)} className="min-h-11 px-4 rounded-md bg-red-700 hover:bg-red-800 text-white text-sm font-semibold">{t('Yes, remove')}</button>
                    <button type="button" onClick={() => setConfirmRemove(null)} className="min-h-11 px-4 rounded-md border border-gray-500 text-sm font-semibold text-gray-800 hover:bg-gray-50">{t('No, keep it')}</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmRemove(i)}
                    aria-label={x.title ? t('Remove work experience {n}: {title}', { n: i + 1, title: x.title }) : t('Remove work experience {n}', { n: i + 1 })}
                    className="mt-3 min-h-11 px-4 rounded-md border border-gray-500 text-sm font-semibold text-red-700 hover:bg-red-50">
                    {t('Remove')}
                  </button>
                )}
              </fieldset>
            ))}
            {exp.length < MAX_EXPERIENCE ? (
              <button id="pf-exp-add" type="button" onClick={addExp}
                className="min-h-11 px-4 rounded-md border-2 border-dashed border-[#1a4fa0] text-[#1a4fa0] font-semibold text-sm hover:bg-blue-50">
                <span aria-hidden="true">+ </span>{t('Add work experience')}
              </button>
            ) : (
              <p className="text-sm text-gray-600">{t('You can add up to {n} jobs. Remove one to add another.', { n: MAX_EXPERIENCE })}</p>
            )}
          </div>
        </EditSection>

        <EditSection id="pf-sec-tools" title={t('Tools and preferences')}>
          <div className="space-y-5">
            <ChipGroup id="pf-at" label={t('Assistive technology I use')} options={ASSISTIVE_TECH}
              selected={profile.assistiveTech ?? []} onToggle={(v) => toggleIn('assistiveTech', v)} />
            <ChipGroup id="pf-setup" label={t('Preferred work setup')} options={WORK_SETUPS}
              selected={profile.workSetup ?? []} onToggle={(v) => toggleIn('workSetup', v)} />
            <ChipGroup id="pf-acc" label={t('What I would ask an employer to arrange')} options={ACCOMMODATIONS}
              selected={profile.accommodations ?? []} onToggle={(v) => toggleIn('accommodations', v)} />
            <ChipGroup id="pf-lang" label={t('Languages I speak')} options={LANGUAGES}
              selected={profile.languages ?? []} onToggle={(v) => toggleIn('languages', v)} />
          </div>
        </EditSection>

        <div className="mt-6"><ErrorMsg id={ERROR_ID} msg={error} /></div>
        <div className="flex flex-wrap items-center gap-3 pt-2 mt-4">
          <button type="button" onClick={handleSave} disabled={saving} aria-busy={saving}
            className="min-h-11 bg-[#1a7a3c] hover:bg-[#155f30] text-white font-semibold rounded-md px-6 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-70">
            {saving ? <Spinner label={t('Saving')} /> : t('Save resume')}
          </button>
          <button type="button" onClick={handleCancel} disabled={saving}
            className="min-h-11 border border-gray-500 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-md px-5 py-2.5 text-sm transition-colors">
            {hasSavedResume ? t('Cancel') : t('Clear changes')}
          </button>
          {/* always mounted so the screen reader hears "Unsaved changes" when it appears (WCAG 4.1.3) */}
          <span role="status" className="flex items-center gap-2 text-sm font-medium text-[#713f12]">
            {dirty && <><span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-[#a16207]" />{t('Unsaved changes')}</>}
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

// Options are saved in English and shown in the chosen language
function ChipGroup({ id, label, options, selected, onToggle }: {
  id: string; label: string; options: string[]; selected: string[]; onToggle: (v: string) => void
}) {
  return (
    <div>
      <p id={id} className="field-label">{label} <span className="font-normal text-gray-600">({t('optional, choose any')})</span></p>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map(o => {
          const on = selected.includes(o)
          return (
            <button type="button" key={o} aria-pressed={on} onClick={() => onToggle(o)}
              className={`text-sm px-3 py-1.5 min-h-11 rounded-full border font-medium transition-colors ${on ? 'bg-[#1a4fa0] text-white border-[#1a4fa0]' : 'bg-white text-gray-700 border-gray-500 hover:border-[#1a4fa0] hover:text-[#1a4fa0]'}`}>
              {on ? '✓ ' : ''}{t(o)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
