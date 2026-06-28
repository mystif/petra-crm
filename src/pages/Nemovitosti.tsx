import { useMemo, useState } from 'react'
import { Plus, Building2, MapPin, Star, Users, Ruler, ExternalLink } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Loading, ErrorState, Empty } from '../components/States'
import { ListingForm } from '../components/ListingForm'
import { useListings } from '../lib/listingsContext'
import { useLeads } from '../lib/leadsContext'
import {
  STATUSES, statusMeta, propertyTypeLabel, offerTypeLabel, formatListingPrice, type Listing
} from '../lib/listings'

type Filter = 'all' | Listing['status']

const WEB_BASE = 'https://www.petrazabranska.com/nemovitosti'

export function Nemovitosti(): JSX.Element {
  const { listings, loading, error, refetch } = useListings()
  const { leads } = useLeads()
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Listing | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const interestedCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of leads) if (l.property_id) m.set(l.property_id, (m.get(l.property_id) ?? 0) + 1)
    return m
  }, [leads])

  const filtered = filter === 'all' ? listings : listings.filter((l) => l.status === filter)

  const openNew = (): void => { setEditing(null); setFormOpen(true) }
  const openEdit = (l: Listing): void => { setEditing(l); setFormOpen(true) }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Nemovitosti"
        subtitle={`${listings.length} ${listings.length === 1 ? 'nabídka' : 'nabídek'} · zveřejněno na webu`}
        showSearch={false}
        actions={<button className="btn-primary" onClick={openNew}><Plus className="h-4 w-4" /> Nová nemovitost</button>}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* filtry */}
          <div className="mb-5 flex flex-wrap gap-1.5">
            {([{ value: 'all', label: 'Vše' }, ...STATUSES] as { value: Filter; label: string }[]).map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${filter === f.value ? 'bg-ink text-white' : 'border border-line bg-white text-tx-soft hover:text-tx'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Empty label={listings.length === 0 ? 'Zatím žádné nemovitosti. Přidejte první — zobrazí se na webu.' : 'Žádné nemovitosti v tomto stavu.'} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((l) => {
                const sm = statusMeta(l.status)
                const interested = interestedCount.get(l.id) ?? 0
                return (
                  <article key={l.id} className="card group cursor-pointer overflow-hidden transition hover:shadow-lift" onClick={() => openEdit(l)}>
                    <div className="relative h-44 overflow-hidden bg-canvas">
                      {l.main_image
                        ? <img src={l.main_image} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                        : <div className="grid h-full w-full place-items-center text-tx-faint"><Building2 className="h-10 w-10" /></div>}
                      <span className={`pill absolute left-2.5 top-2.5 ${sm.cls}`}>{sm.label}</span>
                      {l.featured && <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-ink"><Star className="h-3 w-3" /> Doporučená</span>}
                      <span className="absolute bottom-2.5 left-2.5 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">{offerTypeLabel(l.offer_type)} · {propertyTypeLabel(l.property_type)}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="truncate font-bold text-tx">{l.title}</h3>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-tx-soft">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{l.location}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-tx-soft">
                        {l.disposition && <span className="font-semibold text-tx">{l.disposition}</span>}
                        {l.area_m2 && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> {l.area_m2} m²</span>}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                        <span className="font-mono text-sm font-bold text-tx">{formatListingPrice(l.price, l.price_note, l.offer_type)}</span>
                        {interested > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-dark" title="Zájemci propojení v pipeline">
                            <Users className="h-3 w-3" /> {interested}
                          </span>
                        )}
                      </div>
                      <a
                        href={`${WEB_BASE}/${l.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                        className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Zobrazit na webu
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {formOpen && <ListingForm open listing={editing} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
