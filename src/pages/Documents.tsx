import { useMemo, useState } from 'react'
import { Plus, Search, ExternalLink, Download, Trash2, Loader2, Link2Off } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Loading, Empty } from '../components/States'
import { DocUploadModal, useTargetNames, targetKindMeta } from '../components/DocumentUpload'
import { useDocuments } from '../lib/documentsContext'
import { useLeads } from '../lib/leadsContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { DOC_CATEGORIES, docCategoryMeta, documentSignedUrl, deleteDocument, formatBytes, type DocumentItem, type DocumentLink, type DocTarget } from '../lib/documents'
import { formatDate } from '../lib/format'

type LinkFilter = 'all' | 'nemovitost_id' | 'lead_id' | 'kontakt_id' | 'udalost_id' | 'none'
const LINK_FILTERS: { id: LinkFilter; label: string }[] = [
  { id: 'all', label: 'Vše' },
  { id: 'nemovitost_id', label: 'Nemovitosti' },
  { id: 'lead_id', label: 'Obchody' },
  { id: 'kontakt_id', label: 'Klienti' },
  { id: 'udalost_id', label: 'Prohlídky / úkoly' },
  { id: 'none', label: 'Bez vazby' }
]

function linkToTarget(l: DocumentLink): DocTarget {
  return { lead_id: l.lead_id, kontakt_id: l.kontakt_id, nemovitost_id: l.nemovitost_id, udalost_id: l.udalost_id }
}

export function Documents(): JSX.Element {
  const { docs, links, loading, refetch } = useDocuments()
  const { leads } = useLeads()
  const { openLead } = useLeadDetail()
  const names = useTargetNames()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>('all')
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('all')
  const [busy, setBusy] = useState<string | null>(null)

  const linksByDoc = useMemo(() => {
    const m = new Map<string, DocumentLink[]>()
    for (const l of links) { const a = m.get(l.dokument_id) ?? []; a.push(l); m.set(l.dokument_id, a) }
    return m
  }, [links])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return docs.filter((d) => {
      if (cat !== 'all' && d.kategorie !== cat) return false
      const dl = linksByDoc.get(d.id) ?? []
      if (linkFilter === 'none' && dl.length > 0) return false
      if (linkFilter !== 'all' && linkFilter !== 'none' && !dl.some((l) => l[linkFilter])) return false
      if (q && !d.name.toLowerCase().includes(q) && !dl.some((l) => (names(linkToTarget(l))?.label ?? '').toLowerCase().includes(q))) return false
      return true
    })
  }, [docs, linksByDoc, cat, linkFilter, query, names])

  const open = async (d: DocumentItem, download: boolean): Promise<void> => {
    setBusy(d.id)
    const url = await documentSignedUrl(d.file_path, download ? d.name : undefined)
    setBusy(null)
    if (url) window.open(url, '_blank', 'noopener')
  }
  const del = async (d: DocumentItem): Promise<void> => {
    if (!window.confirm(`Smazat dokument „${d.name}"? Soubor se odstraní i z úložiště.`)) return
    setBusy(d.id)
    try { await deleteDocument(d) } finally { setBusy(null); refetch() }
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Dokumenty"
        subtitle="Smlouvy, protokoly a podklady navázané na obchody, nemovitosti a klienty"
        showSearch={false}
        actions={<button className="btn-primary" onClick={() => setUploadOpen(true)} title="Nahrát dokument" aria-label="Nahrát dokument"><Plus className="h-4 w-4" /> <span className="hidden md:inline">Nahrát dokument</span></button>}
      />

      {loading ? (
        <Loading />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* hledání + filtry */}
          <div className="mb-4 flex flex-col gap-3">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tx-faint" />
              <input className="input pl-9" placeholder="Hledat podle názvu nebo vazby…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LINK_FILTERS.map((f) => (
                <button key={f.id} onClick={() => setLinkFilter(f.id)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${linkFilter === f.id ? 'bg-ink text-white' : 'border border-line bg-white text-tx-soft hover:text-tx'}`}>{f.label}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setCat('all')} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${cat === 'all' ? 'bg-brand-dark text-white' : 'border border-line bg-white text-tx-soft hover:text-tx'}`}>Všechny kategorie</button>
              {DOC_CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => setCat(c.value)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${cat === c.value ? 'bg-brand-dark text-white' : 'border border-line bg-white text-tx-soft hover:text-tx'}`}>{c.label}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Empty label={docs.length === 0 ? 'Zatím žádné dokumenty. Nahrajte první — vždy s vazbou na obchod, nemovitost nebo klienta.' : 'Žádné dokumenty v tomto filtru.'} />
          ) : (
            <div className="space-y-2">
              {filtered.map((d) => {
                const meta = docCategoryMeta(d.kategorie)
                const Icon = meta.icon
                const dl = linksByDoc.get(d.id) ?? []
                return (
                  <div key={d.id} className="card flex flex-wrap items-center gap-3 p-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.cls}`}><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold text-tx">{d.name}</span>
                        <span className={`pill ${meta.cls}`}>{meta.label}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-tx-faint">
                        <span>{formatDate(d.created_at)}</span>
                        {d.size_bytes ? <span>{formatBytes(d.size_bytes)}</span> : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {dl.length === 0 && <span className="flex items-center gap-1 rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-tx-faint"><Link2Off className="h-3 w-3" /> Bez vazby</span>}
                        {dl.map((l) => {
                          const n = names(linkToTarget(l))
                          if (!n) return null
                          const km = targetKindMeta(n.kind)
                          const lead = n.kind === 'lead_id' ? leads.find((x) => x.id === l.lead_id) : null
                          return (
                            <button
                              key={l.id}
                              onClick={() => lead && openLead(lead)}
                              disabled={!lead}
                              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${km.cls} ${lead ? 'hover:opacity-80' : 'cursor-default'}`}
                            >
                              <km.icon className="h-3 w-3" /> {n.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => open(d, false)} disabled={busy === d.id} title="Otevřít" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-tx-soft transition hover:border-brand/40 hover:text-brand-dark">
                        {busy === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      </button>
                      <button onClick={() => open(d, true)} title="Stáhnout" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-tx-soft transition hover:border-brand/40 hover:text-brand-dark"><Download className="h-4 w-4" /></button>
                      <button onClick={() => del(d)} title="Smazat" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-tx-faint transition hover:border-rose/40 hover:bg-rose-soft hover:text-rose"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {uploadOpen && <DocUploadModal onClose={() => setUploadOpen(false)} onUploaded={refetch} />}
    </div>
  )
}
