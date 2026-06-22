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

/** Role kontaktu odvozená z typu obchodu. */
export function contactRole(lead: Lead): string {
  switch (lead.deal_type) {
    case 'prodej':
      return 'Prodávající'
    case 'pronájem':
      return 'Pronajímatel'
    case 'koupě':
      return 'Kupující'
    default:
      return 'Zájemce'
  }
}

/** Deterministický odstín náhledu podle id (stabilní mezi rendery). */
export function hueFromId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  return h
}
