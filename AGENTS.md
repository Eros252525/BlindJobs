# Agent notes

Read README.md first: it maps every folder and lists the accessibility rules.

- Stack: React 19 + TypeScript + Vite + Tailwind 4; data in Supabase (`src/lib/api/`, imported as `@/lib/api`).
- Users are blind and low-vision. Treat WCAG 2.2 AA as a hard requirement, not polish:
  labels, focus, announcements, contrast and the 14px text floor on every change.
- The app is a single page with no router library; `App.tsx` decides which screen shows and keeps
  the address bar in step (each screen's address is in `src/lib/routes.ts`). The host must serve
  `index.html` for every path (`/jobs`, `/profile`, …), as `vite` and `vite preview` already do.
- Accessibility engine lives in `src/lib/a11y/`; its UI in `src/components/a11y/`.
- Type-check with `npx tsc --noEmit -p tsconfig.json` before calling a change done.
- `utils/supabase/info.tsx` is auto-generated; do not edit it.
