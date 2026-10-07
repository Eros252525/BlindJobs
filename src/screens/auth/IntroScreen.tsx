import { AuthShell } from '@/components/auth/AuthShell'
import { KeyBadge } from '@/components/ui/KeyBadge'

type GuideItem = { keys: string[]; icon?: string; label: string }

// Labels are kept to one line at desktop width so the whole guide fits on screen;
// the key badges carry the rest (e.g. "Alt" + "number").
const KEYBOARD: GuideItem[] = [
  { keys: ['↑', '↓', '←', '→'], label: 'Move to the nearest item' },
  { keys: ['Tab'], label: 'Next item (Shift + Tab goes back)' },
  { keys: ['Enter'], label: 'Press the focused button or link' },
  { keys: ['Esc'], label: 'Close a menu or pop-up' },
  { keys: ['Alt', 'number'], label: 'Jump to a menu section, once signed in' },
  { keys: ['F2'], label: 'Turn the screen reader on or off' },
]

const MOUSE: GuideItem[] = [
  { keys: ['Click'], icon: '🖱', label: 'Press any button, link or field' },
  { keys: ['Scroll'], icon: '🖱', label: 'Move up and down the page' },
  { keys: ['Screen Reader'], icon: '🔊', label: 'Bottom-right button: reader on or off' },
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
            <dd className="text-gray-800">{s.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function IntroScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <AuthShell width="max-w-6xl" braille>
      <p className="auth-eyebrow">Navigation guide</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Welcome to Blind Jobs</h1>
      <p className="mt-2 text-gray-700">Use the keyboard, a mouse or touch — everything works with each. The screen reader reads focused items aloud.</p>

      {/* Two columns on wide screens so the whole guide fits without scrolling;
          Continue sits under the shorter column. DOM order = reading/Tab order. */}
      <div className="guide-grid">
        <GuideList id="guide-keyboard" title="Keyboard" items={KEYBOARD} />
        <div className="guide-side">
          <GuideList id="guide-mouse" title="Mouse or touch" items={MOUSE} />
          <div className="guide-continue">
            <button type="button" className="btn-primary w-full" onClick={onContinue} autoFocus>Continue to sign in</button>
            <p className="mt-3 text-center text-base text-gray-600">Continue is already focused — press <kbd className="font-mono font-semibold">Enter</kbd> or click it</p>
          </div>
        </div>
      </div>
    </AuthShell>
  )
}
