import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, ChevronDown, Filter, MoreHorizontal,
  Phone, Navigation, UserRound, CalendarClock, CheckCircle2, MapPin, Coins,
  CalendarDays, PhoneCall, Home as HomeIcon
} from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Loading, ErrorState, Empty } from '../components/States'
import { EventForm } from '../components/EventForm'
import { useEvents } from '../lib/eventsContext'
import { useLeads } from '../lib/leadsContext'
import { useListings } from '../lib/listingsContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { eventTypeMeta, EVENT_TYPES, sameDay, startOfWeek, isOverdue, eventTime, type EventItem, type EventType } from '../lib/events'
import { STAGE_MAP, type Lead } from '../lib/supabase'
import { formatCZK } from '../lib/format'

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
type GridView = 'den' | 'tyden' | 'mesic'
const GRID_VIEWS: { id: GridView; label: string }[] = [
  { id: 'den', label: 'Den' },
  { id: 'tyden', label: 'Týden' },
  { id: 'mesic', label: 'Měsíc' }
]

function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function pad(n: number): string { return String(n).padStart(2, '0') }
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }
function isoDate(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function endMs(e: EventItem): number {
  const s = new Date(e.start_at).getTime()
  return e.end_at ? new Date(e.end_at).getTime() : s + 60 * 60_000
}
/** Délka události v minutách (min. 15, výchozí 60 bez end_at). */
function durationMin(e: EventItem): number {
  if (!e.end_at) return 60
  return Math.max(15, Math.round((endMs(e) - new Date(e.start_at).getTime()) / 60_000))
}
function durationLabel(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/**
 * Odvozený stav události — data neobsahují zvlášť „potvrzeno"/„zrušeno", takže
 * vycházíme z reálného stavu: hotovo / právě probíhá / po termínu / naplánováno.
 */
function eventStatus(e: EventItem): { label: string; cls: string } {
  if (e.done) return { label: 'Hotovo', cls: 'bg-emerald-soft text-emerald' }
  const now = Date.now()
  const start = new Date(e.start_at).getTime()
  if (now >= start && now <= endMs(e)) return { label: 'Probíhá', cls: 'bg-sky-soft text-sky' }
  if (isOverdue(e)) return { label: 'Po termínu', cls: 'bg-rose-soft text-rose' }
  return { label: 'Naplánováno', cls: 'bg-brand-soft text-brand-dark' }
}

/** Způsob konání — odvozeno z typu události (telefonát vs. osobní setkání). */
function modeLabel(e: EventItem): string {
  if (e.type === 'telefonat' || e.type === 'followup') return e.location ? `Telefon · ${e.location}` : 'Telefon'
  return e.location ? `Osobně · ${e.location}` : 'Osobně'
}

/** Animovaný počet od 0 k cíli (ease-out). */
function useCountUp(target: number, duration = 650): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number): void => {
      const t = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

export function Calendar(): JSX.Element {
  const { events, loading, error, refetch, patch, toggleDone } = useEvents()
  const { leads } = useLeads()
  const { listings } = useListings()
  const { openLead } = useLeadDetail()

  const [gridView, setGridView] = useState<GridView>('mesic')
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [cursor, setCursor] = useState(() => new Date())
  const [slideDir, setSlideDir] = useState<1 | -1>(1)
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [hiddenTypes, setHiddenTypes] = useState<Set<EventType>>(new Set())
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const today = new Date()
  const leadOf = (id: string | null): Lead | null => (id ? leads.find((l) => l.id === id) ?? null : null)
  const listingOf = (id: string | null): ReturnType<typeof useListings>['listings'][number] | null =>
    (id ? listings.find((l) => l.id === id) ?? null : null)

  const visibleEvents = useMemo(
    () => events.filter((e) => !hiddenTypes.has(e.type)),
    [events, hiddenTypes]
  )

  const shift = (dir: number): void => {
    setSlideDir(dir > 0 ? 1 : -1)
    if (gridView === 'mesic') {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1)
      setCursor(next); setSelectedDay(next)
    } else if (gridView === 'tyden') {
      const next = addDays(startOfWeek(cursor), dir * 7)
      setCursor(next); setSelectedDay(next)
    } else {
      const next = addDays(selectedDay, dir)
      setSelectedDay(next); setCursor(next)
    }
  }

  const goToday = (): void => {
    setSlideDir(1)
    setSelectedDay(today); setCursor(today)
  }

  const changeGridView = (v: GridView): void => {
    setGridView(v); setViewMenuOpen(false)
    if (v === 'mesic') setCursor(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1))
    else if (v === 'tyden') setCursor(startOfWeek(selectedDay))
    else setCursor(selectedDay)
  }

  const selectDay = (d: Date): void => { setSelectedDay(d) }

  const periodLabel =
    gridView === 'mesic' ? cap(cursor.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' }))
      : gridView === 'tyden' ? `${startOfWeek(cursor).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })} – ${addDays(startOfWeek(cursor), 6).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : cap(selectedDay.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))

  const openNew = (start?: string): void => { setEditing(null); setCreating(start ?? ''); setFormOpen(true) }
  const openEdit = (e: EventItem): void => { setEditing(e); setCreating(null); setFormOpen(true) }
  const addForSelectedDay = (): void => openNew(`${isoDate(selectedDay)}T09:00`)

  const dayEvents = useMemo(
    () => visibleEvents.filter((e) => sameDay(new Date(e.start_at), selectedDay)).sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [visibleEvents, selectedDay]
  )

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Kalendář"
        subtitle="Schůzky, hovory, prohlídky a důležité termíny."
        showSearch={false}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-tx-soft transition hover:text-tx">Dnes</button>

            <div className="relative">
              <button
                onClick={() => { setViewMenuOpen((o) => !o); setFilterOpen(false) }}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-tx-soft transition hover:text-tx"
              >
                {GRID_VIEWS.find((v) => v.id === gridView)?.label}
                <ChevronDown className={`h-3.5 w-3.5 transition ${viewMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {viewMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setViewMenuOpen(false)} />
                  <div className="animate-pop absolute right-0 z-40 mt-1.5 w-32 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift">
                    {GRID_VIEWS.map((v) => (
                      <button key={v.id} onClick={() => changeGridView(v.id)} className={`flex w-full items-center px-3 py-2 text-left text-sm font-semibold transition hover:bg-canvas ${gridView === v.id ? 'text-brand-dark' : 'text-tx-soft'}`}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => { setFilterOpen((o) => !o); setViewMenuOpen(false) }}
                className={`relative grid h-9 w-9 place-items-center rounded-lg border transition ${hiddenTypes.size > 0 ? 'border-brand/50 bg-brand-soft text-brand-dark' : 'border-line bg-white text-tx-soft hover:text-tx'}`}
                title="Filtrovat typy událostí"
              >
                <Filter className="h-4 w-4" />
                {hiddenTypes.size > 0 && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-brand-dark text-[9px] font-bold text-white">{EVENT_TYPES.length - hiddenTypes.size}</span>}
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
                  <div className="animate-pop absolute right-0 z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-lift">
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-tx-faint">Typy událostí</span>
                      {hiddenTypes.size > 0 && <button onClick={() => setHiddenTypes(new Set())} className="text-[11px] font-semibold text-brand-dark hover:underline">Zobrazit vše</button>}
                    </div>
                    {EVENT_TYPES.map((t) => {
                      const on = !hiddenTypes.has(t.value)
                      return (
                        <button
                          key={t.value}
                          onClick={() => setHiddenTypes((cur) => { const next = new Set(cur); if (on) next.add(t.value); else next.delete(t.value); return next })}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm font-medium text-tx transition hover:bg-canvas"
                        >
                          <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition ${on ? 'border-transparent' : 'border-line'}`} style={on ? { background: t.color } : undefined}>
                            {on && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </span>
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <button className="btn-primary" onClick={addForSelectedDay} title="Nová událost" aria-label="Nová událost"><Plus className="h-4 w-4" /> <span className="hidden md:inline">Nová událost</span></button>
          </div>
        }
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* navigace */}
          <div className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-6">
            <button onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-tx-soft transition hover:border-brand/40 hover:text-brand-dark active:scale-95">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[220px] text-base font-bold capitalize text-tx" key={`${gridView}-${periodLabel}`}>{periodLabel}</div>
            <button onClick={() => shift(1)} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-tx-soft transition hover:border-brand/40 hover:text-brand-dark active:scale-95">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* kalendářová mřížka */}
          {gridView !== 'den' && (
            <div key={`grid-${cursor.getTime()}-${gridView}`} className={slideDir > 0 ? 'cal-slide-next' : 'cal-slide-prev'}>
              <CalendarGrid gridView={gridView} cursor={cursor} today={today} selectedDay={selectedDay} events={visibleEvents} onSelect={selectDay} />
            </div>
          )}

          {/* denní agenda */}
          <div className="border-t border-line p-4 md:p-6">
            <DaySummary events={dayEvents} leadOf={leadOf} />
            {dayEvents.length === 0 ? (
              <div className="mt-4"><Empty label="Tento den nemáte žádné události. Naplánujte hovor, prohlídku nebo schůzku." /></div>
            ) : (
              <div className="mt-4 space-y-3">
                {dayEvents.map((e, i) => {
                  const meta = eventTypeMeta(e.type)
                  const isLast = i === dayEvents.length - 1
                  return (
                    <div key={e.id} className="flex animate-pop gap-3" style={{ animationDelay: `${i * 45}ms` }}>
                      <div className="relative flex w-3 shrink-0 flex-col items-center pt-4">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-canvas" style={{ background: meta.color }} />
                        {!isLast && <span className="mt-1 w-px flex-1 bg-line" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <EventCard
                          event={e}
                          lead={leadOf(e.lead_id)}
                          listing={listingOf(e.property_id ?? leadOf(e.lead_id)?.property_id ?? null)}
                          onOpen={() => openEdit(e)}
                          onCall={(phone) => window.open(`tel:${phone}`, '_self')}
                          onNavigate={() => {
                            const q = e.location || listingOf(e.property_id ?? leadOf(e.lead_id)?.property_id ?? null)?.location || leadOf(e.lead_id)?.location
                            if (q) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank')
                          }}
                          onOpenContact={() => { const l = leadOf(e.lead_id); if (l) openLead(l) }}
                          onPostpone={() => {
                            const s = addDays(new Date(e.start_at), 1)
                            const end = e.end_at ? addDays(new Date(e.end_at), 1) : null
                            void patch(e.id, { start_at: s.toISOString(), end_at: end ? end.toISOString() : null })
                          }}
                          onToggleDone={() => void toggleDone(e.id)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {formOpen && (
        <EventForm open event={editing} initialStart={creating ?? undefined} onClose={() => setFormOpen(false)} />
      )}
    </div>
  )
}

/** Souhrn dne — 4 KPI karty (události, hovory, prohlídky, potenciální provize). */
function DaySummary({ events, leadOf }: { events: EventItem[]; leadOf: (id: string | null) => Lead | null }): JSX.Element {
  const calls = events.filter((e) => e.type === 'telefonat').length
  const showings = events.filter((e) => e.type === 'prohlidka').length
  const commission = useMemo(() => {
    const seen = new Set<string>()
    let sum = 0
    for (const e of events) {
      const l = leadOf(e.lead_id)
      if (l && !seen.has(l.id)) { seen.add(l.id); sum += Number(l.provize || 0) }
    }
    return sum
  }, [events, leadOf])

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard icon={CalendarDays} value={events.length} label={events.length === 1 ? 'událost' : events.length < 5 ? 'události' : 'událostí'} accent="#C1A263" />
      <KpiCard icon={PhoneCall} value={calls} label={calls === 1 ? 'hovor' : calls < 5 ? 'hovory' : 'hovorů'} accent="#3B8EF0" />
      <KpiCard icon={HomeIcon} value={showings} label={showings === 1 ? 'prohlídka' : showings < 5 ? 'prohlídky' : 'prohlídek'} accent="#0FA968" />
      <KpiCard icon={Coins} value={commission} label="Potenciální provize" accent="#91753C" format={formatCZK} />
    </div>
  )
}

function KpiCard({ icon: Icon, value, label, accent, format }: {
  icon: ComponentType<{ className?: string }>; value: number; label: string; accent: string; format?: (n: number) => string
}): JSX.Element {
  const n = useCountUp(value)
  return (
    <div className="card flex items-center gap-3 p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${accent}1a`, color: accent }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="stat-num truncate text-lg text-tx">{format ? format(n) : n}</div>
        <div className="truncate text-xs text-tx-soft">{label}</div>
      </div>
    </div>
  )
}

/** Kalendářová mřížka — měsíc (6×7) nebo týden (1×7), moderní styl dní. */
function CalendarGrid({ gridView, cursor, today, selectedDay, events, onSelect }: {
  gridView: GridView; cursor: Date; today: Date; selectedDay: Date; events: EventItem[]; onSelect: (d: Date) => void
}): JSX.Element {
  const days = useMemo(() => {
    if (gridView === 'tyden') return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))
    const year = cursor.getFullYear(), month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const gridStart = addDays(first, -((first.getDay() + 6) % 7))
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  }, [gridView, cursor])

  const eventsByDay = useMemo(() => {
    const m = new Map<string, EventItem[]>()
    for (const e of events) {
      const key = isoDate(new Date(e.start_at))
      const arr = m.get(key) ?? []
      arr.push(e)
      m.set(key, arr)
    }
    return m
  }, [events])

  return (
    <div className="p-3 md:p-4">
      <div className="grid grid-cols-7">
        {DAY_NAMES.map((d) => <div key={d} className="px-2 pb-2 text-center text-[11px] font-bold uppercase tracking-wide text-tx-faint">{d}</div>)}
      </div>
      <div className={`grid grid-cols-7 ${gridView === 'mesic' ? 'grid-rows-6' : ''} gap-y-1.5`}>
        {days.map((day, i) => {
          const inMonth = gridView !== 'mesic' || day.getMonth() === cursor.getMonth()
          const isToday = sameDay(day, today)
          const isSelected = sameDay(day, selectedDay)
          const dayEvents = eventsByDay.get(isoDate(day)) ?? []
          const dotTypes = [...new Set(dayEvents.map((e) => e.type))].slice(0, 3)
          return (
            <div key={i} className="flex flex-col items-center py-1">
              <button
                onClick={() => onSelect(day)}
                className={[
                  'grid place-items-center rounded-xl text-sm font-semibold transition-all duration-150',
                  gridView === 'mesic' ? 'h-10 w-10' : 'h-12 w-12 text-base',
                  isSelected
                    ? 'scale-105 bg-white text-tx shadow-md ring-2 ring-gold'
                    : isToday
                      ? 'text-brand-dark ring-1 ring-gold'
                      : inMonth ? 'text-tx hover:scale-105 hover:bg-canvas' : 'text-tx-faint/60 hover:bg-canvas',
                  'cursor-pointer'
                ].join(' ')}
                style={isSelected ? { boxShadow: '0 0 0 4px rgba(193,162,99,.18), 0 4px 12px rgba(193,162,99,.25)' } : undefined}
              >
                {day.getDate()}
              </button>
              <div className="mt-1 flex h-2.5 items-center gap-0.5">
                {dayEvents.length === 0 ? null : dayEvents.length <= 3 ? (
                  dotTypes.map((t) => <span key={t} className="h-1.5 w-1.5 rounded-full" style={{ background: eventTypeMeta(t).color }} />)
                ) : (
                  <span className="text-[10px] font-bold text-tx-faint">{dayEvents.length}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Karta jedné události — čas/délka, typ+název+lead+způsob, status + akce, karta nemovitosti. */
function EventCard({ event: e, lead, listing, onOpen, onCall, onNavigate, onOpenContact, onPostpone, onToggleDone }: {
  event: EventItem
  lead: Lead | null
  listing: ReturnType<typeof useListings>['listings'][number] | null
  onOpen: () => void
  onCall: (phone: string) => void
  onNavigate: () => void
  onOpenContact: () => void
  onPostpone: () => void
  onToggleDone: () => void
}): JSX.Element {
  const meta = eventTypeMeta(e.type)
  const Icon = meta.icon
  const status = eventStatus(e)
  const stage = lead ? STAGE_MAP[lead.crm_status] : null
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      onClick={onOpen}
      className={`card flex cursor-pointer gap-3 p-3 transition hover:shadow-lift ${e.done ? 'opacity-60' : ''}`}
    >
      <div className="w-14 shrink-0 text-center">
        <div className="text-base font-bold leading-tight text-tx">{e.all_day ? '—' : eventTime(e)}</div>
        <div className="text-[11px] text-tx-faint">{e.all_day ? 'celý den' : durationLabel(durationMin(e))}</div>
      </div>
      <div className="w-px shrink-0 self-stretch bg-line" />

      <span className="grid h-9 w-9 shrink-0 place-items-center self-start rounded-lg" style={{ background: `${meta.color}1a`, color: meta.color }}>
        <Icon className="h-4.5 w-4.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-bold text-tx ${e.done ? 'line-through' : ''}`}>{e.title}</div>
        {lead?.name && <div className="truncate text-sm text-tx-soft">{lead.name}</div>}
        <div className="truncate text-xs text-tx-faint">{modeLabel(e)}</div>

        {listing && (
          <div className="mt-2 overflow-hidden rounded-lg border border-line">
            <div className="flex items-center justify-between gap-2 px-2.5 py-2" style={{ background: stage ? `${stage.accent}0d` : undefined, borderLeft: `3px solid ${stage?.accent ?? '#C1A263'}` }}>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-xs font-semibold text-tx">
                  <MapPin className="h-3 w-3 shrink-0 text-tx-faint" /> {listing.location}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-tx-soft">
                  {lead?.name && <span className="flex items-center gap-1"><UserRound className="h-3 w-3" /> {lead.name}</span>}
                  {!!lead?.provize && <span className="flex items-center gap-1 font-semibold text-emerald"><Coins className="h-3 w-3" /> {formatCZK(lead.provize)}</span>}
                </div>
              </div>
              {stage && <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: stage.accent }}>{stage.label}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2" onClick={(ev) => ev.stopPropagation()}>
        <span className={`pill ${status.cls}`}>{status.label}</span>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="grid h-7 w-7 place-items-center rounded-lg text-tx-faint transition hover:bg-canvas hover:text-tx">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="animate-pop absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift">
                {lead?.phone && (
                  <MenuItem icon={Phone} label="Zavolat" onClick={() => { setMenuOpen(false); onCall(lead.phone as string) }} />
                )}
                <MenuItem icon={Navigation} label="Navigovat" onClick={() => { setMenuOpen(false); onNavigate() }} />
                {lead && <MenuItem icon={UserRound} label="Otevřít kontakt" onClick={() => { setMenuOpen(false); onOpenContact() }} />}
                <MenuItem icon={CalendarClock} label="Přesunout na zítra" onClick={() => { setMenuOpen(false); onPostpone() }} />
                <MenuItem icon={CheckCircle2} label={e.done ? 'Označit jako nehotové' : 'Označit jako hotové'} onClick={() => { setMenuOpen(false); onToggleDone() }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick }: { icon: ComponentType<{ className?: string }>; label: string; onClick: () => void }): JSX.Element {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-tx transition hover:bg-canvas">
      <Icon className="h-4 w-4 text-tx-faint" /> {label}
    </button>
  )
}
