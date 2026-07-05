import { useRef, useState } from 'react'
import { Loader2, ImagePlus, Star, X, Trash2, ChevronDown, Globe, GripVertical, BookmarkCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { Modal } from './Modal'
import { WebStatusLight } from './WebStatusLight'
import { useListings } from '../lib/listingsContext'
import { useLeads } from '../lib/leadsContext'
import { useContacts } from '../lib/contactsContext'
import { mergePeople, samePerson } from '../lib/people'
import type { SavedContact } from '../lib/contacts'
import {
  PROPERTY_TYPES, STATUSES, OFFER_TYPES, CONDITIONS, CONSTRUCTIONS, OWNERSHIPS, FEATURES,
  webStatusMeta, humanizeFeature, makeSlug, type Listing, type PropertyType, type ListingStatus, type OfferType, type WebStatus
} from '../lib/listings'
import { uploadPhoto, photoUrl, BUCKET } from '../lib/photos'
import { supabase, type Lead } from '../lib/supabase'

interface Props {
  open: boolean
  listing?: Listing | null
  onClose: () => void
}

const num = (v: string): number | null => (v.trim() ? Number(v.replace(/\s/g, '')) : null)

// Custom vlastnosti (tagy) ukládáme rovnou jako lidský label — žádná slugifikace,
// aby se na webu zobrazovaly s diakritikou/velkými písmeny/mezerami.
const CUSTOM_FEAT_KEY = 'listing-custom-features-v2'
function loadCustomFeatures(): string[] {
  try { const r = JSON.parse(localStorage.getItem(CUSTOM_FEAT_KEY) || '[]'); return Array.isArray(r) ? r.filter((x) => typeof x === 'string') : [] } catch { return [] }
}
/** Normalizace jen pro porovnání/dedup (bez diakritiky, malá písmena). */
function normFeat(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Reference na osobu → hodnota selectu `lead:<id>` / `contact:<id>` / ''. */
function personRefValue(leadId: string | null | undefined, contactId: string | null | undefined): string {
  if (leadId) return `lead:${leadId}`
  if (contactId) return `contact:${contactId}`
  return ''
}
function parsePersonRef(v: string): { lead: string | null; contact: string | null } {
  if (v.startsWith('lead:')) return { lead: v.slice(5), contact: null }
  if (v.startsWith('contact:')) return { lead: null, contact: v.slice(8) }
  return { lead: null, contact: null }
}

/** Cesta v bucketu z veřejné URL (kvůli mazání souboru). */
function pathFromUrl(url: string): string | null {
  const marker = `/public/${BUCKET}/`
  const i = url.indexOf(marker)
  return i >= 0 ? url.slice(i + marker.length) : null
}

export function ListingForm({ open, listing, onClose }: Props): JSX.Element | null {
  const { add, patch, remove } = useListings()
  const { leads } = useLeads()
  const { contacts } = useContacts()
  const editing = !!listing

  const [title, setTitle] = useState(listing?.title ?? '')
  const [offer, setOffer] = useState<OfferType>(listing?.offer_type ?? 'sale')
  const [ptype, setPtype] = useState<PropertyType>(listing?.property_type ?? 'apartment')
  const [status, setStatus] = useState<ListingStatus>(listing?.status ?? 'available')
  const [webStatus, setWebStatus] = useState<WebStatus>(listing?.web_status ?? 'online')
  const [price, setPrice] = useState(String(listing?.price ?? ''))
  const [priceNote, setPriceNote] = useState(listing?.price_note ?? '')
  const [location, setLocation] = useState(listing?.location ?? '')
  const [address, setAddress] = useState(listing?.address ?? '')
  const [disposition, setDisposition] = useState(listing?.disposition ?? '')
  const [area, setArea] = useState(String(listing?.area_m2 ?? ''))
  const [description, setDescription] = useState(listing?.description ?? '')
  const [images, setImages] = useState<string[]>(listing?.images ?? [])
  const [featured, setFeatured] = useState(listing?.featured ?? false)
  const [sortOrder, setSortOrder] = useState(String(listing?.sort_order ?? '0'))

  // detailní parametry
  const [landArea, setLandArea] = useState(String(listing?.land_area_m2 ?? ''))
  const [floor, setFloor] = useState(listing?.floor ?? '')
  const [totalFloors, setTotalFloors] = useState(String(listing?.total_floors ?? ''))
  const [energy, setEnergy] = useState(listing?.energy_class ?? '')
  const [condition, setCondition] = useState(listing?.condition ?? '')
  const [construction, setConstruction] = useState(listing?.construction ?? '')
  const [ownership, setOwnership] = useState(listing?.ownership ?? '')
  const [yearBuilt, setYearBuilt] = useState(String(listing?.year_built ?? ''))
  const [yearReno, setYearReno] = useState(String(listing?.year_renovated ?? ''))
  const [availableFrom, setAvailableFrom] = useState(listing?.available_from ?? '')
  const [monthlyCosts, setMonthlyCosts] = useState(listing?.monthly_costs ?? '')
  const [refNum, setRefNum] = useState(listing?.reference_number ?? '')
  const [features, setFeatures] = useState<string[]>(listing?.features ?? [])

  // Prodávající / rezervace — hodnota selectu `lead:<id>` / `contact:<id>` / ''.
  const [seller, setSeller] = useState(personRefValue(listing?.seller_lead_id, listing?.seller_contact_id))
  const [reservation, setReservation] = useState(personRefValue(listing?.reservation_lead_id, listing?.reservation_contact_id))

  const [showMore, setShowMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const [customFeatures, setCustomFeatures] = useState<string[]>(loadCustomFeatures)
  const [newFeat, setNewFeat] = useState('')
  // Fixní vlastnosti + custom labely + případné staré slugy uložené na této nemovitosti.
  const baseFeatures = [...FEATURES, ...customFeatures.map((l) => ({ value: l, label: l }))]
  const allFeatures = [
    ...baseFeatures,
    ...features
      .filter((v) => !baseFeatures.some((f) => f.value === v))
      .map((v) => ({ value: v, label: humanizeFeature(v) }))
  ]

  // Zájemci = leady propojené s touto nemovitostí (pole property_id).
  const interested = editing && listing ? leads.filter((l) => l.property_id === listing.id) : []

  const toggleFeature = (v: string): void =>
    setFeatures((f) => (f.includes(v) ? f.filter((x) => x !== v) : [...f, v]))

  const addFeature = (): void => {
    const label = newFeat.trim()
    if (!label) return
    const key = normFeat(label)
    // Shoda s existující vlastností (fixní i custom) → jen ji zapneme (žádný duplikát).
    const match = allFeatures.find((f) => normFeat(f.label) === key || normFeat(f.value) === key)
    const value = match ? match.value : label
    if (!match && !customFeatures.some((l) => normFeat(l) === key)) {
      const next = [...customFeatures, label]
      setCustomFeatures(next)
      try { localStorage.setItem(CUSTOM_FEAT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    }
    if (!features.includes(value)) setFeatures((f) => [...f, value])
    setNewFeat('')
  }

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return
    setUploading(true); setErr(null)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        const path = await uploadPhoto('nemovitosti', file)
        urls.push(photoUrl(path)) // plné veřejné URL → web ho vykreslí přímo
      }
      setImages((cur) => [...cur, ...urls])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Nahrání fotky selhalo.')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }
  const makeCover = (url: string): void => setImages((cur) => [url, ...cur.filter((u) => u !== url)])
  const removeImg = (url: string): void => {
    setImages((cur) => cur.filter((u) => u !== url))
    const p = pathFromUrl(url)
    if (p) supabase.storage.from(BUCKET).remove([p]).catch(() => {})
  }
  /** Přesun fotky z pozice `from` na `to` (drag & drop pořadí). První = hlavní. */
  const moveImage = (from: number, to: number): void => {
    if (from === to || from < 0 || to < 0) return
    setImages((cur) => {
      const next = [...cur]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const save = async (): Promise<void> => {
    if (!title.trim()) return setErr('Vyplňte název nemovitosti.')
    if (!location.trim()) return setErr('Vyplňte lokalitu.')
    if (images.length === 0) return setErr('Nahrajte alespoň jednu fotku (použije se na webu).')
    setSaving(true); setErr(null)
    const s = parsePersonRef(seller)
    const r = parsePersonRef(reservation)
    const payload = {
      title: title.trim(),
      offer_type: offer,
      property_type: ptype,
      status,
      web_status: webStatus,
      price: num(price),
      price_note: priceNote.trim() || null,
      location: location.trim(),
      address: address.trim() || null,
      disposition: disposition.trim() || null,
      area_m2: num(area),
      description: description.trim() || null,
      main_image: images[0],
      images,
      featured,
      sort_order: num(sortOrder) ?? 0,
      land_area_m2: num(landArea),
      floor: floor.trim() || null,
      total_floors: num(totalFloors),
      energy_class: energy.trim() || null,
      condition: condition || null,
      construction: construction || null,
      ownership: ownership || null,
      year_built: num(yearBuilt),
      year_renovated: num(yearReno),
      available_from: availableFrom.trim() || null,
      monthly_costs: monthlyCosts.trim() || null,
      reference_number: refNum.trim() || null,
      features,
      seller_lead_id: s.lead,
      seller_contact_id: s.contact,
      reservation_lead_id: r.lead,
      reservation_contact_id: r.contact
    }
    try {
      if (editing && listing) await patch(listing.id, payload)
      else await add({ ...payload, slug: makeSlug(title) })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Uložení selhalo.')
      setSaving(false)
    }
  }

  const del = async (): Promise<void> => {
    if (!listing) return
    setSaving(true)
    try { await remove(listing.id); onClose() } catch (e) {
      setErr(e instanceof Error ? e.message : 'Smazání selhalo.'); setSaving(false)
    }
  }

  if (!open) return null

  return (
    <Modal
      open size="xl"
      title={editing ? 'Upravit nemovitost' : 'Nová nemovitost'}
      subtitle="Uloží se do databáze a zobrazí na webu petrazabranska.com"
      onClose={onClose}
      footer={
        <>
          {editing && (
            <button className="mr-auto flex items-center gap-1.5 text-sm font-semibold text-rose hover:text-rose/80" onClick={del} disabled={saving}>
              <Trash2 className="h-4 w-4" /> Smazat
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>Zrušit</button>
          <button className="btn-primary" onClick={save} disabled={saving || uploading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            {saving
              ? 'Ukládám…'
              : webStatus === 'online'
                ? (editing ? 'Uložit a zveřejnit' : 'Vytvořit a zveřejnit')
                : (editing ? 'Uložit' : 'Vytvořit koncept')}
          </button>
        </>
      }
    >
      {/* fotky */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-semibold text-tx-soft">Fotky <span className="text-tx-faint">· první = hlavní · táhni pro změnu pořadí · klikni pro náhled</span></label>
        <div
          className={`flex flex-wrap gap-2 rounded-xl p-1 transition ${dragOver ? 'bg-brand-soft ring-2 ring-brand/50' : ''}`}
          onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true) } }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
          onDrop={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) } }}
        >
          {images.map((url, i) => (
            <div
              key={url}
              draggable
              onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragIdx !== null) moveImage(dragIdx, i); setDragIdx(null) }}
              onDragEnd={() => setDragIdx(null)}
              className={`group relative h-24 w-32 cursor-move overflow-hidden rounded-xl border border-line transition ${dragIdx === i ? 'opacity-40' : ''}`}
            >
              <img src={url} alt="" className="h-full w-full cursor-zoom-in object-cover" onClick={() => setLightbox(i)} />
              {i === 0 && <span className="pointer-events-none absolute left-1 top-1 flex items-center gap-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-ink"><Star className="h-2.5 w-2.5" /> Hlavní</span>}
              <span className="pointer-events-none absolute right-1 top-1 rounded bg-black/45 p-0.5 text-white opacity-0 transition group-hover:opacity-100"><GripVertical className="h-3.5 w-3.5" /></span>
              <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                {i !== 0 && <button onClick={(e) => { e.stopPropagation(); makeCover(url) }} title="Nastavit jako hlavní" className="grid h-6 w-6 place-items-center rounded bg-white/90 text-tx hover:text-brand-dark"><Star className="h-3.5 w-3.5" /></button>}
                <button onClick={(e) => { e.stopPropagation(); removeImg(url) }} title="Smazat" className="grid h-6 w-6 place-items-center rounded bg-white/90 text-rose"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
          <button onClick={() => fileInput.current?.click()} disabled={uploading} className="grid h-24 w-32 place-items-center rounded-xl border-2 border-dashed border-line text-tx-faint transition hover:border-brand/50 hover:text-brand-dark">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex flex-col items-center gap-1 px-1 text-center text-xs font-semibold"><ImagePlus className="h-5 w-5" /> Přidat / přetáhnout</span>}
          </button>
          <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
        <p className="mt-1 text-[11px] text-tx-faint">Přetáhněte fotky sem nebo klikněte. Velké se automaticky zmenší pod 1,5 MB.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Název *" full>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="např. Slunný byt 3+kk Praha 5 — Smíchov" autoFocus />
        </Field>

        <Field label="Nabídka">
          <select className="input" value={offer} onChange={(e) => setOffer(e.target.value as OfferType)}>
            {OFFER_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Typ nemovitosti">
          <select className="input" value={ptype} onChange={(e) => setPtype(e.target.value as PropertyType)}>
            {PROPERTY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Stav">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ListingStatus)}>
            {STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Dispozice">
          <input className="input" value={disposition} onChange={(e) => setDisposition(e.target.value)} placeholder="např. 3+kk" />
        </Field>

        <Field label="Cena (Kč)">
          <input className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="např. 9490000" />
        </Field>
        <Field label="Poznámka k ceně">
          <input className="input" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} placeholder="např. včetně provize" />
        </Field>

        <Field label="Lokalita *">
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="např. Praha 5 — Smíchov" />
        </Field>
        <Field label="Plocha (m²)">
          <input className="input" inputMode="numeric" value={area} onChange={(e) => setArea(e.target.value)} placeholder="např. 78" />
        </Field>

        <Field label="Adresa (neveřejná pozn.)" full>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="přesná adresa pro mapu / interní" />
        </Field>

        <Field label="Popis" full>
          <textarea className="input min-h-[100px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Text inzerátu, který se zobrazí na webu…" />
        </Field>
      </div>

      {/* prodávající + rezervace */}
      <div className="mt-4 space-y-3 rounded-xl border border-line p-3">
        <div className="text-sm font-bold text-tx">Prodej a rezervace</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Prodávající">
            <PersonSelect value={seller} onChange={setSeller} leads={leads} contacts={contacts} placeholder="— nevybráno —" />
          </Field>
          <Field label="Rezervace">
            <PersonSelect value={reservation} onChange={setReservation} leads={leads} contacts={contacts} placeholder="— bez rezervace —" />
          </Field>
        </div>
        {editing && (
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-tx-faint">Zájemci ({interested.length})</div>
            {interested.length === 0 ? (
              <p className="text-xs text-tx-faint">Zatím žádní zájemci propojení v pipeline (pole „Nemovitost" u leadu).</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {interested.map((l) => {
                  const r = parsePersonRef(reservation)
                  const reserved = samePerson({ leadId: l.id, contactId: null }, { leadId: r.lead, contactId: r.contact }, leads)
                  return (
                    <span key={l.id} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${reserved ? 'bg-brand-soft text-brand-dark' : 'bg-canvas text-tx-soft'}`}>
                      {reserved && <BookmarkCheck className="h-3.5 w-3.5" />}{l.name || 'Bez jména'}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* další parametry */}
      <button onClick={() => setShowMore((s) => !s)} className="mt-4 flex w-full items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm font-semibold text-tx-soft transition hover:text-tx">
        <ChevronDown className={`h-4 w-4 transition ${showMore ? 'rotate-180' : ''}`} /> Další parametry (energie, stav, vybavení…)
      </button>

      {showMore && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Plocha pozemku (m²)"><input className="input" inputMode="numeric" value={landArea} onChange={(e) => setLandArea(e.target.value)} /></Field>
            <Field label="Podlaží"><input className="input" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="např. 3. NP" /></Field>
            <Field label="Počet podlaží"><input className="input" inputMode="numeric" value={totalFloors} onChange={(e) => setTotalFloors(e.target.value)} /></Field>
            <Field label="Energetická třída"><input className="input" value={energy} onChange={(e) => setEnergy(e.target.value)} placeholder="A–G" /></Field>
            <Field label="Stav">
              <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="">—</option>{CONDITIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Konstrukce">
              <select className="input" value={construction} onChange={(e) => setConstruction(e.target.value)}>
                <option value="">—</option>{CONSTRUCTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Vlastnictví">
              <select className="input" value={ownership} onChange={(e) => setOwnership(e.target.value)}>
                <option value="">—</option>{OWNERSHIPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Rok stavby"><input className="input" inputMode="numeric" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} /></Field>
            <Field label="Rok rekonstrukce"><input className="input" inputMode="numeric" value={yearReno} onChange={(e) => setYearReno(e.target.value)} /></Field>
            <Field label="Dostupné od"><input className="input" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} placeholder="např. ihned / 09/2026" /></Field>
            <Field label="Měsíční náklady"><input className="input" value={monthlyCosts} onChange={(e) => setMonthlyCosts(e.target.value)} placeholder="např. 4 500 Kč" /></Field>
            <Field label="Č. zakázky"><input className="input" value={refNum} onChange={(e) => setRefNum(e.target.value)} /></Field>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-tx-soft">Vybavení</label>
            <div className="flex flex-wrap gap-1.5">
              {allFeatures.map((f) => {
                const on = features.includes(f.value)
                return (
                  <button key={f.value} onClick={() => toggleFeature(f.value)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${on ? 'bg-ink text-white' : 'border border-line bg-white text-tx-soft hover:text-tx'}`}>
                    {f.label}
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="input flex-1" value={newFeat} onChange={(e) => setNewFeat(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature() } }}
                placeholder="Přidat vlastní vybavení (např. Krb)…"
              />
              <button className="btn-soft py-2 text-sm" onClick={addFeature}>Přidat</button>
            </div>
            <p className="mt-1 text-[11px] text-tx-faint">Nově přidané vybavení zůstane k dispozici i pro další nemovitosti.</p>
          </div>
        </div>
      )}

      {/* viditelnost na webu — semafor */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
        <div>
          <div className="text-sm font-semibold text-tx">Viditelnost na webu</div>
          <div className="text-[11px] text-tx-faint">{webStatusMeta(webStatus).hint}</div>
        </div>
        <WebStatusLight value={webStatus} onChange={setWebStatus} showLabel size={22} />
      </div>

      {/* nastavení webu */}
      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-line p-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-tx">
          <input type="checkbox" className="h-4 w-4 accent-brand-dark" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          Doporučená (nahoře na webu)
        </label>
        <label className="flex items-center gap-2 text-sm text-tx-soft">
          Pořadí
          <input className="input w-20 py-1.5" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </label>
      </div>

      {err && <p className="mt-3 text-sm font-medium text-rose">{err}</p>}

      {/* lightbox náhledů fotek */}
      {lightbox !== null && images[lightbox] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><X className="h-5 w-5" /></button>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? 0 : (i - 1 + images.length) % images.length)) }}
                className="absolute left-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              ><ChevronLeft className="h-6 w-6" /></button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? 0 : (i + 1) % images.length)) }}
                className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              ><ChevronRight className="h-6 w-6" /></button>
            </>
          )}
          <img src={images[lightbox]} alt="" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <span className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">{lightbox + 1} / {images.length}</span>
        </div>
      )}
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

/**
 * Výběr osoby — sjednocený adresář (lead a kontakt propojené přes kontakt_id
 * se nabídnou jen jednou). Hodnota: `lead:<id>` / `contact:<id>` / ''.
 */
function PersonSelect({ value, onChange, leads, contacts, placeholder }: {
  value: string
  onChange: (v: string) => void
  leads: Lead[]
  contacts: SavedContact[]
  placeholder: string
}): JSX.Element {
  const people = mergePeople(leads, contacts).sort((a, b) => a.name.localeCompare(b.name, 'cs'))
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {people.map((p) => (
        <option key={p.key} value={p.contactId ? `contact:${p.contactId}` : `lead:${p.leadId}`}>{p.name}</option>
      ))}
    </select>
  )
}
