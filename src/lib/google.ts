// Sign in with Google, through Google's own button (Google Identity Services).
// The button proves which Gmail the person owns; the email function checks that with
// Google and signs in to the account using it (see signInWithGoogle in api/email.ts).

/**
 * The OAuth Client ID of the "Blind Jobs" web client in Google Cloud (APIs & Services →
 * Credentials). Not a secret. The email function needs the same value as its
 * GOOGLE_CLIENT_ID secret. While empty, the button is not shown.
 */
export const GOOGLE_CLIENT_ID = '712486402159-albqrb4gora9ia9p0medpqe14721io2o.apps.googleusercontent.com'

let loading: Promise<any> | null = null

/** Google's script, loaded once, on the first page that shows the button. */
export function loadGoogle(): Promise<any> {
  const w = window as any
  if (w.google?.accounts?.id) return Promise.resolve(w.google)
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve(w.google)
    // blocked or offline: the next page that shows the button tries again
    script.onerror = () => { loading = null; script.remove(); reject(new Error('Google sign-in did not load')) }
    document.head.appendChild(script)
  })
  return loading
}
