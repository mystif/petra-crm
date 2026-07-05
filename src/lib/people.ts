import type { Lead } from './supabase'
import type { SavedContact } from './contacts'

export interface Person { key: string; name: string; leadId: string | null; contactId: string | null }

/** Sjednocený adresář osob — lead a kontakt spojené přes kontakt_id se zobrazí jako JEDNA osoba. */
export function mergePeople(leads: Lead[], contacts: SavedContact[]): Person[] {
  const byContact = new Map<string, Person>()
  for (const c of contacts) byContact.set(c.id, { key: `contact:${c.id}`, name: c.name || 'Bez jména', leadId: null, contactId: c.id })
  const standalone: Person[] = []
  for (const l of leads) {
    if (l.kontakt_id && byContact.has(l.kontakt_id)) {
      byContact.set(l.kontakt_id, { ...byContact.get(l.kontakt_id)!, leadId: l.id })
    } else {
      standalone.push({ key: `lead:${l.id}`, name: l.name || 'Bez jména', leadId: l.id, contactId: l.kontakt_id })
    }
  }
  return [...byContact.values(), ...standalone]
}

/** Jméno osoby podle FK dvojice (seller_lead_id/seller_contact_id apod.) — sleduje kontakt_id, takže neukáže dvakrát stejného člověka. */
export function personName(leadId: string | null, contactId: string | null, leads: Lead[], contacts: SavedContact[]): string | null {
  if (contactId) return contacts.find((c) => c.id === contactId)?.name ?? null
  if (leadId) {
    const l = leads.find((x) => x.id === leadId)
    if (!l) return null
    if (l.kontakt_id) return contacts.find((c) => c.id === l.kontakt_id)?.name ?? l.name
    return l.name
  }
  return null
}

/** Je `leadId`/`contactId` ta samá fyzická osoba jako reference `refLeadId`/`refContactId`? */
export function samePerson(
  a: { leadId: string | null; contactId: string | null },
  b: { leadId: string | null; contactId: string | null },
  leads: Lead[]
): boolean {
  const resolve = (leadId: string | null, contactId: string | null): string | null => {
    if (contactId) return `c:${contactId}`
    if (leadId) {
      const l = leads.find((x) => x.id === leadId)
      return l?.kontakt_id ? `c:${l.kontakt_id}` : `l:${leadId}`
    }
    return null
  }
  const ra = resolve(a.leadId, a.contactId)
  const rb = resolve(b.leadId, b.contactId)
  return ra !== null && ra === rb
}
