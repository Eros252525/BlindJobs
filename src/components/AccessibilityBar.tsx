export function AccessibilityBar({ srEnabled, onToggleSr }: { srEnabled: boolean; onToggleSr: () => void }) {
  return (
    <div data-a11y-bar className="fixed bottom-4 right-4 z-50">
      <button type="button" onClick={onToggleSr} className={`a11y-toggle ${srEnabled ? 'is-on' : ''}`}
        aria-label={`Screen Reader: ${srEnabled ? 'on' : 'off'}. Click or press F2 to toggle.`}
        aria-keyshortcuts="F2">
        <span className="a11y-led" aria-hidden="true" />
        <span className="text-xl" aria-hidden="true">{srEnabled ? '🔊' : '🔇'}</span>
        <span>Screen Reader: {srEnabled ? 'ON' : 'OFF'}</span>
        <kbd className="a11y-toggle-key">F2</kbd>
      </button>
    </div>
  )
}
