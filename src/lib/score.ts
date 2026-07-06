// Jednoduché skórování leadu (0–100). Pomáhá makléři poznat, na koho se soustředit.
import type { Lead } from './supabase'
import { CLOSED_STAGES } from './supabase'
import { leadValue, lastContactInfo } from './leadDisplay'

export interface ScoreFactor {
  label: string
  points: number
}

export interface LeadScore {
  score: number
  factors: ScoreFactor[]
  band: 'vysoke' | 'stredni' | 'nizke'
  color: string
}

/** Spočítá skóre leadu + rozpad jednotlivých faktorů. */
export function scoreLead(lead: Lead): LeadScore {
  const factors: ScoreFactor[] = []
  const add = (label: string, points: number): void => { if (points !== 0) factors.push({ label, points }) }

  // Zdroj
  if (lead.source === 'Doporučení') add('Doporučení', 30)
  else if (lead.source === 'Webový formulář') add('Web formulář', 10)
  else if (lead.source === 'Sreality') add('Sreality', 5)

  // Hodnota / rozpočet
  const value = leadValue(lead)
  if (value > 10_000_000) add('Rozpočet > 10 mil.', 20)
  else if (value >= 5_000_000) add('Rozpočet 5–10 mil.', 10)

  // Priorita
  if (lead.priorita === 'horky') add('Horký lead', 20)
  else if (lead.priorita === 'stredni') add('Střední priorita', 10)

  // Aktivita / reakce
  const { days } = lastContactInfo(lead)
  if (days <= 7) add('Kontakt < 7 dní', 10)
  else if (days > 30) add('Neaktivní > 30 dní', -20)
  else if (days > 14) add('Neaktivní > 14 dní', -10)

  // Pokročilá fáze
  if (lead.crm_status === 'nabidka') add('Ve fázi Nabídka', 10)
  else if (lead.crm_status === 'schuzka') add('Ve fázi Schůzka', 8)

  // Milníky obchodu (proběhlé fáze prodeje) — zdroj pravdy jsou sloupce leadu
  if (lead.schuzka_done_at) add('Schůzka proběhla', 6)
  if (lead.foceni_done_at) add('Focení hotové', 6)
  if (lead.prohlidka_done_at) add('Prohlídka proběhla', 10)
  if (lead.rezervace_done_at) add('Rezervace', 14)
  if (lead.smlouva_done_at) add('Smlouva podepsána', 18)

  // Kvalita kontaktu
  if (lead.phone && lead.email) add('Telefon i e-mail', 5)
  if (lead.gdpr_consent) add('GDPR souhlas', 5)

  // Ztracený lead = nulové skóre
  let score = lead.crm_status === 'ztraceno'
    ? 0
    : Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.points, 0)))

  // Uzavřený obchod = maximální skóre
  if (lead.crm_status === 'uzavreno') score = 100

  const band = score >= 70 ? 'vysoke' : score >= 40 ? 'stredni' : 'nizke'
  const color = band === 'vysoke' ? '#0FA968' : band === 'stredni' ? '#E8920C' : '#8A8F98'

  return { score, factors, band, color }
}

/** Je lead „otevřený" (pro řazení/zvýraznění podle skóre)? */
export function isOpenLead(lead: Lead): boolean {
  return !CLOSED_STAGES.includes(lead.crm_status)
}
