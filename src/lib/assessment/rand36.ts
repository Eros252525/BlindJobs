// The RAND 36-Item Health Survey 1.0: the items, the answer choices and the
// scoring, as published by RAND at
// rand.org/health-care/surveys_tools/mos/36-item-short-form (survey instrument,
// scoring instructions, terms and conditions).
//
// Item and answer wording is RAND's, word for word. Do not reword an item: the
// scores are only comparable while the questions stay the same. Anything Blind
// Jobs adds is kept apart in `note` fields and is shown labelled as ours, which
// RAND's terms require ("all such changes shall be clearly identified as having
// been made by the recipient").

/** RAND's terms ask for this acknowledgement wherever the survey is shown. */
export const RAND36_CREDIT =
  'The RAND 36-Item Health Survey 1.0 was developed at RAND as part of the Medical Outcomes Study.'

export interface Rand36Choices { id: string; options: string[] }

// Answer choices in the printed order; the answer saved is the position, from 1.
const GENERAL: Rand36Choices = { id: 'general', options: ['Excellent', 'Very good', 'Good', 'Fair', 'Poor'] }
const CHANGE: Rand36Choices = {
  id: 'change',
  options: [
    'Much better now than one year ago', 'Somewhat better now than one year ago', 'About the same',
    'Somewhat worse now than one year ago', 'Much worse now than one year ago',
  ],
}
const LIMITED: Rand36Choices = { id: 'limited', options: ['Yes, limited a lot', 'Yes, limited a little', 'No, not limited at all'] }
const YES_NO: Rand36Choices = { id: 'yesno', options: ['Yes', 'No'] }
const EXTENT: Rand36Choices = { id: 'extent', options: ['Not at all', 'Slightly', 'Moderately', 'Quite a bit', 'Extremely'] }
const PAIN: Rand36Choices = { id: 'pain', options: ['None', 'Very mild', 'Mild', 'Moderate', 'Severe', 'Very severe'] }
const INTERFERE: Rand36Choices = { id: 'interfere', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] }
const TIME6: Rand36Choices = {
  id: 'time6',
  options: ['All of the time', 'Most of the time', 'A good bit of the time', 'Some of the time', 'A little of the time', 'None of the time'],
}
const TIME5: Rand36Choices = { id: 'time5', options: ['All of the time', 'Most of the time', 'Some of the time', 'A little of the time', 'None of the time'] }
const TRUE_FALSE: Rand36Choices = { id: 'truefalse', options: ['Definitely true', 'Mostly true', "Don't know", 'Mostly false', 'Definitely false'] }

export interface Rand36Item { n: number; text: string; choices: Rand36Choices }

/** A run of items that share one instruction, shown together on one step. */
export interface Rand36Group { intro?: string; stem?: string; items: Rand36Item[] }

export interface Rand36Step { title: string; note?: string; groups: Rand36Group[] }

const item = (n: number, text: string, choices: Rand36Choices): Rand36Item => ({ n, text, choices })

export const RAND36_STEPS: Rand36Step[] = [
  {
    title: 'Your health in general',
    groups: [{
      items: [
        item(1, 'In general, would you say your health is:', GENERAL),
        item(2, 'Compared to one year ago, how would you rate your health in general now?', CHANGE),
      ],
    }],
  },
  {
    title: 'Activities during a typical day',
    note: 'A mile is about 1.6 kilometres. A block is the distance from one street corner to the next.',
    groups: [{
      intro: 'The following items are about activities you might do during a typical day. Does your health now limit you in these activities? If so, how much?',
      items: [
        item(3, 'Vigorous activities, such as running, lifting heavy objects, participating in strenuous sports', LIMITED),
        item(4, 'Moderate activities, such as moving a table, pushing a vacuum cleaner, bowling, or playing golf', LIMITED),
        item(5, 'Lifting or carrying groceries', LIMITED),
        item(6, 'Climbing several flights of stairs', LIMITED),
        item(7, 'Climbing one flight of stairs', LIMITED),
        item(8, 'Bending, kneeling, or stooping', LIMITED),
        item(9, 'Walking more than a mile', LIMITED),
        item(10, 'Walking several blocks', LIMITED),
        item(11, 'Walking one block', LIMITED),
        item(12, 'Bathing or dressing yourself', LIMITED),
      ],
    }],
  },
  {
    title: 'Work and daily activities',
    groups: [
      {
        intro: 'During the past 4 weeks, have you had any of the following problems with your work or other regular daily activities as a result of your physical health?',
        items: [
          item(13, 'Cut down the amount of time you spent on work or other activities', YES_NO),
          item(14, 'Accomplished less than you would like', YES_NO),
          item(15, 'Were limited in the kind of work or other activities', YES_NO),
          item(16, 'Had difficulty performing the work or other activities (for example, it took extra effort)', YES_NO),
        ],
      },
      {
        intro: 'During the past 4 weeks, have you had any of the following problems with your work or other regular daily activities as a result of any emotional problems (such as feeling depressed or anxious)?',
        items: [
          item(17, 'Cut down the amount of time you spent on work or other activities', YES_NO),
          item(18, 'Accomplished less than you would like', YES_NO),
          item(19, "Didn't do work or other activities as carefully as usual", YES_NO),
        ],
      },
    ],
  },
  {
    title: 'Social activities and pain',
    groups: [{
      items: [
        item(20, 'During the past 4 weeks, to what extent has your physical health or emotional problems interfered with your normal social activities with family, friends, neighbors, or groups?', EXTENT),
        item(21, 'How much bodily pain have you had during the past 4 weeks?', PAIN),
        item(22, 'During the past 4 weeks, how much did pain interfere with your normal work (including both work outside the home and housework)?', INTERFERE),
      ],
    }],
  },
  {
    title: 'How you have been feeling',
    groups: [
      {
        intro: 'These questions are about how you feel and how things have been with you during the past 4 weeks. For each question, please give the one answer that comes closest to the way you have been feeling.',
        stem: 'How much of the time during the past 4 weeks...',
        items: [
          item(23, 'Did you feel full of pep?', TIME6),
          item(24, 'Have you been a very nervous person?', TIME6),
          item(25, 'Have you felt so down in the dumps that nothing could cheer you up?', TIME6),
          item(26, 'Have you felt calm and peaceful?', TIME6),
          item(27, 'Did you have a lot of energy?', TIME6),
          item(28, 'Have you felt downhearted and blue?', TIME6),
          item(29, 'Did you feel worn out?', TIME6),
          item(30, 'Have you been a happy person?', TIME6),
          item(31, 'Did you feel tired?', TIME6),
        ],
      },
      {
        items: [
          item(32, 'During the past 4 weeks, how much of the time has your physical health or emotional problems interfered with your social activities (like visiting with friends, relatives, etc.)?', TIME5),
        ],
      },
    ],
  },
  {
    title: 'Statements about your health',
    groups: [{
      intro: 'How TRUE or FALSE is each of the following statements for you.',
      items: [
        item(33, 'I seem to get sick a little easier than other people', TRUE_FALSE),
        item(34, 'I am as healthy as anybody I know', TRUE_FALSE),
        item(35, 'I expect my health to get worse', TRUE_FALSE),
        item(36, 'My health is excellent', TRUE_FALSE),
      ],
    }],
  },
]

export const RAND36_ITEMS: Rand36Item[] = RAND36_STEPS.flatMap(s => s.groups.flatMap(g => g.items))

// ── Scoring ───────────────────────────────────────────────────────────────────
// Step 1 (RAND's Table 1): each answer becomes 0 to 100, a higher number always
// meaning better health. Index = the answer's position minus 1.

const RECODE: { items: number[]; values: number[] }[] = [
  { items: [1, 2, 20, 22, 34, 36], values: [100, 75, 50, 25, 0] },
  { items: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], values: [0, 50, 100] },
  { items: [13, 14, 15, 16, 17, 18, 19], values: [0, 100] },
  { items: [21, 23, 26, 27, 30], values: [100, 80, 60, 40, 20, 0] },
  { items: [24, 25, 28, 29, 31], values: [0, 20, 40, 60, 80, 100] },
  { items: [32, 33, 35], values: [0, 25, 50, 75, 100] },
]

const RECODE_BY_ITEM = new Map<number, number[]>(RECODE.flatMap(r => r.items.map(n => [n, r.values] as [number, number[]])))

export type Rand36ScaleId =
  | 'physicalFunctioning' | 'roleLimitsPhysical' | 'roleLimitsEmotional' | 'energyFatigue'
  | 'emotionalWellBeing' | 'socialFunctioning' | 'pain' | 'generalHealth'

export interface Rand36Scale {
  id: Rand36ScaleId
  /** RAND's name for the scale. */
  name: string
  items: number[]
  /** Plain words for what the scale covers, written by Blind Jobs. */
  about: string
  /** Average and spread in the Medical Outcomes Study (RAND's Table 3). */
  mosMean: number
  mosSd: number
}

// Step 2 (RAND's Table 2): the items averaged into each of the eight scales.
// Item 2 (health compared to a year ago) belongs to no scale.
export const RAND36_SCALES: Rand36Scale[] = [
  { id: 'physicalFunctioning', name: 'Physical functioning', items: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], mosMean: 70.61, mosSd: 27.42,
    about: 'How far your health limits physical activities, such as walking, climbing stairs, carrying things and dressing.' },
  { id: 'roleLimitsPhysical', name: 'Role limitations due to physical health', items: [13, 14, 15, 16], mosMean: 52.97, mosSd: 40.78,
    about: 'Whether your physical health got in the way of your work or daily activities in the past 4 weeks.' },
  { id: 'roleLimitsEmotional', name: 'Role limitations due to emotional problems', items: [17, 18, 19], mosMean: 65.78, mosSd: 40.71,
    about: 'Whether emotional problems, such as feeling depressed or anxious, got in the way of your work or daily activities in the past 4 weeks.' },
  { id: 'energyFatigue', name: 'Energy/fatigue', items: [23, 27, 29, 31], mosMean: 52.15, mosSd: 22.39,
    about: 'How much energy you had, and how tired or worn out you felt, in the past 4 weeks.' },
  { id: 'emotionalWellBeing', name: 'Emotional well-being', items: [24, 25, 26, 28, 30], mosMean: 70.38, mosSd: 21.97,
    about: 'How calm, happy, nervous or down you felt in the past 4 weeks.' },
  { id: 'socialFunctioning', name: 'Social functioning', items: [20, 32], mosMean: 78.77, mosSd: 25.43,
    about: 'How far your health or emotional problems got in the way of time with family, friends and groups.' },
  { id: 'pain', name: 'Pain', items: [21, 22], mosMean: 70.77, mosSd: 25.46,
    about: 'How much bodily pain you had, and how far it got in the way of your work. A higher score means less pain.' },
  { id: 'generalHealth', name: 'General health', items: [1, 33, 34, 35, 36], mosMean: 56.99, mosSd: 21.11,
    about: 'How you rate your own health overall, and how you expect it to go.' },
]

/** Item number → the position of the chosen answer, from 1. Unanswered items are simply absent. */
export type Rand36Answers = Record<number, number>

export interface Rand36ScaleScore { id: Rand36ScaleId; score: number | null; answered: number; of: number }

export interface Rand36Result {
  scales: Rand36ScaleScore[]
  /** Item 2 on its own: 100 = much better than a year ago, 50 = about the same, 0 = much worse. */
  healthChange: number | null
  answered: number
}

/** One answer recoded to 0–100, or null when the item was skipped or the answer is not one of its choices. */
export function recode(n: number, answer: number | undefined): number | null {
  const values = RECODE_BY_ITEM.get(n)
  if (!values || answer == null || !Number.isInteger(answer)) return null
  return values[answer - 1] ?? null
}

const round1 = (x: number) => Math.round(x * 10) / 10

/**
 * RAND's scoring: a scale is the average of the items in it that were answered.
 * Skipped items are left out, not counted as zero. A scale with no answers has
 * no score.
 */
export function scoreRand36(answers: Rand36Answers): Rand36Result {
  const scales = RAND36_SCALES.map(scale => {
    const values = scale.items.map(n => recode(n, answers[n])).filter((v): v is number => v != null)
    return {
      id: scale.id,
      score: values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null,
      answered: values.length,
      of: scale.items.length,
    }
  })
  return {
    scales,
    healthChange: recode(2, answers[2]),
    answered: RAND36_ITEMS.filter(i => recode(i.n, answers[i.n]) != null).length,
  }
}

/** The answer to item 2, in words. */
export function healthChangeText(answers: Rand36Answers): string | null {
  return answers[2] ? CHANGE.options[answers[2] - 1] ?? null : null
}

// How a 0–100 score is put in words. These bands are Blind Jobs' own plain
// description of where a score sits on the scale. RAND publishes no cut-off
// points, and a band is not a diagnosis.
export function scoreBand(score: number): string {
  if (score >= 80) return 'in the top part of the scale'
  if (score >= 60) return 'in the upper middle of the scale'
  if (score >= 40) return 'around the middle of the scale'
  if (score >= 20) return 'in the lower middle of the scale'
  return 'in the lowest part of the scale'
}

/** One sentence a screen reader can read for a scale. */
export function describeScale(scale: Rand36Scale, s: Rand36ScaleScore): string {
  if (s.score == null) return `${scale.name}: no score, because none of its ${s.of} questions were answered.`
  const skipped = s.of - s.answered
  return `${scale.name}: ${s.score} out of 100, ${scoreBand(s.score)}.` +
    (skipped ? ` Based on ${s.answered} of ${s.of} questions.` : '')
}
