import { useMemo, useState } from 'react'
import { Plus, MapPin, Check } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Loading, ErrorState, Empty } from '../components/States'
import { EventForm } from '../components/EventForm'
import { useEvents } from '../lib/eventsContext'
import { useLeads } from '../lib/leadsContext'
import { eventTypeMeta, isOverdue, sameDay, startOfWeek, eventTime, type EventItem } from '../lib/events'
import { formatDate } from '../lib/format'

type Filter = 'dnes' | 'tyden' | 'poterminu' | 'hotove' | 'vse'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'dnes', label: 'Dnes' },
  { id: 'tyden', label: 'Tento týden' },
  { id: 'poterminu', label: 'Po termínu' },
  { id: 'vse', label: 'Vše' },
  { id: 'hotove', label: 'Hotové' }
]

export function Tasks(): JSX.Element {
  const { events, loading, error, refetch, toggleDone } = useEvents()
  const { leads } = useLeads()
  const [filter, setFilter] = useState<Filter>('dnes')
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const leadName = (id: string | null): string | null => leads.find((l) => l.id === id)?.name ?? null
  const today = new Date()
  const weekStart = startOfWeek(today)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)

  const counts = useMemo(() => ({
    dnes: events.filter((e) => !e.done && sameDay(new Date(e.start_at), today)).length,
    poterminu: events.filter((e) => isOverdue(e)).length
  }), [events, today])

  const list = useMemo(() => {
    const open = events.filter((e) => !e.done)
    let out: EventItem[]
    switch (filter) {
      case 'dnes': out = open.filter((e) => sameDay(new Date(e.start_at), today)); break
      case 'tyden': out = open.filter((e) => { const d = new Date(e.start_at); return d >= weekStart && d < weekEnd }); break
      case 'poterminu': out = events.filter((e) => isOverdue(e)); break
      case 'hotove': out = events.filter((e) => e.done); break
      default: out = open
    }
    return out.sort((a, b) => a.start_at.localeCompare(b.start_at))
  }, [events, filter, today, weekStart, weekEnd])

  const openNew = (): void => { setEditing(null); setFormOpen(true) }
  const openEdit = (e: EventItem): void => { setEditing(e); setFormOpen(true) }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Úkoly"
        subtitle={`${counts.dnes} na dnešek · ${counts.poterminu} po termínu`}
        showSearch={false}
        actions={<button className="btn-primary" onClick={openNew} title="Nový úkol" aria-label="Nový úkol"><Plus className="h-4 w-4" /> <span className="hidden md:inline">Nový úkol</span></button>}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-5 flex flex-wrap gap-1.5">
              {FILTERS.map((f) => {
                const badge = f.id === 'dnes' ? counts.dnes : f.id === 'poterminu' ? counts.poterminu : 0
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${filter === f.id ? 'bg-ink text-white' : 'border border-line bg-white text-tx-soft hover:text-tx'}`}
                  >
                    {f.label}
                    {badge > 0 && <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${filter === f.id ? 'bg-white/20' : f.id === 'poterminu' ? 'bg-rose-soft text-rose' : 'bg-canvas text-tx-soft'}`}>{badge}</span>}
                  </button>
                )
              })}
            </div>

            {list.length === 0 ? (
              <Empty label="Žádné úkoly v této kategorii. 🎉" />
            ) : (
              <ul className="space-y-2">
                {list.map((e) => {
                  const meta = eventTypeMeta(e.type)
                  const Icon = meta.icon
                  const ln = leadName(e.lead_id)
                  const overdue = isOverdue(e)
                  return (
                    <li key={e.id} className={`card flex items-center gap-3 p-3 ${e.done ? 'opacity-60' : ''}`}>
                      <button
                        onClick={() => toggleDone(e.id)}
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition ${e.done ? 'border-emerald bg-emerald text-white' : 'border-line text-transparent hover:border-emerald'}`}
                        title={e.done ? 'Označit jako nesplněné' : 'Označit jako hotové'}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEdit(e)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.soft}`}><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <div className={`truncate text-sm font-bold text-tx ${e.done ? 'line-through' : ''}`}>{e.title}</div>
                          <div className="flex flex-wrap items-center gap-x-3 text-xs text-tx-soft">
                            <span className={overdue ? 'font-semibold text-rose' : ''}>
                              {formatDate(e.start_at)}{!e.all_day && ` · ${eventTime(e)}`}
                            </span>
                            {ln && <span>· {ln}</span>}
                            {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                          </div>
                        </div>
                        <span className={`pill shrink-0 ${meta.soft}`}>{meta.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {formOpen && (
        <EventForm open event={editing} initialType="ukol" onClose={() => setFormOpen(false)} />
      )}
    </div>
  )
}
