// Resume vocabulary and helpers shared by the applicant's Profile screen and the
// employer's applicant view, so both describe a candidate the same way.
import type { ApplicantProfile } from '@/types'
import type { RequiredField } from '@/lib/validation'
import { phMobile } from '@/lib/phone'
import { t } from '@/lib/i18n'

export const SKILL_CHOICES = ['Typing', 'Screen Reader', 'Active Listening', 'Data Entry', 'Communication', 'Encoding', 'Writing', 'Customer Service', 'Research', 'Transcription']

export const EDUCATION_LEVELS = [
  'Elementary', 'Junior High School', 'Senior High School', 'Vocational / TESDA',
  'College (undergraduate)', 'College graduate', 'Postgraduate',
]

// What the applicant works with; tells an employer which accommodations to plan.
export const ASSISTIVE_TECH = [
  'NVDA', 'JAWS', 'Windows Narrator', 'Screen magnifier', 'Braille display',
  'TalkBack (Android)', 'VoiceOver (iPhone)', 'Large text / high contrast',
]

export const WORK_SETUPS = ['Remote', 'Hybrid', 'On-site']

// Saved in English; screens show t(type)
export const DISABILITY_TYPES = ['Totally Blind', 'Legally Blind', 'Partially Blind']

// What an applicant may ask an employer to arrange. Taken from the Job
// Accommodation Network's guidance for employees who are blind or have low
// vision (askjan.org), in the words an employer would act on.
export const ACCOMMODATIONS = [
  'Screen reader software on the work computer',
  'Screen magnifier or a large monitor',
  'Braille display',
  'Documents and training materials in accessible digital form',
  'A reader or assistant for printed material',
  'Orientation to the workplace and its routes',
  'Flexible hours to fit my commute',
  'Work from home',
  'Extra time to learn the tools used',
  'Adjusted lighting or reduced glare',
]

export const LANGUAGES = ['Filipino', 'English', 'Cebuano', 'Ilocano', 'Hiligaynon', 'Bicolano', 'Waray', 'Kapampangan']

export const MAX_EXPERIENCE = 3

// Years in one job: a whole or half number in this range
export const MAX_YEARS = 60

export const fullName = (p: ApplicantProfile) =>
  [p.firstName, p.middleName, p.lastName, p.suffix].filter(Boolean).join(' ')

/**
 * The fields an applicant must fill in to apply, each with the id of its box on
 * the Profile screen, so a message can name what is missing and take them to it.
 * The Profile screen, the dashboard and applying all use this one list.
 */
export const requiredProfileFields = (p: ApplicantProfile, skills = p.skills || []): RequiredField[] => [
  { id: 'pf-firstName', label: t('First name'), value: p.firstName || '' },
  { id: 'pf-lastName', label: t('Last name'), value: p.lastName || '' },
  // a number saved before only Philippine mobiles were accepted counts as missing
  { id: 'pf-mobile', label: t('Mobile number'), value: phMobile(p.mobile) ?? '' },
  { id: 'pf-disability', label: t('Disability type'), value: p.disabilityType || '' },
  { id: 'pf-skill-0', label: t('Skills (at least one)'), value: skills.filter(Boolean).join('') },
]

/** "Complete your profile to apply: Mobile number missing." */
export const incompleteProfileMessage = (missing: RequiredField[]) =>
  t('Complete your profile to apply: {fields} missing.', { fields: missing.map(f => f.label).join(', ') })

/**
 * Years in a job, as a number in a string ("2", "0.5"). Older resumes saved a
 * span such as "2021–2023" or "2020 - present"; that becomes the years between.
 * Anything else becomes empty, to be filled in again.
 */
export function yearsFromPeriod(period: string | undefined): string {
  const v = (period || '').trim()
  if (!v || /^\d+(\.\d+)?$/.test(v)) return v
  const [from, to] = v.match(/\d{4}/g) ?? []
  if (!from) return ''
  const end = to ? Number(to) : /present|now|current/i.test(v) ? new Date().getFullYear() : Number(from)
  return String(Math.max(0, end - Number(from)))
}

/** "2 years", "1 year", "6 months" for a saved number of years; older free text is shown as it was. */
export function yearsLabel(period: string | undefined): string {
  const v = (period || '').trim()
  if (!/^\d+(\.\d+)?$/.test(v)) return v
  const n = Number(v)
  if (n > 0 && n < 1) return t('{n} months', { n: Math.round(n * 12) })
  return t(n === 1 ? '{n} year' : '{n} years', { n })
}

/** Optional sections that make a resume useful to an employer, and whether each is filled. */
export function resumeSections(p: ApplicantProfile): { label: string; done: boolean }[] {
  return [
    { label: t('Location'), done: !!p.location?.trim() },
    { label: t('About me'), done: !!p.about?.trim() },
    { label: t('Education'), done: !!p.educationLevel },
    { label: t('Work experience'), done: !!p.experience?.some(x => x.title.trim()) },
    { label: t('Assistive technology'), done: !!p.assistiveTech?.length },
    { label: t('Work setup'), done: !!p.workSetup?.length },
    { label: t('Workplace accommodations'), done: !!p.accommodations?.length },
    { label: t('Languages'), done: !!p.languages?.length },
  ]
}
