import type { Rand36Item } from '@/lib/assessment/rand36'

// One question: a group of radio buttons whose <legend> is the question, so a
// screen reader says the question on entering the group and only the choice after that.
// Each choice is a box at least 44px tall; the chosen one is outlined and tinted,
// so it can be found again without hunting for a small dot.
export function ItemField({ item, stem, describedBy, value, onChange, onClear }: {
  item: Rand36Item; stem?: string; describedBy?: string; value?: number
  onChange: (v: number) => void; onClear: () => void
}) {
  const name = `hs-item-${item.n}`
  return (
    <fieldset aria-describedby={describedBy} className="pb-5 border-b border-gray-200 last:border-b-0">
      <legend className="text-base font-semibold text-gray-900 mb-2">
        <span aria-hidden="true" className="text-[#1a4fa0]">{item.n}. </span><span className="sr-only">Question {item.n}. {stem ? `${stem} ` : ''}</span>{item.text}
      </legend>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        {item.choices.options.map((option, i) => {
          const id = `${name}-${i + 1}`
          const checked = value === i + 1
          return (
            <div key={id} className={`flex items-center gap-2 min-h-11 pl-3 rounded-lg border ${checked ? 'border-[#1a4fa0] border-l-8 bg-blue-50' : 'border-gray-400 bg-white'}`}>
              <input id={id} type="radio" name={name} value={i + 1} checked={checked}
                onChange={() => onChange(i + 1)} className="w-5 h-5 shrink-0 accent-[#1a4fa0]" />
              <label htmlFor={id} className={`flex-1 text-sm cursor-pointer py-2 pr-4 ${checked ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>{option}</label>
            </div>
          )
        })}
      </div>
      {value != null && (
        // the button disappears with the answer, so focus goes back to the first choice
        <button type="button" onClick={() => { onClear(); document.getElementById(`${name}-1`)?.focus() }} aria-label={`Clear my answer to question ${item.n}`}
          className="mt-2 min-h-6 text-sm text-[#1a4fa0] underline">Clear my answer</button>
      )}
    </fieldset>
  )
}
