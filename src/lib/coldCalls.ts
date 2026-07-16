import { supabase, SUPABASE_URL } from './supabase'

export type ColdCallStatus = 'novy' | 'zavolano' | 'nezajem' | 'domluveno'

export interface ColdCall {
  id: string
  created_at: string
  source_url: string
  title: string | null
  property_type: string | null
  disposition: string | null
  offer_type: string | null
  locality: string | null
  price_czk: number | null
  seller_name: string | null
  company: string | null
  phone: string | null
  email: string | null
  status: ColdCallStatus
  note: string | null
}

export const COLD_CALL_STATUSES: { value: ColdCallStatus; label: string; cls: string }[] = [
  { value: 'novy', label: 'K volání', cls: 'bg-amber-soft text-amber' },
  { value: 'zavolano', label: 'Zavoláno', cls: 'bg-sky-soft text-sky' },
  { value: 'domluveno', label: 'Domluveno', cls: 'bg-emerald-soft text-emerald' },
  { value: 'nezajem', label: 'Nezájem', cls: 'bg-canvas text-tx-soft' }
]
export function coldCallStatusMeta(s: string | null): { label: string; cls: string } {
  return COLD_CALL_STATUSES.find((x) => x.value === s) ?? { label: s ?? '—', cls: 'bg-canvas text-tx-soft' }
}

/** Data vytěžená z inzerátu edge funkcí sreality-fetch. */
export interface SrealityScrape {
  ok: true
  title: string | null
  property_type: string | null
  disposition: string | null
  offer_type: string | null
  locality: string | null
  price_czk: number | null
  seller_name: string | null
  company: string | null
  phone: string | null
  email: string | null
  source_url: string
}

/** Zavolá edge funkci, která z URL inzerátu ze sreality.cz vytáhne data (obchází anti-bot přes SeznamBot UA). */
export async function scrapeSreality(url: string): Promise<SrealityScrape> {
  const key = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_jBA-d9GAB0DeKckQSroAWQ_puCwes1b'
  const res = await fetch(`${SUPABASE_URL}/functions/v1/sreality-fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ url })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) throw new Error(data.error || 'Inzerát se nepodařilo načíst.')
  return data as SrealityScrape
}

export async function fetchColdCalls(): Promise<ColdCall[]> {
  const { data, error } = await supabase.from('cold_calls').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ColdCall[]
}

export async function createColdCall(input: Partial<Omit<ColdCall, 'id' | 'created_at'>>): Promise<ColdCall> {
  const { data, error } = await supabase.from('cold_calls').insert(input).select().single()
  if (error) throw new Error(error.message)
  return data as ColdCall
}

export async function updateColdCall(id: string, patch: Partial<ColdCall>): Promise<void> {
  const { error } = await supabase.from('cold_calls').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteColdCall(id: string): Promise<void> {
  const { error } = await supabase.from('cold_calls').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
