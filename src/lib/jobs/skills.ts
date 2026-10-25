// Skills an applicant can search for while typing. A starting vocabulary, not a
// limit: anyone may add a skill that is not here. Words for work blind and
// low-vision people do, as named in the kinds of work in work-categories.ts,
// plus general office and digital skills.
import type { Job } from '@/types'
import { SKILL_CHOICES } from '@/lib/resume'
import { jobSkillList } from '@/lib/jobs/matching'
import { jobIsOpen } from '@/lib/jobs/job-post'

export const SKILL_VOCABULARY: string[] = [
  // contact centre and customer service
  'Customer Service', 'Call Handling', 'Telesales', 'Telemarketing', 'Technical Support', 'Chat Support', 'Email Support',
  'Complaint Handling', 'Order Taking', 'Active Listening', 'Communication', 'English Communication', 'Filipino Communication',
  'Cross-selling', 'Upselling',
  // office, data and records
  'Typing', 'Data Entry', 'Encoding', 'Microsoft Word', 'Microsoft Excel', 'Google Docs', 'Google Sheets', 'Spreadsheets',
  'Email Management', 'Calendar Management', 'Filing and Records', 'Bookkeeping', 'Report Writing', 'Proofreading',
  // transcription and content
  'Transcription', 'Medical Transcription', 'Captioning', 'Braille Transcription', 'Writing', 'Content Writing',
  'Copywriting', 'Blogging', 'Editing', 'SEO', 'Social Media Management', 'Translation', 'Research',
  // assistive and digital accessibility
  'Screen Reader', 'NVDA', 'JAWS', 'VoiceOver', 'TalkBack', 'Braille', 'Braille Display', 'Screen Magnifier',
  'Accessibility Testing', 'WCAG', 'Web Accessibility', 'Quality Assurance', 'Software Testing', 'Bug Reporting',
  // technology
  'Computer Literacy', 'Programming', 'Web Development', 'HTML', 'CSS', 'JavaScript', 'Python', 'IT Support',
  // massage and wellness
  'Massage Therapy', 'Hilot', 'Swedish Massage', 'Shiatsu', 'Reflexology', 'Sports Massage', 'Client Consultation',
  // teaching and other
  'Teaching', 'Tutoring', 'Braille Teaching', 'Music', 'Piano', 'Singing', 'Counseling', 'Virtual Assistance',
  'Time Management', 'Teamwork', 'Problem Solving',
]

/** The vocabulary and every skill employers have written in a job post, without repeats. */
export function searchableSkills(jobs: Job[]): string[] {
  const seen = new Map<string, string>()
  for (const s of [...SKILL_VOCABULARY, ...jobs.flatMap(jobSkillList)]) {
    const key = s.trim().toLowerCase()
    if (key && !seen.has(key)) seen.set(key, s.trim())
  }
  return [...seen.values()]
}

// Never put forward as a recommendation, even when job posts ask for them: they
// echo the stereotype that blind people massage or make music for a living.
// They stay in the vocabulary, so anyone can still search for them and add them.
const NOT_RECOMMENDED = /massage|hilot|shiatsu|reflexology|music|piano|singing|guitar|instrument/i

/**
 * Skills worth adding, most asked-for first: the ones that appear most often in
 * open job posts. Changes as employers post; falls back to common skills while
 * there are no posts.
 */
export function recommendedSkills(jobs: Job[], count = 10): string[] {
  const tally = new Map<string, { name: string; n: number }>()
  for (const job of jobs) {
    if (!jobIsOpen(job)) continue
    for (const s of new Set(jobSkillList(job).map(x => x.trim()))) {
      if (NOT_RECOMMENDED.test(s)) continue
      const key = s.toLowerCase()
      const t = tally.get(key) ?? { name: s, n: 0 }
      t.n++
      tally.set(key, t)
    }
  }
  const asked = [...tally.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).map(t => t.name)
  return (asked.length ? asked : SKILL_CHOICES).slice(0, count)
}

/**
 * Skills that match what has been typed, best first: names that start with it
 * ("Excel" for "ex"), then names with a word that starts with it ("Microsoft
 * Excel"), then names that merely contain it ("Reflexology").
 */
export function searchSkills(all: string[], query: string, exclude: string[], limit = 8): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const skip = new Set(exclude.map(s => s.toLowerCase()))
  const starts: string[] = [], word: string[] = [], contains: string[] = []
  for (const s of all) {
    const k = s.toLowerCase()
    if (skip.has(k)) continue
    if (k.startsWith(q)) starts.push(s)
    else if (k.split(/[\s/-]+/).some(w => w.startsWith(q))) word.push(s)
    else if (k.includes(q)) contains.push(s)
  }
  return [...starts, ...word, ...contains].slice(0, limit)
}
