import { useEffect, useState } from 'react'
import { Plus, Star, MapPin, Pencil } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { Loading, ErrorState, Empty } from '../components/States'
import { RecenzeForm } from '../components/RecenzeForm'
import { WebStatusLight, WebStatusDot } from '../components/WebStatusLight'
import { fetchRecenze, webStatusMeta, updateRecenze, type Recenze as RecenzeItem } from '../lib/recenze'
import { photoUrl } from '../lib/photos'
import type { WebStatus } from '../lib/listings'

export function Recenze(): JSX.Element {
  const [items, setItems] = useState<RecenzeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<RecenzeItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const load = (): void => {
    setLoading(true); setError(null)
    fetchRecenze().then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Nepodařilo se načíst recenze.')).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openNew = (): void => { setEditing(null); setFormOpen(true) }
  const openEdit = (r: RecenzeItem): void => { setEditing(r); setFormOpen(true) }

  const setWebStatus = (r: RecenzeItem, v: WebStatus): void => {
    setItems((cur) => cur.map((x) => (x.id === r.id ? { ...x, web_status: v } : x)))
    updateRecenze(r.id, { web_status: v }).catch(load)
  }

  const onlineCount = items.filter((r) => r.web_status === 'online').length

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Recenze"
        subtitle={loading ? 'Reference klientů zobrazené na webu' : `${onlineCount} online z ${items.length}`}
        showSearch={false}
        actions={<button className="btn-primary" onClick={openNew} title="Nová recenze" aria-label="Nová recenze"><Plus className="h-4 w-4" /> <span className="hidden md:inline">Nová recenze</span></button>}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <Empty label="Zatím žádné recenze. Přidej první — zobrazí se v sekci Reference na webu." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((r) => {
              const sm = webStatusMeta(r.web_status)
              return (
                <article
                  key={r.id}
                  onClick={() => openEdit(r)}
                  className="card relative flex cursor-pointer flex-col gap-3 p-4 transition hover:shadow-lift"
                >
                  <div className="flex items-start gap-3">
                    {r.foto_path ? (
                      <img src={photoUrl(r.foto_path)} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <Avatar name={r.jmeno} size={44} />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-tx">{r.jmeno}</h3>
                      {r.lokalita && (
                        <div className="flex items-center gap-1 text-xs text-tx-soft">
                          <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{r.lokalita}</span>
                        </div>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()} title={`${sm.label} — ${sm.hint}`}>
                      <WebStatusDot value={r.web_status as WebStatus} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-3.5 w-3.5 ${n <= r.hodnoceni ? 'fill-gold text-gold' : 'text-line'}`} />
                      ))}
                    </div>
                    {r.oblast && <span className="pill bg-brand-soft text-brand-dark">{r.oblast}</span>}
                  </div>

                  <p className="line-clamp-3 flex-1 text-sm text-tx-soft">{r.text_cs}</p>

                  <div className="flex items-center justify-between border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
                    <WebStatusLight value={r.web_status as WebStatus} onChange={(v) => setWebStatus(r, v)} showLabel size={10} />
                    <button className="flex items-center gap-1 text-xs font-semibold text-tx-soft hover:text-brand-dark" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" /> Upravit
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {formOpen && <RecenzeForm recenze={editing} onClose={() => setFormOpen(false)} onSaved={load} />}
    </div>
  )
}
