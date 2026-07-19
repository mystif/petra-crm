// Recenze klientů — tabulka `recenze` je sdílená s webem petrazabranska.com.
// Web ji jen ČTE (web_status='online'), CRM ji vytváří/upravuje.
import { supabase } from './supabase'

/** Viditelnost na webu — stejný semafor jako u nemovitostí: online / koncept. */
export type RecenzeWebStatus = 'online' | 'draft'

export interface Recenze {
  id: string
  created_at: string
  jmeno: string
  lokalita: string | null
  text_cs: string
  text_en: string | null
  hodnoceni: number
  oblast: string | null
  foto_path: string | null
  web_status: RecenzeWebStatus
  sort_order: number
}

export const WEB_STATUSES: { value: RecenzeWebStatus; label: string; hint: string; color: string }[] = [
  { value: 'online', label: 'Online', hint: 'Zveřejněno — je vidět na webu', color: '#16A34A' },
  { value: 'draft', label: 'Koncept', hint: 'Rozpracováno — není na webu', color: '#F59E0B' }
]
export function webStatusMeta(s: string | null): { value: RecenzeWebStatus; label: string; hint: string; color: string } {
  return WEB_STATUSES.find((x) => x.value === s) ?? WEB_STATUSES[1]
}

/** Oblasti, ve kterých Petra klientům pomohla — pevná nabídka + možnost vlastní hodnoty (stejně jako LEAD_SOURCES). */
export const REVIEW_CATEGORIES = ['Prodej', 'Nájem', 'Financování', 'Facility služby', 'Odhad ceny', 'Poradenství']

export type RecenzeInput = Partial<Omit<Recenze, 'id' | 'created_at'>>

export async function fetchRecenze(): Promise<Recenze[]> {
  const { data, error } = await supabase
    .from('recenze')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Recenze[]
}

export async function createRecenze(input: RecenzeInput): Promise<Recenze> {
  const { data, error } = await supabase.from('recenze').insert(input).select().single()
  if (error) throw new Error(error.message)
  return data as Recenze
}

export async function updateRecenze(id: string, patch: RecenzeInput): Promise<void> {
  const { error } = await supabase.from('recenze').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRecenze(id: string): Promise<void> {
  const { error } = await supabase.from('recenze').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
