import { useState } from 'react'
import { LayoutGrid, KanbanSquare, Inbox, CheckSquare, CalendarDays, MoreHorizontal, Users, Building2, Megaphone, LifeBuoy, X } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import type { Page } from './Sidebar'
import { Avatar } from './Avatar'
import { useLeads } from '../lib/leadsContext'
import { useEvents } from '../lib/eventsContext'
import { useMakler } from '../lib/maklerContext'
import { isOverdue, sameDay } from '../lib/events'
import { isReferrer } from '../lib/leadDisplay'

const PRIMARY: { id: Page; icon: ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'dashboard', icon: LayoutGrid, label: 'Přehled' },
  { id: 'pipeline', icon: KanbanSquare, label: 'Pipeline' },
  { id: 'leads', icon: Inbox, label: 'Poptávky' },
  { id: 'tasks', icon: CheckSquare, label: 'Úkoly' },
  { id: 'calendar', icon: CalendarDays, label: 'Kalendář' }
]

// Stránky dostupné přes „Víc".
const MORE_PAGES: Page[] = ['contacts', 'properties', 'marketing']

interface MobileNavProps {
  current: Page
  onNavigate: (p: Page) => void
}

/** Spodní lišta pro mobil — vyšší dotykové cíle s popisky + sheet „Víc". */
export function MobileNav({ current, onNavigate }: MobileNavProps): JSX.Element {
  const { leads } = useLeads()
  const { events } = useEvents()
  const { makler, avatarUrl, openAgent } = useMakler()
  const [moreOpen, setMoreOpen] = useState(false)

  const fresh = leads.filter((l) => l.crm_status === 'novy' && !isReferrer(l)).length
  const taskDue = events.filter((e) => !e.done && (isOverdue(e) || sameDay(new Date(e.start_at), new Date()))).length
  const moreActive = MORE_PAGES.includes(current)

  const go = (p: Page): void => { setMoreOpen(false); onNavigate(p) }

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-ink-line bg-ink md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        {PRIMARY.map((item) => {
          const Icon = item.icon
          const active = current === item.id
          const badge = item.id === 'leads' ? fresh : item.id === 'tasks' ? taskDue : 0
          return (
            <NavTab key={item.id} active={active} label={item.label} onClick={() => go(item.id)}>
              <Icon className="h-6 w-6" />
              {badge > 0 && (
                <span className="absolute -right-1.5 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink ring-2 ring-ink">
                  {badge}
                </span>
              )}
            </NavTab>
          )
        })}

        {/* Víc */}
        <NavTab active={moreActive} label="Víc" onClick={() => setMoreOpen(true)}>
          <MoreHorizontal className="h-6 w-6" />
        </NavTab>
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
              <SheetRow icon={Building2} label="Nemovitosti" active={current === 'properties'} onClick={() => go('properties')} />
              <SheetRow icon={Megaphone} label="Marketing" active={current === 'marketing'} onClick={() => go('marketing')} />
              <SheetRow icon={LifeBuoy} label="Podpora" href="mailto:jirka.zabransky@gmail.com?subject=Petra%20CRM%20%E2%80%93%20podpora" />

              <button
                onClick={() => { setMoreOpen(false); openAgent() }}
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

/** Jeden vyšší dotykový tab spodní lišty s aktivní „pilulkou". */
function NavTab({ active, label, onClick, children }: {
  active: boolean; label: string; onClick: () => void; children: ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1.5 pb-2 pt-2.5 text-[11px] font-semibold transition ${active ? 'text-gold' : 'text-white/55'}`}
    >
      <span className={`relative grid h-8 w-14 place-items-center rounded-2xl transition ${active ? 'bg-gold/15' : ''}`}>
        {children}
      </span>
      <span className="leading-none">{label}</span>
    </button>
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
