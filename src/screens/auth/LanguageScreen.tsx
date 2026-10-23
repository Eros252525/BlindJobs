import { useEffect, useRef } from 'react'
import { setLang, type Lang } from '@/lib/i18n'
import { AuthShell } from '@/components/auth/AuthShell'

// Both languages at once: the person cannot read the page in the other one yet
const CHOICES: { lang: Lang; name: string; hint: string }[] = [
  { lang: 'en', name: 'English', hint: 'Use Blind Jobs in English.' },
  { lang: 'fil', name: 'Filipino (Tagalog)', hint: 'Gamitin ang Blind Jobs sa Filipino.' },
]

/**
 * The very first screen on a new device: English or Filipino. Written in both, with
 * each choice in its own language. Asked once; the 🌐 button at the bottom right
 * switches language at any time after.
 */
export function LanguageScreen({ onChosen }: { onChosen: () => void }) {
  const firstRef = useRef<HTMLButtonElement>(null)
  // The only thing to do here, so start on it
  useEffect(() => { firstRef.current?.focus() }, [])

  const choose = (lang: Lang) => { setLang(lang); onChosen() }

  return (
    <AuthShell width="max-w-md" braille>
      <h1 className="text-3xl font-bold text-gray-900">
        Choose your language<span className="block text-2xl mt-1" lang="fil">Piliin ang iyong wika</span>
      </h1>
      <p className="mt-2 text-gray-700">
        You can change it later with the 🌐 button at the bottom right.{' '}
        <span lang="fil">Mapapalitan mo ito mamaya gamit ang 🌐 button sa kanang ibaba.</span>
      </p>
      <div role="group" aria-label="Language / Wika" className="mt-6 flex flex-col gap-3">
        {CHOICES.map((c, i) => (
          <button key={c.lang} ref={i === 0 ? firstRef : undefined} type="button" lang={c.lang} onClick={() => choose(c.lang)}
            className="btn-primary w-full min-h-14 text-lg flex flex-col items-center justify-center py-3">
            <span>{c.name}</span>
            <span className="text-sm font-normal">{c.hint}</span>
          </button>
        ))}
      </div>
    </AuthShell>
  )
}
