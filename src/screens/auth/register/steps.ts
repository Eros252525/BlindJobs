// Applicant registration, in the order an applicant goes through it. The account
// is only created at the last step. Names are English here; screens show t(STEP_NAMES[step]).
export const STEPS = ['account', 'profile', 'finish'] as const

export type Step = (typeof STEPS)[number]

export const STEP_NAMES: Record<Step, string> = {
  account: 'Your account',
  profile: 'Skills and work preferences',
  finish: 'Create your account',
}

/** A step's place in the flow, from 1. */
export const stepNumber = (step: Step) => STEPS.indexOf(step) + 1

// `email` is optional: many blind applicants have none, but partially and legally blind applicants often do
export type AccountForm = { firstName: string; middleName: string; lastName: string; mobile: string; email: string; username: string; password: string }

export const EMPTY_ACCOUNT_FORM: AccountForm = { firstName: '', middleName: '', lastName: '', mobile: '', email: '', username: '', password: '' }

/** "Juan Santos Dela Cruz": the name as the summary shows it. */
export const accountName = (f: AccountForm) => [f.firstName, f.middleName, f.lastName].map(s => s.trim()).filter(Boolean).join(' ')
