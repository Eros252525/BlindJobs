# Blind Jobs

A job portal for partially, legally and totally blind job seekers in the Philippines,
and the employers who hire them. Built to WCAG 2.2 AA with a screen reader, keyboard
and low vision in mind from the start.

## Run it

```bash
npm install
npm run dev        # http://localhost:8443
npm run build      # production build into dist/
```

## Where things are

```
blindss/
├── index.html                  Page shell React mounts into
├── site.json                   Page description, social title, and whether search engines may index
├── public/                     Static files served as-is
│   ├── images/logo.jpg
│   ├── icons/                  App icons (192, 512)
│   └── manifest.webmanifest
├── src/
│   ├── main.tsx                Entry point; also switches optional themes on
│   ├── App.tsx                 Which screen shows, who is signed in, navigation
│   ├── types.ts                Shared data shapes (User, Job, ApplicantProfile, …)
│   ├── constants.ts            Screen lists, page titles, kanban columns
│   │
│   ├── screens/                One file per page
│   │   ├── auth/               Welcome guide, Sign in, Register (applicant, employer)
│   │   │   └── register/       Applicant registration, one file per step (account, work profile,
│   │   │                       category, finish), plus the step list and the frame around them
│   │   ├── applicant/          Dashboard, Profile (resume), Assessments, Jobs
│   │   │   ├── dashboard/      My Assessment Scores card on the dashboard
│   │   │   ├── profile/        The read-only resume (the edit form is ProfileScreen.tsx)
│   │   │   └── assessments/    Shared by the Assessments page and registration
│   │   │       ├── skills/     Skills check: intro, one question per page, result
│   │   │       ├── CategoryList.tsx   Suggested kinds of work
│   │   │       └── TakenChecks.tsx    Finished checks: score and Retake
│   │   ├── employer/           Dashboard, Post a Job, Applicants board
│   │   │   └── applicants/     What an employer reviews in the applicant dialog: job fit,
│   │   │                       skills-check scores, accommodations
│   │   └── shared/             Messages (both roles)
│   │
│   ├── components/             Pieces used by several screens
│   │   ├── a11y/               Display + Screen Reader buttons, Display settings dialog, braille
│   │   ├── auth/               Signed-out page frame + screen-reader/braille panel
│   │   ├── legal/              Privacy Notice / Terms dialog, consent boxes at registration
│   │   ├── nav/                Top navbar, notification bell, account menu
│   │   ├── toast/              Pop-up messages ("Resume saved")
│   │   └── ui/                 Form field, password box, error message, dialog, spinner, page card,
│   │                           progress and score bars
│   │
│   ├── lib/                    Logic with no UI
│   │   ├── a11y/
│   │   │   ├── display-settings.ts   Text size, font, colours, spacing (saved per device)
│   │   │   ├── screen-reader.ts      Built-in reader (F2 toggles it)
│   │   │   ├── arrow-navigation.ts   Arrow-key movement between items
│   │   │   └── braille.ts            Braille dot patterns for letters
│   │   ├── assessment/
│   │   │   ├── work-categories.ts    Kinds of work offered, why, and how they are suggested
│   │   │   ├── question-bank.ts      The random draw of 10 and the weighted score
│   │   │   └── questions/            The questions, one file per kind of work
│   │   ├── api.ts              Everything that talks to Supabase
│   │   ├── legal.ts            Privacy Notice and Terms text, and their versions
│   │   ├── matching.ts         When a job matches an applicant (skills, location, visual category)
│   │   ├── job-fit.ts          The 0–100 job-fit score, its reasons, and the ranking of jobs
│   │   ├── job-search.ts       Search in plain English or Filipino: filters + BM25 ranking
│   │   ├── resume.ts           Resume choices (education levels, assistive tech, …)
│   │   ├── validation.ts       Required-field checks for forms
│   │   ├── format.ts           Names, dates, stage colours
│   │   └── toast.ts            Show a toast from anywhere
│   │
│   ├── hooks/                  React hooks (screen-change and step-change announcements, closing menus, reload on a notification)
│   │
│   └── styles/                 CSS, loaded in order by index.css
│       ├── tokens.css          Brand colours and motion
│       ├── base.css            Focus ring, skip link
│       ├── components.css      .input, .btn-primary, .field-label
│       ├── nav.css             Navbar
│       ├── auth.css            Signed-out screens + the blue braille backdrop
│       ├── a11y-toggle.css     Screen Reader button (grey off, green on)
│       ├── toast.css           Pop-up messages
│       ├── readability.css     Minimum text sizes and contrast for low vision
│       └── themes.css          Display settings: fonts, dark/high-contrast themes, spacing
│
├── supabase/functions/server/  Edge function (backend, in progress)
└── utils/supabase/info.tsx     Supabase project ID (auto-generated, do not edit)
```

## Finding your way

| I want to change… | Look in |
|---|---|
| A page's content or layout | `src/screens/<role>/<Name>Screen.tsx` |
| The top menu | `src/components/nav/` (links are in `nav-links.ts`) |
| What the built-in reader says, or its shortcut | `src/lib/a11y/screen-reader.ts` |
| How the arrow keys move | `src/lib/a11y/arrow-navigation.ts` |
| Resume fields or their choices | `src/lib/resume.ts`, `src/types.ts`, `ProfileScreen.tsx` |
| Colours | `src/styles/tokens.css` |
| Text size / contrast floor | `src/styles/readability.css` |
| Display settings options (fonts, themes, sizes) | `src/lib/a11y/display-settings.ts` |
| How a theme colours the app | `src/styles/themes.css` |
| Saving or loading data | `src/lib/api.ts` |
| The Privacy Notice or Terms wording | `src/lib/legal.ts` (raise the version when you do) |
| Who gets told about a new job | `src/lib/matching.ts` |
| How the job-fit score is worked out, or its weights | `src/lib/job-fit.ts` |
| Words the job search understands (synonyms, Filipino, places) | `src/lib/job-search.ts` |
| A skills-check question | `src/lib/assessment/questions/<kind-of-work>.ts` |
| Add a kind of work | `src/lib/assessment/work-categories.ts`, then a questions file listed in `questions/index.ts` |
| A step of applicant registration | `src/screens/auth/register/` (order and names in `steps.ts`) |

## From registration to a job

Applicant registration is one guided flow of five steps. The account is created at the
last one, so nothing is stored about someone who stops part-way.

The skills check can be skipped during registration and taken later from the Assessments
page. To make it compulsory, set `check: true` in `REQUIRED_AT_REGISTRATION`
(`src/screens/auth/register/steps.ts`): its Skip button then disappears. Separately, an
employer can tick "Require the skills check to apply" on a job; applying to that job is
then blocked until the applicant has taken that check.

1. **Account and consent.** Full name, email, password; Privacy Notice and Terms, versions
   recorded on the account. The email is checked for being free here, not at the end.
2. **Skills and work preferences.** Disability type, skills, last job, location, work setup,
   assistive technology, accommodations.
3. **Suggested kinds of work**, from step 2, each with its reasons. The applicant picks one,
   or skips.
4. **Skills check.** Ten approved questions drawn at random for that kind of work; a
   weighted score (basic 1, core 2, critical 3 points). Not timed.
5. **Create the account.** A summary, then everything is saved and the applicant is signed in.

After that:

- **Job fit.** Skills 35, skills check 30, work setup 15, location 10, experience 10. Parts a
  job does not use are dropped and the rest scaled to 100. Jobs are listed best fit first.
- **Employer review.** The same score and reasons, every skills-check score, the minimum
  they set, and the accommodations the applicant asked for, with a message to start that
  conversation.
- **Assessments page.** Scores, a retake of any check, or a check in another kind of work.

A RAND-36 health survey was built and then removed, because its results were private to
the applicant and fed nothing in matching. The code is kept in `_removed/health-survey/`.

Rules that keep this fair, and must survive any change:

- The type of visual disability never enters the job-fit score.
- A score is never shown without its reasons, and it never blocks an application: a person
  at the employer decides.
- Assessments are untimed, so nobody is marked down for listening instead of reading.
- A skills-check question is only drawn when `approved` is true. Have someone who does that
  work check a new question before approving it.

## Keyboard

| Key | Does |
|---|---|
| Tab / Shift+Tab | Next / previous item |
| Arrow keys | Move to the nearest item; ↑ reaches the menu |
| Enter | Press the focused button |
| Esc | Close a menu or pop-up |
| Alt+1 … Alt+4 | Jump to a menu section |
| F2 | Turn the built-in screen reader on or off |

## Accessibility rules for changes

- Every input has a visible `<label>`; required/optional is written in words.
- Icon-only buttons get an `aria-label`; decorative icons get `aria-hidden="true"`.
- Status changes (saved, applied, errors) are announced through a `role="status"`
  or `role="alert"` region, or a toast.
- No text below 14px; secondary text no lighter than gray-700.
- Check a changed screen with axe DevTools (WCAG 2.2 AA) and with the keyboard alone.
- Check it under each Display setting too: Dark, both High contrast themes, and
  200% text. New colour classes need a mapping in `themes.css`, and sizes should
  be in rem (not px) so they grow with the chosen text size.
