import { useEffect, useState } from 'react'

// The current time, refreshed every `everyMs` (a minute by default), so text like
// "Posted 5 minutes ago" keeps counting while the page stays open.
export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}
