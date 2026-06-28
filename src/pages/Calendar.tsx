import { useMemo, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, CalendarRange, ListTree, CalendarDays, Grid3x3 } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Loading, ErrorState, Empty } from '../components/States'
import { EventForm } from '../components/EventForm'
import { useEvents } from '../lib/eventsContext'
import { useLeads } from '../lib/leadsContext'
import { eventTypeMeta, startOfWeek, sameDay, eventTime, type EventItem } from '../lib/events'
import { MapPin } from 'lucide-react'

const START_HOUR = 7
const END_HOUR = 21
const HOUR_H = 54
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

type View = 'den' | 'tyden' | 'mesic' | 'agenda'

function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
function pad(n: number): string { return String(n).padStart(2, '0') }

/** Pozice a výška bloku události v denním sloupci (px). */
function blockGeometry(e: EventItem): { top: number; height: number } {
  const s = new Date(e.start_at)
  const startMin = (s.getHours() - START_HOUR) * 60 + s.getMinutes()
  const end = e.end_at ? new Date(e.end_at) : new Date(s.getTime() + 60 * 60_000)
  const durMin = Math.max(34, (end.getTime() - s.getTime()) / 60_000)
  return { top: Math.max(0, (startMin / 60) * HOUR_H), height: (durMin / 60) * HOUR_H }
}

const VIEWS: { id: View; label: string; icon: typeof CalendarRange }[] = [
  { id: 'den', label: 'Den', icon: CalendarDays },
  { id: 'tyden', label: 'Týden', icon: CalendarRange },
  { id: 'mesic', label: 'Měsíc', icon: Grid3x3 },
  { id: 'agenda', label: 'Agenda', icon: ListTree }
]

export function Calendar(): JSX.Element {
  const { events, loading, error, refetch } = useEvents()
  const { leads } = useLeads()
  const [view, setView] = useState<View>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'agenda' : 'tyden'))
  const [anchor, setAnchor] = useState(new Date())
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const leadName = (id: string | null): string | null => leads.find((l) => l.id === id)?.name ?? null

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const today = new Date()

  const shift = (dir: number): void => {
    if (view === 'den') setAnchor(addDays(anchor, dir))
    else if (view === 'tyden') setAnchor(addDays(weekStart, dir * 7))
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1)) // měsíc / agenda
  }

  const label =
    view === 'den' ? cap(anchor.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
      : view === 'tyden' ? `${weekStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })} – ${addDays(weekStart, 6).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : view === 'mesic' ? cap(anchor.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' }))
          : 'Nadcházející události'

  const openNew = (start?: string): void => { setEditing(null); setCreating(start ?? ''); setFormOpen(true) }
  const openEdit = (e: EventItem): void => { setEditing(e); setCreating(null); setFormOpen(true) }
  const slotStart = (day: Date, hour: number): string =>
    `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(hour)}:00`

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Kalendář"
        subtitle="Prohlídky, schůzky a follow-upy"
        showSearch={false}
        actions={<button className="btn-primary" onClick={() => openNew()}><Plus className="h-4 w-4" /> Nová událost</button>}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 md:px-6">
            <div className="flex items-center gap-1">
              {view !== 'agenda' && (
                <>
                  <button onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-tx-soft hover:text-tx"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => shift(1)} className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-tx-soft hover:text-tx"><ChevronRight className="h-4 w-4" /></button>
                </>
              )}
              <button onClick={() => setAnchor(new Date())} className="ml-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-tx-soft hover:text-tx">Dnes</button>
            </div>
            <div className="text-sm font-bold text-tx">{label}</div>

            <div className="ml-auto flex gap-1 rounded-lg border border-line bg-white p-0.5">
              {VIEWS.map((v) => {
                const Icon = v.icon
                return (
                  <button key={v.id} onClick={() => setView(v.id)} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold transition ${view === v.id ? 'bg-ink text-white' : 'text-tx-soft hover:text-tx'}`}>
                    <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{v.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {view === 'agenda' ? (
            <AgendaView events={events} leadName={leadName} onEvent={openEdit} />
          ) : view === 'mesic' ? (
            <MonthGrid anchor={anchor} today={today} events={events}
              onDay={(d) => { setAnchor(d); setView('den') }} onEvent={openEdit} />
          ) : (
            <TimeGrid
              days={view === 'den' ? [anchor] : weekDays} today={today} events={events} leadName={leadName}
              onSlot={(day, hour) => openNew(slotStart(day, hour))} onEvent={openEdit}
            />
          )}
        </div>
      )}

      {formOpen && (
        <EventForm open event={editing} initialStart={creating ?? undefined} onClose={() => setFormOpen(false)} />
      )}
    </div>
  )
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }

/** Hodinová mřížka pro Den (1 sloupec) i Týden (7 sloupců). */
function TimeGrid({ days, today, events, leadName, onSlot, onEvent }: {
  days: Date[]; today: Date; events: EventItem[]; leadName: (id: string | null) => string | null
  onSlot: (day: Date, hour: number) => void; onEvent: (e: EventItem) => void
}): JSX.Element {
  const colMin = days.length === 1 ? '0' : '120px'
  const cols = `56px repeat(${days.length}, minmax(${colMin}, 1fr))`
  return (
    <div className="flex-1 overflow-auto">
      <div className="sticky top-0 z-10 grid border-b border-line bg-canvas/90 backdrop-blur" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d) => {
          const isToday = sameDay(d, today)
          return (
            <div key={d.toISOString()} className={`border-l border-line px-2 py-2 text-center ${isToday ? 'bg-brand-soft/40' : ''}`}>
              <div className="text-[11px] font-bold uppercase tracking-wide text-tx-faint">{DAY_NAMES[(d.getDay() + 6) % 7]}</div>
              <div className={`text-sm font-bold ${isToday ? 'text-brand-dark' : 'text-tx'}`}>{d.getDate()}.{d.getMonth() + 1}.</div>
            </div>
          )
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: cols }}>
        <div className="relative" style={{ height: HOURS.length * HOUR_H }}>
          {HOURS.map((h) => (
            <div key={h} className="absolute right-1.5 -translate-y-1/2 text-[11px] font-medium text-tx-faint" style={{ top: (h - START_HOUR) * HOUR_H }}>{h}:00</div>
          ))}
        </div>

        {days.map((day) => {
          const dayEvents = events.filter((e) => sameDay(new Date(e.start_at), day))
          const isToday = sameDay(day, today)
          return (
            <div key={day.toISOString()} className={`relative border-l border-line ${isToday ? 'bg-brand-soft/10' : ''}`} style={{ height: HOURS.length * HOUR_H }}>
              {HOURS.map((h) => (
                <button key={h} onClick={() => onSlot(day, h)} className="absolute inset-x-0 border-b border-line/60 transition hover:bg-brand-soft/30" style={{ top: (h - START_HOUR) * HOUR_H, height: HOUR_H }} aria-label={`${h}:00`} />
              ))}
              {dayEvents.map((e) => {
                const meta = eventTypeMeta(e.type)
                const { top, height } = blockGeometry(e)
                const Icon = meta.icon
                const ln = leadName(e.lead_id)
                return (
                  <button key={e.id} onClick={() => onEvent(e)}
                    className={`absolute left-1 right-1 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left shadow-card transition hover:shadow-lift ${e.done ? 'opacity-55' : ''}`}
                    style={{ top: top + 1, height: height - 2, background: `${meta.color}1a`, borderColor: meta.color }}>
                    <div className="flex items-center gap-1 text-[11px] font-bold" style={{ color: meta.color }}><Icon className="h-3 w-3 shrink-0" /> {eventTime(e)}</div>
                    <div className={`truncate text-xs font-semibold text-tx ${e.done ? 'line-through' : ''}`}>{e.title}</div>
                    {ln && height > 52 && <div className="truncate text-[11px] text-tx-soft">{ln}</div>}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Měsíční mřížka 6×7 s událostmi jako štítky. */
function MonthGrid({ anchor, today, events, onDay, onEvent }: {
  anchor: Date; today: Date; events: EventItem[]; onDay: (d: Date) => void; onEvent: (e: EventItem) => void
}): JSX.Element {
  const year = anchor.getFullYear(), month = anchor.getMonth()
  const first = new Date(year, month, 1)
  const gridStart = addDays(first, -((first.getDay() + 6) % 7))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  return (
    <div className="flex flex-1 flex-col overflow-auto p-3 md:p-4">
      <div className="grid grid-cols-7 border-b border-line pb-1">
        {DAY_NAMES.map((d) => <div key={d} className="px-2 text-center text-[11px] font-bold uppercase tracking-wide text-tx-faint">{d}</div>)}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {cells.map((day, i) => {
          const inMonth = day.getMonth() === month
          const isToday = sameDay(day, today)
          const dayEvents = events.filter((e) => sameDay(new Date(e.start_at), day)).sort((a, b) => a.start_at.localeCompare(b.start_at))
          return (
            <div key={i} className={`min-h-[90px] border-b border-r border-line p-1 ${i % 7 === 0 ? 'border-l' : ''} ${inMonth ? '' : 'bg-canvas/50'}`}>
              <button onClick={() => onDay(day)} className={`mb-0.5 grid h-6 w-6 place-items-center rounded-full text-xs font-semibold transition hover:bg-brand-soft ${isToday ? 'bg-brand-dark text-white' : inMonth ? 'text-tx' : 'text-tx-faint'}`}>
                {day.getDate()}
              </button>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => {
                  const meta = eventTypeMeta(e.type)
                  return (
                    <button key={e.id} onClick={() => onEvent(e)} className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] font-medium ${e.done ? 'opacity-55 line-through' : ''}`} style={{ background: `${meta.color}1a`, color: meta.color }}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                      <span className="truncate text-tx">{eventTime(e)} {e.title}</span>
                    </button>
                  )
                })}
                {dayEvents.length > 3 && <button onClick={() => onDay(day)} className="px-1 text-[10px] font-semibold text-tx-faint hover:text-brand-dark">+{dayEvents.length - 3} další</button>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AgendaView({ events, leadName, onEvent }: {
  events: EventItem[]; leadName: (id: string | null) => string | null; onEvent: (e: EventItem) => void
}): JSX.Element {
  const now = Date.now()
  const upcoming = events
    .filter((e) => new Date(e.end_at ?? e.start_at).getTime() >= now - 12 * 3600_000)
    .sort((a, b) => a.start_at.localeCompare(b.start_at))

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: EventItem[] }[] = []
    for (const e of upcoming) {
      const d = new Date(e.start_at)
      const key = d.toDateString()
      const last = out[out.length - 1]
      if (last && last.key === key) last.items.push(e)
      else out.push({ key, label: d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' }), items: [e] })
    }
    return out
  }, [upcoming])

  if (groups.length === 0) return <div className="p-8"><Empty label="Žádné nadcházející události. Naplánuj prohlídku nebo schůzku." /></div>

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="mb-2 text-sm font-bold capitalize text-tx">{g.label}</div>
            <ul className="space-y-2">
              {g.items.map((e) => {
                const meta = eventTypeMeta(e.type)
                const Icon = meta.icon
                const ln = leadName(e.lead_id)
                return (
                  <li key={e.id}>
                    <button onClick={() => onEvent(e)} className={`card flex w-full items-center gap-3 p-3 text-left transition hover:shadow-lift ${e.done ? 'opacity-60' : ''}`}>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: meta.color }}><Icon className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-sm font-bold text-tx ${e.done ? 'line-through' : ''}`}>{e.title}</div>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-tx-soft">
                          <span>{e.all_day ? 'celý den' : eventTime(e)}</span>
                          {ln && <span>· {ln}</span>}
                          {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                        </div>
                      </div>
                      <span className={`pill ${meta.soft}`}>{meta.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
