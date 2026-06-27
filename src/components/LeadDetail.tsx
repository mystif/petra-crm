import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Phone,
  Mail,
  MapPin,
  Send,
  CalendarClock,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquarePlus,
  Clock,
  StickyNote,
  Cog,
  ImagePlus,
  Star,
  X,
  Trash2,
  Pencil,
  ShieldCheck,
  Cake,
  Coins,
  MessageCircle,
  Navigation
} from 'lucide-react'
import { Modal } from './Modal'
import { Avatar } from './Avatar'
import { useLeads } from '../lib/leadsContext'
import { STAGES, type Lead, type StageKey } from '../lib/supabase'
import { formatCZK, formatDateTime, formatDate, followUpState } from '../lib/format'
import { isEstimate, whatsappUrl, mapUrl } from '../lib/leadDisplay'
import { fetchTemplates, mergeFields, sendEmail, signatureHtml, AGENT_NAME, type Template } from '../lib/email'
import { fetchActivity, addActivity, type Activity } from '../lib/activity'
import { uploadLeadPhoto, photoUrl, removePhotoFile } from '../lib/photos'
import { useMakler } from '../lib/maklerContext'

export function LeadDetail({ lead: initialLead, onClose }: { lead: Lead; onClose: () => void }): JSX.Element {
  const { leads, moveStage, patch, remove } = useLeads()
  const { makler } = useMakler()
  const lead = leads.find((l) => l.id === initialLead.id) ?? initialLead

  const [templates, setTemplates] = useState<Template[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [loadingAct, setLoadingAct] = useState(true)

  // compose
  const [to, setTo] = useState(lead.email ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [note, setNote] = useState('')
  const [followUp, setFollowUp] = useState(lead.follow_up_at?.slice(0, 10) ?? '')

  // úprava ceny / poznámky / provize
  const estimate = isEstimate(lead)
  const priceField: 'price' | 'price_estimate' = estimate ? 'price_estimate' : 'price'
  const [editPrice, setEditPrice] = useState(false)
  const [priceVal, setPriceVal] = useState(String(lead[priceField] ?? ''))
  const [crmNote, setCrmNote] = useState(lead.crm_note ?? '')
  const [provizeVal, setProvizeVal] = useState(String(lead.provize ?? ''))

  // fotky
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [photoErr, setPhotoErr] = useState<string | null>(null)
  const fotky = lead.fotky ?? []

  // smazání
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [delErr, setDelErr] = useState<string | null>(null)

  const reloadActivity = (): void => {
    setLoadingAct(true)
    fetchActivity(lead.id).then(setActivity).catch(() => setActivity([])).finally(() => setLoadingAct(false))
  }

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => setTemplates([]))
    reloadActivity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id])

  const value = Number(lead[priceField] ?? 0)

  const applyTemplate = (id: string): void => {
    const t = templates.find((x) => x.id === id)
    if (!t) return
    setSubject(mergeFields(t.subject, lead))
    setBody(mergeFields(t.body, lead))
  }

  const handleSend = async (): Promise<void> => {
    if (!to.trim()) return setSendMsg({ ok: false, text: 'Chybí e-mail příjemce.' })
    if (!subject.trim()) return setSendMsg({ ok: false, text: 'Doplňte předmět.' })
    setSending(true)
    setSendMsg(null)
    const res = await sendEmail({ to, subject, body, signature: signatureHtml(makler) })
    setSending(false)
    if (res.ok) {
      setSendMsg({ ok: true, text: 'E-mail byl odeslán.' })
      await addActivity(lead.id, 'email', subject, `Odesláno na ${to}`)
      setSubject('')
      setBody('')
      reloadActivity()
    } else {
      setSendMsg({ ok: false, text: res.error || 'Odeslání selhalo.' })
    }
  }

  const handleAddNote = async (): Promise<void> => {
    if (!note.trim()) return
    await addActivity(lead.id, 'note', null, note.trim())
    setNote('')
    reloadActivity()
  }

  const saveFollowUp = async (val: string): Promise<void> => {
    setFollowUp(val)
    await patch(lead.id, { follow_up_at: val || null })
    await addActivity(lead.id, 'system', null, val ? `Follow-up naplánován na ${formatDate(val)}` : 'Follow-up zrušen')
    reloadActivity()
  }

  // Úprava rozpočtu/ceny — se záznamem do historie aktivit.
  const savePrice = async (): Promise<void> => {
    const next = priceVal ? Number(priceVal.replace(/\s/g, '')) : null
    const prev = lead[priceField] ?? null
    setEditPrice(false)
    if (next === prev) return
    await patch(lead.id, { [priceField]: next })
    await addActivity(
      lead.id,
      'system',
      null,
      `${estimate ? 'Odhadovaná cena' : 'Rozpočet'} upraven z ${prev != null ? formatCZK(Number(prev)) : '—'} na ${next != null ? formatCZK(next) : '—'}`
    )
    reloadActivity()
  }

  const saveCrmNote = async (): Promise<void> => {
    const next = crmNote.trim() || null
    if (next === (lead.crm_note ?? null)) return
    await patch(lead.id, { crm_note: next })
  }

  const saveProvize = async (): Promise<void> => {
    const next = provizeVal ? Number(provizeVal.replace(/\s/g, '')) : null
    if (next === (lead.provize ?? null)) return
    await patch(lead.id, { provize: next })
    await addActivity(lead.id, 'system', null, `Provize nastavena na ${next != null ? formatCZK(next) : '—'}`)
    reloadActivity()
  }

  const saveBirthdate = async (val: string): Promise<void> => {
    await patch(lead.id, { birthdate: val || null })
  }

  // fotky
  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return
    setUploading(true)
    setPhotoErr(null)
    try {
      const paths: string[] = []
      for (const file of Array.from(files)) paths.push(await uploadLeadPhoto(lead.id, file))
      await patch(lead.id, { fotky: [...fotky, ...paths] })
      await addActivity(lead.id, 'system', null, `Přidáno ${paths.length} foto`)
      reloadActivity()
    } catch (e) {
      setPhotoErr(e instanceof Error ? e.message : 'Nahrání fotky selhalo.')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }
  const removePhoto = async (path: string): Promise<void> => {
    await patch(lead.id, { fotky: fotky.filter((p) => p !== path) })
    removePhotoFile(path).catch(() => {})
  }
  const makeCover = async (path: string): Promise<void> => {
    await patch(lead.id, { fotky: [path, ...fotky.filter((p) => p !== path)] })
  }

  const handleDelete = async (): Promise<void> => {
    setDeleting(true)
    setDelErr(null)
    try {
      await remove(lead)
      onClose()
    } catch (e) {
      setDelErr(e instanceof Error ? e.message : 'Smazání selhalo.')
      setDeleting(false)
    }
  }

  const followUpStatus = useMemo(() => {
    const s = followUpState(followUp)
    if (!s) return null
    if (s === 'overdue') return { text: 'Po termínu', cls: 'text-rose' }
    if (s === 'today') return { text: 'Dnes', cls: 'text-amber' }
    return { text: `Naplánováno na ${formatDate(followUp)}`, cls: 'text-tx-soft' }
  }, [followUp])

  const wa = whatsappUrl(lead.phone)
  const map = mapUrl(lead)
  const isClosed = lead.crm_status === 'uzavreno'

  return (
    <Modal
      open
      size="xl"
      title={lead.name || 'Lead'}
      subtitle={`${lead.source ?? 'Lead'} · přijato ${formatDate(lead.created_at)}`}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* LEVÝ SLOUPEC */}
        <div className="space-y-5 lg:col-span-3">
          {/* kontakt */}
          <div className="flex items-start gap-3">
            <Avatar name={lead.name || '?'} size={46} />
            <div className="flex-1 text-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-tx-soft">
                {lead.phone && (
                  <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-brand-dark">
                    <Phone className="h-3.5 w-3.5" /> {lead.phone}
                  </a>
                )}
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald hover:underline">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-brand-dark">
                    <Mail className="h-3.5 w-3.5" /> {lead.email}
                  </a>
                )}
                {lead.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {lead.location}
                    {map && (
                      <a href={map} target="_blank" rel="noreferrer" title="Otevřít v mapě" className="text-brand-dark hover:underline">
                        <Navigation className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </span>
                )}
              </div>

              {/* štítky: GDPR */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {lead.gdpr_consent ? (
                  <span className="pill bg-emerald-soft text-emerald"><ShieldCheck className="h-3 w-3" /> GDPR potvrzeno</span>
                ) : (
                  <span className="pill bg-canvas text-tx-faint"><ShieldCheck className="h-3 w-3" /> GDPR nepotvrzeno</span>
                )}
              </div>

              {/* rozpočet / odhad — editovatelné */}
              <div className="mt-2">
                {editPrice ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="input w-44 font-mono"
                      inputMode="numeric"
                      value={priceVal}
                      onChange={(e) => setPriceVal(e.target.value)}
                      autoFocus
                    />
                    <button className="btn-primary py-1.5 text-xs" onClick={savePrice}>Uložit</button>
                    <button className="btn-ghost py-1.5 text-xs" onClick={() => { setPriceVal(String(lead[priceField] ?? '')); setEditPrice(false) }}>Zrušit</button>
                  </div>
                ) : (
                  <button onClick={() => setEditPrice(true)} className="group flex items-center gap-2" title="Upravit">
                    <span className="font-mono text-base font-bold text-tx">
                      {estimate ? '~ ' : ''}{formatCZK(value, true)}
                    </span>
                    <span className="text-xs font-normal text-tx-faint">{estimate ? 'odhad' : 'rozpočet'}</span>
                    <Pencil className="h-3.5 w-3.5 text-tx-faint opacity-0 transition group-hover:opacity-100" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {lead.message && <p className="rounded-xl bg-canvas p-3 text-sm text-tx">{lead.message}</p>}

          {/* fáze + follow-up */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint">
                <Cog className="h-3.5 w-3.5" /> Fáze
              </label>
              <select className="input" value={lead.crm_status} onChange={(e) => moveStage(lead.id, e.target.value as StageKey)}>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint">
                <CalendarClock className="h-3.5 w-3.5" /> Follow-up
              </label>
              <input type="date" className="input" value={followUp} onChange={(e) => saveFollowUp(e.target.value)} />
              {followUpStatus && <div className={`mt-1 text-xs font-semibold ${followUpStatus.cls}`}>{followUpStatus.text}</div>}
            </div>
          </div>

          {/* provize (po uzavření) */}
          {isClosed && (
            <div className="rounded-xl border border-emerald/30 bg-emerald-soft/50 p-4">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald">
                <Coins className="h-3.5 w-3.5" /> Provize z obchodu
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="input w-44 font-mono"
                  inputMode="numeric"
                  placeholder="např. 250000"
                  value={provizeVal}
                  onChange={(e) => setProvizeVal(e.target.value)}
                  onBlur={saveProvize}
                />
                <span className="text-xs text-tx-soft">Kč — započítá se do dashboardu a karty makléře.</span>
              </div>
            </div>
          )}

          {/* narození + poznámka */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint">
                <Cake className="h-3.5 w-3.5" /> Datum narození
              </label>
              <input type="date" className="input" defaultValue={lead.birthdate?.slice(0, 10) ?? ''} onChange={(e) => saveBirthdate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint">
              <StickyNote className="h-3.5 w-3.5" /> Poznámka k leadu
            </label>
            <textarea
              className="input min-h-[70px] resize-y"
              placeholder="Interní poznámka…"
              value={crmNote}
              onChange={(e) => setCrmNote(e.target.value)}
              onBlur={saveCrmNote}
            />
          </div>

          {/* fotky */}
          <div className="rounded-xl border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-brand-dark" />
                <h3 className="font-bold text-tx">Fotky {fotky.length > 0 && <span className="text-tx-faint">({fotky.length})</span>}</h3>
              </div>
              <button className="btn-soft py-1.5 text-sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? 'Nahrávám…' : 'Přidat fotky'}
              </button>
              <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </div>
            {fotky.length === 0 ? (
              <p className="text-sm text-tx-faint">Zatím žádné fotky. První fotka se použije jako úvodní na kartě v pipeline.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {fotky.map((path, i) => (
                  <div key={path} className="group relative aspect-square overflow-hidden rounded-lg border border-line">
                    <img src={photoUrl(path)} alt="" className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-ink">
                        <Star className="h-2.5 w-2.5" /> Úvodní
                      </span>
                    )}
                    <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                      {i !== 0 && (
                        <button onClick={() => makeCover(path)} title="Nastavit jako úvodní" className="grid h-6 w-6 place-items-center rounded bg-white/90 text-tx hover:text-brand-dark">
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => removePhoto(path)} title="Smazat" className="grid h-6 w-6 place-items-center rounded bg-white/90 text-rose">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {photoErr && <p className="mt-2 text-sm font-medium text-rose">{photoErr}</p>}
          </div>

          {/* psaní e-mailu */}
          <div className="rounded-xl border border-line p-4">
            <div className="mb-3 flex items-center gap-2">
              <Send className="h-4 w-4 text-brand-dark" />
              <h3 className="font-bold text-tx">Napsat e-mail</h3>
            </div>
            <div className="space-y-2.5">
              <select className="input" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">— vyberte šablonu —</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input className="input" placeholder="Příjemce" value={to} onChange={(e) => setTo(e.target.value)} />
              <input className="input" placeholder="Předmět" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea
                className="input min-h-[150px] resize-y"
                placeholder="Text e-mailu… (oslovení se skloňuje, doplní se jméno, lokalita, cena; podpis a fotka makléře se přidají automaticky)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="flex items-center justify-between">
                {sendMsg ? (
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${sendMsg.ok ? 'text-emerald' : 'text-rose'}`}>
                    {sendMsg.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {sendMsg.text}
                  </span>
                ) : (
                  <span className="text-xs text-tx-faint">Odesílá se jako {makler?.name || AGENT_NAME}</span>
                )}
                <button className="btn-primary" onClick={handleSend} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Odesílám…' : 'Odeslat e-mail'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PRAVÝ SLOUPEC: aktivita */}
        <div className="lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-tx">
            <Clock className="h-4 w-4 text-tx-soft" /> Historie a aktivita
          </h3>
          <div className="mb-3 flex gap-2">
            <input
              className="input"
              placeholder="Přidat poznámku do historie…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <button className="btn-ghost px-3" onClick={handleAddNote} title="Přidat poznámku">
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>
          {loadingAct ? (
            <div className="py-8 text-center text-sm text-tx-faint"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-tx-faint">Zatím žádná aktivita.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <div className="mt-0.5">
                    {a.kind === 'email' ? (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand-dark"><Mail className="h-3.5 w-3.5" /></span>
                    ) : a.kind === 'note' ? (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-soft text-amber"><StickyNote className="h-3.5 w-3.5" /></span>
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-canvas text-tx-soft"><Cog className="h-3.5 w-3.5" /></span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {a.subject && <div className="text-sm font-semibold text-tx">{a.subject}</div>}
                    {a.note && <div className="text-sm text-tx-soft">{a.note}</div>}
                    <div className="text-[11px] text-tx-faint">{formatDateTime(a.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* smazání leadu */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {confirmDel ? (
          <>
            <span className="text-sm text-tx-soft">
              Smazat lead včetně historie a fotek? <b className="text-tx">Kontakt zůstane v Kontaktech.</b>
            </span>
            <div className="flex gap-2">
              <button className="btn-ghost py-2 text-sm" onClick={() => setConfirmDel(false)} disabled={deleting}>Zrušit</button>
              <button className="btn bg-rose py-2 text-sm text-white hover:bg-rose/90" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? 'Mažu…' : 'Ano, smazat lead'}
              </button>
            </div>
          </>
        ) : (
          <button className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-rose transition hover:text-rose/80" onClick={() => setConfirmDel(true)}>
            <Trash2 className="h-4 w-4" /> Smazat lead
          </button>
        )}
      </div>
      {delErr && <p className="mt-2 text-right text-sm font-medium text-rose">{delErr}</p>}
    </Modal>
  )
}
