export function initials(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function stageColor(stage: string) {
  if (stage === 'Hired') return 'bg-[#1a4fa0] text-white'
  if (stage === 'Rejected') return 'bg-red-700 text-white'
  if (stage === 'Interviewing') return 'bg-yellow-100 text-yellow-700'
  return 'bg-blue-100 text-blue-700'
}

/** "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago", then the date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const minutes = Math.floor((now - then) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

/** The full date and time, for a tooltip or a screen reader beside a "3 hours ago". */
export const fullDateTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })
}
