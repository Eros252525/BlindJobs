// Applicant registration, in the order an applicant goes through it. The account
// is only created at the last step.
export const STEPS = ['account', 'profile', 'finish'] as const

export type Step = (typeof STEPS)[number]

export const STEP_NAMES: Record<Step, string> = {
  account: 'Your account',
  profile: 'Skills and work preferences',
  finish: 'Create your account',
}

/** A step's place in the flow, from 1. */
export const stepNumber = (step: Step) => STEPS.indexOf(step) + 1

export type AccountForm = { fullName: string; username: string; password: string }
