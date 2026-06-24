import { supabase } from './supabase'

export interface Makler {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  photo_path: string | null
  signature: string | null
}

/** Načte profil makléře (jeden řádek). */
export async function fetchMakler(): Promise<Makler | null> {
  const { data, error } = await supabase.from('makler').select('*').limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Makler) ?? null
}

export async function updateMakler(id: string, patch: Partial<Makler>): Promise<void> {
  const { error } = await supabase
    .from('makler')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
