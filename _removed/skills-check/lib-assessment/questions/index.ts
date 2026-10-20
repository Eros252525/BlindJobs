// Every category's questions, keyed by work category. To add a kind of work: add it
// to work-categories.ts, write its questions in a file here, and list it below.
import type { WorkCategoryId } from '../work-categories'
import type { Question } from './question'
import { CONTACT_CENTRE_QUESTIONS } from './contact-centre'
import { MASSAGE_QUESTIONS } from './massage'
import { TRANSCRIPTION_QUESTIONS } from './transcription'
import { OFFICE_ADMIN_QUESTIONS } from './office-admin'
import { VIRTUAL_ASSISTANCE_QUESTIONS } from './virtual-assistance'
import { ACCESSIBILITY_TESTING_QUESTIONS } from './accessibility-testing'

export const QUESTION_BANK: Record<WorkCategoryId, Question[]> = {
  'contact-centre': CONTACT_CENTRE_QUESTIONS,
  massage: MASSAGE_QUESTIONS,
  transcription: TRANSCRIPTION_QUESTIONS,
  'office-admin': OFFICE_ADMIN_QUESTIONS,
  'virtual-assistance': VIRTUAL_ASSISTANCE_QUESTIONS,
  'accessibility-testing': ACCESSIBILITY_TESTING_QUESTIONS,
}
