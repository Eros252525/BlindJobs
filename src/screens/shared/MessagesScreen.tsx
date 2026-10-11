import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { setOpenConversation } from '@/lib/open-conversation'
import { toast } from '@/lib/toast'
import { Spinner } from '@/components/ui/Spinner'
import type { Conversation, Message, User } from '@/types'

export function MessagesScreen({ user }: { user: User }) {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.getConversations(user.id).then((cs: Conversation[]) => {
      setConvs(cs)
      setSelected(s => s ?? cs[0] ?? null)
    }).catch(() => {})
  }, [user.id])

  useEffect(() => {
    if (!selected) return
    setOpenConversation(selected.id)
    // Mark read on opening and again whenever a poll brings something new, so a
    // message read here is not still counted as unread on the bell.
    let seen = -1
    const load = () => api.getMessages(selected.id).then((ms: Message[]) => {
      setMessages(ms)
      if (ms.length === seen) return
      seen = ms.length
      api.markConversationRead(user.id, selected.id).catch(() => {})
    }).catch(() => {})
    load()
    const t = setInterval(load, 5000)
    return () => { clearInterval(t); setOpenConversation(null) }
  }, [selected, user.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    if (!text.trim() || !selected || sending) return
    setSending(true)
    try {
      const msg = await api.sendMessage(selected.id, user.id, user.name, text.trim())
      setMessages(m => [...m, msg])
      setText('')
    } catch (e: any) { toast(`Message not sent: ${e.message}`, 'error') }
    finally { setSending(false) }
  }

  const otherName = (c: Conversation) =>
    user.role === 'applicant' ? c.employerName : c.applicantName

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 pb-24 sm:pb-24 md:min-h-0">
    <div className="flex-1 bg-white rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row md:min-h-0">
      <aside className="w-full md:w-72 xl:w-96 shrink-0 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-base font-bold text-[#1a7a3c]">{user.role === 'employer' ? 'Applicant Conversations' : 'Messages'}</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.length === 0 && <p className="text-sm text-gray-600 px-4 py-4">No conversations yet.</p>}
          {convs.map(c => (
            <button key={c.id} onClick={() => setSelected(c)} aria-pressed={selected?.id === c.id}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${selected?.id === c.id ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
              <p className="text-sm font-semibold text-gray-800">{otherName(c)}</p>
              <p className="text-xs text-gray-600">{c.jobTitle}</p>
            </button>
          ))}
        </div>
      </aside>
      <section aria-label="Conversation" className="flex-1 flex flex-col bg-[#f8f9fb]">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center"><p className="text-sm text-gray-600 font-medium">No conversations</p></div>
        ) : (
          <>
            <div className="px-4 py-3 bg-white border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{otherName(selected)}</h2>
              <p className="text-xs text-gray-600">{selected.jobTitle}</p>
            </div>
            {/* role=log announces newly arrived messages (polled every 5s) */}
            <div role="log" aria-label={`Messages with ${otherName(selected)}`} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && <p className="text-center text-xs text-gray-600 mt-8">No messages yet. Say hello!</p>}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${m.senderId === user.id ? 'bg-[#1a7a3c] text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                    <p><span className="sr-only">{m.senderId === user.id ? 'You' : m.senderName} said: </span>{m.text}</p>
                    <p className={`text-[10px] mt-1 ${m.senderId === user.id ? 'text-green-100' : 'text-gray-600'}`}>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </>
        )}
        {/* the card's bottom padding (pb-24) keeps Send clear of the fixed accessibility bar */}
        <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
          <input className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1a7a3c]"
            type="text" placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)}
            aria-label={selected ? `Message to ${otherName(selected)}` : 'Message'}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
          <button onClick={handleSend} disabled={sending || !selected}
            className="bg-[#1a7a3c] hover:bg-[#155f30] text-white rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50">
            {sending ? <Spinner label="Sending" /> : 'Send'}
          </button>
        </div>
      </section>
    </div>
    </div>
  )
}
