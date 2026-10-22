// Conversations and messages: the inbox, reading, pinning and deleting.
import type { InboxThread } from '@/types'
import { kvGet, kvList, kvSet } from './client'

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getConversations(userId: string) {
  const [rows, legacy] = await Promise.all([kvList(`conversation_member:${userId}:`), kvGet(`conversations:user:${userId}`)])
  const ids = [...new Set<string>([...(legacy?.ids || []), ...rows.map(r => r.convId)])]
  const convs = await Promise.all(ids.map(id => kvGet(`conversation:${id}`)))
  return convs.filter(Boolean).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
}

export async function createConversation(body: Record<string, any>) {
  const { applicantId, employerId, applicantName, employerName, jobTitle, jobId } = body
  const id = crypto.randomUUID()
  const conv = { id, applicantId, employerId, applicantName, employerName, jobTitle, jobId, createdAt: new Date().toISOString() }
  await kvSet(`conversation:${id}`, conv)
  await Promise.all([applicantId, employerId].map(userId => kvSet(`conversation_member:${userId}:${id}`, { convId: id })))
  return conv
}

export async function getMessages(convId: string) {
  const [rows, legacy] = await Promise.all([kvList(`message:${convId}:`), kvGet(`messages:${convId}`)])
  return [...(legacy?.messages || []), ...rows].sort((a, b) => (a.sentAt || '').localeCompare(b.sentAt || ''))
}

/** The messages one user sees: without the ones they deleted for themselves. */
export async function getMessagesFor(userId: string, convId: string) {
  const [msgs, hidden] = await Promise.all([getMessages(convId), kvGet(`hidden_messages:${userId}:${convId}`)])
  const gone = new Set<string>(Array.isArray(hidden?.ids) ? hidden.ids : [])
  return msgs.filter((m: any) => !gone.has(m.id))
}

/** The sender removes their own message for everyone: its text is erased and it reads "This message was deleted". */
export async function deleteMessageForEveryone(convId: string, messageId: string, userId: string) {
  const key = `message:${convId}:${messageId}`
  const msg = await kvGet(key)
  if (!msg) throw new Error('That message cannot be deleted for everyone. Delete it for yourself instead.')
  if (msg.senderId !== userId) throw new Error('Only the person who wrote a message can delete it for everyone.')
  await kvSet(key, { ...msg, text: '', deleted: true })
}

/** Hides messages from this user's view only; the other person still sees them. */
export async function deleteMessagesForMe(userId: string, convId: string, messageIds: string[]) {
  const key = `hidden_messages:${userId}:${convId}`
  const hidden = await kvGet(key)
  await kvSet(key, { ids: [...new Set([...(Array.isArray(hidden?.ids) ? hidden.ids : []), ...messageIds])] })
}

/**
 * Removes conversations from this user's inbox. The other person keeps theirs,
 * and a conversation comes back if a new message arrives after it was deleted.
 */
export async function deleteConversationsForMe(userId: string, convIds: string[]) {
  const key = `deleted_conversations:${userId}`
  const row = await kvGet(key)
  const at = { ...(row?.at || {}) }
  const now = new Date().toISOString()
  convIds.forEach(id => { at[id] = now })
  await kvSet(key, { at })
  await Promise.all(convIds.map(id => markConversationRead(userId, id)))
}

export async function sendMessage(convId: string, senderId: string, senderName: string, text: string) {
  const msg = { id: crypto.randomUUID(), senderId, senderName, text, sentAt: new Date().toISOString() }
  await kvSet(`message:${convId}:${msg.id}`, msg)
  return msg
}

/** Messages from the other person that arrived after the user last opened that conversation. */
export async function getUnreadMessages(userId: string) {
  const convs = await getConversations(userId)
  const perConv = await Promise.all(convs.map(async c => {
    const [msgs, lastSeen] = await Promise.all([getMessages(c.id), kvGet(`last_seen:${userId}:${c.id}`)])
    return msgs
      .filter(m => m.senderId !== userId && new Date(m.sentAt).getTime() > (lastSeen || 0))
      .map(m => ({ ...m, convId: c.id, jobTitle: c.jobTitle }))
  }))
  return perConv.flat()
}

/**
 * The user's conversations as the inbox lists them, newest activity first: the
 * number of messages, the last one, how many are unread, whether the user has
 * written in it (the Sent folder) and whether they pinned it.
 */
export async function getInbox(userId: string): Promise<InboxThread[]> {
  const [convs, pins, removed] = await Promise.all([
    getConversations(userId), kvGet(`pinned_conversations:${userId}`), kvGet(`deleted_conversations:${userId}`),
  ])
  const pinned = new Set<string>(Array.isArray(pins?.ids) ? pins.ids : [])
  const deletedAt: Record<string, string> = removed?.at || {}
  const threads = await Promise.all(convs.map(async (c: any) => {
    const [msgs, lastSeen] = await Promise.all([getMessagesFor(userId, c.id), kvGet(`last_seen:${userId}:${c.id}`)])
    const last = msgs[msgs.length - 1]
    return {
      ...c,
      count: msgs.length,
      lastAt: last?.sentAt || c.createdAt || '',
      lastText: last ? (last.deleted ? 'This message was deleted' : last.text) : '',
      lastFromMe: last?.senderId === userId,
      unread: msgs.filter((m: any) => m.senderId !== userId && new Date(m.sentAt).getTime() > (lastSeen || 0)).length,
      sentByMe: msgs.some((m: any) => m.senderId === userId),
      pinned: pinned.has(c.id),
    } as InboxThread
  }))
  // a deleted conversation stays gone until something new is said in it
  return threads
    .filter(t => !isDeleted(t, deletedAt))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

const isDeleted = (t: { id: string; lastAt: string }, deletedAt: Record<string, string>) =>
  !!deletedAt[t.id] && t.lastAt <= deletedAt[t.id]

/**
 * Jobs whose conversation this user deleted (and that nobody has written in
 * since). The inbox uses it so the application for that job does not reappear as
 * a "You applied for…" row the moment its conversation is deleted.
 */
export async function getDeletedConversationJobIds(userId: string): Promise<string[]> {
  const [convs, removed] = await Promise.all([getConversations(userId), kvGet(`deleted_conversations:${userId}`)])
  const deletedAt: Record<string, string> = removed?.at || {}
  const ids = Object.keys(deletedAt)
  if (!ids.length) return []
  const out: string[] = []
  await Promise.all(convs.filter((c: any) => deletedAt[c.id] && c.jobId).map(async (c: any) => {
    const msgs = await getMessagesFor(userId, c.id)
    const lastAt = msgs[msgs.length - 1]?.sentAt || c.createdAt || ''
    if (isDeleted({ id: c.id, lastAt }, deletedAt)) out.push(c.jobId)
  }))
  return out
}

/** Pins or unpins conversations for this user only. A row only its owner writes. */
export async function setConversationsPinned(userId: string, convIds: string[], pin: boolean) {
  const pins = await kvGet(`pinned_conversations:${userId}`)
  const ids = new Set<string>(Array.isArray(pins?.ids) ? pins.ids : [])
  convIds.forEach(id => (pin ? ids.add(id) : ids.delete(id)))
  await kvSet(`pinned_conversations:${userId}`, { ids: [...ids] })
}

/** Every conversation the user is in counts as read up to now. */
export async function markAllConversationsRead(userId: string) {
  const convs = await getConversations(userId)
  await Promise.all(convs.map(c => markConversationRead(userId, c.id)))
}

export async function markConversationRead(userId: string, convId: string) {
  await kvSet(`last_seen:${userId}:${convId}`, Date.now())
}
