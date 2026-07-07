import { useMemo, useState } from 'react'
import { FileText, Plus, ExternalLink, Download, Loader2 } from 'lucide-react'
import { DocUploadModal } from './DocumentUpload'
import { useDocuments } from '../lib/documentsContext'
import { docCategoryMeta, documentSignedUrl, formatBytes, type DocTarget, type DocumentItem } from '../lib/documents'

function matchesTarget(link: { lead_id: string | null; kontakt_id: string | null; nemovitost_id: string | null; udalost_id: string | null }, t: DocTarget): boolean {
  return (!!t.lead_id && t.lead_id === link.lead_id)
    || (!!t.kontakt_id && t.kontakt_id === link.kontakt_id)
    || (!!t.nemovitost_id && t.nemovitost_id === link.nemovitost_id)
    || (!!t.udalost_id && t.udalost_id === link.udalost_id)
}

/**
 * Sekce dokumentů navázaných na kteroukoli z entit v `targets` (agregovaný pohled).
 * Upload předvyplní `defaultTargets`.
 */
export function DocumentsSection({ targets, defaultTargets, dark = false }: {
  targets: DocTarget[]
  defaultTargets: DocTarget[]
  dark?: boolean
}): JSX.Element {
  const { docs, links, refetch } = useDocuments()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const items = useMemo(() => {
    const ids = new Set<string>()
    for (const l of links) if (targets.some((t) => matchesTarget(l, t))) ids.add(l.dokument_id)
    return docs.filter((d) => ids.has(d.id))
  }, [docs, links, targets])

  const open = async (d: DocumentItem, download: boolean): Promise<void> => {
    setBusy(d.id)
    const url = await documentSignedUrl(d.file_path, download ? d.name : undefined)
    setBusy(null)
    if (url) window.open(url, '_blank', 'noopener')
  }

  const muted = dark ? 'text-white/55' : 'text-tx-soft'
  const faint = dark ? 'text-white/40' : 'text-tx-faint'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${dark ? 'text-white/70' : 'text-tx-faint'}`}><FileText className="h-3.5 w-3.5" /> Dokumenty {items.length > 0 && <span className={faint}>({items.length})</span>}</h4>
        <button onClick={() => setUploadOpen(true)} className={`flex items-center gap-1 text-xs font-semibold ${dark ? 'text-gold hover:text-[#D4B26F]' : 'text-brand-dark hover:underline'}`}><Plus className="h-3.5 w-3.5" /> Dokument</button>
      </div>

      {items.length === 0 ? (
        <p className={`text-xs ${faint}`}>Zatím žádné dokumenty. Nahrajte smlouvu, protokol nebo podklad.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((d) => {
            const meta = docCategoryMeta(d.kategorie)
            const Icon = meta.icon
            return (
              <li key={d.id} className={`flex items-center gap-2 rounded-lg p-2 ${dark ? 'bg-white/[.04]' : 'bg-canvas'}`}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${meta.cls}`}><Icon className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-semibold ${dark ? 'text-white' : 'text-tx'}`}>{d.name}</div>
                  <div className={`text-[11px] ${muted}`}>{meta.label}{d.size_bytes ? ` · ${formatBytes(d.size_bytes)}` : ''}</div>
                </div>
                <button onClick={() => open(d, false)} disabled={busy === d.id} title="Otevřít" className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${dark ? 'text-white/60 hover:text-white' : 'text-tx-soft hover:text-brand-dark'}`}>
                  {busy === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                </button>
                <button onClick={() => open(d, true)} title="Stáhnout" className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${dark ? 'text-white/60 hover:text-white' : 'text-tx-soft hover:text-brand-dark'}`}><Download className="h-4 w-4" /></button>
              </li>
            )
          })}
        </ul>
      )}

      {uploadOpen && <DocUploadModal defaultTargets={defaultTargets} onClose={() => setUploadOpen(false)} onUploaded={refetch} />}
    </div>
  )
}
