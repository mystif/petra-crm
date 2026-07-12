// Nemovitosti — tabulka `nemovitosti` je sdílená s webem petrazabranska.com.
// Web ji jen ČTE (veřejné sloupce), CRM ji vytváří/upravuje. Typy a hodnoty
// MUSÍ odpovídat webu (src/lib/listings.ts na webu), jinak se rozbije zobrazení.
import { supabase } from './supabase'

export type PropertyType = 'house' | 'apartment' | 'commercial' | 'land'
export type ListingStatus = 'available' | 'reserved' | 'sold' | 'rented'
export type OfferType = 'sale' | 'rent'
/** Viditelnost na webu — semafor: zelená online / oranžová koncept / červená skryto. */
export type WebStatus = 'online' | 'draft'

export interface Listing {
  id: string
  created_at: string
  slug: string
  title: string
  property_type: PropertyType
  status: ListingStatus
  web_status: WebStatus
  offer_type: OfferType
  price: number | null
  price_note: string | null
  location: string
  disposition: string | null
  area_m2: number | null
  description: string | null
  main_image: string
  images: string[]
  vizualizace: string[] // URL fotek označených jako vizualizace (na webu dostanou štítek)
  featured: boolean
  sort_order: number
  address: string | null
  energy_class: string | null
  land_area_m2: number | null
  floor: string | null
  total_floors: number | null
  condition: string | null
  construction: string | null
  features: string[]
  year_built: number | null
  year_renovated: number | null
  available_from: string | null
  monthly_costs: string | null
  ownership: string | null
  reference_number: string | null
  // Prodávající a rezervace — reference na lead NEBO uložený kontakt (vždy max jedno z dvojice).
  seller_lead_id: string | null
  seller_contact_id: string | null
  reservation_lead_id: string | null
  reservation_contact_id: string | null
}

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Byt' },
  { value: 'house', label: 'Dům' },
  { value: 'land', label: 'Pozemek' },
  { value: 'commercial', label: 'Komerční prostor' }
]
export const STATUSES: { value: ListingStatus; label: string; cls: string }[] = [
  { value: 'available', label: 'Volné', cls: 'bg-emerald-soft text-emerald' },
  { value: 'reserved', label: 'Rezervováno', cls: 'bg-amber-soft text-amber' },
  { value: 'sold', label: 'Prodáno', cls: 'bg-canvas text-tx-soft' },
  { value: 'rented', label: 'Pronajato', cls: 'bg-sky-soft text-sky' }
]
export const OFFER_TYPES: { value: OfferType; label: string }[] = [
  { value: 'sale', label: 'Prodej' },
  { value: 'rent', label: 'Pronájem' }
]
/** Semafor viditelnosti na webu. `color` = barva svítícího světla. */
export const WEB_STATUSES: { value: WebStatus; label: string; hint: string; color: string }[] = [
  { value: 'online', label: 'Online', hint: 'Zveřejněno — je vidět na webu', color: '#16A34A' },
  { value: 'draft', label: 'Koncept', hint: 'Rozpracováno — není na webu', color: '#F59E0B' }
]
export function webStatusMeta(s: string | null): { value: WebStatus; label: string; hint: string; color: string } {
  return WEB_STATUSES.find((x) => x.value === s) ?? WEB_STATUSES[0]
}
export const CONDITIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'Novostavba' },
  { value: 'very_good', label: 'Velmi dobrý stav' },
  { value: 'good', label: 'Dobrý stav' },
  { value: 'after_reconstruction', label: 'Po rekonstrukci' },
  { value: 'before_reconstruction', label: 'Před rekonstrukcí' },
  { value: 'under_construction', label: 'Ve výstavbě' },
  { value: 'project', label: 'Projekt' }
]
export const CONSTRUCTIONS: { value: string; label: string }[] = [
  { value: 'brick', label: 'Cihla' },
  { value: 'panel', label: 'Panel' },
  { value: 'wood', label: 'Dřevostavba' },
  { value: 'stone', label: 'Kámen' },
  { value: 'mixed', label: 'Smíšená' },
  { value: 'prefab', label: 'Montovaná' },
  { value: 'skeleton', label: 'Skelet' }
]
export const OWNERSHIPS: { value: string; label: string }[] = [
  { value: 'personal', label: 'Osobní' },
  { value: 'cooperative', label: 'Družstevní' },
  { value: 'state', label: 'Státní / obecní' },
  { value: 'other', label: 'Jiné' }
]
export const FEATURES: { value: string; label: string }[] = [
  { value: 'balcony', label: 'Balkon' },
  { value: 'terrace', label: 'Terasa' },
  { value: 'loggia', label: 'Lodžie' },
  { value: 'garden', label: 'Zahrada' },
  { value: 'garage', label: 'Garáž' },
  { value: 'parking', label: 'Parkování' },
  { value: 'cellar', label: 'Sklep' },
  { value: 'elevator', label: 'Výtah' },
  { value: 'pool', label: 'Bazén' },
  { value: 'furnished', label: 'Vybaveno' },
  { value: 'air_conditioning', label: 'Klimatizace' },
  { value: 'barrier_free', label: 'Bezbariérové' }
]

export function propertyTypeLabel(t: string | null): string {
  return PROPERTY_TYPES.find((x) => x.value === t)?.label ?? t ?? '—'
}
export function statusMeta(s: string | null): { label: string; cls: string } {
  return STATUSES.find((x) => x.value === s) ?? { label: s ?? '—', cls: 'bg-canvas text-tx-soft' }
}
export function offerTypeLabel(t: string | null): string {
  return OFFER_TYPES.find((x) => x.value === t)?.label ?? t ?? '—'
}
/** Fixní vlastnost → český label; jinak vrátí hodnotu (custom label už je čitelný). */
export function featureLabel(v: string): string {
  return FEATURES.find((f) => f.value === v)?.label ?? humanizeFeature(v)
}
/**
 * Zlidští starý slug ('zimni_zahrada' → 'Zimni zahrada'). Pokud hodnota už je
 * čitelný label (mezery / velká písmena / diakritika), vrátí ji beze změny.
 */
export function humanizeFeature(v: string): string {
  if (!/^[a-z0-9_]+$/.test(v)) return v // už lidský label
  const s = v.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Cena ve formátu webu: „9 490 000 Kč", u pronájmu „/ měsíc". */
export function formatListingPrice(price: number | null, note: string | null, offer: OfferType): string {
  if (price == null) return note || 'Cena na vyžádání'
  let s = `${new Intl.NumberFormat('cs-CZ').format(price)} Kč`
  if (offer === 'rent') s += ' / měsíc'
  return note ? `${s} · ${note}` : s
}

/** Slug bez diakritiky + krátký suffix kvůli unikátnosti (slug má UNIQUE). */
export function makeSlug(title: string): string {
  const base = title
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'nemovitost'
  return `${base}-${Date.now().toString(36).slice(-4)}`
}

// --- API ---

export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('nemovitosti')
    .select('*')
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Listing[]
}

export type ListingInput = Partial<Omit<Listing, 'id' | 'created_at'>>

export async function createListing(input: ListingInput): Promise<Listing> {
  const { data, error } = await supabase.from('nemovitosti').insert(input).select().single()
  if (error) throw new Error(error.message)
  return data as Listing
}

export async function updateListing(id: string, patch: ListingInput): Promise<void> {
  const { error } = await supabase.from('nemovitosti').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteListing(id: string): Promise<void> {
  const { error } = await supabase.from('nemovitosti').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
