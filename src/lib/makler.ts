import { supabase, SUPABASE_URL } from './supabase'

export interface Makler {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  photo_path: string | null
  signature: string | null
  ics_token: string | null
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

/** Odkaz na ICS feed kalendáře pro subskripci v telefonu. scheme 'webcal' pro přímé otevření na iPhonu. */
export function icsFeedUrl(token: string, scheme: 'https' | 'webcal' = 'webcal'): string {
  const host = SUPABASE_URL.replace(/^https:\/\//, '')
  return `${scheme}://${host}/functions/v1/ics-feed/${token}`
}

/** Vygeneruje nový náhodný token a uloží ho — starý odkaz tím okamžitě přestane fungovat. */
export async function regenerateIcsToken(id: string): Promise<string> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  await updateMakler(id, { ics_token: token })
  return token
}
