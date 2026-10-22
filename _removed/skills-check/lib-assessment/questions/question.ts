// The shape of a skills-check question, shared by every category's file.

/** 1 = basic knowledge, 2 = core to the job, 3 = critical: safety, privacy or a client's trust. */
export type QuestionWeight = 1 | 2 | 3

export interface Question {
  id: string
  topic: string
  text: string
  options: string[]
  /** Position of the right option, from 0. */
  answer: number
  weight: QuestionWeight
  /** Shown after the check, so a wrong answer still teaches something. */
  why: string
  approved: boolean
}

/**
 * One approved question. A new or edited question should be written out with
 * `approved: false` until someone who does that work for a living has checked it.
 */
export const q = (id: string, topic: string, weight: QuestionWeight, text: string, options: string[], answer: number, why: string): Question =>
  ({ id, topic, weight, text, options, answer, why, approved: true })
