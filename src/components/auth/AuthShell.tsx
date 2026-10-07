import type { ReactNode } from 'react'
import { BrailleText } from '@/components/a11y/BrailleText'
import { AuthShowcase } from './AuthShowcase'

// Full-screen frame for the signed-out screens: branded backdrop, logo lockup, card.
// `braille` adds the braille backdrop and braille name (welcome + login only).
// `showcase` (login + register) puts the form on the left and the screen-reader /
// braille panel on the right from 1024px up; below that only the form shows.
// Backdrop layers are described in auth.css under "auth shell".
export function AuthShell({ children, width = 'max-w-md', braille = false, showcase }: {
  children: ReactNode; width?: string; braille?: boolean; showcase?: string
}) {
  const brand = (
    <div className="auth-brand">
      <img className="auth-brand-mark" src="/images/logo.jpg" alt="" />
      <div className="flex flex-col gap-1.5">
        {/* Wordmark is set tight like the logo; give assistive tech the spaced name. */}
        <span className="auth-brand-name" aria-hidden="true">BLIND<span>JOBS</span></span>
        <span className="sr-only">Blind Jobs</span>
        {braille && <BrailleText text="blind jobs" className="auth-brand-braille" />}
      </div>
    </div>
  )

  return (
    <main className={`auth-shell ${braille ? 'has-braille' : ''} ${showcase ? 'is-split' : ''}`}>
      <svg className="auth-motif" viewBox="0 0 600 420" fill="none" aria-hidden="true" focusable="false">
        <path d="M-20 420 L190 210 L280 300 L485 95" stroke="currentColor" strokeWidth="56" strokeLinejoin="miter" />
        <path d="M570 10 L435 45 L535 145 Z" fill="currentColor" />
      </svg>
      {showcase ? (
        <div className="auth-split">
          <div className="auth-split-form">
            {brand}
            <div className={`auth-card ${width}`}>{children}</div>
          </div>
          <AuthShowcase heading={showcase} />
        </div>
      ) : (
        <>
          {brand}
          <div className={`auth-card ${width}`}>{children}</div>
        </>
      )}
    </main>
  )
}
