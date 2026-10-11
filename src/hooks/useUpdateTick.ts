import { useEffect, useState } from 'react'
import { APPLICATION_UPDATE_EVENT } from '@/constants'

// Counts up each time the notification bell reports something new (an application
// moved or arrived, a matching job was posted). Put it in the dependencies of a
// data-loading effect so the screen reloads and matches what was just announced.
export function useUpdateTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const onUpdate = () => setTick(n => n + 1)
    window.addEventListener(APPLICATION_UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(APPLICATION_UPDATE_EVENT, onUpdate)
  }, [])
  return tick
}
