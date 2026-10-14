// Resume vocabulary and helpers shared by the applicant's Profile screen and the
// employer's applicant view, so both describe a candidate the same way.
import type { ApplicantProfile } from '@/types'

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

export const fullName = (p: ApplicantProfile) =>
  [p.firstName, p.middleName, p.lastName, p.suffix].filter(Boolean).join(' ')

/** Optional sections that make a resume useful to an employer, and whether each is filled. */
export function resumeSections(p: ApplicantProfile): { label: string; done: boolean }[] {
  return [
    { label: 'Location', done: !!p.location?.trim() },
    { label: 'About me', done: !!p.about?.trim() },
    { label: 'Education', done: !!p.educationLevel },
    { label: 'Work experience', done: !!p.experience?.some(x => x.title.trim()) },
    { label: 'Assistive technology', done: !!p.assistiveTech?.length },
    { label: 'Work setup', done: !!p.workSetup?.length },
    { label: 'Workplace accommodations', done: !!p.accommodations?.length },
    { label: 'Languages', done: !!p.languages?.length },
  ]
}
