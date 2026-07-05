import { supabase, TABLE, type Lead } from './supabase'
import { upsertContact } from './contacts'
import { contactRole } from './leadDisplay'
import { BUCKET } from './photos'

/**
 * Smaže lead z pipeline včetně všech jeho dat (aktivity přes kaskádu, fotky ze storage),
 * ale osobu nejprve zachová v tabulce kontaktů, aby zůstala v Kontaktech.
 */
export async function deleteLeadKeepContact(lead: Lead): Promise<void> {
  // 1. zachovat kontakt — pokud už je lead propojený (kontakt_id, viz DB trigger
  // link_lead_to_kontakt), kanonický záznam v `kontakty` už existuje a není co upsertovat.
  if (!lead.kontakt_id) {
    await upsertContact({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      role: contactRole(lead),
      city: lead.location,
      gdpr_consent: lead.gdpr_consent,
      birthdate: lead.birthdate
    })
  }

  // 2. smazat fotky ze storage (best effort)
  if (lead.fotky && lead.fotky.length > 0) {
    await supabase.storage.from(BUCKET).remove(lead.fotky).catch(() => {})
  }

  // 3. smazat lead (lead_aktivity se smaže kaskádou)
  const { error } = await supabase.from(TABLE).delete().eq('id', lead.id)
  if (error) throw new Error(error.message)
}
