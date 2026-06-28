import { Sparkles, ChevronRight, CalendarDays } from 'lucide-react'
import { useLeads } from '../lib/leadsContext'
import { useEvents } from '../lib/eventsContext'
import { useMakler } from '../lib/maklerContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { buildDailyPlan } from '../lib/dailyPlan'
import { vocative } from '../lib/vocative'
import type { Page } from './Sidebar'

export function AnnaBriefing({ onNavigate }: { onNavigate: (p: Page) => void }): JSX.Element {
  const { leads } = useLeads()
  const { events } = useEvents()
  const { makler } = useMakler()
  const { openLead } = useLeadDetail()

  const plan = buildDailyPlan(leads, events)
  const osloveni = vocative(makler?.name) || 'Petro'

  const handleStep = (leadId: string | null): void => {
    if (!leadId) { onNavigate('calendar'); return }
    const lead = leads.find((l) => l.id === leadId)
    if (lead) openLead(lead)
  }

  return (
    <section className="card overflow-hidden">
      {/* hlavička s Annou */}
      <div className="relative text-white">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, #1A1A1A 42%, #5e4d28 78%, #91753C 100%)' }} />
        <div className="absolute inset-0 grain opacity-[0.05] mix-blend-overlay" />
        <div className="relative flex items-center gap-4 p-5 sm:p-6">
          <div className="relative shrink-0">
            <img
              src="./asistentka-anna.jpg" alt="Asistentka Anna"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-[#C1A263] sm:h-[72px] sm:w-[72px]"
            />
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-[#C1A263] text-ink ring-2 ring-ink">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/55">
              <CalendarDays className="h-3.5 w-3.5" /> {plan.dateLabel}
            </div>
            <h2 className="mt-0.5 font-display text-lg font-bold leading-snug sm:text-xl">
              Dobrý den, {osloveni} — tady jsem pro vás připravila dnešní plán.
            </h2>
            <p className="mt-1 text-sm text-white/70">{plan.summary}</p>
            <div className="mt-1.5 text-[11px] text-white/40">Anna · vaše asistentka</div>
          </div>
        </div>
      </div>

      {/* kroky dne */}
      <div className="space-y-2 p-4 sm:p-5">
        {plan.steps.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => handleStep(s.leadId)}
              className="group flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:border-brand/40 hover:shadow-card"
            >
              {s.time ? (
                <span className="w-12 shrink-0 text-center font-mono text-[13px] font-bold text-tx">{s.time}</span>
              ) : (
                <span className="w-12 shrink-0" />
              )}
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: s.color }}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-tx">{s.title}</div>
                {s.detail && <div className="truncate text-xs text-tx-soft">{s.detail}</div>}
              </div>
              {s.badge && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ background: `${s.color}1a`, color: s.color }}
                >
                  {s.badge}
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-tx-faint transition group-hover:text-brand-dark" />
            </button>
          )
        })}

        {/* uzavírací doporučení od Anny */}
        <div className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm text-tx-soft">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
          <span>{plan.closing}</span>
        </div>
      </div>
    </section>
  )
}
