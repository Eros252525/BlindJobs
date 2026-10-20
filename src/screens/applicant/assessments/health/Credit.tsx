import { RAND36_CREDIT } from '@/lib/assessment/rand36'

/** RAND's terms ask for the credit line, and for our own additions to be named as ours. */
export function Credit() {
  return (
    <p className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-700 max-w-3xl">
      {RAND36_CREDIT} The questions and answer choices are RAND's, unchanged. The notes marked as from Blind Jobs, the page titles, and the wording of the results were added by Blind Jobs.
    </p>
  )
}
