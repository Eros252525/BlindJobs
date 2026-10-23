import { useEffect, type CSSProperties } from 'react'
import { t } from '@/lib/i18n'
import { ModalDialog } from '@/components/ui/ModalDialog'
import {
  DEFAULT_DISPLAY, FONTS, SPACINGS, TEXT_SIZES, THEMES, loadFont,
  type DisplaySettings,
} from '@/lib/a11y/display-settings'

// Every change applies immediately (the page behind is the live preview) and is
// saved on this device. Native radio groups: arrows move within a group, Tab
// moves to the next group.
export function DisplaySettingsDialog({ settings, onChange, onClose }: {
  settings: DisplaySettings; onChange: (patch: Partial<DisplaySettings>) => void; onClose: () => void
}) {
  // fetch every font once so each option can be shown in its own typeface
  useEffect(() => { FONTS.forEach(f => loadFont(f.value)) }, [])

  return (
    <ModalDialog labelledBy="ds-title" onClose={onClose} returnFocusTo=".a11y-display-btn" wide>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="ds-title" className="text-2xl font-bold text-gray-900">{t('Display settings')}</h2>
            <p className="mt-1 text-base text-gray-700">{t('Changes apply straight away and are saved on this device.')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Close display settings')}
            className="w-11 h-11 shrink-0 grid place-items-center rounded-md text-gray-700 hover:bg-gray-100 text-xl">
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Visual sample only: shapes low-vision readers commonly confuse */}
        <div aria-hidden="true" className="mt-5 rounded-lg border border-gray-300 bg-gray-50 px-5 py-4">
          <p className="text-lg font-semibold text-gray-900">{t('Find work that fits you.')}</p>
          <p className="mt-1 text-base text-gray-700">{t('Similar shapes stay apart: 0 O · 1 l I · 5 S · 8 B · rn m')}</p>
        </div>

        <OptionGroup legend="Text size" name="ds-size"
          value={String(settings.size)}
          onChange={v => onChange({ size: Number(v) })}
          options={TEXT_SIZES.map(s => ({ value: String(s.value), label: s.label }))} />

        <OptionGroup legend="Font" name="ds-font"
          value={settings.font}
          onChange={v => onChange({ font: v as DisplaySettings['font'] })}
          options={FONTS.map(f => ({ value: f.value, label: f.label, hint: f.hint, labelStyle: f.family ? { fontFamily: f.family } : undefined }))} />

        <OptionGroup legend="Colours" name="ds-theme"
          value={settings.theme}
          onChange={v => onChange({ theme: v as DisplaySettings['theme'] })}
          options={THEMES.map(item => ({ value: item.value, label: item.label, hint: item.hint, swatch: item.swatch }))} />

        <OptionGroup legend="Spacing" name="ds-spacing"
          value={settings.spacing}
          onChange={v => onChange({ spacing: v as DisplaySettings['spacing'] })}
          options={SPACINGS.map(s => ({ value: s.value, label: s.label, hint: s.hint }))} />

        <label className="mt-6 flex items-start gap-3 rounded-lg border-2 border-gray-300 p-3 cursor-pointer hover:bg-gray-50">
          <input type="checkbox" checked={settings.bold} onChange={e => onChange({ bold: e.target.checked })}
            className="mt-1 w-5 h-5 shrink-0 accent-[#1a4fa0]" />
          <span>
            <span className="block font-semibold text-gray-900">{t('Heavier text')}</span>
            <span className="block text-sm text-gray-700">{t('Makes thin letters thicker and easier to see.')}</span>
          </span>
        </label>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={onClose} className="btn-primary px-6">{t('Done')}</button>
          <button type="button" onClick={() => onChange(DEFAULT_DISPLAY)}
            className="min-h-10 px-5 rounded-md border border-gray-500 bg-white text-gray-800 font-semibold hover:bg-gray-50">
            {t('Reset to default')}
          </button>
        </div>
      </div>
    </ModalDialog>
  )
}

type Option = { value: string; label: string; hint?: string; labelStyle?: CSSProperties; swatch?: { bg: string; fg: string } }

function OptionGroup({ legend, name, value, onChange, options }: {
  legend: string; name: string; value: string; onChange: (v: string) => void; options: Option[]
}) {
  return (
    <fieldset className="mt-6">
      <legend className="mb-2 text-lg font-bold text-gray-900">{legend}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(o => {
          const checked = o.value === value
          const labelId = `${name}-${o.value}-label`
          const hintId = o.hint ? `${name}-${o.value}-hint` : undefined
          // name = title only, hint = description, so nothing is read twice
          return (
            <label key={o.value}
              className={`flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer ${checked ? 'border-[#1a4fa0] bg-[#eff6ff]' : 'border-gray-300 hover:bg-gray-50'}`}>
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)}
                aria-labelledby={labelId} aria-describedby={hintId} className="mt-1 w-5 h-5 shrink-0 accent-[#1a4fa0]" />
              {o.swatch && (
                <span aria-hidden="true" className="w-11 h-11 shrink-0 rounded-md grid place-items-center text-lg font-bold border border-gray-500"
                  style={{ background: o.swatch.bg, color: o.swatch.fg }}>Aa</span>
              )}
              <span className="min-w-0">
                <span id={labelId} className="block font-semibold text-gray-900" style={o.labelStyle}>{o.label}</span>
                {o.hint && <span id={hintId} className="block text-sm text-gray-700">{o.hint}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
