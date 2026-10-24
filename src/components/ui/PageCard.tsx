import type { ReactNode } from 'react'

// The white card a signed-in page (or a registration step) sits in. It fills the
// width of the page, like the dashboard and Jobs screens, and is as tall as its
// content, never stretched to the window.
// `narrow` is for pages with one job (a question, a consent box): a shorter line
// length is easier to read at low vision and keeps the buttons under the text.
export function PageCard({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className="flex-1 p-4 sm:p-6 pb-24 sm:pb-24">
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 w-full ${narrow ? 'max-w-3xl mx-auto' : ''} p-6 sm:p-8`}>{children}</div>
    </div>
  )
}

// The button beside a primary one ("Previous page", "Back"). Kept as utility
// classes, not a CSS class, because themes.css re-colours by these class names.
export const BTN_SECONDARY = 'min-h-11 px-5 bg-white border border-gray-500 text-gray-800 hover:bg-gray-100 font-semibold rounded-md text-sm'

/** Classes for a step's <h1>, which takes focus when the step opens. */
export const STEP_HEADING = 'text-2xl font-bold text-[#1a4fa0] focus:outline-none'

/** The small line above a step's heading that says which step this is. */
export const STEP_EYEBROW = 'text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1'
