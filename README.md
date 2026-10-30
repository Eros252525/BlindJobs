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
│   ├── main.tsx                Entry point; switches optional themes on, catches screen crashes
│   ├── App.tsx                 Which screen shows, who is signed in, navigation, the address bar
│   ├── types.ts                Shared data shapes (User, Job, ApplicantProfile, …)
│   ├── constants.ts            Screen lists, page titles, kanban columns
│   │
│   ├── screens/                One file per page
│   │   ├── auth/               Language choice, welcome guide, Sign in, Forgot password,
│   │   │   │                   Register (applicant, employer)
│   │   │   └── register/       Applicant registration, one file per step (account, work profile,
│   │   │                       finish), plus the step list and the frame around them
│   │   ├── applicant/          Dashboard (Home), Profile (resume), Jobs
│   │   │   └── profile/        The read-only resume and the Gmail confirmation box
│   │   │                       (the edit form is ProfileScreen.tsx)
│   │   ├── employer/           Dashboard, Post a Job, Applicants board
│   │   │   └── applicants/     What an employer reviews in the applicant dialog: job fit,
│   │   │                       accommodations
│   │   └── shared/             Messages (both roles): inbox with Messages, Unread, Pinned and Sent folders
│   │       └── messages/       Folder list, conversation list, one conversation
│   │
│   ├── components/             Pieces used by several screens
│   │   ├── a11y/               Language, Display and Screen Reader buttons, Display settings dialog, braille
│   │   ├── auth/               Signed-out page frame, screen-reader/braille panel, email code form
│   │   ├── legal/              Privacy Notice / Terms dialog, consent boxes at registration
│   │   ├── nav/                Top navbar, notification bell, account menu
│   │   ├── toast/              Pop-up messages ("Resume saved")
│   │   └── ui/                 Form field, password and Gmail boxes, error message, dialog, spinner,
│   │                           page card, progress bars, skill picker, profile photo, and the
│   │                           "Something went wrong" screen shown if a page crashes
│   │
│   ├── lib/                    Logic with no UI
│   │   ├── a11y/
│   │   │   ├── display-settings.ts   Text size, font, colours, spacing (saved per device)
│   │   │   ├── screen-reader.ts      Built-in reader (F2 toggles it)
│   │   │   └── braille.ts            Braille dot patterns for letters
│   │   ├── api/                Everything that talks to Supabase; screens import '@/lib/api'
│   │   │   ├── client.ts             The connection, the key → JSON helpers, the storage layout
│   │   │   ├── auth.ts               Register and sign in
│   │   │   ├── email.ts              Email codes (register, confirm a Gmail), password reset, sign-in alerts
│   │   │   ├── profile.ts            Applicant profile
│   │   │   ├── health.ts             Deletes health survey answers left by earlier versions
│   │   │   ├── jobs.ts               Job posts
│   │   │   ├── applications.ts       Applying, and application stages
│   │   │   ├── notifications.ts      The bell
│   │   │   ├── messages.ts           Inbox, conversations, pinning and deleting
│   │   │   └── index.ts              The `api` object the screens use
│   │   ├── jobs/
│   │   │   ├── matching.ts           When a job matches an applicant (skills, past work, location, visual category)
│   │   │   ├── job-post.ts           What a job post needs before it is published (description, location vs work mode)
│   │   │   ├── job-fit.ts            The 0–100 job-fit score, its reasons, suggestions and ranking
│   │   │   ├── skills.ts             Skills to search while typing, and recommended skills from job posts
│   │   │   └── work-categories.ts    Kinds of work a job can be tagged with
│   │   ├── job-search.ts       Job search in plain English or Filipino: filters + BM25 ranking
│   │   ├── documents/
│   │   │   ├── legal.ts              Privacy Notice and Terms text, their versions, and consent
│   │   │   └── accessibility-statement.ts  The Accessibility page: WCAG 2.2 criteria, W3C's words, how we meet each
│   │   ├── i18n/
│   │   │   ├── index.ts              English and Filipino: t('…'), the chosen language, useLang()
│   │   │   └── fil.ts                The Filipino for every English text in the app
│   │   ├── session.ts          Signed-in user and open screen, kept for the tab so a reload returns there
│   │   ├── routes.ts           Each screen's address (/login, /jobs, /profile, …) and who may open it
│   │   ├── resume.ts           Resume choices (education levels, assistive tech, …)
│   │   ├── photo.ts            Shrinks a chosen profile photo to a small square JPEG
│   │   ├── phone.ts            Philippine mobile numbers: checking, cleaning up typing, +63 format
│   │   ├── gmail.ts            Gmail address rules (employers, and applicants' optional email)
│   │   ├── username.ts         Applicant username rules
│   │   ├── open-conversation.ts  Which conversation is on screen, so the bell does not count or announce it
│   │   ├── validation.ts       Required-field checks for forms, the 50-character name limit
│   │   ├── format.ts           Names, dates (one style: "September 18, 2026"), salaries ("₱17,000–21,000"), stage colours
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
│       ├── a11y-toggle.css     Bottom-right buttons: language, Display, Screen Reader (icons only on
│       │                       phones and at large text sizes)
│       ├── toast.css           Pop-up messages
│       ├── readability.css     Minimum text sizes and contrast for low vision
│       └── themes.css          Display settings: fonts, dark/high-contrast themes, spacing
│
├── scripts/i18n-keys.py        Lists English text that has no Filipino translation yet
├── supabase/functions/
│   ├── blindjobs-email/        Email codes, password reset by email, sign-in alerts
│   └── server/                 Edge function (backend, in progress)
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
| Add a kind of work | `src/lib/jobs/work-categories.ts` |
| A Filipino translation | `src/lib/i18n/fil.ts` (then run `python scripts/i18n-keys.py src src/lib/i18n/fil.ts`) |
| A page's address (`/jobs`, …) | `src/lib/routes.ts` |
| A step of applicant registration | `src/screens/auth/register/` (order and names in `steps.ts`) |

## From registration to a job

Applicant registration is one guided flow of three steps. The account is created at the
last one, so nothing is stored about someone who stops part-way.

1. **Account and consent.** First, middle and last name (up to 50 characters each),
   Philippine mobile number, an optional Gmail (many blind applicants have no email;
   partially and legally blind applicants often do), username, password (at least 8 characters);
   Privacy Notice and Terms, versions recorded on the account. The username is checked
   for being free here. The mobile number is asked now because applying needs it.
2. **Skills and work preferences.** Disability type, skills, last job, location, work setup,
   assistive technology, accommodations.
3. **Create the account.** A summary, then everything is saved and the applicant is taken to
   Sign in, with their username filled in, to sign in with the password they chose.

After that:

- **Job fit.** Skills 50, work setup 20, location 15, experience 15. Parts a job does not use
  are dropped and the rest scaled to 100. Common skills (Typing, Communication, …; the list
  is `COMMON_SKILLS` in `src/lib/jobs/matching.ts`) count a quarter as much as other skills.
  A past job related to this one counts in full towards experience, any other past job half.
  If a job names skills beyond the common ones and none of them is on the profile, the score
  is kept at 24 at most (a Low fit): typing well does not make someone a web developer, and
  setup, location and experience cannot make up for that (`NO_MAIN_SKILL_CAP`).
  Jobs are listed best fit first. Applicants do not see the score (only the order, and an
  "Open to …" note naming the visual categories when a job is limited to others); employers
  see it with its reasons when reviewing an applicant.
- **Job suggestions come from the skills and past work on the profile.** A job is suggested
  (and a new one announced in the bell) when two of its skills match, at least one of them
  not a common skill, or one such skill and related past work (`isGoodMatch` in
  `src/lib/jobs/matching.ts`). Best fit first, on the Jobs page and the dashboard. With no
  skills on the profile, nothing is suggested.
- **Recommended skills** come from what job posts ask for most, but massage and music skills
  are never recommended (a stereotype about blind workers). Anyone can still search for and
  add them.
- **Applying needs the required profile fields** (first and last name, mobile number,
  disability type, a skill), because the employer is sent the profile. The dashboard names
  any that are missing, with a button straight to each one.
- **Job posts must be complete and consistent** (`src/lib/jobs/job-post.ts`): a description,
  and a location that agrees with the work mode (a city for On-site or Hybrid). Posting and
  editing are both refused otherwise. Older posts that break these rules are hidden from
  applicants ("Being updated") and marked "Fix" on the employer dashboard. A live job is
  paused while the employer edits it; saving or cancelling puts its status back.
- **Employer review.** The same score and reasons, and the accommodations the applicant asked
  for, with a message to start that conversation.
- **The health survey (RAND-36) was removed on 2026-10-24.** Its purpose was to show
  employers whether an applicant is healthy enough to work, which the Magna Carta for Persons
  with Disability (RA 7277, Sec. 32) treats as discrimination, and health answers should not
  be collected without a lawful need. Answers saved by earlier versions
  (`health_assessment:<userId>`) are deleted when the applicant next opens the dashboard
  (`deleteOldHealthAnswers` in `src/lib/api/health.ts`). To ask employers' real question,
  "can this person work on-site, and what do they need?", ask the applicant job-related
  questions instead (work setup and accommodations are already on the profile).

The skills check (a 10-question test per kind of work) was removed on 2026-10-20. Its code
is kept in `_removed/skills-check/`, with a README on how it was wired in.

Rules that keep this fair, and must survive any change:

- The type of visual disability never enters the job-fit score.
- A score is never shown without its reasons, and it never blocks an application: a person
  at the employer decides.
- Nothing is timed, so nobody is marked down for listening instead of reading.

## Email: sign-up codes and sign-in alerts

Applicants register with a **username** (`src/lib/username.ts`): many blind applicants
have no email address. A Gmail is optional, at registration or on the Profile page; it is
saved unconfirmed and used for password resets only after the applicant types back the
6-digit code emailed to it (`EmailConfirm`). Home and Profile remind them until then. Employers register with a Gmail address
(`src/lib/gmail.ts` checks Google's username rules); to prove it is real, registration
emails it a 6-digit code that must be typed back before the account is created. Every
sign-in to an account that has an email (an employer's Gmail, or an applicant's once
confirmed) sends it a short alert. A welcome email ("your account is ready", with what
to sign in with) goes once per account: to an employer when the account is made, to an
applicant when they first confirm a Gmail.

A failed sign-in always says "Email, username or password is incorrect.", so the page
never tells anyone whether an account exists.

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
`login_alert:<userId>`, `welcome_sent:<userId>`. Optionally set `SITE_URL` (the Vercel
address) as a secret too, so the welcome email links to the app.

## Sign in with Google

Under the Sign in form, Google's own button (`src/components/auth/GoogleSignInButton.tsx`)
signs in to the account that uses the Gmail the person picks, applicant or employer.
Google proves the address; the email function's `google-sign-in` action checks Google's
token (that it is real, meant for Blind Jobs, and the address confirmed) and finds the
account: one registered with that Gmail, or an applicant who added it to their profile
(which then counts as confirmed). One Tap, the prompt that pops up by itself, is off,
because it would interrupt a screen reader.

**No account yet:** the function marks the Gmail proved (`email_verified:<email>`, as a
typed-back code does) and answers `{ newAccount: { email, firstName, lastName } }`. The
person goes on to registration for the account type chosen on Sign in, with Google's name
and Gmail filled in, and no username, password or emailed code to make. Consent and the
profile are still asked, as the Data Privacy Act needs. `register({ google: true })` makes
the account with that Gmail as what they sign in with and `password: null`, so a password
never signs in to it; it is signed in to at once. A password can be added later with
Forgot password, which emails the code to that Gmail. Only Gmail addresses can make an
account this way. After changing this, redeploy the function
(`supabase functions deploy blindjobs-email`).

Setup: in Google Cloud, APIs & Services → Credentials, make an OAuth client ID of type
"Web application" with the site's addresses (e.g. `https://blind-jobs.vercel.app`,
`http://localhost:8443`) under Authorized JavaScript origins. Put its Client ID in
`src/lib/google.ts` and set it as the `GOOGLE_CLIENT_ID` secret of the email function.
While `src/lib/google.ts` has none, the button is not shown.

## Forgot password

"Forgot your password?" sits under the Password box on Sign in (`/forgot-password`).
A 6-digit code is emailed, then a new password is chosen:

- **Applicants:** to the email on their profile. That email is optional, because many
  blind applicants have none; an applicant without one asks Blind Jobs for help.
- **Employers:** to their Gmail.

The person types the address themselves, and the page answers the same whether or not it
matched, so it never reveals whether an account exists. The code works for 10 minutes and
5 tries; one a minute. Key used: `reset_code:<userId>` (an HMAC, never the code).

Both actions are in the same Edge Function (`send-reset`, `reset-password`). Codes by text
message were taken off the page on 2026-10-28. The function can still send them through
[Semaphore](https://semaphore.co) when the `SEMAPHORE_API_KEY` secret is set, so they can
come back by putting the choice back in `ForgotPasswordScreen.tsx`.

## Languages

English and Filipino. A new device starts on a screen that asks which, in both languages;
after that the 🌐 button at the bottom right of every page switches (saved on the device,
and `<html lang>` follows, so screen readers change voice). The built-in reader speaks with
a Filipino voice when the device has one.

Code is written in English with each piece of text wrapped in `t('…')` (`src/lib/i18n/`);
`fil.ts` holds the Filipino for each English string. Text without an entry shows in
English. To list text that still needs translating:
`python scripts/i18n-keys.py src src/lib/i18n/fil.ts`.

Not translated, on purpose: the Privacy Notice and
Terms (legal text needs a lawyer's translation), the employer screens, and what people type
(job posts, messages, skills). Saved values such as disability types are stored in English
and only shown translated. The Filipino was written by Claude and should be checked by a
native speaker, ideally one who uses a screen reader, before launch.

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
