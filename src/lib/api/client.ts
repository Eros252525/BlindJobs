// The Supabase connection and the three ways everything else reads and writes it.
// All data lives in one key → JSON table; the storage layout below lists the keys.
import { createClient, SupabaseClient } from '@supabase/supabase-js'

type G = typeof globalThis & { __bjSb?: SupabaseClient }
const g = globalThis as G
if (!g.__bjSb) {
  g.__bjSb = createClient(
    'https://twetarrmrxfdrparsxiz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZXRhcnJtcnhmZHJwYXJzeGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjYwMDAsImV4cCI6MjEwNTMwMjAwMH0.tzIPrIeDGb08d77KYJhdt6RlJx6KTfEKhJcEWJWyWPY',
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'bj-auth' } }
  )
}
export const supabase = g.__bjSb!

export const TABLE = 'kv_store_6ad6397b'

export async function kvGet(key: string): Promise<any> {
  const { data, error } = await supabase.from(TABLE).select('value').eq('key', key).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.value ?? null
}

export async function kvSet(key: string, value: any): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert({ key, value })
  if (error) throw new Error(error.message)
}

export async function kvDelete(key: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('key', key)
  if (error) throw new Error(error.message)
}

// Every value stored under a key prefix. `newest` keeps only the last N keys, for
// prefixes whose keys carry a timestamp. Supabase returns at most 1000 rows.
export async function kvList(prefix: string, newest?: number): Promise<any[]> {
  let query = supabase.from(TABLE).select('value').like('key', `${prefix}%`)
  if (newest) query = query.order('key', { ascending: false }).limit(newest)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []).map(r => r.value)
}

// ── Storage layout ────────────────────────────────────────────────────────────
// One table of key → JSON value. Anything several people add to is stored as one
// row per item under a shared key prefix, so two people saving at the same moment
// can never overwrite each other:
//
//   job:<jobId>                             application:<jobId>:<applicantId>
//   conversation_member:<userId>:<convId>   message:<convId>:<messageId>
//   (applying for a job starts the conversation for it; see startApplicationThread)
//   notification:<userId>:<time>:<id>
//
// These used to be single rows holding a whole list (jobs:list,
// job_applications:<jobId>, conversations:user:<userId>, messages:<convId>).
// Those rows are still read, so data saved before the change keeps showing, but
// they are never written again.
//
// Lists only their owner writes are still single rows: employer_jobs:<employerId>,
// applied_jobs:<applicantId>, notifications_seen:<userId>, pinned_conversations:<userId>,
// deleted_conversations:<userId>, hidden_messages:<userId>:<convId>.
// health_assessment:<userId> is no longer written: the health survey was removed (see health.ts).
