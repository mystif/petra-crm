import { useState } from 'react'
import { PhoneCall, Phone, Mail, MapPin, Trash2, Loader2, Plus, ExternalLink, Building2, MessageCircle, X } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Modal } from '../components/Modal'
import { Loading, ErrorState, Empty } from '../components/States'
import { useColdCalls } from '../lib/coldCallsContext'
import { scrapeSreality, COLD_CALL_STATUSES, coldCallStatusMeta, type ColdCall, type ColdCallStatus } from '../lib/coldCalls'
import { whatsappUrl } from '../lib/leadDisplay'
import { formatCZK } from '../lib/format'

export function ColdCall(): JSX.Element {
  const { calls, loading, error, refetch, add, patch, remove } = useColdCalls()
  const [addOpen, setAddOpen] = useState(false)
  const [toDelete, setToDelete] = useState<ColdCall | null>(null)

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Cold Call"
        subtitle="Vytěžené inzeráty ze sreality.cz k oslovení majitelů"
        showSearch={false}
        actions={<button className="btn-primary" onClick={() => setAddOpen(true)} title="Nový Cold Call" aria-label="Nový Cold Call"><Plus className="h-4 w-4" /> <span className="hidden md:inline">Nový Cold Call</span></button>}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : calls.length === 0 ? (
          <Empty label="Zatím žádné Cold Cally. Vlož odkaz na inzerát ze sreality.cz a data se vytěží sama." />
        ) : (
          <>
            {/* mobil: karty */}
            <ul className="space-y-2 md:hidden">
              {calls.map((c) => <ColdCallCardMobile key={c.id} c={c} onStatus={(s) => patch(c.id, { status: s })} onDelete={() => setToDelete(c)} />)}
            </ul>

            {/* desktop: tabulka */}
            <div className="card hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px]">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-tx-faint">
                    <th className="px-5 py-3.5">Nemovitost</th>
                    <th className="px-5 py-3.5">Lokalita</th>
                    <th className="px-5 py-3.5">Nabídka</th>
                    <th className="px-5 py-3.5">Kontakt</th>
                    <th className="px-5 py-3.5">Stav</th>
                    <th className="px-5 py-3.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {calls.map((c) => {
                    const wa = whatsappUrl(c.phone)
                    return (
                      <tr key={c.id} className="group transition hover:bg-canvas">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-tx">
                            <Building2 className="h-4 w-4 shrink-0 text-tx-faint" />
                            <span className="whitespace-nowrap">{[c.property_type, c.disposition].filter(Boolean).join(' · ') || '—'}</span>
                          </div>
                          {(c.company || c.seller_name) && <div className="mt-0.5 truncate text-xs text-tx-soft">{c.company || c.seller_name}</div>}
                        </td>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-1 text-sm text-tx-soft"><MapPin className="h-3.5 w-3.5 shrink-0 text-tx-faint" /> {c.locality || '—'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="whitespace-nowrap">
                            <span className={`pill ${c.offer_type === 'Pronájem' ? 'bg-sky-soft text-sky' : 'bg-brand-soft text-brand-dark'}`}>{c.offer_type || '—'}</span>
                          </div>
                          {c.price_czk != null && <div className="mt-0.5 font-mono text-xs text-tx-soft">{formatCZK(c.price_czk, true)}</div>}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            {c.phone ? (
                              <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="flex items-center gap-1 whitespace-nowrap font-mono text-[13px] text-tx-soft transition hover:text-brand-dark" title="Zavolat">
                                <Phone className="h-3.5 w-3.5 text-tx-faint" /> {c.phone}
                              </a>
                            ) : <span className="text-tx-faint">—</span>}
                            {wa && <a href={wa} target="_blank" rel="noreferrer" className="grid h-6 w-6 place-items-center rounded-md border border-line text-emerald transition hover:border-emerald/40" title="WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></a>}
                            {c.email && <a href={`mailto:${c.email}`} className="grid h-6 w-6 place-items-center rounded-md border border-line text-tx-soft transition hover:border-brand/40 hover:text-brand-dark" title={c.email}><Mail className="h-3.5 w-3.5" /></a>}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <select
                            className={`input h-8 w-auto min-w-[120px] py-1 text-xs font-semibold ${coldCallStatusMeta(c.status).cls}`}
                            value={c.status}
                            onChange={(e) => patch(c.id, { status: e.target.value as ColdCallStatus })}
                          >
                            {COLD_CALL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a href={c.source_url} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-tx-faint transition hover:border-brand/40 hover:text-brand-dark" title="Otevřít inzerát"><ExternalLink className="h-4 w-4" /></a>
                            <button onClick={() => setToDelete(c)} className="grid h-8 w-8 place-items-center rounded-lg text-tx-faint opacity-0 transition hover:bg-rose-soft hover:text-rose group-hover:opacity-100" title="Smazat"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {addOpen && <AddColdCallModal onClose={() => setAddOpen(false)} onCreate={add} />}

      {toDelete && (
        <Modal open size="md" title="Smazat Cold Call" subtitle={toDelete.title || toDelete.locality || 'Záznam'} onClose={() => setToDelete(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setToDelete(null)}>Zrušit</button>
              <button className="btn bg-rose text-white hover:bg-rose/90" onClick={async () => { await remove(toDelete.id); setToDelete(null) }}>
                <Trash2 className="h-4 w-4" /> Smazat
              </button>
            </>
          }
        >
          <p className="text-sm text-tx-soft">Odstraní tento vytěžený inzerát ze seznamu Cold Callů.</p>
        </Modal>
      )}
    </div>
  )
}

function AddColdCallModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: Partial<Omit<ColdCall, 'id' | 'created_at'>>) => Promise<ColdCall> }): JSX.Element {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (): Promise<void> => {
    const clean = url.trim()
    if (!/^https:\/\/(www\.)?sreality\.cz\/detail\//.test(clean)) {
      return setErr('Vlož odkaz na konkrétní inzerát (detail) ze sreality.cz.')
    }
    setBusy(true); setErr(null)
    try {
      const d = await scrapeSreality(clean)
      await onCreate({
        source_url: d.source_url,
        title: d.title,
        property_type: d.property_type,
        disposition: d.disposition,
        offer_type: d.offer_type,
        locality: d.locality,
        price_czk: d.price_czk,
        seller_name: d.seller_name,
        company: d.company,
        phone: d.phone,
        email: d.email,
        status: 'novy'
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Vytěžení selhalo.')
      setBusy(false)
    }
  }

  return (
    <Modal open size="md" title="Nový Cold Call" subtitle="Vlož odkaz na inzerát ze sreality.cz" onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>Zrušit</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
            {busy ? 'Vytěžuji…' : 'Vytěžit inzerát'}
          </button>
        </>
      }
    >
      <label className="mb-1 block text-sm font-semibold text-tx-soft">Odkaz na inzerát</label>
      <input
        className="input" autoFocus value={url} onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder="https://www.sreality.cz/detail/prodej/byt/…"
      />
      <p className="mt-2 text-xs text-tx-faint">Ze stránky se automaticky načte typ nemovitosti, lokalita, prodej/pronájem a kontakt na majitele.</p>
      {err && <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-rose"><X className="mt-0.5 h-4 w-4 shrink-0" /> {err}</p>}
    </Modal>
  )
}

function ColdCallCardMobile({ c, onStatus, onDelete }: { c: ColdCall; onStatus: (s: ColdCallStatus) => void; onDelete: () => void }): JSX.Element {
  const wa = whatsappUrl(c.phone)
  const sm = coldCallStatusMeta(c.status)
  return (
    <li className="card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-bold text-tx">
            <Building2 className="h-4 w-4 shrink-0 text-tx-faint" />
            {[c.property_type, c.disposition].filter(Boolean).join(' · ') || '—'}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-tx-soft"><MapPin className="h-3 w-3 shrink-0" /> {c.locality || '—'}</div>
        </div>
        <span className={`pill shrink-0 ${sm.cls}`}>{sm.label}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`pill ${c.offer_type === 'Pronájem' ? 'bg-sky-soft text-sky' : 'bg-brand-soft text-brand-dark'}`}>{c.offer_type || '—'}</span>
        {c.price_czk != null && <span className="font-mono text-xs text-tx-soft">{formatCZK(c.price_czk, true)}</span>}
        {(c.company || c.seller_name) && <span className="truncate text-xs text-tx-faint">· {c.company || c.seller_name}</span>}
      </div>
      <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3">
        {c.phone && <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="flex flex-1 items-center gap-1.5 font-mono text-[13px] text-tx-soft"><Phone className="h-3.5 w-3.5 text-tx-faint" /> {c.phone}</a>}
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-emerald" title="WhatsApp"><MessageCircle className="h-4 w-4" /></a>}
        {c.email && <a href={`mailto:${c.email}`} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-tx-soft" title="E-mail"><Mail className="h-4 w-4" /></a>}
        <a href={c.source_url} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-tx-faint" title="Inzerát"><ExternalLink className="h-4 w-4" /></a>
        <button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-rose" title="Smazat"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {COLD_CALL_STATUSES.map((s) => (
          <button key={s.value} onClick={() => onStatus(s.value)} className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${c.status === s.value ? s.cls : 'bg-canvas text-tx-faint'}`}>{s.label}</button>
        ))}
      </div>
    </li>
  )
}
