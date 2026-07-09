import { supabase } from './supabase'
import type { StageKey } from './supabase'

export type FollowUpUnit = 'day' | 'month' | 'year'

export interface FollowUpSetting {
  stage: StageKey
  amount: number | null
  unit: FollowUpUnit | null
}

/** Pevná nabídka intervalů — jediný zdroj pravdy pro UI i pro validaci vstupu. */
export const FOLLOWUP_OPTIONS: { amount: number | null; unit: FollowUpUnit | null; label: string }[] = [
  { amount: null, unit: null, label: 'Vypnuto' },
  { amount: 1, unit: 'day', label: '1 den' },
  { amount: 3, unit: 'day', label: '3 dny' },
  { amount: 7, unit: 'day', label: '7 dní' },
  { amount: 14, unit: 'day', label: '14 dní' },
  { amount: 30, unit: 'day', label: '30 dní' },
  { amount: 6, unit: 'month', label: '6 měsíců' },
  { amount: 1, unit: 'year', label: '1 rok' }
]

export function followUpOptionKey(amount: number | null, unit: FollowUpUnit | null): string {
  return amount == null ? 'off' : `${amount}_${unit}`
}

export async function fetchFollowUpSettings(): Promise<FollowUpSetting[]> {
  const { data, error } = await supabase.from('followup_nastaveni').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []) as FollowUpSetting[]
}

export async function updateFollowUpSetting(stage: StageKey, amount: number | null, unit: FollowUpUnit | null): Promise<void> {
  const { error } = await supabase
    .from('followup_nastaveni')
    .update({ amount, unit, updated_at: new Date().toISOString() })
    .eq('stage', stage)
  if (error) throw new Error(error.message)
}
