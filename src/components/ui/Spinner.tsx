// `label` gives the button an accessible name while the spinner replaces its text
// (WCAG 4.1.2); omit it only when the button already has an aria-label or sr-only text.
export function Spinner({ label }: { label?: string }) {
  return (
    <>
      <span aria-hidden="true" className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
      {label && <span className="sr-only">{label}</span>}
    </>
  )
}
