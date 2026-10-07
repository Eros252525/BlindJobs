import { BRAILLE_DOTS } from '@/lib/a11y/braille'

const CELL_ADVANCE = 6.5, DOT_GAP = 2.5, DOT_R = 0.95

// Drawn as SVG rather than Unicode braille (U+2800) because screen readers read those
// characters aloud as "braille pattern dots…"; this is decoration for sighted visitors
// only, so it is always aria-hidden and the real words are present as text.
export function BrailleText({ text, className }: { text: string; className?: string }) {
  const cells = text.toLowerCase().split('')
  const dots = cells.flatMap((ch, i) => (BRAILLE_DOTS[ch] ?? []).map(d => ({
    cx: 1 + i * CELL_ADVANCE + (d > 3 ? DOT_GAP : 0),
    cy: 1 + ((d - 1) % 3) * DOT_GAP,
  })))
  const width = (cells.length - 1) * CELL_ADVANCE + DOT_GAP + 2
  return (
    <svg className={className} viewBox={`0 0 ${width} ${2 * DOT_GAP + 2}`} fill="currentColor" aria-hidden="true" focusable="false">
      {dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={DOT_R} />)}
    </svg>
  )
}
