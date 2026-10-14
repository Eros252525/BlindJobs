// Bars that show a number as a length. Both are decoration for sighted users and
// hidden from screen readers: the number they repeat must also be on the page as text.

/** How far through a set of pages or questions: a thin bar, `value` of `max` filled. */
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div aria-hidden="true" className="h-2.5 w-full rounded-full border border-gray-500 overflow-hidden">
      <div className="h-full bg-[#1a4fa0]" style={{ width: `${percent}%` }} />
    </div>
  )
}

/** A score out of 100 as a bar. */
export function ScoreBar({ score, className = '' }: { score: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`h-3 w-full rounded-full border border-gray-500 overflow-hidden ${className}`}>
      <div className="h-full bg-[#1a4fa0]" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
    </div>
  )
}

/**
 * A score out of 100 as the main thing in its box: the number large, what it is
 * out of beside it, an optional word for the level, and the bar underneath.
 */
export function ScoreFigure({ score, level, size = 'lg' }: { score: number; level?: string; size?: 'lg' | 'xl' }) {
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className={`${size === 'xl' ? 'text-5xl' : 'text-3xl'} font-bold text-gray-900 leading-none`}>{score}</span>
        <span className="text-sm font-semibold text-gray-700">out of 100</span>
        {level && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{level}</span>}
      </p>
      <ScoreBar score={score} className="mt-2" />
    </div>
  )
}
