import { supabase, TABLE, type Lead } from './supabase'
import { upsertContact } from './contacts'
import { contactRole } from './leadDisplay'
import { BUCKET } from './photos'

/**
 * Smaže lead z pipeline včetně všech jeho dat (aktivity přes kaskádu, fotky ze storage),
 * ale osobu nejprve zachová v tabulce kontaktů, aby zůstala v Kontaktech.
 */
export async function deleteLeadKeepContact(lead: Lead): Promise<void> {
  // 1. zachovat kontakt
  await upsertContact({
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    role: contactRole(lead),
    city: lead.location
  })

  // 2. smazat fotky ze storage (best effort)
  if (lead.fotky && lead.fotky.length > 0) {
    await supabase.storage.from(BUCKET).remove(lead.fotky).catch(() => {})
  }

  // 3. smazat lead (lead_aktivity se smaže kaskádou)
  const { error } = await supabase.from(TABLE).delete().eq('id', lead.id)
  if (error) throw new Error(error.message)
}
