import { Component, type ReactNode } from 'react'
import { t } from '@/lib/i18n'

/**
 * If a screen crashes, show what happened and a way out instead of a blank page,
 * which a screen-reader user cannot tell apart from a page still loading.
 * The message is an alert, so it is read out at once.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: unknown) { console.error('Blind Jobs screen crashed:', error) }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="min-h-screen grid place-items-center p-6 bg-[#0b3b8c]">
        <div role="alert" className="max-w-md w-full bg-white rounded-xl p-6 text-gray-900">
          <h1 className="text-2xl font-bold">{t('Something went wrong on this page')}</h1>
          <p className="mt-2 text-gray-800">{t('Your work that was already saved is safe. Reload the page to try again. If it keeps happening, go back to Home.')}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="btn-primary min-h-11 px-5" onClick={() => window.location.reload()}>{t('Reload the page')}</button>
            <a href="/" className="min-h-11 px-5 inline-flex items-center rounded-md border border-gray-500 font-semibold text-gray-800 hover:bg-gray-50">{t('Go to Home')}</a>
          </div>
        </div>
      </main>
    )
  }
}
