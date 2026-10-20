# Removed: skills check

Taken out of the app on 2026-10-20 at the owner's request. The RAND-36 health survey
stayed and is now the only thing on the Assessments page.

- `lib-assessment/` was `src/lib/assessment/`: `question-bank.ts` (random draw of 10,
  weighted score, `scoreLevel`) and `questions/` (one file per kind of work).
  `work-categories.ts` stayed in `src/`, because jobs are still tagged with a kind of work.
- `screens/skills/`, `CategoryList.tsx`, `TakenChecks.tsx` were `src/screens/applicant/assessments/`.
- `screens/ScoresCard.tsx` was `src/screens/applicant/dashboard/`.
- `screens/SkillsScores.tsx` was `src/screens/employer/applicants/`.
- `screens/CategoryStep.tsx` was `src/screens/auth/register/` (the "choose a kind of work" step).

Bringing it back also means restoring what was cut from the files that used it:
`categoryScores` on `ApplicantProfile`, `minCategoryScore` / `requireCheck` on `Job`,
`saveCategoryScore` in the API, the "category" part of the job-fit score (it was 30 of
100), the "suggestions start after the first check" rule in `job-fit.ts` and
`matching.ts`, the `category` and `check` registration steps, and the skills-check
wording in the Privacy Notice.

Nothing in `src` imports these files. Delete this folder if the skills check is not coming back.
Scores already saved on profiles (`categoryScores`) are left in the database, unread.
