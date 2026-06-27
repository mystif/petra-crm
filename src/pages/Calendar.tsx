import { useMemo, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, CalendarRange, ListTree, MapPin } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Loading, ErrorState, Empty } from '../components/States'
import { EventForm } from '../components/EventForm'
import { useEvents } from '../lib/eventsContext'
import { useLeads } from '../lib/leadsContext'
import { eventTypeMeta, startOfWeek, sameDay, eventTime, type EventItem } from '../lib/events'

const START_HOUR = 7
const END_HOUR = 21
const HOUR_H = 54
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

type View = 'tyden' | 'agenda'

function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}

/** Pozice a výška bloku události v denním sloupci (px). */
function blockGeometry(e: EventItem): { top: number; height: number } {
  const s = new Date(e.start_at)
  const startMin = (s.getHours() - START_HOUR) * 60 + s.getMinutes()
  const end = e.end_at ? new Date(e.end_at) : new Date(s.getTime() + 60 * 60_000)
  const durMin = Math.max(34, (end.getTime() - s.getTime()) / 60_000)
  return { top: Math.max(0, (startMin / 60) * HOUR_H), height: (durMin / 60) * HOUR_H }
}

export function Calendar(): JSX.Element {
  const { events, loading, error, refetch } = useEvents()
  const { leads } = useLeads()
  // Na mobilu je týdenní mřížka stísněná → výchozí pohled Agenda.
  const [view, setView] = useState<View>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'agenda' : 'tyden'))
  const [anchor, setAnchor] = useState(new Date())
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [creating, setCreating] = useState<string | null>(null) // initialStart (datetime-local)
  const [formOpen, setFormOpen] = useState(false)

  const leadName = (id: string | null): string | null => leads.find((l) => l.id === id)?.name ?? null

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const today = new Date()

  const weekLabel = `${weekStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })} – ${addDays(weekStart, 6).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}`

  const openNew = (start?: string): void => { setEditing(null); setCreating(start ?? ''); setFormOpen(true) }
  const openEdit = (e: EventItem): void => { setEditing(e); setCreating(null); setFormOpen(true) }

  const slotStart = (day: Date, hour: number): string => {
    const d = new Date(day); d.setHours(hour, 0, 0, 0)
    const pad = (n: number): string => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00`
  }

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
          {/* lišta: navigace + přepínač pohledu */}
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-3">
            <div className="flex items-center gap-1">
              <button onClick={() => setAnchor(addDays(weekStart, -7))} className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-tx-soft hover:text-tx"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setAnchor(addDays(weekStart, 7))} className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-tx-soft hover:text-tx"><ChevronRight className="h-4 w-4" /></button>
              <button onClick={() => setAnchor(new Date())} className="ml-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-tx-soft hover:text-tx">Dnes</button>
            </div>
            <div className="text-sm font-bold text-tx">{weekLabel}</div>

            <div className="ml-auto flex gap-1 rounded-lg border border-line bg-white p-0.5">
              <button onClick={() => setView('tyden')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${view === 'tyden' ? 'bg-ink text-white' : 'text-tx-soft hover:text-tx'}`}><CalendarRange className="h-4 w-4" /> Týden</button>
              <button onClick={() => setView('agenda')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${view === 'agenda' ? 'bg-ink text-white' : 'text-tx-soft hover:text-tx'}`}><ListTree className="h-4 w-4" /> Agenda</button>
            </div>
          </div>

          {view === 'tyden' ? (
            <WeekGrid
              weekDays={weekDays} today={today} events={events} leadName={leadName}
              onSlot={(day, hour) => openNew(slotStart(day, hour))} onEvent={openEdit}
            />
          ) : (
            <AgendaView events={events} leadName={leadName} onEvent={openEdit} />
          )}
        </div>
      )}

      {formOpen && (
        <EventForm
          open
          event={editing}
          initialStart={creating ?? undefined}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}

function WeekGrid({ weekDays, today, events, leadName, onSlot, onEvent }: {
  weekDays: Date[]; today: Date; events: EventItem[]; leadName: (id: string | null) => string | null
  onSlot: (day: Date, hour: number) => void; onEvent: (e: EventItem) => void
}): JSX.Element {
  return (
    <div className="flex-1 overflow-auto">
      {/* záhlaví dnů */}
      <div className="sticky top-0 z-10 grid border-b border-line bg-canvas/90 backdrop-blur" style={{ gridTemplateColumns: '56px repeat(7, minmax(120px, 1fr))' }}>
        <div />
        {weekDays.map((d) => {
          const isToday = sameDay(d, today)
          return (
            <div key={d.toISOString()} className={`border-l border-line px-2 py-2 text-center ${isToday ? 'bg-brand-soft/40' : ''}`}>
              <div className="text-[11px] font-bold uppercase tracking-wide text-tx-faint">{DAY_NAMES[(d.getDay() + 6) % 7]}</div>
              <div className={`text-sm font-bold ${isToday ? 'text-brand-dark' : 'text-tx'}`}>{d.getDate()}.{d.getMonth() + 1}.</div>
            </div>
          )
        })}
      </div>

      {/* mřížka */}
      <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, minmax(120px, 1fr))' }}>
        {/* gutter hodin */}
        <div className="relative" style={{ height: HOURS.length * HOUR_H }}>
          {HOURS.map((h) => (
            <div key={h} className="absolute right-1.5 -translate-y-1/2 text-[11px] font-medium text-tx-faint" style={{ top: (h - START_HOUR) * HOUR_H }}>
              {h}:00
            </div>
          ))}
        </div>

        {/* denní sloupce */}
        {weekDays.map((day) => {
          const dayEvents = events.filter((e) => sameDay(new Date(e.start_at), day))
          const isToday = sameDay(day, today)
          return (
            <div key={day.toISOString()} className={`relative border-l border-line ${isToday ? 'bg-brand-soft/10' : ''}`} style={{ height: HOURS.length * HOUR_H }}>
              {/* klikací sloty po hodinách */}
              {HOURS.map((h) => (
                <button
                  key={h}
                  onClick={() => onSlot(day, h)}
                  className="absolute inset-x-0 border-b border-line/60 transition hover:bg-brand-soft/30"
                  style={{ top: (h - START_HOUR) * HOUR_H, height: HOUR_H }}
                  aria-label={`${h}:00`}
                />
              ))}
              {/* události */}
              {dayEvents.map((e) => {
                const meta = eventTypeMeta(e.type)
                const { top, height } = blockGeometry(e)
                const Icon = meta.icon
                const ln = leadName(e.lead_id)
                return (
                  <button
                    key={e.id}
                    onClick={() => onEvent(e)}
                    className={`absolute left-1 right-1 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left shadow-card transition hover:shadow-lift ${e.done ? 'opacity-55' : ''}`}
                    style={{ top: top + 1, height: height - 2, background: `${meta.color}1a`, borderColor: meta.color }}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold" style={{ color: meta.color }}>
                      <Icon className="h-3 w-3 shrink-0" /> {eventTime(e)}
                    </div>
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
