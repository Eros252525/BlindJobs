// The Privacy Notice and Terms and Conditions a user accepts at registration.
// Shown in <LegalDialog>; the version accepted is saved on the user's account
// (see `register` in api.ts) as the record of consent the Data Privacy Act of
// 2012 (Republic Act No. 10173) asks for.
//
// Written in short, plain sentences on purpose: many users hear this through a
// screen reader, one section at a time.
//
// Change the wording of a document → raise its `version` and `effective` date,
// so each account's consent record says which text was agreed to.
import type { Role } from '@/types'
import { ACCESSIBILITY } from './accessibility-statement'

// TODO before real users sign up: who legally runs Blind Jobs, and where a user
// writes to use their privacy rights. Both appear in the documents below.
const OPERATOR = '[name of the organisation that runs Blind Jobs]'
const CONTACT = '[contact email address]'

export type LegalDocId = 'privacy' | 'terms' | 'accessibility'

/** The documents a user agrees to at registration. The Accessibility statement is information only. */
export type ConsentDocId = 'privacy' | 'terms'

export interface LegalSection { heading: string; body: string[]; items?: string[] }
export interface LegalDoc { id: LegalDocId; title: string; version: string; effective: string; summary: string; sections: LegalSection[] }

const PRIVACY: LegalDoc = {
  id: 'privacy',
  title: 'Privacy Notice',
  version: '2.0',
  effective: 'October 24, 2026',
  summary: 'This notice explains what personal data Blind Jobs collects, why, who can see it, and your rights under the Data Privacy Act of 2012 (Republic Act No. 10173).',
  sections: [
    {
      heading: 'Who is responsible for your data',
      body: [
        `${OPERATOR} ("we") runs Blind Jobs and decides how your personal data is used. Under the law, this makes us the personal information controller.`,
        `To ask a question or to use any of your rights, write to us at ${CONTACT}.`,
      ],
    },
    {
      heading: 'What we collect',
      body: ['We collect only what you type into Blind Jobs.'],
      items: [
        'Applicants: your name, the username you sign in with (no email is needed), mobile number, gender if you give it, type of visual disability, skills, city or province, education, work experience, assistive technology, preferred work setup, the workplace accommodations you would ask for, languages, your "About me" text, and a profile photo if you add one (employers see it when you apply).',
        'Employers: your company name, your Gmail address, and the jobs you post.',
        'Everyone: your password, the messages you send, the jobs you apply to, and the stage of each application.',
        'Employers: when you register, a 6-digit code is emailed to your Gmail address to confirm it is yours; only a scrambled form of the code is stored, and it is deleted once used or after 10 minutes. Each time an account that has an email address is signed in to, we email that address the time and the kind of device and browser used, so you can tell if someone else signed in.',
      ],
    },
    {
      heading: 'Sensitive personal information',
      body: [
        'Your type of visual disability is information about your health. The Data Privacy Act treats health and education details as sensitive personal information, which we may process only with your consent.',
        'We ask for that consent when you register.',
      ],
    },
    {
      heading: 'The health survey has been removed',
      body: [
        'Earlier versions of Blind Jobs had an optional health survey (RAND-36). It was removed on October 24, 2026, and we no longer ask about your health beyond your type of visual disability.',
        'Answers that earlier versions saved are deleted from our server the next time you open your dashboard. We do not use them for anything in the meantime.',
      ],
    },
    {
      heading: 'The job-fit score',
      body: [
        'The job-fit score is worked out by the system from your skills, your preferred work setup, your location and your work experience. Your type of visual disability is not used in it.',
        'It decides the order in which jobs are listed for you. The employer sees the score with its reasons when you apply. It is a guide. A person at the employer, not the system, decides on every application.',
      ],
    },
    {
      heading: 'Why we use your data',
      body: ['We use your data only to run the job portal:'],
      items: [
        'to create your account and sign you in;',
        'to show applicants the jobs that fit their skills, location and visual category;',
        'to suggest kinds of work to an applicant, and to rank jobs for them by how well they fit;',
        'to tell an employer which accommodations an applicant would ask for, so the two can discuss them;',
        'to share an applicant\'s resume with the employers they apply to;',
        'to let applicants and employers message each other and follow each application;',
        'to notify you about your applications and about new jobs that match you.',
      ],
    },
    {
      heading: 'What we do not do',
      body: ['We do not sell your data, and we do not use it for advertising.'],
    },
    {
      heading: 'Who can see your data',
      body: [],
      items: [
        'An employer sees your full profile, including your disability type, contact details, the accommodations you would ask for, and your job-fit score for that job, only after you apply to one of that employer\'s jobs.',
        'Other applicants cannot see your profile.',
        'Job posts and company names are shown to all applicants.',
        'Your data is stored with Supabase, a cloud database service. Its servers may be outside the Philippines.',
      ],
    },
    {
      heading: 'How long we keep your data',
      body: [
        'We keep your data for as long as your account is open.',
        'When you ask us to close your account, we delete your profile, applications and messages, unless a law requires us to keep them.',
      ],
    },
    {
      heading: 'Your rights',
      body: ['Under the Data Privacy Act you have the right to:'],
      items: [
        'be told how your data is used;',
        'ask for a copy of your data;',
        'correct data that is wrong. You can edit most of it yourself on the My Profile page;',
        'object to how we use your data;',
        'have your data blocked or deleted;',
        'receive your data in a form you can take to another service;',
        'be paid damages if you are harmed because your data was misused;',
        'file a complaint with the National Privacy Commission, at privacy.gov.ph.',
      ],
    },
    {
      heading: 'Withdrawing your consent',
      body: [
        'You may withdraw your consent at any time by writing to us.',
        'Blind Jobs cannot work without your data, so withdrawing consent means we will close your account.',
      ],
    },
    {
      heading: 'Changes to this notice',
      body: ['When we change this notice, we update the version and date shown at the top. Please read it again from time to time.'],
    },
  ],
}

const TERMS: LegalDoc = {
  id: 'terms',
  title: 'Terms and Conditions',
  version: '1.0',
  effective: 'October 12, 2026',
  summary: 'These are the rules for using Blind Jobs, for applicants and for employers.',
  sections: [
    {
      heading: 'Agreeing to these terms',
      body: ['By creating an account you agree to these terms. If you do not agree, please do not use Blind Jobs.'],
    },
    {
      heading: 'Your account',
      body: [],
      items: [
        'Give information that is true and up to date.',
        'Keep your password private. You are responsible for what is done in your account.',
        'Each account is for one person or one company.',
        'Tell us if you think someone else has used your account.',
      ],
    },
    {
      heading: 'For applicants',
      body: [
        'Keep your resume truthful.',
        'When you apply to a job, your profile is shared with that employer so they can consider you.',
      ],
    },
    {
      heading: 'For employers',
      body: [],
      items: [
        'Post only real job openings, with honest details about the pay, location and duties.',
        'Do not ask applicants for money.',
        'Do not discriminate against an applicant because of their disability. The Magna Carta for Persons with Disability (Republic Act No. 7277) protects their right to equal opportunity in employment.',
        'Use an applicant\'s personal data only to consider them for the job they applied for, keep it confidential, and follow the Data Privacy Act.',
      ],
    },
    {
      heading: 'Respectful use',
      body: ['Do not use Blind Jobs to harass anyone, to send scams or spam, or to post anything false or unlawful.'],
    },
    {
      heading: 'What Blind Jobs does and does not do',
      body: [
        'Blind Jobs connects applicants and employers. We do not guarantee that an applicant will be hired, or that an employer will find a candidate.',
        'Any job offer or employment contract is between the applicant and the employer.',
      ],
    },
    {
      heading: 'Removing accounts or posts',
      body: ['We may remove a job post, or suspend an account, that breaks these terms.'],
    },
    {
      heading: 'Your privacy',
      body: ['How we handle your personal data is explained in the Privacy Notice.'],
    },
    {
      heading: 'Law that applies',
      body: ['These terms are governed by the laws of the Republic of the Philippines.'],
    },
    {
      heading: 'Contact',
      body: [`Questions about these terms can be sent to ${CONTACT}.`],
    },
  ],
}

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = { privacy: PRIVACY, terms: TERMS, accessibility: ACCESSIBILITY }

// ── consent ──────────────────────────────────────────────────────────────────

export type Consent = Record<ConsentDocId, boolean>
export const NO_CONSENT: Consent = { privacy: false, terms: false }

/** What each registration checkbox says. The privacy one names the purpose, as consent must be specific. */
export function consentLabel(doc: ConsentDocId, role: Role): string {
  if (doc === 'terms') return 'I agree to the Terms and Conditions.'
  return role === 'applicant'
    ? 'I have read the Privacy Notice. I consent to Blind Jobs collecting and using my personal data, including my type of visual disability, to match me with jobs and to share my profile with the employers I apply to.'
    : 'I have read the Privacy Notice. I consent to Blind Jobs collecting and using my personal data to post jobs and manage applicants.'
}

/** Saved on the user's account at registration: which text was agreed to, and when. */
export function consentRecord() {
  return { privacyVersion: PRIVACY.version, termsVersion: TERMS.version, acceptedAt: new Date().toISOString() }
}

// Lets any screen open the dialog owned by <LegalDialogHost> in App.
const OPEN_EVENT = 'bj:open-legal'
export const openLegal = (doc: LegalDocId) => window.dispatchEvent(new CustomEvent<LegalDocId>(OPEN_EVENT, { detail: doc }))
export function onOpenLegal(cb: (doc: LegalDocId) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<LegalDocId>).detail)
  window.addEventListener(OPEN_EVENT, handler)
  return () => window.removeEventListener(OPEN_EVENT, handler)
}
