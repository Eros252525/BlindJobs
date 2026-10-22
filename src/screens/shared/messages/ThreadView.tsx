import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { setOpenConversation } from '@/lib/open-conversation'
import { toast } from '@/lib/toast'
import { useStepFocus } from '@/hooks/useStepFocus'
import { BTN_SECONDARY } from '@/components/ui/PageCard'
import { Spinner } from '@/components/ui/Spinner'
import type { InboxThread, Message, MyApplication, User } from '@/types'

/** One conversation: its messages (checked for new ones every 5 seconds) and a box to reply. */
export function ThreadView({ user, thread, otherName, backLabel, onBack, applied, onOpenJob, onDeleteConversation }: {
  user: User
  thread: InboxThread
  otherName: string
  backLabel: string
  onBack: () => void
  /** Set when the applicant applied for this conversation's job. */
  applied?: MyApplication
  onOpenJob?: (jobId: string) => void
  /** Removes the conversation from this user's inbox. */
  onDeleteConversation: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  // the message whose Delete was pressed, waiting for Yes or Cancel
  const [confirming, setConfirming] = useState<string | null>(null)
  const [confirmThread, setConfirmThread] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const headingRef = useStepFocus<HTMLHeadingElement>(thread.id, `Conversation with ${otherName} about ${thread.jobTitle}. ${thread.count} messages.`)

  useEffect(() => {
    setOpenConversation(thread.id)
    // Mark read on opening and again whenever a poll brings something new, so a
    // message read here is not still counted as unread on the bell.
    let seen = -1
    const load = () => api.getMessagesFor(user.id, thread.id).then((ms: Message[]) => {
      setMessages(ms)
      if (ms.length === seen) return
      seen = ms.length
      api.markConversationRead(user.id, thread.id).catch(() => {})
    }).catch(() => {})
    load()
    const t = setInterval(load, 5000)
    return () => { clearInterval(t); setOpenConversation(null) }
  }, [thread.id, user.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const msg = await api.sendMessage(thread.id, user.id, user.name, text.trim())
      setMessages(m => [...m, msg])
      setText('')
    } catch (e: any) { toast(`Message not sent: ${e.message}`, 'error') }
    finally { setSending(false) }
  }

  // Your own message: gone for everyone, leaving "This message was deleted". Theirs: gone from your view only.
  const deleteMessage = async (m: Message) => {
    try {
      if (m.senderId === user.id) {
        await api.deleteMessageForEveryone(thread.id, m.id, user.id)
        setMessages(ms => ms.map(x => (x.id === m.id ? { ...x, text: '', deleted: true } : x)))
      } else {
        await api.deleteMessagesForMe(user.id, thread.id, [m.id])
        setMessages(ms => ms.filter(x => x.id !== m.id))
      }
      setConfirming(null)
      toast('Message deleted.', 'info')
      requestAnimationFrame(() => document.getElementById('msg-reply')?.focus())
    } catch (e: any) { toast(e.message, 'error') }
  }

  return (
    <div className="flex flex-col flex-1 min-h-[28rem]">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className={BTN_SECONDARY}><span aria-hidden="true">‹ </span>{backLabel}</button>
        <div className="min-w-0 flex-1">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-gray-900 focus:outline-none">{otherName}</h2>
          <p className="text-sm text-gray-700">{thread.jobTitle}{applied ? ` · You applied, status: ${applied.stage}` : ''}</p>
        </div>
        <button type="button" onClick={() => setConfirmThread(true)} aria-expanded={confirmThread}
          className="min-h-11 px-4 rounded-md border border-red-700 text-sm font-semibold text-red-700 hover:bg-red-50">
          Delete conversation
        </button>
        {applied && onOpenJob && (
          <button type="button" onClick={() => onOpenJob(applied.job.id)}
            className="min-h-11 px-4 rounded-md border border-[#1a7a3c] text-sm font-semibold text-[#1a7a3c] hover:bg-green-50">
            View the job you applied for
          </button>
        )}
      </div>

      {confirmThread && (
        <div role="alert" className="mx-4 sm:mx-6 mt-4 rounded-lg border-2 border-red-400 p-4">
          <p className="text-sm font-semibold text-gray-900">Delete this conversation from your inbox?</p>
          <p className="text-sm text-gray-700 mt-1">{otherName} keeps their copy. If they write again, the conversation comes back.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={onDeleteConversation} className="min-h-11 px-5 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-md text-sm">Yes, delete it</button>
            <button type="button" onClick={() => setConfirmThread(false)} className={BTN_SECONDARY}>Cancel</button>
          </div>
        </div>
      )}

      {/* role=log announces newly arrived messages (checked every 5 seconds) */}
      <div role="log" aria-label={`Messages with ${otherName}`} className="flex-1 px-4 sm:px-6 py-5 space-y-3 bg-[#f8f9fb]">
        {messages.length === 0 && <p className="text-center text-sm text-gray-600 mt-8">No messages yet. Say hello!</p>}
        {messages.map(m => {
          const mine = m.senderId === user.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%] flex flex-col">
                <div className={`px-4 py-2.5 rounded-xl text-sm ${m.deleted ? 'bg-white border border-dashed border-gray-400 text-gray-700' : mine ? 'bg-[#1a7a3c] text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                  {m.deleted
                    ? <p><span className="sr-only">{mine ? 'You' : m.senderName}: </span><span aria-hidden="true">🚫 </span>This message was deleted</p>
                    : <p className="whitespace-pre-line"><span className="sr-only">{mine ? 'You' : m.senderName} said: </span>{m.text}</p>}
                  <p className={`text-[10px] mt-1 ${mine && !m.deleted ? 'text-green-100' : 'text-gray-600'}`}>
                    {new Date(m.sentAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!m.deleted && (confirming === m.id ? (
                  <div role="alert" className={`mt-1 flex flex-wrap items-center gap-2 ${mine ? 'self-end' : 'self-start'}`}>
                    <span className="text-xs font-semibold text-gray-900">{mine ? 'Delete for everyone?' : 'Delete from your view?'}</span>
                    <button type="button" onClick={() => deleteMessage(m)} className="min-h-8 px-3 rounded-md bg-red-700 hover:bg-red-800 text-white text-xs font-semibold">Delete</button>
                    <button type="button" onClick={() => setConfirming(null)} className="min-h-8 px-3 rounded-md border border-gray-500 bg-white text-xs font-semibold text-gray-800">Cancel</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirming(m.id)}
                    aria-label={`Delete ${mine ? 'your' : `${m.senderName}'s`} message: ${m.text.slice(0, 60)}`}
                    className={`mt-0.5 min-h-6 px-1 text-xs text-gray-600 underline hover:text-red-700 ${mine ? 'self-end' : 'self-start'}`}>
                    Delete
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-3 flex items-center gap-3">
        <label htmlFor="msg-reply" className="sr-only">Message to {otherName}</label>
        <input id="msg-reply" className="input flex-1" type="text" placeholder="Type a message…" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send() } }} />
        <button type="button" onClick={send} disabled={sending || !text.trim()}
          className="min-h-11 bg-[#1a7a3c] hover:bg-[#155f30] text-white rounded-md px-5 text-sm font-semibold transition-colors disabled:opacity-50">
          {sending ? <Spinner label="Sending" /> : 'Send'}
        </button>
      </div>
    </div>
  )
}
