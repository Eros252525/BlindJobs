// The Accessibility statement: the WCAG 2.2 success criteria Blind Jobs follows,
// each with W3C's own wording and how the app meets it. Shown in the same dialog
// as the Privacy Notice and Terms (LegalDialog), opened with openLegal('accessibility').
//
// Source of every quotation: Web Content Accessibility Guidelines (WCAG) 2.2,
// W3C Recommendation, https://www.w3.org/TR/WCAG22/. Each quotation is the exact
// opening of a success criterion, ending in "…" where W3C's text goes on (usually
// to a list of exceptions). Never reword inside the quotation marks.
//
// Keep the "Blind Jobs:" lines true. When a change stops meeting a criterion,
// change the line, or say so under "What is not done yet".
import type { LegalDoc } from './legal'

const WCAG = 'https://www.w3.org/TR/WCAG22/'

/** One criterion as a list item: number, title and level, W3C's words, then ours. */
const sc = (num: string, title: string, level: 'A' | 'AA', wcag: string, ours: string) =>
  `${num} ${title} (Level ${level}). WCAG: “${wcag}” Blind Jobs: ${ours}`

export const ACCESSIBILITY: LegalDoc = {
  id: 'accessibility',
  title: 'Accessibility',
  version: '1.0',
  effective: 'October 14, 2026',
  summary: 'Blind Jobs is built for people who are blind or have low vision. We follow the Web Content Accessibility Guidelines (WCAG) 2.2 from the W3C, at Level AA. Below, each guideline we follow is given in W3C\'s own words, with how Blind Jobs meets it.',
  sections: [
    {
      heading: 'The standard we follow',
      body: [
        'WCAG 2.2 is the international standard for accessible websites, published by the World Wide Web Consortium (W3C). It is organised under four principles: content must be perceivable, operable, understandable and robust.',
        'Level A is the minimum. Level AA, which we aim for, adds requirements such as minimum contrast and text that can be enlarged to 200 percent.',
        `The full guidelines are at ${WCAG}. Each quotation below is the opening of a success criterion; the full text, with its exceptions, is there.`,
      ],
    },
    {
      heading: 'Perceivable: information you can see, hear or feel',
      body: [],
      items: [
        sc('1.1.1', 'Non-text Content', 'A', 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose, except for…',
          'icon-only buttons have a spoken name, and decorative icons and emoji are hidden from screen readers.'),
        sc('1.3.1', 'Info and Relationships', 'A', 'Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.',
          'pages use real headings, every field has a label, and each question\'s answers are grouped under the question.'),
        sc('1.4.1', 'Use of Color', 'A', 'Color is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element.',
          'errors are written out, a chosen answer is also marked with a tick or a thick edge, and fit scores are given in words.'),
        sc('1.4.3', 'Contrast (Minimum)', 'AA', 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1, except for…',
          'secondary text is never lighter than dark grey (about 10:1 on white), and two high-contrast themes are available.'),
        sc('1.4.4', 'Resize Text', 'AA', 'Except for captions and images of text, text can be resized without assistive technology up to 200 percent without loss of content or functionality.',
          'Display settings enlarge all text up to 200 percent, and no text is smaller than 14 pixels.'),
        sc('1.4.10', 'Reflow', 'AA', 'Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions for…',
          'layouts fold into one column on phones and at large text sizes, so pages scroll in one direction only.'),
        sc('1.4.11', 'Non-text Contrast', 'AA', 'The visual presentation of the following have a contrast ratio of at least 3:1 against adjacent color(s): User Interface Components… Graphical Objects…',
          'buttons and fields have dark outlines, and the focus ring has two tones so it shows on light and dark backgrounds.'),
        sc('1.4.12', 'Text Spacing', 'AA', 'In content implemented using markup languages that support the following text style properties, no loss of content or functionality occurs by setting all of the following and by changing no other style property…',
          'Display settings offer wider letter, word and line spacing, and text wraps instead of being cut off.'),
      ],
    },
    {
      heading: 'Operable: everything works without a mouse',
      body: [],
      items: [
        sc('2.1.1', 'Keyboard', 'A', 'All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes…',
          'every page works with the keyboard alone: Tab moves between items and Enter presses them.'),
        sc('2.1.2', 'No Keyboard Trap', 'A', 'If keyboard focus can be moved to a component of the page using a keyboard interface, then focus can be moved away from that component using only a keyboard interface.',
          'pop-up windows keep Tab inside them while open, and Escape always closes them.'),
        sc('2.1.4', 'Character Key Shortcuts', 'A', 'If a keyboard shortcut is implemented in content using only letter (including upper- and lower-case letters), punctuation, number, or symbol characters, then at least one of the following is true…',
          'F2 turns the built-in reader on or off. The only single-key shortcuts are 1 (read the page again) and 2 (mute the reader), and they work only straight after the reader has read a page, until any other key is pressed, and never while typing in a field.'),
        sc('2.2.1', 'Timing Adjustable', 'A', 'For each time limit that is set by the content, at least one of the following is true…',
          'nothing is timed: no page, form or session has a time limit.'),
        sc('2.4.1', 'Bypass Blocks', 'A', 'A mechanism is available to bypass blocks of content that are repeated on multiple web pages.',
          'a "Skip to main content" link is the first stop on every signed-in page.'),
        sc('2.4.2', 'Page Titled', 'A', 'Web pages have titles that describe topic or purpose.',
          'the browser tab title changes with each screen, and the built-in reader says the screen\'s name.'),
        sc('2.4.3', 'Focus Order', 'A', 'If a web page can be navigated sequentially and the navigation sequences affect meaning or operation, focusable components receive focus in an order that preserves meaning and operability.',
          'when a step, question or page of jobs changes, focus moves to its heading or first item; closing a pop-up returns focus to where you were.'),
        sc('2.4.6', 'Headings and Labels', 'AA', 'Headings and labels describe topic or purpose.',
          'each section has a heading that says what it is, so screen reader users can jump between them.'),
        sc('2.4.7', 'Focus Visible', 'AA', 'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.',
          'a thick green and white ring shows which item has focus, in every theme.'),
        sc('2.4.11', 'Focus Not Obscured (Minimum)', 'AA', 'When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content.',
          'pages leave room at the top and bottom so the menu bar and the Screen Reader button never cover the item in focus.'),
        sc('2.5.8', 'Target Size (Minimum)', 'AA', 'The size of the target for pointer inputs is at least 24 by 24 CSS pixels, except when…',
          'main buttons and answer choices are at least 44 pixels tall; smaller links are at least 24 pixels.'),
      ],
    },
    {
      heading: 'Understandable: clear words and forms that help',
      body: [],
      items: [
        sc('3.3.1', 'Error Identification', 'A', 'If an input error is automatically detected, the item that is in error is identified and the error is described to the user in text.',
          'a form names each field that needs fixing, says it out loud, and moves focus to the first one.'),
        sc('3.3.2', 'Labels or Instructions', 'A', 'Labels or instructions are provided when content requires user input.',
          'every field has a visible label, and "required" or "optional" is written in words, not shown by an asterisk or colour.'),
        sc('3.3.7', 'Redundant Entry', 'A', 'Information previously entered by or provided to the user that is required to be entered again in the same process is either…',
          'what you give at registration is carried into your profile, and an employer\'s company name is filled in on every job post.'),
      ],
    },
    {
      heading: 'Robust: works with your screen reader',
      body: [],
      items: [
        sc('4.1.2', 'Name, Role, Value', 'A', 'For all user interface components (including but not limited to: form elements, links and components generated by scripts), the name and role can be programmatically determined…',
          'standard buttons, fields and radio buttons are used, and toggles say whether they are pressed.'),
        sc('4.1.3', 'Status Messages', 'AA', 'In content implemented using markup languages, status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus.',
          'messages such as "Resume saved", a new notification, or the number of skills found are announced without moving your focus.'),
      ],
    },
    {
      heading: 'Beyond WCAG',
      body: ['Some features go further than the guidelines require:'],
      items: [
        'A built-in screen reader that reads the page aloud, for people without their own (press F2).',
        'Display settings: text size, easy-to-read fonts, dark and two high-contrast themes, and heavier text.',
        'Braille shown beside the Blind Jobs name on the welcome and sign-in screens.',
      ],
    },
    {
      heading: 'What is not done yet',
      body: [
        'Blind Jobs has not yet been checked by an independent accessibility auditor, and not every page has been tested with every screen reader. Where a page falls short of what is written here, we treat it as a fault to fix.',
      ],
    },
    {
      heading: 'Tell us about a problem',
      body: ['If something does not work with your screen reader, magnifier or keyboard, please tell us what you were trying to do and what happened, through Messages or the contact address in the Privacy Notice.'],
    },
  ],
}
