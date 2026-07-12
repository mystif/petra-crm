import { useState } from 'react'
import { Loader2, Trash2, Clock3, Link2 } from 'lucide-react'
import { Modal } from './Modal'
import { useEvents } from '../lib/eventsContext'
import { useLeads } from '../lib/leadsContext'
import { useListings } from '../lib/listingsContext'
import { EVENT_TYPES, type EventType, type EventItem } from '../lib/events'
import { lastContactInfo } from '../lib/leadDisplay'
import { relativeDays } from '../lib/format'

/** ISO → hodnota pro <input type="datetime-local"> (lokální čas). */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** datetime-local → ISO. */
function fromLocalInput(v: string): string {
  return v ? new Date(v).toISOString() : ''
}
/** Přičte minuty k datetime-local hodnotě a vrátí ISO (pro automatický konec). */
function plusMinutesIso(localVal: string, min: number): string {
  if (!localVal) return ''
  return new Date(new Date(localVal).getTime() + min * 60_000).toISOString()
}

const REMINDERS: { value: number | null; label: string }[] = [
  { value: null, label: 'Bez připomenutí' },
  { value: 15, label: '15 min předem' },
  { value: 30, label: '30 min předem' },
  { value: 60, label: '1 h předem' },
  { value: 120, label: '2 h předem' },
  { value: 1440, label: '1 den předem' }
]

const RESULTS = ['Zájem', 'Nezájem', 'Rezervace'] as const

interface EventFormProps {
  open: boolean
  onClose: () => void
  /** Úprava existující události. */
  event?: EventItem | null
  /** Předvyplněný začátek (datetime-local hodnota nebo ISO). */
  initialStart?: string
  /** Předvybraný lead a výchozí typ (z detailu leadu). */
  initialLeadId?: string | null
  initialType?: EventType
  initialTitle?: string
  initialPropertyId?: string | null
  /** Zavolá se po vytvoření nové události (pro zápis do historie leadu apod.). */
  onSaved?: (e: EventItem) => void
}

export function EventForm({
  open, onClose, event, initialStart, initialLeadId, initialType, initialTitle, initialPropertyId, onSaved
}: EventFormProps): JSX.Element | null {
  const { add, patch, remove } = useEvents()
  const { leads } = useLeads()
  const { listings } = useListings()
  const editing = !!event

  const [type, setType] = useState<EventType>(event?.type ?? initialType ?? 'prohlidka')
  const [title, setTitle] = useState(event?.title ?? initialTitle ?? '')
  const [leadId, setLeadId] = useState<string>(event?.lead_id ?? initialLeadId ?? '')
  const [propertyId, setPropertyId] = useState<string>(event?.property_id ?? initialPropertyId ?? '')
  const [start, setStart] = useState<string>(
    event ? toLocalInput(event.start_at) : initialStart ? toLocalInput(fromLocalInput(initialStart) || initialStart) : ''
  )
  const [end, setEnd] = useState<string>(toLocalInput(event?.end_at ?? null))
  // Nová událost z leadu s nemovitostí zájmu → rovnou převezme její adresu.
  const [location, setLocation] = useState(() => {
    if (event) return event.location ?? ''
    return listings.find((x) => x.id === initialPropertyId)?.location ?? ''
  })
  const [note, setNote] = useState(event?.note ?? '')
  const [reminder, setReminder] = useState<number | null>(event?.reminder_min ?? 30)
  const [result, setResult] = useState<string>(event?.result ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const lead = leads.find((l) => l.id === leadId) ?? null

  const pickLead = (id: string): void => {
    setLeadId(id)
    const l = leads.find((x) => x.id === id)
    if (l && !location) setLocation(l.location ?? '')
  }

  const save = async (): Promise<void> => {
    if (!title.trim()) return setErr('Vyplňte název události.')
    if (!start) return setErr('Vyberte datum a čas.')
    setSaving(true); setErr(null)
    try {
      const payload = {
        type,
        title: title.trim(),
        lead_id: leadId || null,
        start_at: fromLocalInput(start),
        end_at: end ? fromLocalInput(end) : null,
        location: location.trim() || null,
        note: note.trim() || null,
        reminder_min: reminder,
        result: result || null,
        property_id: propertyId || null
      }
      if (editing && event) await patch(event.id, payload)
      else {
        const created = await add(payload)
        onSaved?.(created)
      }
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Uložení selhalo.')
      setSaving(false)
    }
  }

  const del = async (): Promise<void> => {
    if (!event) return
    setSaving(true)
    try { await remove(event.id); onClose() } catch (e) {
      setErr(e instanceof Error ? e.message : 'Smazání selhalo.'); setSaving(false)
    }
  }

  if (!open) return null

  return (
    <Modal
      open
      size="lg"
      title={editing ? 'Upravit událost' : 'Nová událost'}
      subtitle={editing ? undefined : 'Naplánujte prohlídku, schůzku, telefonát…'}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <button className="mr-auto flex items-center gap-1.5 text-sm font-semibold text-rose hover:text-rose/80" onClick={del} disabled={saving}>
              <Trash2 className="h-4 w-4" /> Smazat
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>Zrušit</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Ukládám…' : editing ? 'Uložit' : 'Vytvořit událost'}
          </button>
        </>
      }
    >
      {/* typ — barevné dlaždice */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {EVENT_TYPES.filter((t) => t.value !== 'jine').map((t) => {
          const Icon = t.icon
          const active = type === t.value
          return (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${active ? 'border-transparent text-white' : 'border-line bg-white text-tx-soft hover:text-tx'}`}
              style={active ? { background: t.color } : undefined}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Název *" full>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="např. Prohlídka bytu 3+kk Smíchov" autoFocus />
        </Field>

        <Field label="Klient (lead)">
          <select className="input" value={leadId} onChange={(e) => pickLead(e.target.value)}>
            <option value="">— bez vazby —</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.name || 'Bez jména'}{l.location ? ` · ${l.location}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Nemovitost">
          <select className="input" value={propertyId} onChange={(e) => {
            setPropertyId(e.target.value)
            const p = listings.find((x) => x.id === e.target.value)
            if (p && !location) setLocation(p.location)
          }}>
            <option value="">— bez vazby —</option>
            {listings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </Field>

        <Field label="Začátek *">
          <input className="input" type="datetime-local" value={start} onChange={(e) => {
            setStart(e.target.value)
            if (!end && e.target.value) setEnd(toLocalInput(plusMinutesIso(e.target.value, 30)))
          }} />
        </Field>
        <Field label="Konec">
          <input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>

        <Field label="Adresa / místo" full>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="např. Plzeňská 120, Praha 5" />
        </Field>

        <Field label="Připomenutí">
          <select className="input" value={reminder ?? ''} onChange={(e) => setReminder(e.target.value ? Number(e.target.value) : null)}>
            {REMINDERS.map((r) => <option key={String(r.value)} value={r.value ?? ''}>{r.label}</option>)}
          </select>
        </Field>
        {type === 'prohlidka' && (
          <Field label="Výsledek prohlídky">
            <select className="input" value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="">— zatím neproběhla —</option>
              {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        )}

        <Field label="Poznámka" full>
          <textarea className="input min-h-[70px] resize-y" value={note} onChange={(e) => setNote(e.target.value)} placeholder="např. Klient řeší hypotéku." />
        </Field>
      </div>

      {/* propojení s CRM — kontext leadu */}
      {lead && (
        <div className="mt-4 rounded-xl border border-line bg-canvas/60 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint">
            <Link2 className="h-3.5 w-3.5" /> Propojeno s CRM
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-tx-soft">
            <span className="font-semibold text-tx">{lead.name}</span>
            {lead.phone && <span>{lead.phone}</span>}
            <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> kontakt {lastContactInfo(lead).text}</span>
            <span>přijat {relativeDays(lead.created_at)}</span>
          </div>
        </div>
      )}

      {err && <p className="mt-3 text-sm font-medium text-rose">{err}</p>}
    </Modal>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }): JSX.Element {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-sm font-semibold text-tx-soft">{label}</label>
      {children}
    </div>
  )
}
