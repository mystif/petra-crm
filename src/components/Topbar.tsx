import { useState } from 'react'
import { Search, Bell, CalendarClock, Inbox, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useSearch } from '../lib/searchContext'
import { useLeads } from '../lib/leadsContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { useMakler } from '../lib/maklerContext'
import { CLOSED_STAGES, type Lead } from '../lib/supabase'
import { Avatar } from './Avatar'
import { relativeDays, formatDate } from '../lib/format'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  /** Volitelný obsah hned vedle titulku (např. widget počasí). */
  titleAside?: ReactNode
  showSearch?: boolean
}

export function Topbar({ title, subtitle, actions, titleAside, showSearch = true }: TopbarProps): JSX.Element {
  const { openSearch } = useSearch()
  const { leads } = useLeads()
  const { openLead } = useLeadDetail()
  const { makler, avatarUrl, openAgent } = useMakler()
  const [notifOpen, setNotifOpen] = useState(false)

  // Notifikace: follow-upy k vyřízení + nové (nezpracované) leady.
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  const dueFollowUps = leads.filter(
    (l) => l.follow_up_at && !CLOSED_STAGES.includes(l.crm_status) && new Date(l.follow_up_at) <= endOfToday
  )
  const newLeads = leads.filter((l) => l.crm_status === 'novy')
  const notifCount = dueFollowUps.length + newLeads.length

  const go = (l: Lead): void => {
    setNotifOpen(false)
    openLead(l)
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-canvas/80 px-4 py-4 backdrop-blur-xl md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] font-bold tracking-tight text-tx">{title}</h1>
          {subtitle && <p className="text-sm text-tx-soft">{subtitle}</p>}
        </div>
        {titleAside}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {showSearch && (
          <button
            onClick={openSearch}
            className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-tx-faint transition hover:border-brand/40 md:flex"
          >
            <Search className="h-4 w-4" />
            <span className="w-40 text-left">Hledat v CRM…</span>
            <kbd className="rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-tx-faint">⌘K</kbd>
          </button>
        )}

        {/* zvonek + dropdown notifikací */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-tx-soft transition hover:text-brand-dark"
          >
            <Bell className="h-[18px] w-[18px]" />
            {notifCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-lift">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <span className="font-bold text-tx">Notifikace</span>
                  <button onClick={() => setNotifOpen(false)} className="text-tx-faint hover:text-tx">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {notifCount === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-tx-faint">Nic nového. Máš hotovo 🎉</p>
                  ) : (
                    <>
                      {dueFollowUps.length > 0 && (
                        <Section icon={<CalendarClock className="h-3.5 w-3.5" />} label="Follow-up k vyřízení">
                          {dueFollowUps.map((l) => (
                            <NotifRow key={l.id} lead={l} onClick={() => go(l)} hint={l.follow_up_at ? formatDate(l.follow_up_at) : ''} />
                          ))}
                        </Section>
                      )}
                      {newLeads.length > 0 && (
                        <Section icon={<Inbox className="h-3.5 w-3.5" />} label="Nové poptávky">
                          {newLeads.map((l) => (
                            <NotifRow key={l.id} lead={l} onClick={() => go(l)} hint={relativeDays(l.created_at)} />
                          ))}
                        </Section>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {actions}

        {/* profil makléře — jen desktop, otevře kartu makléře */}
        <button
          onClick={openAgent}
          aria-label="Profil makléře"
          className="ml-1 hidden items-center gap-2.5 rounded-xl border border-line bg-white py-1.5 pl-1.5 pr-3 transition hover:border-brand/40 md:flex"
        >
          <Avatar name={makler?.name || 'Petra Zábranská'} src={avatarUrl} size={32} />
          <div className="min-w-0 text-left leading-tight">
            <div className="truncate text-sm font-semibold text-tx">{makler?.name || 'Petra Zábranská'}</div>
            <div className="truncate text-[11px] text-tx-faint">Realitní makléřka</div>
          </div>
        </button>
      </div>
    </header>
  )
}

function Section({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-tx-faint">
        {icon} {label}
      </div>
      {children}
    </div>
  )
}

function NotifRow({ lead, onClick, hint }: { lead: Lead; onClick: () => void; hint: string }): JSX.Element {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition hover:bg-canvas">
      <Avatar name={lead.name || '?'} size={30} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-tx">{lead.name || 'Bez jména'}</div>
        <div className="truncate text-xs text-tx-soft">{lead.location || lead.source || '—'}</div>
      </div>
      <span className="shrink-0 text-[11px] text-tx-faint">{hint}</span>
    </button>
  )
}
