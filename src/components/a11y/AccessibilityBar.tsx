import { useEffect, useState } from 'react'
import * as sr from '@/lib/a11y/screen-reader'
import { getLang, setLang, t } from '@/lib/i18n'
import { onOpenDisplaySettings, useDisplaySettings } from '@/lib/a11y/display-settings'
import { DisplaySettingsDialog } from './DisplaySettingsDialog'

// Fixed bottom-right on every screen: the language, Display settings, and the built-in Screen Reader.
export function AccessibilityBar({ srEnabled, onToggleSr }: { srEnabled: boolean; onToggleSr: () => void }) {
  const [settings, update] = useDisplaySettings()
  const [open, setOpen] = useState(false)
  const [said, setSaid] = useState('')
  useEffect(() => onOpenDisplaySettings(() => setOpen(true)), [])

  // The button names the language it switches to, written in that language, so
  // someone who reads only that language can find it
  const other = getLang() === 'en' ? { lang: 'fil' as const, name: 'Filipino' } : { lang: 'en' as const, name: 'English' }
  const switchLanguage = () => {
    setLang(other.lang)
    const done = t('The page is now in {language}.', { language: other.name })
    setSaid(done); sr.announce(done)
  }

  return (
    <>
      <div data-a11y-bar className="fixed bottom-4 right-4 z-50 flex flex-wrap justify-end items-center gap-2">
        <button type="button" onClick={switchLanguage} className="a11y-display-btn" lang={other.lang}
          aria-label={other.lang === 'fil' ? 'Filipino. Gawing Filipino ang wika ng page.' : 'English. Switch the page to English.'}>
          <span aria-hidden="true" className="a11y-display-icon">🌐</span>
          <span className="a11y-label">{other.name}</span>
        </button>
        <button type="button" onClick={() => setOpen(true)} className="a11y-display-btn" aria-haspopup="dialog" aria-label={t('Display settings')}>
          <span aria-hidden="true" className="a11y-display-icon">Aa</span>
          <span className="a11y-label">{t('Display')}</span>
        </button>
        <button type="button" onClick={onToggleSr} className={`a11y-toggle ${srEnabled ? 'is-on' : ''}`}
          aria-label={srEnabled ? t('Screen Reader: on. Click or press F2 to toggle.') : t('Screen Reader: off. Click or press F2 to toggle.')}
          aria-keyshortcuts="F2">
          <span className="a11y-led" aria-hidden="true" />
          <span className="text-xl" aria-hidden="true">{srEnabled ? '🔊' : '🔇'}</span>
          <span className="a11y-label">{srEnabled ? t('Screen Reader: ON') : t('Screen Reader: OFF')}</span>
          <kbd className="a11y-toggle-key">F2</kbd>
        </button>
      </div>
      {/* for screen readers: says the language changed (WCAG 4.1.3) */}
      <p role="status" className="sr-only">{said}</p>
      {/* outside the bar, so the bar's zoom setting does not shrink the dialog */}
      {open && <DisplaySettingsDialog settings={settings} onChange={update} onClose={() => setOpen(false)} />}
    </>
  )
}
