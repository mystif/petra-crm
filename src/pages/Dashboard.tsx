import { useState } from 'react'
import { Users, Briefcase, MessageSquare, CheckCircle2, Coins, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, Building2, ClipboardList, Home, Gift } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { AnnaBriefing } from '../components/AnnaBriefing'
import { Loading, ErrorState } from '../components/States'
import { useLeads } from '../lib/leadsContext'
import { useEvents } from '../lib/eventsContext'
import { useListings } from '../lib/listingsContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { CLOSED_STAGES } from '../lib/supabase'
import { formatCZK } from '../lib/format'
import { leadValue, isReferrer } from '../lib/leadDisplay'
import { topReferrers } from '../lib/referrals'
import { eventTypeMeta, isOverdue, sameDay, eventTime, type EventItem } from '../lib/events'
import { statusMeta, formatListingPrice, propertyTypeLabel } from '../lib/listings'
import type { Page } from '../components/Sidebar'
import type { LeadsFilter } from './Leads'

const MONTHS = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro']
const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

/** Procentuální změna current vs previous; null = nelze spočítat (minulé období 0). */
function pct(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null
  return Math.round(((cur - prev) / prev) * 100)
}

export function Dashboard({ onNavigate }: { onNavigate: (p: Page, focus?: LeadsFilter) => void }): JSX.Element {
  const { leads, loading, error, refetch } = useLeads()
  const { events } = useEvents()
  const { listings } = useListings()
  const { openLead } = useLeadDetail()

  const [period, setPeriod] = useState<'mesic' | 'rok'>('mesic')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)

  // Doporučitelé jsou kontakty, ne obchody → z KPI obchodů je vyřadíme.
  const dealLeads = leads.filter((l) => !isReferrer(l))
  const open = dealLeads.filter((l) => !CLOSED_STAGES.includes(l.crm_status))
  const won = dealLeads.filter((l) => l.crm_status === 'uzavreno')
  const fresh = dealLeads.filter((l) => l.crm_status === 'novy')
  const uniqueContacts = new Set(leads.map((l) => (l.email || l.phone || l.id).toLowerCase())).size
  const inMonth = (iso: string | null): boolean => !!iso && new Date(iso) >= monthStart
  const inRange = (iso: string | null, s: Date, e: Date): boolean => { if (!iso) return false; const d = new Date(iso); return d >= s && d < e }

  const provizeMonth = won.filter((l) => inMonth(l.crm_updated_at)).reduce((s, l) => s + Number(l.provize || 0), 0)
  const provizeLastMonth = won.filter((l) => inRange(l.crm_updated_at, lastMonthStart, monthStart)).reduce((s, l) => s + Number(l.provize || 0), 0)
  const provizeYtd = won.filter((l) => l.crm_updated_at && new Date(l.crm_updated_at) >= yearStart).reduce((s, l) => s + Number(l.provize || 0), 0)
  const newContactsMonth = new Set(leads.filter((l) => inMonth(l.created_at)).map((l) => (l.email || l.phone || l.id).toLowerCase())).size
  const provizePctM = pct(provizeMonth, provizeLastMonth)

  // KPI řada (každá karta má ukazatel změny)
  const monthTrend = (n: number): { text: string; positive: boolean } => ({ text: `+${n} tento měsíc`, positive: true })
  const kpis: { label: string; value: string; icon: typeof Users; trend: { text: string; positive: boolean } | null; nav?: Page }[] = [
    { label: 'Nové kontakty', value: String(newContactsMonth), icon: Users, trend: monthTrend(newContactsMonth), nav: 'contacts' },
    { label: 'Aktivní obchody', value: String(open.length), icon: Briefcase, trend: monthTrend(open.filter((l) => inMonth(l.created_at)).length), nav: 'pipeline' },
    { label: 'Nové poptávky', value: String(fresh.length), icon: MessageSquare, trend: monthTrend(fresh.filter((l) => inMonth(l.created_at)).length), nav: 'leads' },
    { label: 'Uzavřené obchody', value: String(won.filter((l) => inMonth(l.crm_updated_at)).length), icon: CheckCircle2, trend: monthTrend(won.filter((l) => inMonth(l.crm_updated_at)).length) },
    { label: 'Provize (měsíc)', value: formatCZK(provizeMonth, true), icon: Coins, trend: provizePctM == null ? null : { text: `${provizePctM >= 0 ? '+' : ''}${provizePctM} % vs minulý`, positive: provizePctM >= 0 } }
  ]

  // Pipeline trychtýř
  const cnt = (k: string): number => dealLeads.filter((l) => l.crm_status === k).length
  const funnel = [
    { label: 'Nové', value: cnt('novy') },
    { label: 'Jednání', value: cnt('kontaktovan') + cnt('schuzka') },
    { label: 'Nabídka', value: cnt('nabidka') },
    { label: 'Uzavřené', value: cnt('uzavreno') }
  ]
  const conversion = Math.round((funnel[3].value / Math.max(1, funnel.reduce((s, f) => s + f.value, 0))) * 1000) / 10

  // Přehled výkonu — škálovatelný dle období (tento měsíc / tento rok)
  const periodStart = period === 'mesic' ? monthStart : yearStart
  const prevStart = period === 'mesic' ? lastMonthStart : lastYearStart
  const prevEnd = periodStart
  const wonSum = (s: Date, e: Date, fn: (l: typeof won[number]) => number): number =>
    won.filter((l) => inRange(l.crm_updated_at, s, e)).reduce((a, l) => a + fn(l), 0)
  const valOf = (l: typeof won[number]): number => leadValue(l)
  const provOf = (l: typeof won[number]): number => Number(l.provize || 0)
  const meetingsIn = (s: Date, e: Date): number => events.filter((ev) => (ev.type === 'schuzka' || ev.type === 'prohlidka') && inRange(ev.start_at, s, e)).length
  const convRate = (s: Date, e: Date): number => {
    const created = dealLeads.filter((l) => inRange(l.created_at, s, e)).length
    return created > 0 ? Math.round((won.filter((l) => inRange(l.crm_updated_at, s, e)).length / created) * 100) : 0
  }
  const perfMetrics = [
    { label: 'Obrat', value: formatCZK(wonSum(periodStart, now, valOf), true), change: pct(wonSum(periodStart, now, valOf), wonSum(prevStart, prevEnd, valOf)) },
    { label: 'Provize', value: formatCZK(wonSum(periodStart, now, provOf), true), change: pct(wonSum(periodStart, now, provOf), wonSum(prevStart, prevEnd, provOf)) },
    { label: 'Počet schůzek', value: String(meetingsIn(periodStart, now)), change: pct(meetingsIn(periodStart, now), meetingsIn(prevStart, prevEnd)) },
    { label: 'Konverze lead → obchod', value: `${convRate(periodStart, now)} %`, change: pct(convRate(periodStart, now), convRate(prevStart, prevEnd)) }
  ]

  // Graf obratu + provize v čase dle období
  const bucket = (s: Date, e: Date, label: string): { label: string; obrat: number; provize: number } =>
    ({ label, obrat: wonSum(s, e, valOf), provize: wonSum(s, e, provOf) })
  const series = period === 'rok'
    ? Array.from({ length: 12 }, (_, m) => bucket(new Date(now.getFullYear(), m, 1), new Date(now.getFullYear(), m + 1, 1), MONTHS[m]))
    : (() => {
        const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const out: { label: string; obrat: number; provize: number }[] = []
        for (let d = 1; d <= days; d += 7) {
          out.push(bucket(new Date(now.getFullYear(), now.getMonth(), d), new Date(now.getFullYear(), now.getMonth(), Math.min(d + 7, days + 1)), `${d}.`))
        }
        return out
      })()

  const todayEvents = events.filter((e) => sameDay(new Date(e.start_at), now)).sort((a, b) => a.start_at.localeCompare(b.start_at))
  const taskDue = events.filter((e) => !e.done && (isOverdue(e) || sameDay(new Date(e.start_at), now))).length
  const activeProps = listings.filter((l) => l.status === 'available').length
  const referrers = topReferrers(leads)

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Přehled"
        subtitle="Souhrn vašeho realitního byznysu"
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
          {/* AI asistentka Anna (jediný tmavý box nahoře) */}
          <AnnaBriefing onNavigate={onNavigate} />

          {/* KPI */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((k) => {
              const Icon = k.icon
              return (
                <button
                  key={k.label}
                  onClick={() => k.nav && onNavigate(k.nav)}
                  disabled={!k.nav}
                  className={`rounded-2xl bg-[#1A1A1A] p-4 text-left ring-1 ring-white/5 shadow-card transition ${k.nav ? 'cursor-pointer hover:ring-gold/40' : 'cursor-default'}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-medium text-white/55">{k.label}</span>
                    <Icon className="h-4 w-4 text-gold" />
                  </div>
                  <div className="mt-2 stat-num text-2xl text-white">{k.value}</div>
                  {k.trend && (
                    <div className={`mt-1 flex items-center gap-1 text-xs font-semibold ${k.trend.positive ? 'text-gold' : 'text-rose'}`}>
                      {k.trend.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />} {k.trend.text}
                    </div>
                  )}
                </button>
              )
            })}
          </section>

          {/* Hlavní řada — na velkém monitoru 4 boxy vedle sebe (2×2 na střední, 1 na mobilu) */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-4">
            {/* Přehled výkonu */}
            <div className="card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-tx">Přehled výkonu</h3>
                <div className="flex gap-0.5 rounded-lg border border-line bg-canvas p-0.5">
                  <button onClick={() => setPeriod('mesic')} className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${period === 'mesic' ? 'bg-ink text-white' : 'text-tx-soft hover:text-tx'}`}>Měsíc</button>
                  <button onClick={() => setPeriod('rok')} className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${period === 'rok' ? 'bg-ink text-white' : 'text-tx-soft hover:text-tx'}`}>Rok</button>
                </div>
              </div>
              <PerfChart data={series} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {perfMetrics.map((m) => (
                  <div key={m.label} className="rounded-xl border border-line p-2.5">
                    <div className="text-[11px] font-medium leading-tight text-tx-soft">{m.label}</div>
                    <div className="stat-num mt-0.5 text-base text-tx">{m.value}</div>
                    <div className={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold ${m.change == null ? 'text-tx-faint' : m.change >= 0 ? 'text-brand-dark' : 'text-rose'}`}>
                      {m.change == null ? '—' : <>{m.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {m.change >= 0 ? '+' : ''}{m.change} %</>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline obchodů */}
            <div className="card p-5">
              <h3 className="mb-4 font-display text-lg font-bold text-tx">Pipeline obchodů</h3>
              <Funnel data={funnel} />
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="text-sm font-semibold text-tx-soft">Konverze lead → obchod</span>
                <span className="stat-num text-xl text-brand-dark">{conversion} %</span>
              </div>
            </div>

            {/* Aktivity */}
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-tx">Aktivity</h3>
                <button onClick={() => onNavigate('calendar')} className="text-sm font-semibold text-brand-dark hover:underline">Vše</button>
              </div>
              <ActivityList events={todayEvents} leads={leads} onOpen={(id) => { const l = leads.find((x) => x.id === id); if (l) openLead(l) }} onEmpty={() => onNavigate('calendar')} />
            </div>

            {/* Kalendář */}
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-tx">Kalendář</h3>
                <button onClick={() => onNavigate('calendar')} className="text-sm font-semibold text-brand-dark hover:underline">Celý</button>
              </div>
              <MiniCalendar now={now} events={events} todayEvents={todayEvents} leads={leads} />
            </div>
          </section>

          {/* Nejnovější nemovitosti */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="font-display text-lg font-bold text-tx">Nejnovější nemovitosti</h3>
              <button onClick={() => onNavigate('properties')} className="text-sm font-semibold text-brand-dark hover:underline">Zobrazit všechny</button>
            </div>
            {listings.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-tx-faint">Zatím žádné nemovitosti. Přidejte první v sekci Nemovitosti.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-y border-line text-left text-[11px] font-bold uppercase tracking-wider text-tx-faint">
                      <th className="px-5 py-2.5">Nemovitost</th>
                      <th className="px-5 py-2.5">Typ</th>
                      <th className="px-5 py-2.5">Lokalita</th>
                      <th className="px-5 py-2.5">Cena</th>
                      <th className="px-5 py-2.5">Stav</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {listings.slice(0, 4).map((l) => {
                      const sm = statusMeta(l.status)
                      return (
                        <tr key={l.id} className="cursor-pointer transition hover:bg-canvas" onClick={() => onNavigate('properties')}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
                                {l.main_image ? <img src={l.main_image} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-tx-faint"><Building2 className="h-4 w-4" /></div>}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-tx">{l.title}</div>
                                {l.reference_number && <div className="text-xs text-tx-faint">{l.reference_number}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-tx-soft">{propertyTypeLabel(l.property_type)}</td>
                          <td className="px-5 py-3 text-sm text-tx-soft">{l.location}</td>
                          <td className="px-5 py-3 font-mono text-sm font-semibold text-tx">{formatListingPrice(l.price, l.price_note, l.offer_type)}</td>
                          <td className="px-5 py-3"><span className={`pill ${sm.cls}`}>{sm.label}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Spodní souhrn */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <BottomStat icon={Users} value={String(uniqueContacts)} label="Celkem kontaktů" hint={`+${newContactsMonth} tento měsíc`} />
            <BottomStat icon={Home} value={String(activeProps)} label="Aktivních nemovitostí" hint={`${listings.length} celkem`} />
            <BottomStat icon={Coins} value={formatCZK(provizeYtd, true)} label="Celková provize (YTD)" hint={`${won.length} obchodů`} />
            <BottomStat icon={ClipboardList} value={String(taskDue)} label="Úkolů k vyřízení" hint={`${todayEvents.length} dnes`} />
          </section>

          {/* Top doporučitelé */}
          <section className="rounded-2xl bg-[#1A1A1A] p-5 ring-1 ring-white/5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gold/40 text-gold"><Gift className="h-5 w-5" /></span>
              <div>
                <h3 className="font-display text-lg font-bold text-white">Top doporučitelé</h3>
                <p className="text-xs text-white/55">Kdo vám přivádí obchody a kolik už přinesl</p>
              </div>
            </div>
            {referrers.length === 0 ? (
              <p className="py-2 text-sm text-white/40">Zatím žádná doporučení. Označte kontakt jako „Doporučitele" nebo vyplňte pole „Doporučil(a)" u leadu.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {referrers.map((r, i) => (
                  <li key={r.lead.id} className="flex items-center gap-3 rounded-xl bg-white/[.04] p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-[11px] font-bold text-ink">{i + 1}</span>
                    <Avatar name={r.lead.name || '?'} size={34} />
                    <div className="min-w-0 flex-1">
                      <button onClick={() => openLead(r.lead)} className="truncate text-sm font-bold text-white hover:text-gold">{r.lead.name || 'Bez jména'}</button>
                      <div className="text-xs text-white/55">{r.count} {r.count === 1 ? 'doporučení' : r.count < 5 ? 'doporučení' : 'doporučení'}</div>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-gold">{formatCZK(r.value, true)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

// ─── Sub-komponenty ───

function PerfChart({ data }: { data: { label: string; obrat: number; provize: number }[] }): JSX.Element {
  const W = 560, H = 240, padL = 48, padR = 14, padT = 14, padB = 30
  const innerW = W - padL - padR, innerH = H - padT - padB
  const rawMax = Math.max(...data.map((d) => Math.max(d.obrat, d.provize)), 1)
  const niceMax = Math.max(400000, Math.ceil(rawMax / 100000) * 100000)
  const x = (i: number): number => padL + innerW * (i / (Math.max(1, data.length - 1)))
  const y = (v: number): number => padT + innerH * (1 - v / niceMax)
  const line = (key: 'obrat' | 'provize'): string => data.map((d, i) => `${x(i)},${y(d[key])}`).join(' ')
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((niceMax / 4) * i))
  const fmtK = (v: number): string => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))
  const OBRAT = '#C1A263', PROVIZE = '#1A1A1A'

  return (
    <div>
      <div className="mb-1 flex items-center gap-4 text-[11px] font-semibold text-tx-soft">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: OBRAT }} /> Obrat</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PROVIZE }} /> Provize</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="#EEF0F4" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="fill-tx-faint" fontSize="11">{fmtK(t)}</text>
          </g>
        ))}
        <polyline points={line('obrat')} fill="none" stroke={OBRAT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={line('provize')} fill="none" stroke={PROVIZE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.obrat)} r="3.5" fill={OBRAT} stroke="#fff" strokeWidth="1.5" />
            <circle cx={x(i)} cy={y(d.provize)} r="3.5" fill={PROVIZE} stroke="#fff" strokeWidth="1.5" />
            <text x={x(i)} y={H - 10} textAnchor="middle" className="fill-tx-faint" fontSize="11">{d.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function Funnel({ data }: { data: { label: string; value: number }[] }): JSX.Element {
  const W = 360, H = 280
  const colors = ['#D4B26F', '#C1A263', '#A8884E', '#7E6736']
  const widths = [1, 0.78, 0.56, 0.34, 0.14]
  const gap = 4
  const bandH = (H - gap * 3) / 4
  const cx = W / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {data.map((d, i) => {
        const wTop = widths[i] * W, wBot = widths[i + 1] * W
        const yTop = i * (bandH + gap), yBot = yTop + bandH
        const pts = `${cx - wTop / 2},${yTop} ${cx + wTop / 2},${yTop} ${cx + wBot / 2},${yBot} ${cx - wBot / 2},${yBot}`
        const ty = yTop + bandH / 2
        return (
          <g key={i}>
            <polygon points={pts} fill={colors[i]} />
            <text x={cx} y={ty - 4} textAnchor="middle" className="fill-white" fontSize="13" fontWeight="600">{d.label}</text>
            <text x={cx} y={ty + 16} textAnchor="middle" className="fill-white" fontSize="18" fontWeight="800">{d.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

function ActivityList({ events, leads, onOpen, onEmpty }: {
  events: EventItem[]; leads: { id: string; name: string | null }[]; onOpen: (leadId: string) => void; onEmpty: () => void
}): JSX.Element {
  if (events.length === 0) {
    return (
      <button onClick={onEmpty} className="w-full rounded-xl bg-canvas py-8 text-center text-sm text-tx-faint hover:text-brand-dark">
        Dnes žádné aktivity — naplánujte schůzku nebo hovor.
      </button>
    )
  }
  const leadName = (id: string | null): string | null => leads.find((l) => l.id === id)?.name ?? null
  return (
    <ul className="space-y-1">
      {events.slice(0, 5).map((e) => {
        const meta = eventTypeMeta(e.type)
        const Icon = meta.icon
        const ln = leadName(e.lead_id)
        return (
          <li key={e.id}>
            <button onClick={() => e.lead_id && onOpen(e.lead_id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-canvas">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${meta.color}1a`, color: meta.color }}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-tx">{e.title}</div>
                {ln && <div className="truncate text-xs text-tx-soft">{ln}</div>}
              </div>
              <span className="shrink-0 font-mono text-[13px] font-semibold text-tx-soft">{e.all_day ? '—' : eventTime(e)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function MiniCalendar({ now, events, todayEvents, leads }: {
  now: Date; events: EventItem[]; todayEvents: EventItem[]; leads: { id: string; name: string | null }[]
}): JSX.Element {
  const year = now.getFullYear(), month = now.getMonth()
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // pondělí = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const hasEvent = (day: number): boolean => events.some((e) => { const d = new Date(e.start_at); return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day })
  const leadName = (id: string | null): string | null => leads.find((l) => l.id === id)?.name ?? null

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <ChevronLeft className="h-4 w-4 text-tx-faint" />
          <span className="text-sm font-bold capitalize text-tx">{now.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}</span>
          <ChevronRight className="h-4 w-4 text-tx-faint" />
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {DAY_NAMES.map((d) => <div key={d} className="py-1 text-[10px] font-bold uppercase text-tx-faint">{d}</div>)}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />
            const isToday = day === now.getDate()
            return (
              <div key={i} className={`relative mx-auto grid h-7 w-7 place-items-center rounded-full text-xs ${isToday ? 'bg-brand-dark font-bold text-white' : 'text-tx'}`}>
                {day}
                {!isToday && hasEvent(day) && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand-dark" />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-line pt-3">
        {todayEvents.length === 0 ? (
          <p className="py-1 text-sm text-tx-faint">Dnes nemáte žádné události.</p>
        ) : (
          <ul className="space-y-2.5">
            {todayEvents.slice(0, 4).map((e) => (
              <li key={e.id} className="flex gap-2.5">
                <span className="w-10 shrink-0 font-mono text-[12px] font-bold text-brand-dark">{e.all_day ? '—' : eventTime(e)}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-tx">{e.title}</div>
                  {leadName(e.lead_id) && <div className="truncate text-xs text-tx-soft">{leadName(e.lead_id)}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function BottomStat({ icon: Icon, value, label, hint }: { icon: typeof Users; value: string; label: string; hint: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#1A1A1A] p-4 ring-1 ring-white/5 shadow-card">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/40 text-gold"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <div className="stat-num text-xl text-white">{value}</div>
        <div className="truncate text-xs font-medium text-white/55">{label}</div>
        <div className="truncate text-[11px] font-semibold text-gold">{hint}</div>
      </div>
    </div>
  )
}
