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
│   │   ├── applicant/          Dashboard, Profile (resume), Jobs
│   │   ├── employer/           Dashboard, Post a Job, Applicants board
│   │   └── shared/             Messages (both roles)
│   │
│   ├── components/             Pieces used by several screens
│   │   ├── a11y/               Display + Screen Reader buttons, Display settings dialog, braille
│   │   ├── auth/               Signed-out page frame + screen-reader/braille panel
│   │   ├── legal/              Privacy Notice / Terms dialog, consent boxes at registration
│   │   ├── nav/                Top navbar, notification bell, account menu
│   │   ├── toast/              Pop-up messages ("Resume saved")
│   │   └── ui/                 Form field, password box, error message, dialog, spinner
│   │
│   ├── lib/                    Logic with no UI
│   │   ├── a11y/
│   │   │   ├── display-settings.ts   Text size, font, colours, spacing (saved per device)
│   │   │   ├── screen-reader.ts      Built-in reader (F2 toggles it)
│   │   │   ├── arrow-navigation.ts   Arrow-key movement between items
│   │   │   └── braille.ts            Braille dot patterns for letters
│   │   ├── api.ts              Everything that talks to Supabase
│   │   ├── legal.ts            Privacy Notice and Terms text, and their versions
│   │   ├── matching.ts         When a job matches an applicant (skills, location, visual category)
│   │   ├── resume.ts           Resume choices (education levels, assistive tech, …)
│   │   ├── validation.ts       Required-field checks for forms
│   │   ├── format.ts           Names, dates, stage colours
│   │   └── toast.ts            Show a toast from anywhere
│   │
│   ├── hooks/                  React hooks (screen-change announcements, closing menus, reload on a notification)
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
