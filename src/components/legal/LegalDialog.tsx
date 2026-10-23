import { useEffect, useState } from 'react'
import { t } from '@/lib/i18n'
import { ModalDialog } from '@/components/ui/ModalDialog'
import { LEGAL_DOCS, onOpenLegal, type LegalDoc, type LegalDocId, type LegalSection } from '@/lib/documents/legal'

// Mounted once in App; `openLegal('privacy' | 'terms' | 'accessibility')` from anywhere shows it.
export function LegalDialogHost() {
  const [doc, setDoc] = useState<LegalDocId | null>(null)
  useEffect(() => onOpenLegal(setDoc), [])
  return doc ? <LegalDialog doc={LEGAL_DOCS[doc]} onClose={() => setDoc(null)} /> : null
}

const sectionText = (s: LegalSection) => [s.heading, ...s.body, ...(s.items ?? [])].join('. ')

// The intro and every section are focus stops (tabIndex 0), which is unusual for
// plain text but needed here: the built-in reader only speaks what is focused.
// This way Tab walks through the whole document, scrolling it and reading it
// aloud, so nobody is asked to agree to text they could not reach.
function LegalDialog({ doc, onClose }: { doc: LegalDoc; onClose: () => void }) {
  const meta = t('Version {v}, effective {date}.', { v: doc.version, date: doc.effective })
  const howTo = `${doc.sections.length} sections. Press Tab to read each one, Escape to close.`

  return (
    // opened from the account menu, its item is gone by the time this closes: return to the menu button
    <ModalDialog labelledBy="legal-title" onClose={onClose} returnFocusTo=".nav-user" wide>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          {/* first focus stop, so opening the dialog starts reading from the top (not from "Close") */}
          <div tabIndex={0} data-speak={`${doc.title}. ${meta} ${doc.summary} ${howTo}`} className="rounded-md">
            <h2 id="legal-title" className="text-2xl font-bold text-gray-900">{doc.title}</h2>
            <p className="mt-1 text-base text-gray-700">{meta}</p>
            <p className="mt-3 text-base text-gray-800">{doc.summary}</p>
            <p className="sr-only">{howTo}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Close {doc}', { doc: t(doc.title) })}
            className="w-11 h-11 shrink-0 grid place-items-center rounded-md text-gray-700 hover:bg-gray-100 text-xl">
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {doc.sections.map((s, i) => {
            const headingId = `legal-sec-${i}`
            return (
              <section key={s.heading} tabIndex={0} aria-labelledby={headingId} data-speak={sectionText(s)}
                className="rounded-md border-t border-gray-200 pt-4 pb-2">
                <h3 id={headingId} className="text-lg font-bold text-gray-900">{i + 1}. {s.heading}</h3>
                {s.body.map(p => <p key={p} className="mt-2 text-base text-gray-800">{p}</p>)}
                {s.items && (
                  <ul className="mt-2 list-disc pl-6 space-y-1.5 text-base text-gray-800">
                    {s.items.map(item => <li key={item}><Item text={item} /></li>)}
                  </ul>
                )}
              </section>
            )
          })}
        </div>

        <div className="mt-6 pt-5 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-primary px-6">{t('Close')}</button>
        </div>
      </div>
    </ModalDialog>
  )
}

// An Accessibility statement item ("1.4.3 Contrast (Minimum) (Level AA). WCAG: “…” Blind Jobs: …")
// is laid out in three parts: the criterion, W3C's words set apart as a quotation, and ours.
// Any other item is plain text.
const CRITERION = /^(.+?\(Level AA?\))\. WCAG: (“.+”) Blind Jobs: (.+)$/s

function Item({ text }: { text: string }) {
  const m = CRITERION.exec(text)
  if (!m) return <>{text}</>
  return (
    <>
      <strong className="text-gray-900">{m[1]}</strong>
      <blockquote className="mt-1 border-l-4 border-gray-400 pl-3 text-gray-700">
        <span className="sr-only">{t('WCAG says:')} </span>{m[2]}
      </blockquote>
      <span className="block mt-1"><span className="font-semibold">{t('How Blind Jobs meets it:')}</span> {m[3]}</span>
    </>
  )
}
