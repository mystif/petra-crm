import { useMemo, useState } from 'react'
import { Plus, Building2, MapPin, Star, Users, Ruler, ExternalLink, Trash2, Loader2, BookmarkCheck, UserRound } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Loading, ErrorState, Empty } from '../components/States'
import { ListingForm } from '../components/ListingForm'
import { WebStatusLight } from '../components/WebStatusLight'
import { pathFromPublicUrl, removePhotoFiles } from '../lib/photos'
import { useListings } from '../lib/listingsContext'
import { useLeads } from '../lib/leadsContext'
import { useContacts } from '../lib/contactsContext'
import { personName, samePerson } from '../lib/people'
import { avatarGradient } from '../lib/format'
import {
  STATUSES, statusMeta, propertyTypeLabel, offerTypeLabel, formatListingPrice, type Listing, type WebStatus
} from '../lib/listings'

type Filter = 'all' | Listing['status']

const WEB_BASE = 'https://www.petrazabranska.com/nemovitosti'

export function Nemovitosti(): JSX.Element {
  const { listings, loading, error, refetch, patch, remove } = useListings()
  const { leads } = useLeads()
  const { contacts } = useContacts()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const setWebStatus = (l: Listing, v: WebStatus): void => { void patch(l.id, { web_status: v }) }

  const deleteListing = async (l: Listing): Promise<void> => {
    if (!window.confirm(`Opravdu smazat nemovitost „${l.title}"?\n\nSmaže se z databáze i webu včetně všech fotek. Akci nelze vrátit.`)) return
    setDeletingId(l.id)
    try {
      const paths = [l.main_image, ...(l.images ?? [])]
        .map(pathFromPublicUrl)
        .filter((p): p is string => !!p)
      if (paths.length) await removePhotoFiles([...new Set(paths)])
      await remove(l.id)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Nemovitost se nepodařilo smazat.')
    } finally {
      setDeletingId(null)
    }
  }
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Listing | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const interestedByProperty = useMemo(() => {
    const m = new Map<string, { id: string; name: string | null }[]>()
    for (const l of leads) {
      if (!l.property_id) continue
      const arr = m.get(l.property_id) ?? []
      arr.push({ id: l.id, name: l.name })
      m.set(l.property_id, arr)
    }
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
        actions={<button className="btn-primary" onClick={openNew} title="Nová nemovitost" aria-label="Nová nemovitost"><Plus className="h-4 w-4" /> <span className="hidden md:inline">Nová nemovitost</span></button>}
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
                const reservedName = personName(l.reservation_lead_id, l.reservation_contact_id, leads, contacts)
                const interestedList = interestedByProperty.get(l.id) ?? []
                const people = interestedList.map((p) => ({
                  name: p.name || 'Bez jména',
                  reserved: samePerson({ leadId: p.id, contactId: null }, { leadId: l.reservation_lead_id, contactId: l.reservation_contact_id }, leads)
                }))
                if (reservedName && !people.some((p) => p.reserved)) people.unshift({ name: reservedName, reserved: true })
                people.sort((a, b) => Number(b.reserved) - Number(a.reserved))
                const sellerName = personName(l.seller_lead_id, l.seller_contact_id, leads, contacts)
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

                      {sellerName && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-tx-soft">
                          <UserRound className="h-3.5 w-3.5 shrink-0 text-tx-faint" /> Prodává <span className="font-semibold text-tx">{sellerName}</span>
                        </div>
                      )}

                      {people.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <Users className="h-3.5 w-3.5 shrink-0 text-tx-faint" />
                          {people.slice(0, 3).map((p, i) => (
                            <span
                              key={i}
                              title={p.reserved ? 'Rezervováno' : 'Zájemce'}
                              className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${p.reserved ? 'bg-brand-soft text-brand-dark' : 'text-white'}`}
                              style={p.reserved ? undefined : { background: avatarGradient(p.name) }}
                            >
                              {p.reserved && <BookmarkCheck className="h-3 w-3" />}{p.name}
                            </span>
                          ))}
                          {people.length > 3 && <span className="text-[11px] font-semibold text-tx-faint">+{people.length - 3}</span>}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                        <span className="font-mono text-sm font-bold text-tx">{formatListingPrice(l.price, l.price_note, l.offer_type)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                        <div onClick={(e) => e.stopPropagation()} title="Viditelnost na webu">
                          <WebStatusLight value={l.web_status} onChange={(v) => setWebStatus(l, v)} size={11} showLabel />
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <a
                            href={`${WEB_BASE}/${l.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                            title="Zobrazit na webu"
                            className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-tx-soft transition hover:border-brand/40 hover:text-brand-dark"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Web
                          </a>
                          <button
                            onClick={(e) => { e.stopPropagation(); void deleteListing(l) }}
                            disabled={deletingId === l.id}
                            title="Smazat nemovitost"
                            aria-label="Smazat nemovitost"
                            className="grid h-7 w-7 place-items-center rounded-lg border border-line text-tx-faint transition hover:border-rose/40 hover:bg-rose-soft hover:text-rose disabled:opacity-50"
                          >
                            {deletingId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
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
