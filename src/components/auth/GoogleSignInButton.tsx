import { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID, loadGoogle } from '@/lib/google'
import { t, useLang } from '@/lib/i18n'

/**
 * Google's own "Sign in with Google" button, in the chosen language. Google draws it
 * (it already has its own label for screen readers) and opens its sign-in in a pop-up;
 * `onCredential` gets the ID token when the person has chosen their account.
 * One Tap, the prompt that appears by itself, is left off: an unexpected pop-up
 * would interrupt a screen reader.
 */
export function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const lang = useLang()
  const box = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  // Google keeps the first callback it is given, so it calls through this to the latest one
  const latest = useRef(onCredential)
  latest.current = onCredential

  useEffect(() => {
    let cancelled = false
    loadGoogle().then(google => {
      if (cancelled || !box.current) return
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r: { credential: string }) => latest.current(r.credential),
        ux_mode: 'popup',
        auto_select: false,
      })
      box.current.innerHTML = ''
      google.accounts.id.renderButton(box.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular',
        width: Math.min(400, box.current.clientWidth || 400),
        locale: lang === 'fil' ? 'fil' : 'en',
      })
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [lang])

  if (failed) return <p className="text-gray-700 text-center">{t('Sign in with Google is not available right now. Sign in with your password instead.')}</p>
  return <div ref={box} className="flex justify-center min-h-11" />
}
