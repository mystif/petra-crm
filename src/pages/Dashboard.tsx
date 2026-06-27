import { TrendingUp, TrendingDown, Wallet, Trophy, Inbox, Users, Coins, ArrowUpRight, ArrowRight, Dot, CalendarClock, AlertCircle, MapPin, Gift } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { Loading, ErrorState } from '../components/States'
import { useLeads } from '../lib/leadsContext'
import { useEvents } from '../lib/eventsContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { STAGES, CLOSED_STAGES } from '../lib/supabase'
import { formatCZK, relativeDays, followUpState } from '../lib/format'
import { leadValue } from '../lib/leadDisplay'
import { eventTypeMeta, isOverdue, sameDay, eventTime } from '../lib/events'
import { topReferrers } from '../lib/referrals'
import type { Page } from '../components/Sidebar'
import type { LeadsFilter } from './Leads'

export function Dashboard({ onNavigate }: { onNavigate: (p: Page, focus?: LeadsFilter) => void }): JSX.Element {
  const { leads, loading, error, refetch } = useLeads()
  const { events } = useEvents()
  const { openLead } = useLeadDetail()

  const leadName = (id: string | null): string | null => leads.find((l) => l.id === id)?.name ?? null
  const todayEvents = events
    .filter((e) => sameDay(new Date(e.start_at), new Date()))
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
  const overdueEvents = events.filter(isOverdue).sort((a, b) => a.start_at.localeCompare(b.start_at))
  const referrers = topReferrers(leads)

  const open = leads.filter((l) => !CLOSED_STAGES.includes(l.crm_status))
  const won = leads.filter((l) => l.crm_status === 'uzavreno')
  const fresh = leads.filter((l) => l.crm_status === 'novy')
  const pipelineValue = open.reduce((s, l) => s + leadValue(l), 0)
  const wonValue = won.reduce((s, l) => s + leadValue(l), 0)

  // Follow-upy k vyřízení (termín dnes nebo po termínu, otevřené leady).
  const dueFollowUps = leads.filter((l) => {
    if (CLOSED_STAGES.includes(l.crm_status)) return false
    const s = followUpState(l.follow_up_at)
    return s === 'overdue' || s === 'today'
  })
  const uniqueContacts = new Set(leads.map((l) => (l.email || l.phone || l.id).toLowerCase())).size

  // Měsíční změna — co přibylo / uzavřelo se v aktuálním kalendářním měsíci.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const inThisMonth = (iso: string | null): boolean => !!iso && new Date(iso) >= monthStart

  const createdThisMonth = leads.filter((l) => inThisMonth(l.created_at))
  const openAddedThisMonth = createdThisMonth.filter((l) => !CLOSED_STAGES.includes(l.crm_status))
  const closedThisMonth = won.filter((l) => inThisMonth(l.crm_updated_at))
  const freshThisMonth = fresh.filter((l) => inThisMonth(l.created_at))
  const contactsThisMonth = new Set(
    createdThisMonth.map((l) => (l.email || l.phone || l.id).toLowerCase())
  ).size

  // Provize: aktuální vs. minulý měsíc (podle data uzavření).
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const inLastMonth = (iso: string | null): boolean => {
    if (!iso) return false
    const d = new Date(iso)
    return d >= lastMonthStart && d < monthStart
  }
  const provizeThisMonth = won.filter((l) => inThisMonth(l.crm_updated_at)).reduce((s, l) => s + Number(l.provize || 0), 0)
  const provizeLastMonth = won.filter((l) => inLastMonth(l.crm_updated_at)).reduce((s, l) => s + Number(l.provize || 0), 0)
  const provizeDelta = provizeThisMonth - provizeLastMonth
  const provizePct = provizeLastMonth > 0 ? Math.round((provizeDelta / provizeLastMonth) * 100) : null
  const provizeChip =
    provizePct != null
      ? `${provizePct >= 0 ? '+' : ''}${provizePct} % vs. minulý měsíc`
      : `${provizeDelta >= 0 ? '+' : ''}${formatCZK(provizeDelta, true)} vs. minulý`

  const monthDelta = (n: number): { chip: string; up: boolean } => ({ chip: `+${n} tento měsíc`, up: n > 0 })

  const today = new Date().toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const kpis = [
    { label: 'Hodnota pipeline', value: formatCZK(pipelineValue, true), sub: `${open.length} otevřených leadů`, ...monthDelta(openAddedThisMonth.length), icon: Wallet, tint: 'text-brand-dark bg-brand-soft' },
    { label: 'Provize (měsíc)', value: formatCZK(provizeThisMonth, true), sub: `${closedThisMonth.length} uzavřených obchodů`, chip: provizeChip, up: provizeDelta >= 0, icon: Coins, tint: 'text-emerald bg-emerald-soft' },
    { label: 'Uzavřeno', value: formatCZK(wonValue, true), sub: `${won.length} obchodů celkem`, ...monthDelta(closedThisMonth.length), icon: Trophy, tint: 'text-amber bg-amber-soft' },
    { label: 'Nové poptávky', value: String(fresh.length), sub: 'čekají na reakci', ...monthDelta(freshThisMonth.length), icon: Inbox, tint: 'text-sky bg-sky-soft' },
    { label: 'Kontakty', value: String(uniqueContacts), sub: 'z poptávek', ...monthDelta(contactsThisMonth), icon: Users, tint: 'text-[#9333EA] bg-[#F0E7FB]' }
  ]

  // Graf: rozložení hodnoty pipeline podle fází (donut).
  const stageData = STAGES.map((s) => ({
    ...s,
    items: leads.filter((l) => l.crm_status === s.key),
    val: leads.filter((l) => l.crm_status === s.key).reduce((a, l) => a + leadValue(l), 0)
  }))
  const stageTotal = Math.max(1, stageData.reduce((a, s) => a + s.val, 0))

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Dashboard"
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
        actions={<button className="btn-primary" onClick={() => onNavigate('pipeline')}>Otevřít pipeline</button>}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-2xl text-white shadow-lift">
            <div className="absolute inset-0 aurora" />
            <div className="absolute inset-0 grain opacity-[0.07] mix-blend-overlay" />
            <div className="relative flex flex-wrap items-center justify-between gap-6 p-7">
              <div className="max-w-lg">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/15">
                  <Dot className="h-4 w-4 text-emerald" /> {fresh.length} nových poptávek čeká na reakci
                </div>
                <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
                  Dobrý den, Petro.
                </h2>
                <p className="mt-1.5 text-sm text-white/65">
                  Máš {open.length} otevřených leadů v hodnotě {formatCZK(pipelineValue, true)}.
                  Nové poptávky chodí z formulářů na webu.
                </p>
                <div className="mt-5 flex gap-2.5">
                  <button onClick={() => onNavigate('leads')} className="btn bg-white text-ink hover:bg-white/90">
                    Zpracovat poptávky <ArrowRight className="h-4 w-4" />
                  </button>
                  <button onClick={() => onNavigate('pipeline')} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15">
                    Pipeline
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white/[.08] p-5 ring-1 ring-white/15 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/55">Uzavřeno</div>
                <div className="mt-1 font-display text-4xl font-bold">{won.length}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald">
                  <TrendingUp className="h-3.5 w-3.5" /> {formatCZK(wonValue, true)}
                </div>
                <div className="mt-3 flex h-1.5 gap-1">
                  {STAGES.map((s) => (
                    <div
                      key={s.key}
                      className="flex-1 rounded-full"
                      style={{ background: s.accent, opacity: leads.some((l) => l.crm_status === s.key) ? 1 : 0.3 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Follow-upy k vyřízení */}
          {dueFollowUps.length > 0 && (
            <button
              onClick={() => onNavigate('leads', 'followup')}
              className="flex w-full items-center gap-3 rounded-2xl border border-amber/30 bg-amber-soft px-5 py-3.5 text-left transition hover:border-amber/50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber/15 text-amber">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="text-sm font-bold text-tx">
                  {dueFollowUps.length} {dueFollowUps.length === 1 ? 'follow-up k vyřízení' : 'follow-upů k vyřízení'}
                </div>
                <div className="text-xs text-tx-soft">
                  {dueFollowUps.slice(0, 3).map((l) => l.name).filter(Boolean).join(', ')}
                  {dueFollowUps.length > 3 ? ' a další…' : ''}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-amber" />
            </button>
          )}

          {/* DENNÍ AGENDA */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Dnes */}
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand-dark"><CalendarClock className="h-5 w-5" /></span>
                  <h3 className="font-display text-lg font-bold text-tx">Dnes</h3>
                </div>
                <button onClick={() => onNavigate('calendar')} className="text-sm font-semibold text-brand-dark hover:underline">Kalendář</button>
              </div>
              {todayEvents.length === 0 ? (
                <p className="py-6 text-center text-sm text-tx-faint">Dnes nemáš žádné naplánované události.</p>
              ) : (
                <ul className="space-y-1">
                  {todayEvents.map((e) => {
                    const meta = eventTypeMeta(e.type)
                    const Icon = meta.icon
                    const ln = leadName(e.lead_id)
                    return (
                      <li key={e.id} className={`flex items-center gap-3 rounded-xl p-2 transition hover:bg-canvas ${e.done ? 'opacity-50' : ''}`}>
                        <span className="w-12 shrink-0 font-mono text-[13px] font-bold text-tx-soft">{e.all_day ? '—' : eventTime(e)}</span>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: meta.color }}><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <div className={`truncate text-sm font-semibold text-tx ${e.done ? 'line-through' : ''}`}>{e.title}</div>
                          {(ln || e.location) && (
                            <div className="flex items-center gap-2 truncate text-xs text-tx-soft">
                              {ln && <span>{ln}</span>}
                              {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Po termínu */}
            <div className={`card p-6 ${overdueEvents.length > 0 ? 'ring-1 ring-rose/30' : ''}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-soft text-rose"><AlertCircle className="h-5 w-5" /></span>
                  <h3 className="font-display text-lg font-bold text-tx">Po termínu</h3>
                </div>
                <button onClick={() => onNavigate('tasks')} className="text-sm font-semibold text-brand-dark hover:underline">Úkoly</button>
              </div>
              {overdueEvents.length === 0 ? (
                <p className="py-6 text-center text-sm text-tx-faint">Nic po termínu. Máš vše pod kontrolou 👌</p>
              ) : (
                <ul className="space-y-1">
                  {overdueEvents.slice(0, 6).map((e) => {
                    const meta = eventTypeMeta(e.type)
                    const Icon = meta.icon
                    const ln = leadName(e.lead_id)
                    const days = Math.max(1, Math.floor((Date.now() - new Date(e.start_at).getTime()) / 86_400_000))
                    return (
                      <li key={e.id} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-canvas">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-tx-soft"><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-tx">{e.title}</div>
                          <div className="truncate text-xs text-tx-soft">{ln ?? meta.label}</div>
                        </div>
                        <span className="shrink-0 rounded-md bg-rose-soft px-2 py-0.5 text-xs font-bold text-rose">{days} {days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* KPI */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {kpis.map((k) => {
              const Icon = k.icon
              return (
                <div key={k.label} className="card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`grid h-10 w-10 place-items-center rounded-xl ${k.tint}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`pill ${k.up ? 'bg-emerald-soft text-emerald' : 'bg-canvas text-tx-soft'}`}>
                      {k.up ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {k.chip}
                    </span>
                  </div>
                  <div className="mt-4 stat-num text-2xl text-tx">{k.value}</div>
                  <div className="text-sm font-semibold text-tx">{k.label}</div>
                  <div className="text-xs text-tx-soft">{k.sub}</div>
                </div>
              )
            })}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* PŘEHLED PIPELINE */}
            <section className="card p-6 lg:col-span-3">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-tx">Pipeline podle fází</h3>
                  <p className="text-sm text-tx-soft">Hodnota leadů v jednotlivých fázích</p>
                </div>
                <button onClick={() => onNavigate('pipeline')} className="text-sm font-semibold text-brand-dark hover:underline">
                  Detail
                </button>
              </div>
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                {/* donut */}
                <div className="relative h-44 w-44 shrink-0">
                  <svg viewBox="0 0 176 176" className="h-full w-full -rotate-90">
                    <circle cx="88" cy="88" r="75" fill="none" stroke="#EEF0F4" strokeWidth="22" />
                    {(() => {
                      const C = 2 * Math.PI * 75
                      let acc = 0
                      return stageData.map((s) => {
                        const dash = (s.val / stageTotal) * C
                        const el = (
                          <circle
                            key={s.key}
                            cx="88"
                            cy="88"
                            r="75"
                            fill="none"
                            stroke={s.accent}
                            strokeWidth="22"
                            strokeDasharray={`${dash} ${C - dash}`}
                            strokeDashoffset={-acc}
                            strokeLinecap="butt"
                          >
                            <title>{`${s.label}: ${formatCZK(s.val, true)}`}</title>
                          </circle>
                        )
                        acc += dash
                        return el
                      })
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-lg font-bold text-tx">{formatCZK(pipelineValue + wonValue, true)}</span>
                    <span className="text-[11px] text-tx-faint">celková hodnota</span>
                  </div>
                </div>

                {/* legenda */}
                <div className="flex-1 space-y-2">
                  {stageData.map((s) => {
                    const pct = Math.round((s.val / stageTotal) * 100)
                    return (
                      <div key={s.key} className="flex items-center gap-3 text-sm">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.accent }} />
                        <span className="font-medium text-tx">{s.label}</span>
                        <span className="text-tx-faint">· {s.items.length}</span>
                        <span className="ml-auto font-mono text-[13px] font-semibold text-tx-soft">{formatCZK(s.val, true)}</span>
                        <span className="w-9 text-right text-xs text-tx-faint">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* NEJNOVĚJŠÍ POPTÁVKY */}
            <section className="card p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-tx">Nejnovější poptávky</h3>
                <button onClick={() => onNavigate('leads')} className="text-sm font-semibold text-brand-dark hover:underline">
                  Vše
                </button>
              </div>
              <ul className="space-y-1">
                {leads.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-canvas">
                    <Avatar name={l.name || '?'} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-tx">{l.name || 'Bez jména'}</div>
                      <div className="truncate text-xs text-tx-soft">{l.message || l.location || l.source}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[13px] font-semibold text-tx">{formatCZK(leadValue(l), true)}</div>
                      <div className="text-[11px] text-tx-faint">{relativeDays(l.created_at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* TOP DOPORUČITELÉ */}
          {referrers.length > 0 && (
            <section className="card p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand-dark"><Gift className="h-5 w-5" /></span>
                <div>
                  <h3 className="font-display text-lg font-bold text-tx">Top doporučitelé</h3>
                  <p className="text-sm text-tx-soft">Klienti, kteří vám přivádějí další obchody</p>
                </div>
              </div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {referrers.map((r, i) => (
                  <li key={r.lead.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-gold">{i + 1}</span>
                    <Avatar name={r.lead.name || '?'} size={36} />
                    <div className="min-w-0 flex-1">
                      <button onClick={() => openLead(r.lead)} className="truncate text-sm font-bold text-tx hover:text-brand-dark hover:underline">{r.lead.name || 'Bez jména'}</button>
                      <div className="text-xs text-tx-soft">{r.count} {r.count === 1 ? 'doporučení' : r.count < 5 ? 'doporučení' : 'doporučení'}</div>
                    </div>
                    <span className="font-mono text-[13px] font-bold text-emerald">{formatCZK(r.value, true)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
