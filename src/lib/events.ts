// Datová vrstva pro Kalendář / Úkoly. Jedna tabulka `udalosti` pohání kalendář,
// seznam úkolů i denní agendu na dashboardu.
import { supabase } from './supabase'
import {
  Home, Handshake, Phone, Send, Camera, FileSignature, DoorOpen, CheckSquare, CalendarDays,
  type LucideIcon
} from 'lucide-react'

export type EventType =
  | 'prohlidka' | 'schuzka' | 'telefonat' | 'followup'
  | 'foceni' | 'podpis' | 'openhouse' | 'ukol' | 'jine'

export interface EventItem {
  id: string
  created_at: string
  lead_id: string | null
  title: string
  type: EventType
  start_at: string
  end_at: string | null
  all_day: boolean
  location: string | null
  note: string | null
  reminder_min: number | null
  done: boolean
  result: string | null
}

export interface EventTypeMeta {
  value: EventType
  label: string
  icon: LucideIcon
  /** Akcentní barva pro bloky v kalendáři. */
  color: string
  /** Měkké pozadí + text pro štítky. */
  soft: string
}

/** Typy událostí s barvami dle zadání (prohlídka modrá, schůzka zelená, focení oranžová…). */
export const EVENT_TYPES: EventTypeMeta[] = [
  { value: 'prohlidka', label: 'Prohlídka', icon: Home, color: '#3B8EF0', soft: 'bg-sky-soft text-sky' },
  { value: 'schuzka', label: 'Schůzka', icon: Handshake, color: '#0FA968', soft: 'bg-emerald-soft text-emerald' },
  { value: 'telefonat', label: 'Telefonát', icon: Phone, color: '#8A8F98', soft: 'bg-canvas text-tx-soft' },
  { value: 'followup', label: 'Follow-up', icon: Send, color: '#C9A14A', soft: 'bg-brand-soft text-brand-dark' },
  { value: 'foceni', label: 'Focení', icon: Camera, color: '#E8920C', soft: 'bg-amber-soft text-amber' },
  { value: 'podpis', label: 'Podpis smlouvy', icon: FileSignature, color: '#9333EA', soft: 'bg-[#F0E7FB] text-[#9333EA]' },
  { value: 'openhouse', label: 'Open house', icon: DoorOpen, color: '#E5A50A', soft: 'bg-amber-soft text-amber' },
  { value: 'ukol', label: 'Úkol', icon: CheckSquare, color: '#5AA6A0', soft: 'bg-emerald-soft text-emerald' },
  { value: 'jine', label: 'Jiné', icon: CalendarDays, color: '#8A8F98', soft: 'bg-canvas text-tx-soft' }
]

const TYPE_MAP: Record<string, EventTypeMeta> = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t]))

export function eventTypeMeta(t: string | null): EventTypeMeta {
  return TYPE_MAP[t ?? 'jine'] ?? TYPE_MAP.jine
}

/** Typy, které dávají smysl jako „úkol" (bez nutného časového bloku). */
export const TASK_TYPES: EventType[] = ['ukol', 'telefonat', 'followup']

// --- API ---

export async function fetchEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from('udalosti')
    .select('*')
    .order('start_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as EventItem[]
}

export type EventInput = Partial<Omit<EventItem, 'id' | 'created_at'>> & { title: string; start_at: string; type: EventType }

export async function createEvent(input: EventInput): Promise<EventItem> {
  const { data, error } = await supabase.from('udalosti').insert(input).select().single()
  if (error) throw new Error(error.message)
  return data as EventItem
}

export async function updateEvent(id: string, patch: Partial<EventItem>): Promise<void> {
  const { error } = await supabase.from('udalosti').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('udalosti').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Pomůcky pro práci s daty ---

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Pondělí daného týdne (00:00). */
export function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = (x.getDay() + 6) % 7 // pondělí = 0
  x.setDate(x.getDate() - day)
  return x
}

/** „před termínem" — nesplněná událost v minulosti. */
export function isOverdue(e: EventItem): boolean {
  return !e.done && new Date(e.start_at).getTime() < Date.now()
}

export function eventTime(e: EventItem): string {
  return new Date(e.start_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}
