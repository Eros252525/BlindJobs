// Natural-language job search. What an applicant types, in English, Filipino or
// a mix ("remote call center job sa QC", "masahe, totally blind, 18k pataas"),
// becomes filters plus keywords; the keywords rank jobs by BM25. Every step is a
// plain rule, so each result can be explained, and nothing leaves the device.
//
//   1. Normalise   lower case, accents and punctuation removed, "centre" → "center"
//   2. Entities    minimum salary, visual category, work setup, experience level and
//                  place are found and removed from the text; they become filters
//   3. Phrases     multi-word terms ("call center", "data entry") are found next
//   4. Tokens      the rest is split into words; filler words in English and Filipino
//                  are dropped, Filipino and informal words are mapped to the words
//                  employers use, and a light stemmer strips -s, -ing and -er
//   5. Ranking     BM25 over each job's title (x3), skills (x2), kind of work (x2),
//                  company and description, blended with the job-fit score
import { categoryById } from '@/lib/assessment/work-categories'
import type { JobFit } from '@/lib/jobs/job-fit'
import { sameArea } from '@/lib/jobs/matching'
import type { Job } from '@/types'

export type Setup = 'Remote' | 'On-site' | 'Hybrid'

export interface SearchFilters {
  setup?: Setup
  visualCategory?: string
  /** A city or province, matched the way job-fit.ts matches locations. */
  place?: string
  entryLevel?: boolean
  /** Pesos a month; a job matches when the top of its salary range reaches it. */
  minSalary?: number
}

export interface ParsedQuery {
  /** The words recognised as what the applicant is looking for, as they would read them. */
  keywords: string[]
  /** Those words expanded with synonyms and stemmed: what BM25 scores. */
  terms: string[]
  filters: SearchFilters
}

export interface SearchHit { job: Job; fit: JobFit; relevance: number; matched: string[] }

// Share of the order that comes from the search words; the rest is the job-fit score.
const RELEVANCE_WEIGHT = 0.6
// BM25's usual constants: k1 limits how much repeating a word helps, b how much long jobs are discounted.
const K1 = 1.2
const B = 0.75
const FIELD_WEIGHTS = { title: 3, skills: 2, category: 2, company: 1, description: 1 }

// ── 1. Normalise ──────────────────────────────────────────────────────────────

const normalise = (s: string) => ` ${s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/centre/g, 'center').replace(/[^a-z0-9₱,.\s]/g, ' ').replace(/\s+/g, ' ').trim()} `

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Removes the first of `phrases` found as whole words; returns it, or undefined. */
function take(state: { text: string }, phrases: string[]): string | undefined {
  for (const p of [...phrases].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(?<![a-z0-9])${escape(p)}(?![a-z0-9])`)
    if (re.test(state.text)) { state.text = state.text.replace(re, ' '); return p }
  }
  return undefined
}

// ── 2. Entities ───────────────────────────────────────────────────────────────

const SETUPS: Record<Setup, string[]> = {
  Remote: ['remote', 'work from home', 'from home', 'wfh', 'home based', 'homebased', 'sa bahay', 'bahay lang', 'online'],
  'On-site': ['on site', 'onsite', 'in person', 'in office', 'sa opisina', 'face to face', 'f2f'],
  Hybrid: ['hybrid'],
}

// Plain "blind" or "bulag" names no category: every job here is for visually impaired applicants.
const VISUAL_CATEGORIES: Record<string, string[]> = {
  'Totally Blind': ['totally blind', 'total blind', 'fully blind', 'completely blind', 'totally'],
  'Legally Blind': ['legally blind', 'legally'],
  'Partially Blind': ['partially blind', 'partially sighted', 'low vision', 'partial', 'partially', 'malabo ang mata'],
}

const ENTRY_LEVEL = ['entry level', 'no experience', 'walang experience', 'fresh graduate', 'fresh grad', 'beginner', 'baguhan']

// Common short forms; every other place is learned from the jobs' own locations.
const PLACE_ALIASES: Record<string, string> = { qc: 'quezon city', 'q.c.': 'quezon city', ncr: 'metro manila', 'metro': 'metro manila' }

/** "20k", "20,000", "₱18000", "20 libo": the largest amount of at least 1,000 pesos. */
function takeSalary(state: { text: string }): number | undefined {
  let best: number | undefined
  state.text = state.text.replace(/(?:₱|php\s*)?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|libo|thousand)?(?![a-z0-9])/g, (all, num: string, unit?: string) => {
    const value = parseFloat(num.replace(/,/g, '')) * (unit ? 1000 : 1)
    if (value < 1000) return all
    best = Math.max(best ?? 0, value)
    return ' '
  })
  return best
}

/** The top of a salary range such as "18,000–22,000 plus incentives". */
function salaryTop(salary: string | undefined): number {
  const nums = (salary || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || []
  return Math.max(0, ...nums.map(Number))
}

// "Makati City" is also said as just "Makati"
const placesOf = (location: string | undefined) =>
  (location || '').toLowerCase().split(/[,/]/).map(p => p.trim()).filter(p => p.length > 2 && !/remote|home/.test(p))
    .flatMap(p => p.endsWith(' city') ? [p, p.slice(0, -5)] : [p])

// ── 3–4. Phrases, filler words, synonyms, stemming ──────────────────────────────

// Each group: what an applicant may say → the words employers use in job posts.
const SYNONYM_GROUPS: { say: string[]; means: string[] }[] = [
  { say: ['call center', 'contact center', 'customer service', 'customer care', 'bpo', 'csr', 'tawag', 'tumawag'], means: ['call', 'customer', 'service', 'support', 'agent', 'contact', 'center'] },
  { say: ['it support', 'it helpdesk', 'tech support', 'technical support', 'help desk', 'helpdesk'], means: ['helpdesk', 'technical', 'support'] },
  { say: ['massage', 'masahe', 'masahista', 'hilot', 'masseur', 'masseuse', 'spa', 'therapist'], means: ['massage', 'therapist', 'spa'] },
  { say: ['music', 'musika', 'musiko', 'musician', 'kanta', 'kumanta', 'singer', 'singing', 'piano', 'pianista', 'band'], means: ['music', 'musician', 'singing'] },
  { say: ['teacher', 'teaching', 'tutor', 'guro', 'titser', 'magturo', 'instructor'], means: ['instructor', 'teaching'] },
  { say: ['programmer', 'programming', 'coder', 'coding', 'developer', 'web developer', 'software'], means: ['developer', 'programming', 'software', 'web'] },
  { say: ['data entry', 'encoder', 'encoding', 'encode', 'typist', 'typing'], means: ['data', 'entry', 'encoder'] },
  { say: ['writer', 'writing', 'content writer', 'blogger', 'manunulat', 'magsulat', 'sulat'], means: ['writer', 'writing', 'content'] },
  { say: ['sales', 'selling', 'telesales', 'benta', 'magbenta', 'ahente'], means: ['sales', 'telesales'] },
  { say: ['admin', 'administrative', 'secretary', 'sekretarya', 'clerk', 'office work', 'office'], means: ['administrative', 'assistant', 'office', 'records'] },
  { say: ['qa', 'quality assurance', 'tester', 'testing'], means: ['quality', 'assurance', 'tester', 'testing'] },
  { say: ['healthcare', 'health', 'hospital', 'medical', 'clinic'], means: ['healthcare', 'health'] },
]

// Words that say nothing about which job: English and Filipino filler, and words every job shares.
const STOP_WORDS = new Set(`
  a an the and or of to in on at for with without from by near around into is are am be been i im me my we our us you your
  it its this that these those there here which who what where when how any some all can could would should will please
  like want need looking look find search show give get have has
  job jobs work works working trabaho hanapbuhay hiring vacancy vacancies position positions role roles opening openings available
  ako ko ng sa na ang mga para may meron pwede puwede po yung yun lang naman din rin kahit si ni sana gusto hanap hanapin
  naghahanap kailangan anong ano saan nasa malapit taga dito doon at o
  blind bulag visually impaired impairment pwd pwds person persons people
  php pesos peso salary sahod sweldo pataas least minimum min above over more than per month buwan monthly
`.trim().split(/\s+/))

/** Light suffix stripping, the same for queries and jobs, so "teaching" and "teacher" both become "teach". */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 6 && w.endsWith('er')) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

// A bare number left over (not a salary) says nothing about the job
const words = (text: string) => text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
const tokens = (text: string) => words(normalise(text)).map(stem)

// ── Parse ─────────────────────────────────────────────────────────────────────

export function parseQuery(query: string, knownPlaces: string[] = []): ParsedQuery {
  const state = { text: normalise(query) }
  const filters: SearchFilters = {}

  filters.minSalary = takeSalary(state)
  for (const [cat, phrases] of Object.entries(VISUAL_CATEGORIES)) if (take(state, phrases)) { filters.visualCategory = cat; break }
  for (const [setup, phrases] of Object.entries(SETUPS) as [Setup, string[]][]) if (take(state, phrases)) { filters.setup = setup; break }
  if (take(state, ENTRY_LEVEL)) filters.entryLevel = true
  const places = [...new Set([...knownPlaces, ...Object.keys(PLACE_ALIASES)])]
  const place = take(state, places)
  if (place) filters.place = PLACE_ALIASES[place] ?? place

  const keywords: string[] = []
  const terms: string[] = []
  // Multi-word phrases first, so "call center" is not read as "call" + "center"
  for (const group of SYNONYM_GROUPS) {
    const multi = group.say.filter(s => s.includes(' '))
    let found: string | undefined
    while ((found = take(state, multi))) { keywords.push(found); terms.push(...group.means.map(stem)) }
  }
  for (const w of words(state.text)) {
    const group = SYNONYM_GROUPS.find(g => g.say.includes(w))
    keywords.push(w)
    terms.push(...(group ? group.means : [w]).map(stem))
  }

  for (const k of Object.keys(filters) as (keyof SearchFilters)[]) if (filters[k] === undefined) delete filters[k]
  return { keywords: [...new Set(keywords)], terms: [...new Set(terms)], filters }
}

// ── Filter and rank ──────────────────────────────────────────────────────────

function passes(job: Job, f: SearchFilters): boolean {
  const remote = job.jobType === 'Remote' || /remote|work from home|wfh/i.test(job.location || '')
  if (f.setup && (f.setup === 'Remote' ? !remote : job.jobType !== f.setup)) return false
  const cats = job.disabilityCategories || []
  if (f.visualCategory && cats.length && !cats.includes(f.visualCategory)) return false
  // A remote job can be done from the place asked for, as in job-fit.ts
  if (f.place && !remote && !sameArea(job.location || '', f.place)) return false
  if (f.entryLevel && job.experienceLevel && job.experienceLevel !== 'Entry Level') return false
  if (f.minSalary && salaryTop(job.salary) < f.minSalary) return false
  return true
}

/** A job as the bag of stemmed words BM25 counts, each field repeated by its weight. */
function jobTokens(job: Job): string[] {
  const fields: [keyof typeof FIELD_WEIGHTS, string][] = [
    ['title', job.jobTitle], ['skills', job.skills], ['category', categoryById(job.workCategory)?.name || ''],
    ['company', job.companyName], ['description', job.description],
  ]
  return fields.flatMap(([field, text]) => {
    const t = tokens(text || '')
    return Array.from({ length: FIELD_WEIGHTS[field] }, () => t).flat()
  })
}

/** Okapi BM25 of each job for the query terms, with the terms each job matched. */
function bm25(jobs: Job[], terms: string[]): { score: number; matched: string[] }[] {
  const docs = jobs.map(jobTokens)
  const avgdl = docs.reduce((s, d) => s + d.length, 0) / (docs.length || 1)
  const df = new Map(terms.map(t => [t, docs.filter(d => d.includes(t)).length]))
  return docs.map(doc => {
    let score = 0
    const matched: string[] = []
    for (const t of terms) {
      const tf = doc.filter(w => w === t).length
      if (!tf) continue
      const n = df.get(t) || 0
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5))
      score += idf * (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * doc.length / (avgdl || 1)))
      matched.push(t)
    }
    return { score, matched }
  })
}

/**
 * The jobs that pass the query's filters and, when it has search words, match at
 * least one. Ordered: jobs the applicant may apply to first, then by
 * 60% search relevance + 40% job fit (fit alone when there are no search words).
 */
export function searchJobs(query: string, ranked: { job: Job; fit: JobFit }[]): { parsed: ParsedQuery; hits: SearchHit[]; summary: string } {
  const knownPlaces = [...new Set(ranked.flatMap(r => placesOf(r.job.location)))]
  const parsed = parseQuery(query, knownPlaces)
  const pool = ranked.filter(r => passes(r.job, parsed.filters))
  const scores = parsed.terms.length ? bm25(pool.map(r => r.job), parsed.terms) : pool.map(() => ({ score: 0, matched: [] as string[] }))
  const top = Math.max(0, ...scores.map(s => s.score))

  const hits = pool
    .map((r, i) => ({ ...r, relevance: top ? scores[i].score / top : 0, matched: scores[i].matched }))
    .filter(h => !parsed.terms.length || h.relevance > 0)
    .sort((a, b) => {
      const order = (h: SearchHit) => parsed.terms.length ? RELEVANCE_WEIGHT * h.relevance + (1 - RELEVANCE_WEIGHT) * h.fit.score / 100 : h.fit.score
      return Number(b.fit.eligible) - Number(a.fit.eligible) || order(b) - order(a)
    })

  return { parsed, hits, summary: describe(parsed) }
}

/** The query as understood, in words a screen reader can say: "call center · Remote · Quezon City". */
export function describe({ keywords, filters: f }: ParsedQuery): string {
  const parts = [
    ...keywords,
    f.setup,
    f.place && (f.setup === 'Remote' ? titleCase(f.place) : `${titleCase(f.place)} (remote jobs included)`),
    f.visualCategory && `open to ${f.visualCategory}`,
    f.entryLevel && 'entry level',
    f.minSalary && `at least ₱${f.minSalary.toLocaleString('en-PH')} a month`,
  ].filter(Boolean)
  return parts.join(' · ')
}

const titleCase = (s: string) => s.replace(/\b[a-z]/g, c => c.toUpperCase())
