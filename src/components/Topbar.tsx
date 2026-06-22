import { Search, Bell } from 'lucide-react'
import type { ReactNode } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  showSearch?: boolean
}

/** Horní lišta stránky: titulek, volitelné hledání a akce. */
export function Topbar({ title, subtitle, actions, showSearch = true }: TopbarProps): JSX.Element {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-canvas/80 px-8 py-4 backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-tx">{title}</h1>
        {subtitle && <p className="text-sm text-tx-soft">{subtitle}</p>}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {showSearch && (
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tx-faint" />
            <input className="input w-64 pl-9" placeholder="Hledat v CRM…" />
          </div>
        )}
        <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-tx-soft transition hover:text-brand">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose ring-2 ring-white" />
        </button>
        {actions}
      </div>
    </header>
  )
}
