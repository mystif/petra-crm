import { LayoutGrid, KanbanSquare, Inbox, Users, Mail } from 'lucide-react'
import type { ComponentType } from 'react'
import type { Page } from './Sidebar'
import { Avatar } from './Avatar'
import { useLeads } from '../lib/leadsContext'
import { useMakler } from '../lib/maklerContext'

const ITEMS: { id: Page; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', icon: LayoutGrid },
  { id: 'pipeline', icon: KanbanSquare },
  { id: 'leads', icon: Inbox },
  { id: 'contacts', icon: Users },
  { id: 'templates', icon: Mail }
]

interface MobileNavProps {
  current: Page
  onNavigate: (p: Page) => void
  onOpenAgent: () => void
}

/** Spodní lišta jen s ikonami pro mobil (sidebar je skrytý). */
export function MobileNav({ current, onNavigate, onOpenAgent }: MobileNavProps): JSX.Element {
  const { leads } = useLeads()
  const { makler, avatarUrl } = useMakler()
  const fresh = leads.filter((l) => l.crm_status === 'novy').length

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-ink-line bg-ink px-2 py-2 md:hidden">
      {ITEMS.map((item) => {
        const Icon = item.icon
        const active = current === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`relative grid h-11 w-11 place-items-center rounded-xl transition ${active ? 'bg-white/[.1] text-gold' : 'text-white/60'}`}
          >
            <Icon className="h-[22px] w-[22px]" />
            {item.id === 'leads' && fresh > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-ink" />
            )}
          </button>
        )
      })}
      <button onClick={onOpenAgent} className="grid h-11 w-11 place-items-center rounded-xl" title="Profil makléře">
        <Avatar name={makler?.name || 'Petra Zábranská'} src={avatarUrl} size={30} />
      </button>
    </nav>
  )
}
