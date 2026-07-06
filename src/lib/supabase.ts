import { createClient } from '@supabase/supabase-js'

// Připojení k Supabase. Publishable (anon) klíč je určený do prohlížeče.
// Hodnoty lze přepsat přes .env (VITE_SUPABASE_URL / VITE_SUPABASE_KEY).
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://rhdxopvennrbkhkqeqvb.supabase.co'
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_jBA-d9GAB0DeKckQSroAWQ_puCwes1b'

export const TABLE = 'leadyCRM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// --- Datový model (odpovídá tabulce leadyCRM) ---

export type StageKey = 'novy' | 'kontaktovan' | 'schuzka' | 'nabidka' | 'uzavreno' | 'ztraceno'

export interface Stage {
  key: StageKey
  label: string
  accent: string
}

/** Fáze pipeline — sjednocené s daty z webových formulářů. */
export const STAGES: Stage[] = [
  { key: 'novy', label: 'Nový', accent: '#3B8EF0' },
  { key: 'kontaktovan', label: 'Kontaktován', accent: '#C9A14A' },
  { key: 'schuzka', label: 'Schůzka', accent: '#9B7BB8' },
  { key: 'nabidka', label: 'Nabídka', accent: '#5AA6A0' },
  { key: 'uzavreno', label: 'Uzavřeno', accent: '#0FA968' },
  { key: 'ztraceno', label: 'Ztracený', accent: '#E5484D' }
]

export const STAGE_MAP: Record<string, Stage> = Object.fromEntries(STAGES.map((s) => [s.key, s]))
export const CLOSED_STAGES: StageKey[] = ['uzavreno', 'ztraceno']

export interface Lead {
  id: string
  created_at: string
  name: string | null
  email: string | null
  phone: string | null
  source: string | null
  lead_type: string | null // 'poptavka' | 'odhad'
  deal_type: string | null
  property_type: string | null
  location: string | null
  address: string | null
  price: number | null
  price_estimate: number | null
  message: string | null
  tags: string[] | null
  gdpr_consent: boolean | null
  gdpr_consent_at: string | null
  crm_status: StageKey
  crm_note: string | null
  crm_updated_at: string | null
  meeting_at: string | null
  follow_up_at: string | null
  fotky: string[] | null
  birthdate: string | null
  provize: number | null
  priorita: string | null // 'horky' | 'stredni' | 'dlouhodoby'
  last_contact_at: string | null
  doporucil_id: string | null // kdo tento lead doporučil (jiný lead)
  property_id: string | null // nemovitost, o kterou má lead zájem
  kontakt_id: string | null // kanonická osoba v kontaktech (propojeno DB triggerem)
  // Milníky obchodu (proběhlé fáze) — ZDROJ PRAVDY o splnění; aktivita v logu je jen doprovodný append-only záznam.
  schuzka_done_at: string | null
  foceni_done_at: string | null
  prohlidka_done_at: string | null
  smlouva_done_at: string | null
}

// --- API ---

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Lead[]
}

/** Přesun leadu do jiné fáze (drag-drop v pipeline). */
export async function updateLeadStage(id: string, stage: StageKey): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ crm_status: stage, crm_updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ ...patch, crm_updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Ruční vytvoření nového leadu (telefonát, doporučení, walk-in…). */
export async function createLead(input: Partial<Lead>): Promise<void> {
  const { error } = await supabase.from(TABLE).insert({
    crm_status: 'novy',
    crm_updated_at: new Date().toISOString(),
    ...input
  })
  if (error) throw new Error(error.message)
}
