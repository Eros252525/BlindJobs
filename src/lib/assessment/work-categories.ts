// The kinds of work Blind Jobs suggests and tests for. Each one is here because
// blind and low-vision people are documented doing it for a living, most of them
// in the Philippines. `evidence` says where that comes from, so nobody has to
// take the list on trust.
//
// Suggestions only ever add: every category stays open to every applicant.
import type { ApplicantProfile } from '@/types'

export type WorkCategoryId =
  | 'contact-centre' | 'massage' | 'transcription' | 'office-admin' | 'virtual-assistance' | 'accessibility-testing'

export interface WorkCategory {
  id: WorkCategoryId
  name: string
  summary: string
  /** Why this category is offered to visually impaired applicants, with the source. */
  evidence: string
  /** Lower-case words that, found in a profile, point to this category. */
  keywords: string[]
  /** Assistive technology (as named in resume.ts) that this work usually relies on. */
  assistiveTech: string[]
  /** Work setups (as named in resume.ts) this work is usually offered in. */
  setups: string[]
}

const SCREEN_READERS = ['NVDA', 'JAWS', 'Windows Narrator']

export const WORK_CATEGORIES: WorkCategory[] = [
  {
    id: 'contact-centre',
    name: 'Customer service and contact centre',
    summary: 'Answering or making calls for a company: helping customers, taking orders, handling complaints, telesales.',
    evidence: 'ATRIEV, the Philippine computer school for the blind, trains scholars for contact centre work with Sitel, and its graduates work as contact centre and telesales agents. TESDA sets the national standard in Contact Center Services NC II.',
    keywords: ['customer service', 'call center', 'call centre', 'contact center', 'contact centre', 'bpo', 'telesales', 'telemarketing', 'communication', 'active listening', 'agent', 'csr', 'help desk'],
    assistiveTech: [...SCREEN_READERS, 'Braille display'],
    setups: ['On-site', 'Hybrid', 'Remote'],
  },
  {
    id: 'massage',
    name: 'Massage therapy and wellness',
    summary: 'Therapeutic massage in a clinic, spa, home service or your own practice.',
    evidence: 'Massage is the most commonly reported occupation of blind Filipinos. TESDA\'s Massage Therapy NC II regulations (amended 2017) provide for therapists with visual impairment, and residents of the DSWD National Vocational Rehabilitation Center have passed the Department of Health licensure examination.',
    keywords: ['massage', 'masseur', 'masseuse', 'therapist', 'hilot', 'shiatsu', 'reflexology', 'swedish', 'spa', 'wellness'],
    assistiveTech: [],
    setups: ['On-site'],
  },
  {
    id: 'transcription',
    name: 'Transcription and captioning',
    summary: 'Listening to recordings and typing what is said: meetings, interviews, voicemail, captions.',
    evidence: 'ATRIEV places its graduates in voicemail transcription with a local transcription company, and lists transcriptionists among the jobs its graduates hold. The work depends on listening and typing, not sight.',
    keywords: ['transcription', 'transcriptionist', 'transcribe', 'typing', 'encoding', 'captioning', 'captions', 'subtitles', 'active listening'],
    assistiveTech: [...SCREEN_READERS, 'Braille display'],
    setups: ['Remote', 'Hybrid'],
  },
  {
    id: 'office-admin',
    name: 'Data entry and office administration',
    summary: 'Encoding records, keeping spreadsheets and files in order, handling email and office paperwork.',
    evidence: 'In RNIB\'s employment research, one in four jobs gained by blind and partially sighted people it supported were administrative and secretarial. A screen reader or magnifier makes ordinary office software usable.',
    keywords: ['data entry', 'encoding', 'encoder', 'typing', 'clerk', 'administrative', 'admin', 'secretary', 'office', 'records', 'excel', 'spreadsheet', 'filing'],
    assistiveTech: [...SCREEN_READERS, 'Screen magnifier', 'Large text / high contrast'],
    setups: ['On-site', 'Hybrid', 'Remote'],
  },
  {
    id: 'virtual-assistance',
    name: 'Virtual assistance and online content',
    summary: 'Working online for clients: managing email and calendars, research, writing articles and social media posts.',
    evidence: 'ATRIEV graduates work as virtual assistants, online content writers and search engine optimisation managers, and Virtualahan trains Filipinos with disabilities, including visual impairment, for online freelance work.',
    keywords: ['virtual assistant', 'freelance', 'freelancer', 'writing', 'writer', 'content', 'research', 'seo', 'social media', 'blog', 'copywriting', 'editing', 'online'],
    assistiveTech: [...SCREEN_READERS, 'Screen magnifier'],
    setups: ['Remote'],
  },
  {
    id: 'accessibility-testing',
    name: 'Digital accessibility testing',
    summary: 'Checking websites, apps and documents with a screen reader, and reporting what does not work.',
    evidence: 'Daily screen reader use is the core skill of this job. The Carroll Center for the Blind runs a Screen Reader User Tester programme that prepares blind adults for paid testing work against the WCAG standard.',
    keywords: ['screen reader', 'accessibility', 'wcag', 'tester', 'testing', 'quality assurance', 'qa', 'nvda', 'jaws', 'web', 'software'],
    assistiveTech: [...SCREEN_READERS, 'TalkBack (Android)', 'VoiceOver (iPhone)', 'Braille display'],
    setups: ['Remote', 'Hybrid'],
  },
]

export const categoryById = (id?: string | null) => WORK_CATEGORIES.find(c => c.id === id)

// ── Suggestions ───────────────────────────────────────────────────────────────

export interface CategorySuggestion { category: WorkCategory; points: number; reasons: string[] }

const has = (haystack: string, word: string) => haystack.includes(word)

/**
 * Categories ordered by how much of the applicant's own profile points to them,
 * each with the reasons in words. Skills count most, then past jobs and
 * training, then the assistive technology and work setup they already have.
 */
export function suggestCategories(p: ApplicantProfile): CategorySuggestion[] {
  const skills = (p.skills || []).map(s => (s || '').trim()).filter(Boolean)
  const jobs = (p.experience || []).map(x => x.title?.trim()).filter(Boolean) as string[]
  const training = [p.trainings, p.about].filter(Boolean).join(' ').toLowerCase()

  return WORK_CATEGORIES.map(category => {
    const reasons: string[] = []
    let points = 0

    // a skill may be typed shorter than the keyword ("Encode" for "encoding"), but not so short it matches anything
    const skillHits = skills.filter(s => category.keywords.some(k => has(s.toLowerCase(), k) || (s.length >= 4 && has(k, s.toLowerCase()))))
    if (skillHits.length) { points += skillHits.length * 3; reasons.push(`Your skills: ${skillHits.join(', ')}`) }

    const jobHits = jobs.filter(t => category.keywords.some(k => has(t.toLowerCase(), k)))
    if (jobHits.length) { points += jobHits.length * 3; reasons.push(`Your work experience: ${jobHits.join(', ')}`) }

    const trainingHits = category.keywords.filter(k => has(training, k))
    if (trainingHits.length) { points += 2; reasons.push(`Your training or "About me" mentions ${trainingHits.slice(0, 3).join(', ')}`) }

    const techHits = (p.assistiveTech || []).filter(t => category.assistiveTech.includes(t))
    if (techHits.length) { points += 1; reasons.push(`You already use ${techHits.join(', ')}`) }

    const setupHits = (p.workSetup || []).filter(s => category.setups.includes(s))
    if (setupHits.length && points > 0) { points += 1; reasons.push(`It is usually offered ${setupHits.join(' or ').toLowerCase()}, which you prefer`) }

    return { category, points, reasons }
  }).sort((a, b) => b.points - a.points)
}
