# Removed: arrow-key navigation

Taken out on 2026-10-20 at the owner's request. It moved focus to the nearest item
with the arrow keys (Up reached the menu bar) and spoke it with the built-in reader.
It was `src/lib/a11y/arrow-navigation.ts`, started by `useRemoteControl()` in `App.tsx`.

Its "focus already announced" flag lives on as `window.__quietFocus` in
`src/lib/a11y/screen-reader.ts`. Delete this folder if the feature is not coming back.
