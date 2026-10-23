import { useState, type KeyboardEvent } from 'react'
import * as sr from '@/lib/a11y/screen-reader'
import { searchSkills } from '@/lib/jobs/skills'
import { t, useLang } from '@/lib/i18n'
import { useSkillSources } from '@/hooks/useSkillSources'

const MAX_LENGTH = 40

/**
 * As many skills as the applicant wants (or up to `max`, when one is given). Typing searches a list of skills (and every skill named in a
 * job post) and offers matches; any skill can still be added in the applicant's
 * own words. Below it, recommended skills: the ones employers ask for most.
 *
 * The search box is an ARIA combobox: Up and Down move through the matches,
 * Enter adds the highlighted one (or what was typed), Escape closes the list.
 * `inputId` is the box's id; forms point "Skills is required" errors and focus at it.
 */
export function SkillPicker({ inputId, value, onChange, max, invalid = false, errorId }: {
  inputId: string
  value: string[]
  onChange: (skills: string[]) => void
  /** Leave out for no limit. */
  max?: number
  invalid?: boolean
  errorId?: string
}) {
  useLang()
  const { searchable, recommended, fromJobs } = useSkillSources()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [note, setNote] = useState('')
  const chosen = value.filter(Boolean)
  const has = (s: string) => chosen.some(c => c.toLowerCase() === s.toLowerCase())
  const full = max != null && chosen.length >= max
  // "3 skills", or "3 of 5 skills" when there is a limit
  const count = (n: number) => max != null ? t('{n} of {max} skills', { n, max }) : t(n === 1 ? '{n} skill' : '{n} skills', { n })

  const labelId = `${inputId}-label`
  const helpId = `${inputId}-help`
  const listId = `${inputId}-list`
  const optionId = (i: number) => `${inputId}-opt-${i}`

  const typed = query.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH)
  const matches = searchSkills(searchable, typed, chosen)
  // what was typed is always an option, unless it is already one of the matches
  const options = typed && !matches.some(m => m.toLowerCase() === typed.toLowerCase()) && !has(typed)
    ? [...matches, typed] : matches
  const isOwn = (i: number) => !!typed && i === options.length - 1 && options[i] === typed && !matches.includes(typed)
  const showList = open && options.length > 0

  const add = (raw: string) => {
    const skill = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH)
    if (!skill) { setNote(t('Type a skill first.')); return }
    if (has(skill)) { setNote(t('{skill} is already in your skills.', { skill })); return }
    if (full) { setNote(t('You can add up to {max} skills. Remove one to add {skill}.', { max: max!, skill })); return }
    onChange([...chosen, skill])
    setNote(t('{skill} added. {count}.', { skill, count: count(chosen.length + 1) }))
    setQuery(''); setOpen(false); setActive(-1)
  }

  const remove = (skill: string) => {
    onChange(chosen.filter(c => c !== skill))
    setNote(t('{skill} removed. {count}.', { skill, count: count(chosen.length - 1) }))
    // the Remove button disappears with the skill, so focus goes to the search box
    requestAnimationFrame(() => document.getElementById(inputId)?.focus())
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!options.length) return // nothing to move through: leave the arrows to page navigation
      e.preventDefault()
      setOpen(true)
      const n = options.length
      const next = e.key === 'ArrowDown' ? (active + 1) % n : (active <= 0 ? n - 1 : active - 1)
      setActive(next)
      // the built-in reader does not follow aria-activedescendant, so say the option
      sr.speak(`${isOwn(next) ? t('Add your own: {skill}', { skill: options[next] }) : options[next]}, ${t('{n} of {total}', { n: next + 1, total: n })}`)
    } else if (e.key === 'Enter') {
      e.preventDefault() // adds a skill; it must not submit the form
      add(showList && active >= 0 ? options[active] : typed)
    } else if (e.key === 'Escape' && showList) {
      e.preventDefault(); e.stopPropagation()
      setOpen(false); setActive(-1)
    }
  }

  return (
    <div>
      <p id={labelId} className="field-label">{t('Your skills')} <span className="font-normal text-gray-600">({max != null ? t('required, at least one, up to {max}', { max }) : t('required, at least one, add as many as you like')})</span></p>

      {/* what is chosen so far, each removable */}
      <div className="mb-3">
        {chosen.length ? (
          <ul aria-label={`${t('Your skills')}, ${count(chosen.length)}`} className="flex flex-wrap gap-2">
            {chosen.map(s => (
              <li key={s} className="inline-flex items-center gap-1 pl-3 pr-1 min-h-9 rounded-full bg-[#1a4fa0] text-white text-sm font-semibold">
                {s}
                <button type="button" onClick={() => remove(s)} aria-label={t('Remove {skill}', { skill: s })}
                  className="w-8 h-8 grid place-items-center rounded-full hover:bg-[#1558a8]"><span aria-hidden="true">✕</span></button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-600">{t('No skills added yet.')}</p>}
      </div>

      <label htmlFor={inputId} className="text-sm text-gray-700 block mb-1">{t('Search for a skill, or type your own')}</label>
      <div className="relative">
        <div className="flex gap-2">
          <input id={inputId} className="input flex-1 min-w-0" type="text" maxLength={MAX_LENGTH} autoComplete="off"
            role="combobox" aria-autocomplete="list" aria-expanded={showList} aria-controls={listId}
            aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
            aria-invalid={invalid} aria-describedby={[helpId, invalid ? errorId : ''].filter(Boolean).join(' ')}
            placeholder={t('e.g., Excel, Braille, Customer Service')} value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); setNote('') }}
            onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1) }} onKeyDown={onKey} />
          <button type="button" onClick={() => add(typed)}
            className="min-h-11 px-4 rounded-md border border-[#1a4fa0] text-[#1a4fa0] font-semibold text-sm hover:bg-blue-50 shrink-0">
            {t('Add')}
          </button>
        </div>
        {showList && (
          <ul id={listId} role="listbox" aria-label={t('Matching skills')}
            className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-500 bg-white shadow-xl py-1">
            {options.map((o, i) => (
              <li key={o + i} id={optionId(i)} role="option" aria-selected={i === active}
                // mousedown, not click: picking an option must not blur the box first
                onMouseDown={(e) => { e.preventDefault(); add(o) }} onMouseEnter={() => setActive(i)}
                className={`px-3 py-2.5 min-h-11 cursor-pointer text-sm ${i === active ? 'bg-blue-50 text-gray-900 font-semibold' : 'text-gray-800'}`}>
                {isOwn(i) ? <>{t('Add your own:')} <strong>“{o}”</strong></> : o}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p id={helpId} className="mt-1 text-xs text-gray-600">
        {t('Matches appear as you type. Up and Down arrows move through them; Enter adds one. Any skill can be added, even one not in the list.')}
      </p>
      {/* the number of matches, for screen reader users who cannot see the list open */}
      <p role="status" className="sr-only">{open && typed ? t(matches.length === 1 ? '{n} matching skill.' : '{n} matching skills.', { n: matches.length }) : ''}</p>

      <p className="mt-4 text-sm font-semibold text-gray-800 mb-1.5">
        {t('Recommended skills')} <span className="font-normal text-gray-600">({fromJobs ? t('the ones employers ask for most in their job posts') : t('common in jobs for blind and low-vision workers')})</span>
      </p>
      <div role="group" aria-label={t('Recommended skills')} className="flex flex-wrap gap-2">
        {recommended.map(s => {
          const on = has(s)
          return (
            <button type="button" key={s} aria-pressed={on} onClick={() => (on ? remove(chosen.find(c => c.toLowerCase() === s.toLowerCase())!) : add(s))}
              className={`text-sm px-3 py-1.5 min-h-9 rounded-full border font-medium transition-colors ${on ? 'bg-[#1a4fa0] text-white border-[#1a4fa0]' : 'bg-white text-gray-700 border-gray-500 hover:border-[#1a4fa0] hover:text-[#1a4fa0]'}`}>
              {on ? '✓ ' : '+ '}{s}
            </button>
          )
        })}
      </div>

      <p role="status" className="mt-2 text-sm text-gray-800 min-h-5">{note}</p>
    </div>
  )
}
