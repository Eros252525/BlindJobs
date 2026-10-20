// The skills check: a random draw of ten from a category's approved questions,
// and a weighted score. The questions themselves are in ./questions/, one file
// per kind of work.
//
// Only questions marked `approved` are ever drawn.
import { QUESTION_BANK } from './questions'
import type { Question, QuestionWeight } from './questions/question'
import type { WorkCategoryId } from './work-categories'

export type { Question, QuestionWeight }

export const QUESTIONS_PER_CHECK = 10

/** The approved questions for a category. */
export const approvedQuestions = (category: WorkCategoryId): Question[] => (QUESTION_BANK[category] || []).filter(x => x.approved)

function randomBelow(n: number): number {
  const buf = new Uint32Array(1)
  // reject the uneven tail so every index is equally likely
  const limit = Math.floor(2 ** 32 / n) * n
  do { crypto.getRandomValues(buf) } while (buf[0] >= limit)
  return buf[0] % n
}

function shuffled<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Ten approved questions for the category, picked and ordered at random. The
 * options of each are shuffled too, so the right one has no usual position.
 */
export function drawQuestions(category: WorkCategoryId, count = QUESTIONS_PER_CHECK): Question[] {
  return shuffled(approvedQuestions(category)).slice(0, count).map(x => {
    const right = x.options[x.answer]
    const options = shuffled(x.options)
    return { ...x, options, answer: options.indexOf(right) }
  })
}

export interface CheckResult {
  /** Weighted score, 0 to 100. */
  score: number
  earned: number
  possible: number
  correct: number
  total: number
  missed: Question[]
}

/**
 * Weighted score: each right answer earns its question's weight, so a critical
 * question (privacy, safety) counts three times a basic one. An unanswered
 * question earns nothing.
 */
export function scoreCheck(questions: Question[], answers: Record<string, number>): CheckResult {
  let earned = 0, possible = 0, correct = 0
  const missed: Question[] = []
  for (const x of questions) {
    possible += x.weight
    if (answers[x.id] === x.answer) { earned += x.weight; correct++ } else missed.push(x)
  }
  return { score: possible ? Math.round((earned / possible) * 100) : 0, earned, possible, correct, total: questions.length, missed }
}

/** A score in a word. Blind Jobs' own bands; an employer may set a different minimum on a job. */
export function scoreLevel(score: number): string {
  if (score >= 85) return 'Strong'
  if (score >= 70) return 'Proficient'
  if (score >= 50) return 'Developing'
  return 'Beginning'
}

export const WEIGHT_LABEL: Record<QuestionWeight, string> = { 1: 'basic', 2: 'core', 3: 'critical' }
