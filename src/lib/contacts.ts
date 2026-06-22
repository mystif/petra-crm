import { supabase } from './supabase'

export interface SavedContact {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  role: string | null
  city: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export async function fetchSavedContacts(): Promise<SavedContact[]> {
  const { data, error } = await supabase
    .from('kontakty')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as SavedContact[]
}

/**
 * Uloží kontakt do tabulky kontaktů. Nejprve zkontroluje, zda už osoba
 * (podle e-mailu nebo telefonu) neexistuje — aby nevznikaly duplicity.
 */
export async function upsertContact(c: {
  name: string | null
  phone: string | null
  email: string | null
  role: string | null
  city: string | null
}): Promise<void> {
  // Najdeme existující kontakt podle e-mailu nebo telefonu (samostatné dotazy = bezpečné kódování).
  let existingId: string | null = null
  if (c.email) {
    const { data } = await supabase.from('kontakty').select('id').eq('email', c.email).limit(1)
    if (data && data.length > 0) existingId = data[0].id
  }
  if (!existingId && c.phone) {
    const { data } = await supabase.from('kontakty').select('id').eq('phone', c.phone).limit(1)
    if (data && data.length > 0) existingId = data[0].id
  }

  if (existingId) {
    await supabase.from('kontakty').update({ updated_at: new Date().toISOString() }).eq('id', existingId)
  } else {
    await supabase.from('kontakty').insert(c)
  }
}
