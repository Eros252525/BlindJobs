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

export function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (!Number.isFinite(days)) return ''
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}
