import { supabase } from './supabase'

export type ActivityKind = 'email' | 'note' | 'system'

export interface Activity {
  id: string
  lead_id: string
  kind: ActivityKind
  subject: string | null
  note: string | null
  created_at: string
}

export async function fetchActivity(leadId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('lead_aktivity')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Activity[]
}

export async function addActivity(
  leadId: string,
  kind: ActivityKind,
  subject: string | null,
  note: string | null
): Promise<void> {
  const { error } = await supabase
    .from('lead_aktivity')
    .insert({ lead_id: leadId, kind, subject, note })
  if (error) throw new Error(error.message)
}
