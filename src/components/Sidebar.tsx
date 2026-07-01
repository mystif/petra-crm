import {
  LayoutGrid,
  KanbanSquare,
  Inbox,
  Users,
  CheckSquare,
  CalendarDays,
  Building2,
  Search,
  Plus,
  Mail,
  Zap,
  LifeBuoy
} from 'lucide-react'
import { useState } from 'react'
import { Modal } from './Modal'
import { useLeads } from '../lib/leadsContext'
import { useEvents } from '../lib/eventsContext'
import { useNewLead } from '../lib/newLeadContext'
import { useSearch } from '../lib/searchContext'
import { isOverdue, sameDay } from '../lib/events'
import { isReferrer } from '../lib/leadDisplay'

export type Page = 'dashboard' | 'pipeline' | 'leads' | 'contacts' | 'properties' | 'tasks' | 'calendar' | 'automatizace' | 'templates'

const NAV: { id: Page; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
  { id: 'leads', label: 'Poptávky', icon: Inbox },
  { id: 'contacts', label: 'Kontakty', icon: Users },
  { id: 'properties', label: 'Nemovitosti', icon: Building2 },
  { id: 'tasks', label: 'Úkoly', icon: CheckSquare },
  { id: 'calendar', label: 'Kalendář', icon: CalendarDays }
]

interface SidebarProps {
  current: Page
  onNavigate: (p: Page) => void
}

export function Sidebar({ current, onNavigate }: SidebarProps): JSX.Element {
  const { leads } = useLeads()
  const { events } = useEvents()
  const { open: openNewLead } = useNewLead()
  const { openSearch } = useSearch()
  const [helpOpen, setHelpOpen] = useState(false)
  // Odznak u Poptávek = počet nových (nezpracovaných) leadů.
  const freshCount = leads.filter((l) => l.crm_status === 'novy' && !isReferrer(l)).length
  // Odznak u Úkolů = dnešní + po termínu (nesplněné).
  const taskCount = events.filter((e) => !e.done && (isOverdue(e) || sameDay(new Date(e.start_at), new Date()))).length

  return (
    <>
    <aside className="relative hidden w-[252px] shrink-0 flex-col overflow-hidden bg-[#0D0D0D] text-white md:flex">
      <div className="relative flex h-full flex-col scroll-dark">
        {/* logo */}
        <div className="px-4 pb-2 pt-5">
          <img src="./logo-crm.png" alt="AUREA — Real Estate CRM" className="mx-auto h-auto w-1/2 object-contain" />
        </div>

        {/* rychlé hledání */}
        <div className="px-4 pt-5">
          <button
            onClick={openSearch}
            className="flex w-full items-center gap-2.5 rounded-xl bg-white/[.06] px-3 py-2.5 text-sm text-white/55 ring-1 ring-white/10 transition hover:bg-white/[.1]"
          >
            <Search className="h-4 w-4" />
            <span>Hledat…</span>
            <kbd className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* nový obchod */}
        <div className="px-4 pt-3">
          <button
            onClick={openNewLead}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-ink shadow-[0_6px_20px_rgba(0,0,0,.25)] transition hover:bg-white/90"
          >
            <Plus className="h-4 w-4" /> Nový lead
          </button>
        </div>

        {/* navigace */}
        <nav className="mt-6 flex-1 space-y-1 px-3">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-white/30">
            Přehled
          </div>
          {NAV.map((item) => {
            const Icon = item.icon
            const active = current === item.id
            const badge =
              item.id === 'leads' && freshCount > 0 ? freshCount
                : item.id === 'tasks' && taskCount > 0 ? taskCount
                  : undefined
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`nav-item w-full ${active ? 'active' : ''}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
                {badge && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-ink">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}

          <div className="px-3 pb-1 pt-5 text-[11px] font-bold uppercase tracking-wider text-white/30">
            Ostatní
          </div>
          <button
            onClick={() => onNavigate('automatizace')}
            className={`nav-item w-full ${current === 'automatizace' ? 'active' : ''}`}
          >
            <Zap className="h-[18px] w-[18px]" /> Automatizace
          </button>
          <button
            onClick={() => onNavigate('templates')}
            className={`nav-item w-full ${current === 'templates' ? 'active' : ''}`}
          >
            <Mail className="h-[18px] w-[18px]" /> Email Follow-up
          </button>
          <button onClick={() => setHelpOpen(true)} className="nav-item w-full">
            <LifeBuoy className="h-[18px] w-[18px]" /> Podpora
          </button>
        </nav>
      </div>
    </aside>

    <Modal open={helpOpen} size="md" title="Podpora a nápověda" onClose={() => setHelpOpen(false)}>
      <div className="space-y-3 text-sm text-tx-soft">
        <p>
          Vítej v CRM. Leady z webových formulářů se sbírají automaticky, můžeš je posouvat v pipeline,
          psát e-maily ze šablon a plánovat follow-up.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li><b className="text-tx">Nový lead</b> přidáš tlačítkem vlevo nahoře.</li>
          <li><b className="text-tx">Vyhledávání</b> otevřeš klávesou <kbd className="rounded bg-canvas px-1 text-xs">⌘K</kbd>.</li>
          <li>Klikni na kartu leadu pro detail, psaní e-mailu a historii.</li>
        </ul>
        <p>
          Potřebuješ pomoc nebo úpravu?{' '}
          <a className="font-semibold text-brand-dark hover:underline" href="mailto:jirka.zabransky@gmail.com?subject=Petra%20CRM%20%E2%80%93%20podpora">
            Napiš na podporu
          </a>.
        </p>
      </div>
    </Modal>
    </>
  )
}
