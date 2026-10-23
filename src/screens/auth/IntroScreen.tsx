import { useEffect } from 'react'
import { t, useLang } from '@/lib/i18n'
import { AuthShell } from '@/components/auth/AuthShell'
import { KeyBadge } from '@/components/ui/KeyBadge'
import * as sr from '@/lib/a11y/screen-reader'

// `spoken` is what the built-in reader says for the row in the tutorial it reads
// when the app opens; keep it in step with `label`.
type GuideItem = { keys: string[]; icon?: string; label: string; spoken: string }

// Labels are kept to one line at desktop width so the whole guide fits on screen;
// the key badges carry the rest (e.g. "Shift + Tab").
const KEYBOARD: GuideItem[] = [
  { keys: ['Tab'], label: 'Next item (Shift + Tab goes back)', spoken: 'Press Tab to go to the next item, and Shift plus Tab to go back.' },
  { keys: ['Enter'], label: 'Press the focused button or link', spoken: 'Press Enter to press the button or link you are on.' },
  { keys: ['Esc'], label: 'Close a menu or pop-up', spoken: 'Press Escape to close a menu or pop-up.' },
  { keys: ['F2'], label: 'Turn the screen reader on or off', spoken: 'Press F2 at any time to turn the screen reader on or off.' },
]

const MOUSE: GuideItem[] = [
  { keys: ['Click'], icon: '🖱', label: 'Press any button, link or field', spoken: 'Click any button, link or field to press it.' },
  { keys: ['Scroll'], icon: '🖱', label: 'Move up and down the page', spoken: 'Scroll to move up and down the page.' },
  { keys: ['Screen Reader'], icon: '🔊', label: 'Bottom-right button: reader on or off', spoken: 'The Screen Reader button at the bottom right turns the reader on or off.' },
  { keys: ['Display'], icon: 'Aa', label: 'Bottom-right: text size, font and colours', spoken: 'The Display button next to it changes text size, font and colours.' },
]

const TUTORIAL = [
  'This is the navigation guide.',
  'You can use the keyboard, a mouse or touch. Everything works with each. The screen reader reads each item aloud when you move to it.',
  'Keyboard.',
  ...KEYBOARD.map(s => s.spoken),
  'Mouse or touch.',
  ...MOUSE.map(s => s.spoken),
  'The Continue to sign in button is already selected. When you are ready, press Enter to go to sign in.',
]

function GuideList({ id, title, items }: { id: string; title: string; items: GuideItem[] }) {
  return (
    <section aria-labelledby={id} className="mt-4">
      <h2 id={id} className="text-base font-bold text-gray-900">{title}</h2>
      <dl className="mt-1">
        {items.map(s => (
          <div key={s.label} className="shortcut-row">
            <dt className="flex flex-wrap gap-1.5">
              <span className="sr-only">{s.keys.join(' ')}</span>
              {s.keys.map(k => (
                <KeyBadge key={k}>{s.icon && <span aria-hidden="true" className="mr-1.5">{s.icon}</span>}{k}</KeyBadge>
              ))}
            </dt>
            <dd className="text-gray-800">{t(s.label)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function IntroScreen({ onContinue }: { onContinue: () => void }) {
  const lang = useLang()
  useEffect(() => {
    sr.setScreenScript(TUTORIAL.map(line => t(line)))
    return () => sr.setScreenScript(null)
  }, [lang])

  return (
    <AuthShell width="max-w-6xl" braille>
      <p className="auth-eyebrow">{t('Navigation guide')}</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">{t('Welcome to Blind Jobs')}</h1>
      <p className="mt-2 text-gray-700">{t('Use the keyboard, a mouse or touch — everything works with each. The screen reader reads focused items aloud.')}</p>

      {/* Two columns on wide screens so the whole guide fits without scrolling;
          Continue sits centred under both. DOM order = reading/Tab order. */}
      <div className="guide-grid">
        <GuideList id="guide-keyboard" title={t('Keyboard')} items={KEYBOARD} />
        <GuideList id="guide-mouse" title={t('Mouse or touch')} items={MOUSE} />
      </div>
      <div className="guide-continue">
        <button type="button" className="btn-primary w-full" onClick={onContinue} autoFocus>{t('Continue to sign in')}</button>
        <p className="mt-3 text-center text-base text-gray-600">{t('Continue is already focused — press')} <kbd className="font-mono font-semibold">{t('Enter')}</kbd> {t('or click it')}</p>
      </div>
    </AuthShell>
  )
}
