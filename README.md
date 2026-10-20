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
│   │   │                       finish), plus the step list and the frame around them
│   │   ├── applicant/          Dashboard, Profile (resume), Assessments, Jobs
│   │   │   ├── profile/        The read-only resume (the edit form is ProfileScreen.tsx)
│   │   │   └── assessments/
│   │   │       └── health/     RAND-36 health survey: consent, question pages, results
│   │   ├── employer/           Dashboard, Post a Job, Applicants board
│   │   │   └── applicants/     What an employer reviews in the applicant dialog: job fit,
│   │   │                       accommodations
│   │   └── shared/             Messages (both roles): inbox with Messages, Unread, Pinned and Sent folders
│   │       └── messages/       Folder list, conversation list, one conversation
│   │
│   ├── components/             Pieces used by several screens
│   │   ├── a11y/               Display + Screen Reader buttons, Display settings dialog, braille
│   │   ├── auth/               Signed-out page frame + screen-reader/braille panel
│   │   ├── legal/              Privacy Notice / Terms dialog, consent boxes at registration
│   │   ├── nav/                Top navbar, notification bell, account menu
│   │   ├── toast/              Pop-up messages ("Resume saved")
│   │   └── ui/                 Form field, password box, error message, dialog, spinner, page card,
│   │                           progress and score bars, skill picker, profile photo
│   │
│   ├── lib/                    Logic with no UI
│   │   ├── a11y/
│   │   │   ├── display-settings.ts   Text size, font, colours, spacing (saved per device)
│   │   │   ├── screen-reader.ts      Built-in reader (F2 toggles it)
│   │   │   └── braille.ts            Braille dot patterns for letters
│   │   ├── assessment/
│   │   │   ├── work-categories.ts    Kinds of work a job can be tagged with
│   │   │   └── rand36.ts             RAND-36 items, answer choices and RAND's scoring
│   │   ├── api/                Everything that talks to Supabase; screens import '@/lib/api'
│   │   │   ├── client.ts             The connection, the key → JSON helpers, the storage layout
│   │   │   ├── auth.ts               Register and sign in
│   │   │   ├── profile.ts            Applicant profile
│   │   │   ├── health.ts             Health survey answers (own row, never on the profile)
│   │   │   ├── jobs.ts               Job posts
│   │   │   ├── applications.ts       Applying, and application stages
│   │   │   ├── notifications.ts      The bell
│   │   │   ├── messages.ts           Inbox, conversations, pinning and deleting
│   │   │   └── index.ts              The `api` object the screens use
│   │   ├── jobs/
│   │   │   ├── matching.ts           When a job matches an applicant (skills, location, visual category)
│   │   │   ├── job-fit.ts            The 0–100 job-fit score, its reasons, suggestions and ranking
│   │   │   └── skills.ts             Skills to search while typing, and recommended skills from job posts
│   │   ├── job-search.ts       Job search in plain English or Filipino: filters + BM25 ranking
│   │   ├── documents/
│   │   │   ├── legal.ts              Privacy Notice and Terms text, their versions, and consent
│   │   │   └── accessibility-statement.ts  The Accessibility page: WCAG 2.2 criteria, W3C's words, how we meet each
│   │   ├── session.ts          Signed-in user and open screen, kept for the tab so a reload returns there
│   │   ├── resume.ts           Resume choices (education levels, assistive tech, …)
│   │   ├── photo.ts            Shrinks a chosen profile photo to a small square JPEG
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
| Resume fields or their choices | `src/lib/resume.ts`, `src/types.ts`, `ProfileScreen.tsx` |
| Colours | `src/styles/tokens.css` |
| Text size / contrast floor | `src/styles/readability.css` |
| Display settings options (fonts, themes, sizes) | `src/lib/a11y/display-settings.ts` |
| How a theme colours the app | `src/styles/themes.css` |
| Saving or loading data | `src/lib/api/` (one file per kind of data) |
| The Privacy Notice or Terms wording | `src/lib/documents/legal.ts` (raise the version when you do) |
| The Accessibility page | `src/lib/documents/accessibility-statement.ts` (W3C's quoted words are never reworded) |
| Who gets told about a new job | `src/lib/jobs/matching.ts` |
| How the job-fit score is worked out, or its weights | `src/lib/jobs/job-fit.ts` |
| Words the job search understands (synonyms, Filipino, places) | `src/lib/job-search.ts` |
| Add a kind of work | `src/lib/assessment/work-categories.ts` |
| A step of applicant registration | `src/screens/auth/register/` (order and names in `steps.ts`) |

## From registration to a job

Applicant registration is one guided flow of three steps. The account is created at the
last one, so nothing is stored about someone who stops part-way.

1. **Account and consent.** Full name, username (no email), password; Privacy Notice and
   Terms, versions recorded on the account. The username is checked for being free here.
2. **Skills and work preferences.** Disability type, skills, last job, location, work setup,
   assistive technology, accommodations.
3. **Create the account.** A summary, then everything is saved and the applicant is signed in.

After that:

- **Job fit.** Skills 50, work setup 20, location 15, experience 15. Parts a job does not use
  are dropped and the rest scaled to 100. Jobs are listed best fit first. Applicants do not
  see the score (only the order, and a note when a job is limited to other visual
  categories); employers see it with its reasons when reviewing an applicant.
- **Job suggestions come from the skills on the profile.** Jobs asking for one of the
  applicant's skills are suggested best fit first (`suggestJobs` in `src/lib/jobs/job-fit.ts`),
  on the Jobs page and the dashboard. With no skills on the profile, nothing is suggested.
- **Employer review.** The same score and reasons, and the accommodations the applicant asked
  for, with a message to start that conversation.
- **Assessments page: the health survey (RAND-36).** Must be answered before applying to
  any job; the Jobs screen and `applyToJob` both check for it. Saved only with its own
  consent, as `health_assessment:<userId>`, never on the profile (employers are sent the
  profile). Only the applicant sees the results; it feeds nothing in matching. Item and
  answer wording is RAND's and must not be reworded (`src/lib/assessment/rand36.ts`).

The skills check (a 10-question test per kind of work) was removed on 2026-10-20. Its code
is kept in `_removed/skills-check/`, with a README on how it was wired in.

Rules that keep this fair, and must survive any change:

- The type of visual disability never enters the job-fit score.
- A score is never shown without its reasons, and it never blocks an application: a person
  at the employer decides.
- Nothing is timed, so nobody is marked down for listening instead of reading.

## Email: sign-up codes and sign-in alerts

Applicants register with a **username and no email** (`src/lib/username.ts`): many blind
applicants have no email address. Employers register with a Gmail address
(`src/lib/gmail.ts` checks Google's username rules); to prove it is real, registration
emails it a 6-digit code that must be typed back before the account is created. Every
sign-in to an account that has an email sends it a short alert.

Both are sent by the Edge Function `supabase/functions/blindjobs-email/`, through a
Gmail account made for Blind Jobs. Until it is deployed, **employers cannot register**:
the code cannot be sent. Applicants are not affected, and signing in still works.

One-time setup (about 15 minutes):

1. Make a Gmail account for Blind Jobs (e.g. `blindjobs.noreply@gmail.com`). In its
   Google Account, turn on **2-Step Verification**, then open
   https://myaccount.google.com/apppasswords and create an app password named
   "Blind Jobs". Copy the 16 letters.
2. Install the Supabase CLI: `npm install -g supabase`, then `supabase login`.
3. In this folder:
   ```
   supabase link --project-ref twetarrmrxfdrparsxiz
   supabase secrets set GMAIL_USER=blindjobs.noreply@gmail.com GMAIL_APP_PASSWORD="abcd efgh ijkl mnop" CODE_SECRET="<any long random text>"
   supabase functions deploy blindjobs-email
   ```
4. Register a test account: the code should arrive within a minute (check Spam).

Limits: Gmail sends about 500 emails a day from one account. A code works for 10 minutes
and 5 tries; a new one can be asked for once a minute. A sign-in alert goes out at most
once a minute per account. Keys used: `email_code:<email>` (the code as an HMAC, never the
code itself), `email_verified:<email>` (deleted once the account is made),
`login_alert:<email>`.

## Keyboard

| Key | Does |
|---|---|
| Tab / Shift+Tab | Next / previous item |
| Enter | Press the focused button |
| Esc | Close a menu or pop-up |
| F2 | Turn the built-in screen reader on or off (on turning on, it reads the page) |
| 1 / 2 | Right after the reader has read the page: 1 reads it again, 2 mutes the reader |

The built-in reader starts on and reads the whole page when the app opens. Muting it
(2 or F2) is remembered, so a reload stays quiet until F2 turns it back on.

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
