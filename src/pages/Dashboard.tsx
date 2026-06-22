import { TrendingUp, Wallet, Trophy, Inbox, Users, ArrowUpRight, ArrowRight, Dot } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { Loading, ErrorState } from '../components/States'
import { useLeads } from '../lib/leadsContext'
import { STAGES, CLOSED_STAGES } from '../lib/supabase'
import { formatCZK, relativeDays } from '../lib/format'
import { leadValue } from '../lib/leadDisplay'
import type { Page } from '../components/Sidebar'

export function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }): JSX.Element {
  const { leads, loading, error, refetch } = useLeads()

  const open = leads.filter((l) => !CLOSED_STAGES.includes(l.crm_status))
  const won = leads.filter((l) => l.crm_status === 'uzavreno')
  const fresh = leads.filter((l) => l.crm_status === 'novy')
  const pipelineValue = open.reduce((s, l) => s + leadValue(l), 0)
  const wonValue = won.reduce((s, l) => s + leadValue(l), 0)
  const uniqueContacts = new Set(leads.map((l) => (l.email || l.phone || l.id).toLowerCase())).size

  const today = new Date().toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const kpis = [
    { label: 'Hodnota pipeline', value: formatCZK(pipelineValue, true), sub: `${open.length} otevřených leadů`, trend: 'aktivní', icon: Wallet, tint: 'text-brand bg-brand-soft' },
    { label: 'Uzavřeno', value: formatCZK(wonValue, true), sub: `${won.length} obchodů`, trend: 'celkem', icon: Trophy, tint: 'text-emerald bg-emerald-soft' },
    { label: 'Nové poptávky', value: String(fresh.length), sub: 'čekají na reakci', trend: 'nové', icon: Inbox, tint: 'text-amber bg-amber-soft' },
    { label: 'Kontakty', value: String(uniqueContacts), sub: 'z poptávek', trend: 'databáze', icon: Users, tint: 'text-sky bg-sky-soft' }
  ]

  const maxStageValue = Math.max(
    1,
    ...STAGES.map((s) => leads.filter((l) => l.crm_status === s.key).reduce((a, l) => a + leadValue(l), 0))
  )

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
        <div className="flex-1 space-y-6 overflow-y-auto p-8">
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

          {/* KPI */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => {
              const Icon = k.icon
              return (
                <div key={k.label} className="card p-5">
                  <div className="flex items-center justify-between">
                    <div className={`grid h-10 w-10 place-items-center rounded-xl ${k.tint}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="pill bg-canvas text-tx-soft">
                      <ArrowUpRight className="h-3 w-3" /> {k.trend}
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
                <button onClick={() => onNavigate('pipeline')} className="text-sm font-semibold text-brand hover:underline">
                  Detail
                </button>
              </div>
              <div className="space-y-4">
                {STAGES.map((s) => {
                  const items = leads.filter((l) => l.crm_status === s.key)
                  const val = items.reduce((a, l) => a + leadValue(l), 0)
                  const pct = (val / maxStageValue) * 100
                  return (
                    <div key={s.key}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-semibold text-tx">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.accent }} />
                          {s.label}
                          <span className="text-tx-faint">· {items.length}</span>
                        </span>
                        <span className="font-mono text-[13px] font-semibold text-tx-soft">{formatCZK(val, true)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-canvas">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.accent }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* NEJNOVĚJŠÍ POPTÁVKY */}
            <section className="card p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-tx">Nejnovější poptávky</h3>
                <button onClick={() => onNavigate('leads')} className="text-sm font-semibold text-brand hover:underline">
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
        </div>
      )}
    </div>
  )
}
