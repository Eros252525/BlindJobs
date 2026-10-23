import { t } from '@/lib/i18n'
import type { InboxThread } from '@/types'

// The inbox folders, in the order they are listed. Each is a view of the same
// conversations, not a place they move to.
export type FolderId = 'all' | 'unread' | 'pinned' | 'sent'

export const FOLDERS: { id: FolderId; label: string; icon: string; empty: string }[] = [
  { id: 'all', label: 'Messages', icon: '✉️', empty: 'No conversations yet. When you apply for a job, a conversation with that employer starts here.' },
  { id: 'unread', label: 'Unread', icon: '📩', empty: 'Nothing unread. You are all caught up.' },
  { id: 'pinned', label: 'Pinned', icon: '📌', empty: 'Nothing pinned. Pin a conversation to keep it here.' },
  { id: 'sent', label: 'Sent', icon: '📤', empty: 'Nothing sent yet. Your job applications and the messages you write appear here.' },
]

export const inFolder = (item: InboxThread, f: FolderId) =>
  f === 'unread' ? item.unread > 0 : f === 'pinned' ? item.pinned : f === 'sent' ? item.sentByMe : true

// Labels are English here; shown through t()
export const folderLabel = (f: FolderId) => t(FOLDERS.find(x => x.id === f)!.label)
