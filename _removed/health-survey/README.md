# Removed: RAND-36 health survey

Taken out of the app on 2026-10-13 because its results were private to the
applicant and fed nothing in job matching.

- `rand36.ts` was `src/lib/assessment/rand36.ts`: the 36 items, answer choices and RAND's scoring.
- `screens-health/` was `src/screens/applicant/assessments/health/`: consent, question pages, results.

Nothing in `src` imports these. Delete this folder if the survey is not coming back.
