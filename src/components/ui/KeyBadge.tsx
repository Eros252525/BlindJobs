import type { ReactNode } from 'react'

export function KeyBadge({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[2.5rem] h-10 px-2.5 border border-gray-400 rounded-md bg-white text-gray-800 text-base font-mono font-semibold shadow-sm">
      {children}
    </kbd>
  )
}
