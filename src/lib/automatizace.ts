// Automatizační pravidla — uložená v Supabase, vynucená DB triggery na serveru
// (fungují i pro leady z webu, když je appka zavřená).
import { supabase } from './supabase'

export interface Rule {
  key: string
  label: string
  popis: string | null
  enabled: boolean
  poradi: number
  updated_at: string
}

export async function fetchRules(): Promise<Rule[]> {
  const { data, error } = await supabase
    .from('automatizace')
    .select('*')
    .order('poradi', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Rule[]
}

export async function setRuleEnabled(key: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('automatizace')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('key', key)
  if (error) throw new Error(error.message)
}

/** Vizuální popis spouštěče a kroků pro každé pravidlo (skupiny v UI). */
export interface Flow {
  trigger: string
  triggerIcon: 'lead' | 'deal'
  steps: { key: string; fallbackLabel: string }[]
}

export const FLOWS: Flow[] = [
  {
    trigger: 'Když přijde nový lead',
    triggerIcon: 'lead',
    steps: [
      { key: 'novy_lead_kontakt', fallbackLabel: 'Vytvořit kontakt' },
      { key: 'novy_lead_followup', fallbackLabel: 'Follow-up za 1 den' },
      { key: 'novy_lead_ukol', fallbackLabel: 'Úkol „Uvítací hovor“' },
      { key: 'novy_lead_email', fallbackLabel: 'Uvítací e-mail' }
    ]
  },
  {
    trigger: 'Po uzavření obchodu',
    triggerIcon: 'deal',
    steps: [
      { key: 'uzavreno_pripomenuti', fallbackLabel: 'Připomenutí za 6 měsíců' }
    ]
  }
]
