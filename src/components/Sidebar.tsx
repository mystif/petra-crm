import {
  LayoutGrid,
  KanbanSquare,
  Inbox,
  Users,
  Building2,
  Search,
  Plus,
  Settings,
  LifeBuoy
} from 'lucide-react'
import { Avatar } from './Avatar'
import { useLeads } from '../lib/leadsContext'

export type Page = 'dashboard' | 'pipeline' | 'leads' | 'contacts'

const NAV: { id: Page; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
  { id: 'leads', label: 'Poptávky', icon: Inbox },
  { id: 'contacts', label: 'Kontakty', icon: Users }
]

interface SidebarProps {
  current: Page
  onNavigate: (p: Page) => void
}

export function Sidebar({ current, onNavigate }: SidebarProps): JSX.Element {
  const { leads } = useLeads()
  // Odznak u Poptávek = počet nových (nezpracovaných) leadů.
  const freshCount = leads.filter((l) => l.crm_status === 'novy').length

  return (
    <aside className="relative flex w-[252px] shrink-0 flex-col overflow-hidden bg-ink text-white">
      {/* atmosférický gradient + jemné zrno */}
      <div className="pointer-events-none absolute inset-0 aurora opacity-90" />
      <div className="pointer-events-none absolute inset-0 grain opacity-[0.06] mix-blend-overlay" />

      <div className="relative flex h-full flex-col scroll-dark">
        {/* logo */}
        <div className="flex items-center gap-3 px-5 pb-2 pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[17px] font-bold tracking-tight">Reality CRM</div>
            <div className="text-[11px] font-medium text-white/45">Realitní pult</div>
          </div>
        </div>

        {/* rychlé hledání */}
        <div className="px-4 pt-5">
          <button className="flex w-full items-center gap-2.5 rounded-xl bg-white/[.06] px-3 py-2.5 text-sm text-white/55 ring-1 ring-white/10 transition hover:bg-white/[.1]">
            <Search className="h-4 w-4" />
            <span>Hledat…</span>
            <kbd className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* nový obchod */}
        <div className="px-4 pt-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-ink shadow-[0_6px_20px_rgba(0,0,0,.25)] transition hover:bg-white/90">
            <Plus className="h-4 w-4" /> Nový obchod
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
            const badge = item.id === 'leads' && freshCount > 0 ? freshCount : undefined
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`nav-item w-full ${active ? 'active' : ''}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
                {badge && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}

          <div className="px-3 pb-1 pt-5 text-[11px] font-bold uppercase tracking-wider text-white/30">
            Ostatní
          </div>
          <button className="nav-item w-full">
            <Settings className="h-[18px] w-[18px]" /> Nastavení
          </button>
          <button className="nav-item w-full">
            <LifeBuoy className="h-[18px] w-[18px]" /> Podpora
          </button>
        </nav>

        {/* profil makléře */}
        <div className="m-3 flex items-center gap-3 rounded-xl bg-white/[.06] p-2.5 ring-1 ring-white/10">
          <Avatar name="Petra Zábranská" size={36} />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">Petra Zábranská</div>
            <div className="truncate text-[11px] text-white/45">Realitní makléřka</div>
          </div>
          <div className="ml-auto h-2 w-2 rounded-full bg-emerald shadow-[0_0_8px_#0FA968]" />
        </div>
      </div>
    </aside>
  )
}
