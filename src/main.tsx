import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import './index.css'
import { applyDisplaySettings, loadDisplaySettings } from './lib/a11y/display-settings'

// Before the first render, so a saved size/theme/font never flashes the default look.
applyDisplaySettings(loadDisplaySettings())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
