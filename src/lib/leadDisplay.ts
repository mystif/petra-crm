// Pomůcky pro zobrazení leadu v UI (popisky, barvy zdrojů, typů).
import type { Lead } from './supabase'
import { Globe, Calculator, Building, Star, HelpCircle } from 'lucide-react'

export const PROPERTY_LABELS: Record<string, string> = {
  byt: 'Byt',
  dum: 'Dům',
  pozemek: 'Pozemek',
  komercni: 'Komerční',
  pronajem: 'Pronájem'
}

export function propertyLabel(t: string | null): string {
  if (!t) return 'Nemovitost'
  return PROPERTY_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1)
}

/** Typ nemovitosti u leadu — volný výběr (na rozdíl od PROPERTY_LABELS, které popisují hodnoty z webu). */
export const PROPERTY_OPTIONS = ['byt', 'dům', 'pozemek', 'komerční', 'pronájem']

export function isEstimate(lead: Lead): boolean {
  return lead.lead_type === 'odhad' || (lead.price_estimate != null && lead.price == null)
}

/** Hodnota leadu pro souhrny — cena, jinak odhad. */
export function leadValue(lead: Lead): number {
  return Number(lead.price ?? lead.price_estimate ?? 0)
}

/** Barva + ikona podle zdroje poptávky. */
export function sourceStyle(source: string | null): { cls: string; icon: typeof Globe } {
  switch (source) {
    case 'Webový formulář':
      return { cls: 'bg-sky-soft text-sky', icon: Globe }
    case 'Sreality':
      return { cls: 'bg-emerald-soft text-emerald', icon: Building }
    case 'Odhad ceny':
      return { cls: 'bg-amber-soft text-amber', icon: Calculator }
    case 'Doporučení':
      return { cls: 'bg-brand-soft text-brand-dark', icon: Star }
    default:
      return { cls: 'bg-canvas text-tx-soft', icon: HelpCircle }
  }
}

/** Lead vznikl přímo na webu petrazabranska.com (kontaktní formulář, odhad ceny, doporučení). */
export function isWebLead(lead: Lead): boolean {
  return lead.source === 'Webový formulář' || lead.source === 'Odhad ceny' || lead.source === 'Doporučení'
}

/** Doporučitel = člověk, který jen přivádí klienty (sám o nic nemá zájem). */
export function isReferrer(lead: Lead): boolean {
  return lead.lead_type === 'doporucitel'
}

export type LeadRole = 'prodavajici' | 'nakupujici' | 'pronajimatel' | 'najemce'

const ROLE_LABEL: Record<LeadRole, string> = {
  prodavajici: 'Prodávající',
  nakupujici: 'Nakupující',
  pronajimatel: 'Pronajímatel',
  najemce: 'Nájemce'
}
/** Role → deal_type (drží se v synchronu při zápisu; pronajímatel i nájemce = 'pronájem'). */
export const ROLE_TO_DEAL: Record<LeadRole, string> = {
  prodavajici: 'prodej',
  nakupujici: 'koupě',
  pronajimatel: 'pronájem',
  najemce: 'pronájem'
}

/** Kanonická role leadu: lead_role, jinak fallback odvozený z deal_type (web/legacy leady). */
export function leadRole(lead: Lead): LeadRole | null {
  if (isReferrer(lead)) return null
  if (lead.lead_role) return lead.lead_role as LeadRole
  switch (lead.deal_type) {
    case 'prodej': return 'prodavajici'
    case 'koupě': return 'nakupujici'
    case 'pronájem': return 'najemce' // web „pronájem" = poptávka nájmu; pronajímatele nastaví makléřka ručně
    default: return null
  }
}
export function roleLabel(r: LeadRole): string { return ROLE_LABEL[r] }

/** Nabízí lead nemovitost? (Prodávající / Pronajímatel) vs. poptávka (Nakupující / Nájemce). */
export function isOffer(lead: Lead): boolean {
  const r = leadRole(lead)
  return r === 'prodavajici' || r === 'pronajimatel'
}

/** Role kontaktu (label) — z kanonické role leadu. */
export function contactRole(lead: Lead): string {
  if (isReferrer(lead)) return 'Doporučitel'
  const r = leadRole(lead)
  return r ? ROLE_LABEL[r] : 'Zájemce'
}

/** Deterministický odstín náhledu podle id (stabilní mezi rendery). */
export function hueFromId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  return h
}

/** Odkaz na Google Mapy podle adresy/lokality (otevře pin). */
export function mapUrl(lead: Lead): string | null {
  const q = [lead.address, lead.location].filter(Boolean).join(', ').trim()
  if (!q) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

// --- Priorita ---

export interface PriorityMeta {
  value: string
  label: string
  emoji: string
  cls: string
  dot: string
}

export const PRIORITIES: PriorityMeta[] = [
  { value: 'horky', label: 'Horký lead', emoji: '🔥', cls: 'bg-rose-soft text-rose', dot: '#E5484D' },
  { value: 'stredni', label: 'Střední', emoji: '🟡', cls: 'bg-amber-soft text-amber', dot: '#E8920C' },
  { value: 'dlouhodoby', label: 'Dlouhodobý', emoji: '🔵', cls: 'bg-sky-soft text-sky', dot: '#3B8EF0' }
]

export function priorityMeta(p: string | null): PriorityMeta | null {
  return PRIORITIES.find((x) => x.value === p) ?? null
}

// --- Poslední kontakt ---

/** Info o posledním kontaktu — počet dní, text a příznak „prošlé" (>14 dní). */
export function lastContactInfo(lead: Lead): { days: number; stale: boolean; text: string } {
  const base = lead.last_contact_at || lead.created_at
  const days = Math.floor((Date.now() - new Date(base).getTime()) / 86_400_000)
  const text = days <= 0 ? 'dnes' : days === 1 ? 'včera' : `před ${days} dny`
  return { days, stale: days > 14, text }
}

/** WhatsApp odkaz z telefonu (jen číslice, předvolba +420 pokud chybí). */
export function whatsappUrl(phone: string | null): string | null {
  if (!phone) return null
  let digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.length === 9) digits = '420' + digits // české číslo bez předvolby
  if (digits.length < 9) return null
  return `https://wa.me/${digits}`
}

/** Zdroje leadu („Odkud přišel") — realitní portály + kontaktní kanály. Sdíleno LeadDetail i NewLeadForm. */
export const LEAD_SOURCES = [
  'Web', 'Sreality', 'Annonce', 'Pražské reality', 'RealHit', 'Reality.cz',
  'Domybytypozemky', 'realityČechy', 'iDnesReality', 'Realitymix', 'Českéreality',
  'Telefonát', 'Email', 'Dopis'
]

/** Podíl kanceláře makléře na provizi (%). Výchozí 50 %. */
export function officePct(lead: Lead): number {
  const p = lead.provize_kancelar_pct
  return p == null ? 50 : p
}
/** Reálná provize makléře = hrubá provize po odečtení podílu kanceláře. */
export function maklerProvize(lead: Lead): number {
  return Number(lead.provize || 0) * (100 - officePct(lead)) / 100
}
