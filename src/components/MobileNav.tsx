import { useState } from 'react'
import { LayoutGrid, KanbanSquare, Inbox, CheckSquare, CalendarDays, MoreHorizontal, Users, Mail, LifeBuoy, X } from 'lucide-react'
import type { ComponentType } from 'react'
import type { Page } from './Sidebar'
import { Avatar } from './Avatar'
import { useLeads } from '../lib/leadsContext'
import { useEvents } from '../lib/eventsContext'
import { useMakler } from '../lib/maklerContext'
import { isOverdue, sameDay } from '../lib/events'

const PRIMARY: { id: Page; icon: ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'dashboard', icon: LayoutGrid, label: 'Přehled' },
  { id: 'pipeline', icon: KanbanSquare, label: 'Pipeline' },
  { id: 'leads', icon: Inbox, label: 'Poptávky' },
  { id: 'tasks', icon: CheckSquare, label: 'Úkoly' },
  { id: 'calendar', icon: CalendarDays, label: 'Kalendář' }
]

// Stránky dostupné přes „Víc".
const MORE_PAGES: Page[] = ['contacts', 'templates']

interface MobileNavProps {
  current: Page
  onNavigate: (p: Page) => void
  onOpenAgent: () => void
}

/** Spodní lišta pro mobil — vyšší dotykové cíle s popisky + sheet „Víc". */
export function MobileNav({ current, onNavigate, onOpenAgent }: MobileNavProps): JSX.Element {
  const { leads } = useLeads()
  const { events } = useEvents()
  const { makler, avatarUrl } = useMakler()
  const [moreOpen, setMoreOpen] = useState(false)

  const fresh = leads.filter((l) => l.crm_status === 'novy').length
  const taskDue = events.filter((e) => !e.done && (isOverdue(e) || sameDay(new Date(e.start_at), new Date()))).length
  const moreActive = MORE_PAGES.includes(current)

  const go = (p: Page): void => { setMoreOpen(false); onNavigate(p) }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-ink-line bg-ink pb-[env(safe-area-inset-bottom)] md:hidden">
        {PRIMARY.map((item) => {
          const Icon = item.icon
          const active = current === item.id
          const badge = item.id === 'leads' ? fresh : item.id === 'tasks' ? taskDue : 0
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition ${active ? 'text-gold' : 'text-white/55'}`}
            >
              <span className="relative">
                <Icon className="h-[23px] w-[23px]" />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink ring-2 ring-ink">
                    {badge}
                  </span>
                )}
              </span>
              <span className="leading-none">{item.label}</span>
              {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-gold" />}
            </button>
          )
        })}

        {/* Víc */}
        <button
          onClick={() => setMoreOpen(true)}
          className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition ${moreActive ? 'text-gold' : 'text-white/55'}`}
        >
          <MoreHorizontal className="h-[23px] w-[23px]" />
          <span className="leading-none">Víc</span>
          {moreActive && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-gold" />}
        </button>
      </nav>

      {/* Bottom sheet „Víc" */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 bottom-0 animate-pop rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <span className="font-display text-lg font-bold text-tx">Víc</span>
              <button onClick={() => setMoreOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-tx-soft hover:bg-canvas">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-3 pb-3">
              <SheetRow icon={Users} label="Kontakty" active={current === 'contacts'} onClick={() => go('contacts')} />
              <SheetRow icon={Mail} label="Email Follow-up" active={current === 'templates'} onClick={() => go('templates')} />
              <SheetRow icon={LifeBuoy} label="Podpora" href="mailto:jirka.zabransky@gmail.com?subject=Petra%20CRM%20%E2%80%93%20podpora" />

              <button
                onClick={() => { setMoreOpen(false); onOpenAgent() }}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-canvas"
              >
                <Avatar name={makler?.name || 'Petra Zábranská'} src={avatarUrl} size={40} />
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-sm font-bold text-tx">{makler?.name || 'Petra Zábranská'}</div>
                  <div className="truncate text-xs text-tx-soft">Profil makléře</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SheetRow({ icon: Icon, label, active, onClick, href }: {
  icon: ComponentType<{ className?: string }>; label: string; active?: boolean; onClick?: () => void; href?: string
}): JSX.Element {
  const cls = `flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold transition ${active ? 'bg-brand-soft text-brand-dark' : 'text-tx hover:bg-canvas'}`
  const inner = (
    <>
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${active ? 'bg-brand/15 text-brand-dark' : 'bg-canvas text-tx-soft'}`}>
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </>
  )
  if (href) return <a href={href} className={cls}>{inner}</a>
  return <button onClick={onClick} className={cls}>{inner}</button>
}
