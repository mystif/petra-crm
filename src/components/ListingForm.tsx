import { useRef, useState } from 'react'
import { Loader2, ImagePlus, Star, X, Trash2, ChevronDown, Globe } from 'lucide-react'
import { Modal } from './Modal'
import { useListings } from '../lib/listingsContext'
import {
  PROPERTY_TYPES, STATUSES, OFFER_TYPES, CONDITIONS, CONSTRUCTIONS, OWNERSHIPS, FEATURES,
  makeSlug, type Listing, type PropertyType, type ListingStatus, type OfferType
} from '../lib/listings'
import { uploadPhoto, photoUrl, BUCKET } from '../lib/photos'
import { supabase } from '../lib/supabase'

interface Props {
  open: boolean
  listing?: Listing | null
  onClose: () => void
}

const num = (v: string): number | null => (v.trim() ? Number(v.replace(/\s/g, '')) : null)

/** Cesta v bucketu z veřejné URL (kvůli mazání souboru). */
function pathFromUrl(url: string): string | null {
  const marker = `/public/${BUCKET}/`
  const i = url.indexOf(marker)
  return i >= 0 ? url.slice(i + marker.length) : null
}

export function ListingForm({ open, listing, onClose }: Props): JSX.Element | null {
  const { add, patch, remove } = useListings()
  const editing = !!listing

  const [title, setTitle] = useState(listing?.title ?? '')
  const [offer, setOffer] = useState<OfferType>(listing?.offer_type ?? 'sale')
  const [ptype, setPtype] = useState<PropertyType>(listing?.property_type ?? 'apartment')
  const [status, setStatus] = useState<ListingStatus>(listing?.status ?? 'available')
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

  const [showMore, setShowMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const toggleFeature = (v: string): void =>
    setFeatures((f) => (f.includes(v) ? f.filter((x) => x !== v) : [...f, v]))

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

  const save = async (): Promise<void> => {
    if (!title.trim()) return setErr('Vyplňte název nemovitosti.')
    if (!location.trim()) return setErr('Vyplňte lokalitu.')
    if (images.length === 0) return setErr('Nahrajte alespoň jednu fotku (použije se na webu).')
    setSaving(true); setErr(null)
    const payload = {
      title: title.trim(),
      offer_type: offer,
      property_type: ptype,
      status,
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
      features
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
            {saving ? 'Ukládám…' : editing ? 'Uložit a zveřejnit' : 'Vytvořit a zveřejnit'}
          </button>
        </>
      }
    >
      {/* fotky */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-semibold text-tx-soft">Fotky <span className="text-tx-faint">· první = hlavní (na kartě)</span></label>
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={url} className="group relative h-24 w-32 overflow-hidden rounded-xl border border-line">
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-ink"><Star className="h-2.5 w-2.5" /> Hlavní</span>}
              <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                {i !== 0 && <button onClick={() => makeCover(url)} title="Nastavit jako hlavní" className="grid h-6 w-6 place-items-center rounded bg-white/90 text-tx hover:text-brand-dark"><Star className="h-3.5 w-3.5" /></button>}
                <button onClick={() => removeImg(url)} title="Smazat" className="grid h-6 w-6 place-items-center rounded bg-white/90 text-rose"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
          <button onClick={() => fileInput.current?.click()} disabled={uploading} className="grid h-24 w-32 place-items-center rounded-xl border-2 border-dashed border-line text-tx-faint transition hover:border-brand/50 hover:text-brand-dark">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex flex-col items-center gap-1 text-xs font-semibold"><ImagePlus className="h-5 w-5" /> Přidat</span>}
          </button>
          <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
        <p className="mt-1 text-[11px] text-tx-faint">Velké fotky se automaticky zmenší pod 1,5 MB.</p>
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
              {FEATURES.map((f) => {
                const on = features.includes(f.value)
                return (
                  <button key={f.value} onClick={() => toggleFeature(f.value)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${on ? 'bg-ink text-white' : 'border border-line bg-white text-tx-soft hover:text-tx'}`}>
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* nastavení webu */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-line p-3">
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
