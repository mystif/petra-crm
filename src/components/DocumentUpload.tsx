import { useMemo, useState } from 'react'
import { Loader2, Upload, X, Building2, Briefcase, UserRound, CalendarClock, Plus, Check } from 'lucide-react'
import { Modal } from './Modal'
import { useLeads } from '../lib/leadsContext'
import { useContacts } from '../lib/contactsContext'
import { useListings } from '../lib/listingsContext'
import { useEvents } from '../lib/eventsContext'
import { useDocuments } from '../lib/documentsContext'
import { DOC_CATEGORIES, docCategoryMeta, formatBytes, uploadDocument, type DocTarget, type DocumentItem, type DocumentLink } from '../lib/documents'

function linkMatches(l: DocumentLink, t: DocTarget): boolean {
  return (!!t.lead_id && t.lead_id === l.lead_id) || (!!t.kontakt_id && t.kontakt_id === l.kontakt_id)
    || (!!t.nemovitost_id && t.nemovitost_id === l.nemovitost_id) || (!!t.udalost_id && t.udalost_id === l.udalost_id)
}

type TargetKind = 'nemovitost_id' | 'lead_id' | 'kontakt_id' | 'udalost_id'
const TARGET_META: { kind: TargetKind; label: string; icon: typeof Building2; cls: string }[] = [
  { kind: 'nemovitost_id', label: 'Nemovitost', icon: Building2, cls: 'bg-sky-soft text-sky' },
  { kind: 'lead_id', label: 'Obchod', icon: Briefcase, cls: 'bg-brand-soft text-brand-dark' },
  { kind: 'kontakt_id', label: 'Klient', icon: UserRound, cls: 'bg-emerald-soft text-emerald' },
  { kind: 'udalost_id', label: 'Prohlídka / úkol', icon: CalendarClock, cls: 'bg-amber-soft text-amber' }
]

/** Popisek jednoho cíle vazby (jméno leadu / kontaktu / titul nemovitosti / název události). */
export function useTargetNames(): (t: DocTarget) => { kind: TargetKind; label: string } | null {
  const { leads } = useLeads()
  const { contacts } = useContacts()
  const { listings } = useListings()
  const { events } = useEvents()
  return useMemo(() => (t: DocTarget) => {
    if (t.nemovitost_id) return { kind: 'nemovitost_id', label: listings.find((l) => l.id === t.nemovitost_id)?.title ?? 'Nemovitost' }
    if (t.lead_id) return { kind: 'lead_id', label: leads.find((l) => l.id === t.lead_id)?.name ?? 'Obchod' }
    if (t.kontakt_id) return { kind: 'kontakt_id', label: contacts.find((c) => c.id === t.kontakt_id)?.name ?? 'Klient' }
    if (t.udalost_id) return { kind: 'udalost_id', label: events.find((e) => e.id === t.udalost_id)?.title ?? 'Událost' }
    return null
  }, [leads, contacts, listings, events])
}
export function targetKindMeta(kind: TargetKind) {
  return TARGET_META.find((m) => m.kind === kind) ?? TARGET_META[0]
}

function sameTarget(a: DocTarget, b: DocTarget): boolean {
  return (a.lead_id ?? null) === (b.lead_id ?? null) && (a.kontakt_id ?? null) === (b.kontakt_id ?? null)
    && (a.nemovitost_id ?? null) === (b.nemovitost_id ?? null) && (a.udalost_id ?? null) === (b.udalost_id ?? null)
}

/** Výběr vazeb — 4 typy entit, každou lze přidat vícekrát (M:N), zobrazené jako odebíratelné chipy. */
export function TargetPicker({ value, onChange }: { value: DocTarget[]; onChange: (t: DocTarget[]) => void }): JSX.Element {
  const { leads } = useLeads()
  const { contacts } = useContacts()
  const { listings } = useListings()
  const { events } = useEvents()
  const names = useTargetNames()

  const optionsFor = (kind: TargetKind): { id: string; label: string }[] => {
    if (kind === 'nemovitost_id') return listings.map((l) => ({ id: l.id, label: l.title }))
    if (kind === 'lead_id') return leads.filter((l) => l.lead_type !== 'doporucitel').map((l) => ({ id: l.id, label: l.name || 'Bez jména' }))
    if (kind === 'kontakt_id') return contacts.map((c) => ({ id: c.id, label: c.name || 'Bez jména' }))
    return [...events].sort((a, b) => b.start_at.localeCompare(a.start_at)).map((e) => ({ id: e.id, label: e.title }))
  }

  const add = (kind: TargetKind, id: string): void => {
    if (!id) return
    const t: DocTarget = { [kind]: id }
    if (value.some((x) => sameTarget(x, t))) return
    onChange([...value, t])
  }
  const remove = (t: DocTarget): void => onChange(value.filter((x) => !sameTarget(x, t)))

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TARGET_META.map((m) => (
          <div key={m.kind}>
            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-tx-faint"><m.icon className="h-3.5 w-3.5" /> {m.label}</label>
            <select className="input" value="" onChange={(e) => add(m.kind, e.target.value)}>
              <option value="">+ přidat…</option>
              {optionsFor(m.kind).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((t, i) => {
            const n = names(t)
            if (!n) return null
            const meta = targetKindMeta(n.kind)
            return (
              <span key={i} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${meta.cls}`}>
                <meta.icon className="h-3 w-3" /> {n.label}
                <button onClick={() => remove(t)} className="ml-0.5 rounded-full hover:opacity-70"><X className="h-3 w-3" /></button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Modál nahrání dokumentu s předvyplněnými vazbami. */
export function DocUploadModal({ defaultTargets, defaultCategory, onClose, onUploaded }: {
  defaultTargets?: DocTarget[]
  defaultCategory?: string
  onClose: () => void
  onUploaded?: () => void
}): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState(defaultCategory ?? 'jine')
  const [note, setNote] = useState('')
  const [targets, setTargets] = useState<DocTarget[]>(defaultTargets ?? [])
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const pick = (f: File | null): void => {
    if (!f) return
    setFile(f)
    if (!name.trim()) setName(f.name.replace(/\.[^.]+$/, ''))
  }

  const save = async (): Promise<void> => {
    if (!file) return setErr('Vyberte soubor.')
    if (targets.length === 0) return setErr('Přidejte alespoň jednu vazbu (dokument musí být na něco navázán).')
    setSaving(true); setErr(null)
    try {
      await uploadDocument(file, { name, kategorie, note }, targets)
      onUploaded?.()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Nahrání selhalo.')
      setSaving(false)
    }
  }

  return (
    <Modal
      open size="lg"
      title="Nahrát dokument"
      subtitle="Dokument musí být navázán alespoň na jednu entitu"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Zrušit</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Nahrát
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0] ?? null) }}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${dragOver ? 'border-brand/50 bg-brand-soft/40' : 'border-line'}`}
        >
          <Upload className="h-6 w-6 text-tx-faint" />
          {file ? (
            <div className="text-sm font-semibold text-tx">{file.name}</div>
          ) : (
            <div className="text-sm text-tx-soft">Přetáhněte soubor sem nebo</div>
          )}
          <label className="btn-soft cursor-pointer py-1.5 text-sm">
            {file ? 'Vybrat jiný' : 'Vybrat soubor'}
            <input type="file" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          <span className="text-[11px] text-tx-faint">PDF, Word, Excel, obrázky — do 20 MB</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-tx-soft">Název</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="např. Kupní smlouva" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-tx-soft">Kategorie</label>
            <select className="input" value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
              {DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-tx-soft">Navázat na</label>
          <TargetPicker value={targets} onChange={setTargets} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-tx-soft">Poznámka</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="volitelné" />
        </div>

        {err && <p className="text-sm font-medium text-rose">{err}</p>}
      </div>
    </Modal>
  )
}

/**
 * Výběr příloh pro e-mail — existující dokumenty navázané na `targets`
 * + možnost nahrát nový (kategorie „Nabídka spolupráce"). Vrací vybrané dokumenty.
 */
export function AttachDocsModal({ targets, defaultTargets, selectedIds, onClose, onConfirm }: {
  targets: DocTarget[]
  defaultTargets: DocTarget[]
  selectedIds: string[]
  onClose: () => void
  onConfirm: (docs: DocumentItem[]) => void
}): JSX.Element {
  const { docs, links, refetch } = useDocuments()
  const [sel, setSel] = useState<Set<string>>(new Set(selectedIds))
  const [uploadOpen, setUploadOpen] = useState(false)

  const items = useMemo(() => {
    const ids = new Set<string>()
    for (const l of links) if (targets.some((t) => linkMatches(l, t))) ids.add(l.dokument_id)
    return docs.filter((d) => ids.has(d.id))
  }, [docs, links, targets])

  const toggle = (id: string): void => setSel((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <Modal
      open size="lg"
      title="Přiložit dokument"
      subtitle="Vyberte existující dokument nebo nahrajte nový (PDF nabídky spolupráce)"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Zrušit</button>
          <button className="btn-primary" onClick={() => onConfirm(items.filter((d) => sel.has(d.id)))}>Přiložit ({sel.size})</button>
        </>
      }
    >
      <button onClick={() => setUploadOpen(true)} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line py-3 text-sm font-semibold text-tx-soft transition hover:border-brand/50 hover:text-brand-dark">
        <Plus className="h-4 w-4" /> Nahrát nový dokument
      </button>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-tx-faint">Žádné navázané dokumenty. Nahrajte nový výše.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((d) => {
            const meta = docCategoryMeta(d.kategorie)
            const Icon = meta.icon
            const on = sel.has(d.id)
            return (
              <li key={d.id}>
                <button onClick={() => toggle(d.id)} className={`flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition ${on ? 'border-brand/50 bg-brand-soft/40' : 'border-line hover:bg-canvas'}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.cls}`}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-tx">{d.name}</div>
                    <div className="text-[11px] text-tx-faint">{meta.label}{d.size_bytes ? ` · ${formatBytes(d.size_bytes)}` : ''}</div>
                  </div>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-transparent bg-brand text-ink' : 'border-line'}`}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {uploadOpen && <DocUploadModal defaultTargets={defaultTargets} defaultCategory="nabidka_spoluprace" onClose={() => setUploadOpen(false)} onUploaded={refetch} />}
    </Modal>
  )
}
