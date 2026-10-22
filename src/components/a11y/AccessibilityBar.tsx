import { useEffect, useState } from 'react'
import { onOpenDisplaySettings, useDisplaySettings } from '@/lib/a11y/display-settings'
import { DisplaySettingsDialog } from './DisplaySettingsDialog'

// Fixed bottom-right on every screen: Display settings + the built-in Screen Reader.
export function AccessibilityBar({ srEnabled, onToggleSr }: { srEnabled: boolean; onToggleSr: () => void }) {
  const [settings, update] = useDisplaySettings()
  const [open, setOpen] = useState(false)
  useEffect(() => onOpenDisplaySettings(() => setOpen(true)), [])

  return (
    <>
      <div data-a11y-bar className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} className="a11y-display-btn" aria-haspopup="dialog">
          <span aria-hidden="true" className="a11y-display-icon">Aa</span>
          <span>Display</span>
        </button>
        <button type="button" onClick={onToggleSr} className={`a11y-toggle ${srEnabled ? 'is-on' : ''}`}
          aria-label={`Screen Reader: ${srEnabled ? 'on' : 'off'}. Click or press F2 to toggle.`}
          aria-keyshortcuts="F2">
          <span className="a11y-led" aria-hidden="true" />
          <span className="text-xl" aria-hidden="true">{srEnabled ? '🔊' : '🔇'}</span>
          <span>Screen Reader: {srEnabled ? 'ON' : 'OFF'}</span>
          <kbd className="a11y-toggle-key">F2</kbd>
        </button>
      </div>
      {/* outside the bar, so the bar's zoom setting does not shrink the dialog */}
      {open && <DisplaySettingsDialog settings={settings} onChange={update} onClose={() => setOpen(false)} />}
    </>
  )
}
