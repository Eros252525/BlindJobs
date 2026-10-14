// Applicant registration, in the order an applicant goes through it. The account
// is only created at the last step, once the assessment is done.
export const STEPS = ['account', 'profile', 'category', 'check', 'finish'] as const

export type Step = (typeof STEPS)[number]

export const STEP_NAMES: Record<Step, string> = {
  account: 'Your account',
  profile: 'Skills and work preferences',
  category: 'Choose a kind of work',
  check: 'Skills check',
  finish: 'Create your account',
}

// Whether an applicant must finish a skills check before their account is created.
// false = the step can be skipped and taken later from the Assessments page.
// true  = the step has no Skip button.
export const REQUIRED_AT_REGISTRATION = { check: false }

/** A step's place in the flow, from 1. */
export const stepNumber = (step: Step) => STEPS.indexOf(step) + 1

/** What the skills check hands back during registration, before there is a profile to save it on. */
export type CheckSummary = { score: number; correct: number; total: number }

export type AccountForm = { fullName: string; email: string; password: string }

// The email box shows "@gmail.com" after a bare username; a full address typed with "@" is kept as it is.
export const withGmail = (v: string) => {
  const t = v.trim()
  return t && !t.includes('@') ? `${t}@gmail.com` : t
}
