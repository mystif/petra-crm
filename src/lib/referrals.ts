// Doporučení klientů — realitní byznys stojí na referencích.
import type { Lead } from './supabase'
import { leadValue } from './leadDisplay'

export interface ReferralSummary {
  count: number   // kolik klientů člověk doporučil
  value: number   // jakou hodnotu přinesli (součet leadů)
  leads: Lead[]
}

/** Koho tento lead doporučil + jakou hodnotu to přineslo. */
export function referralsBy(leads: Lead[], referrerId: string): ReferralSummary {
  const refs = leads.filter((l) => l.doporucil_id === referrerId)
  return { count: refs.length, value: refs.reduce((s, l) => s + leadValue(l), 0), leads: refs }
}

/** Lead, který tento lead doporučil (nebo null). */
export function referrerOf(leads: Lead[], lead: Lead): Lead | null {
  if (!lead.doporucil_id) return null
  return leads.find((l) => l.id === lead.doporucil_id) ?? null
}

export interface TopReferrer {
  lead: Lead
  count: number
  value: number
}

/** Žebříček nejlepších doporučitelů. */
export function topReferrers(leads: Lead[], limit = 5): TopReferrer[] {
  const agg = new Map<string, { count: number; value: number }>()
  for (const l of leads) {
    if (!l.doporucil_id) continue
    const cur = agg.get(l.doporucil_id) ?? { count: 0, value: 0 }
    cur.count += 1
    cur.value += leadValue(l)
    agg.set(l.doporucil_id, cur)
  }
  const out: TopReferrer[] = []
  for (const [id, s] of agg) {
    const lead = leads.find((l) => l.id === id)
    if (lead) out.push({ lead, count: s.count, value: s.value })
  }
  return out.sort((a, b) => b.count - a.count || b.value - a.value).slice(0, limit)
}
