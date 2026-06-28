// „Asistentka Anna" — sestaví denní itinerář z kalendáře, úkolů, follow-upů,
// nových poptávek a narozenin a prioritizuje, co je dnes potřeba udělat.
import { AlertCircle, BellRing, Inbox, Cake, type LucideIcon } from 'lucide-react'
import type { Lead } from './supabase'
import { CLOSED_STAGES } from './supabase'
import { eventTypeMeta, eventTime, type EventItem } from './events'
import { followUpState } from './format'

export interface PlanStep {
  id: string
  kind: 'overdue' | 'meeting' | 'followup' | 'newlead' | 'birthday'
  time: string | null
  title: string
  detail: string | null
  badge: string | null
  icon: LucideIcon
  color: string
  leadId: string | null
}

export interface DailyPlan {
  dateLabel: string
  summary: string
  steps: PlanStep[]
  closing: string
  isEmpty: boolean
}

function startOfToday(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function isBirthdayToday(birthdate: string, today: Date): boolean {
  const b = new Date(birthdate)
  return b.getMonth() === today.getMonth() && b.getDate() === today.getDate()
}
/** České skloňování: [1, 2-4, 5+]. */
function plural(n: number, forms: [string, string, string]): string {
  if (n === 1) return forms[0]
  if (n >= 2 && n <= 4) return forms[1]
  return forms[2]
}

export function buildDailyPlan(leads: Lead[], events: EventItem[]): DailyPlan {
  const today = new Date()
  const todayStart = startOfToday()

  const todaysEvents = events
    .filter((e) => !e.done && sameDay(new Date(e.start_at), today))
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
  const pastDue = events
    .filter((e) => !e.done && new Date(e.start_at) < todayStart)
    .sort((a, b) => a.start_at.localeCompare(b.start_at))

  const openLeads = leads.filter((l) => !CLOSED_STAGES.includes(l.crm_status))
  const followOverdue = openLeads.filter((l) => followUpState(l.follow_up_at) === 'overdue')
  const followToday = openLeads.filter((l) => followUpState(l.follow_up_at) === 'today')
  const newLeads = leads.filter((l) => l.crm_status === 'novy')
  const birthdays = leads.filter((l) => l.birthdate && isBirthdayToday(l.birthdate, today))

  const leadName = (id: string | null): string | null => leads.find((l) => l.id === id)?.name ?? null
  const steps: PlanStep[] = []

  // 1) Po termínu — události z minulých dní
  for (const e of pastDue) {
    const ln = leadName(e.lead_id)
    steps.push({
      id: 'pe-' + e.id, kind: 'overdue', time: null,
      title: e.title, detail: ln, badge: 'Po termínu',
      icon: AlertCircle, color: '#E5484D', leadId: e.lead_id
    })
  }
  // 2) Po termínu — follow-upy
  for (const l of followOverdue) {
    steps.push({
      id: 'fo-' + l.id, kind: 'overdue', time: null,
      title: `Ozvat se: ${l.name ?? 'klient'}`, detail: l.location, badge: 'Follow-up po termínu',
      icon: AlertCircle, color: '#E5484D', leadId: l.id
    })
  }
  // 3) Dnešní program — události s časem (chronologicky)
  for (const e of todaysEvents) {
    const meta = eventTypeMeta(e.type)
    const ln = leadName(e.lead_id)
    steps.push({
      id: 'ev-' + e.id, kind: 'meeting', time: e.all_day ? null : eventTime(e),
      title: e.title, detail: [ln, e.location].filter(Boolean).join(' · ') || null, badge: meta.label,
      icon: meta.icon, color: meta.color, leadId: e.lead_id
    })
  }
  // 4) Follow-upy na dnešek
  for (const l of followToday) {
    steps.push({
      id: 'ft-' + l.id, kind: 'followup', time: null,
      title: `Follow-up: ${l.name ?? 'klient'}`, detail: l.location, badge: 'Dnes',
      icon: BellRing, color: '#C9A14A', leadId: l.id
    })
  }
  // 5) Narozeniny
  for (const l of birthdays) {
    steps.push({
      id: 'bd-' + l.id, kind: 'birthday', time: null,
      title: `${l.name ?? 'Klient'} má dnes narozeniny`, detail: 'Pošlete přání — skvělá příležitost k doporučení', badge: '🎂',
      icon: Cake, color: '#9333EA', leadId: l.id
    })
  }
  // 6) Nové poptávky k vyřízení (max 4)
  for (const l of newLeads.slice(0, 4)) {
    steps.push({
      id: 'nl-' + l.id, kind: 'newlead', time: null,
      title: `Zareagovat na novou poptávku: ${l.name ?? 'lead'}`, detail: l.message || l.location || l.source, badge: 'Nový',
      icon: Inbox, color: '#3B8EF0', leadId: l.id
    })
  }

  // Shrnutí (Anna vyhodnotí den)
  const overdueCount = pastDue.length + followOverdue.length
  const parts: string[] = []
  if (overdueCount > 0) parts.push(`${overdueCount} ${plural(overdueCount, ['věc po termínu', 'věci po termínu', 'věcí po termínu'])}`)
  if (todaysEvents.length > 0) parts.push(`${todaysEvents.length} ${plural(todaysEvents.length, ['událost', 'události', 'událostí'])} v kalendáři`)
  if (followToday.length > 0) parts.push(`${followToday.length} ${plural(followToday.length, ['follow-up', 'follow-upy', 'follow-upů'])} na dnešek`)
  if (newLeads.length > 0) parts.push(`${newLeads.length} ${plural(newLeads.length, ['novou poptávku', 'nové poptávky', 'nových poptávek'])}`)
  if (birthdays.length > 0) parts.push(`${birthdays.length} ${plural(birthdays.length, ['narozeniny', 'narozeniny', 'narozenin'])}`)

  const isEmpty = steps.length === 0
  const summary = isEmpty
    ? 'Dnes nemáte v kalendáři nic naléhavého. Připravila jsem pár tipů, jak den využít.'
    : `Dnes vás čeká ${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' a ' : ''}${parts[parts.length - 1]}.`

  let closing: string
  if (overdueCount > 0) closing = 'Doporučuji začít hned ráno tím, co je po termínu — ať nic dál nečeká.'
  else if (todaysEvents.length > 0) closing = 'Držte se časů u schůzek a den proběhne hladce. Držím palce!'
  else if (newLeads.length > 0) closing = 'Nejdřív bych vyřídila nové poptávky, ať žádný zájemce nezůstane bez reakce.'
  else closing = 'Dnes nic nehoří — ideální čas oslovit pár klientů nebo posunout leady v pipeline blíž k podpisu.'

  // Tipy pro prázdný den (proaktivní doporučení)
  if (isEmpty) {
    steps.push({
      id: 'tip-1', kind: 'newlead', time: null,
      title: 'Projděte si pipeline a posuňte leady k uzavření', detail: 'Každý posun blíž k podpisu se počítá', badge: 'Tip',
      icon: BellRing, color: '#C9A14A', leadId: null
    })
    steps.push({
      id: 'tip-2', kind: 'newlead', time: null,
      title: 'Ozvěte se klientům, se kterými jste dlouho nemluvili', detail: 'Krátký telefonát často přinese doporučení', badge: 'Tip',
      icon: BellRing, color: '#C9A14A', leadId: null
    })
  }

  const dateLabel = today.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return { dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), summary, steps, closing, isEmpty }
}
