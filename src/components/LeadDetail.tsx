import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Phone, Mail, MapPin, Send, CalendarClock, Loader2, CheckCircle2, XCircle, MessageSquarePlus,
  Clock, StickyNote, Cog, ImagePlus, Star, X, Trash2, Pencil, ShieldCheck, Cake, Coins,
  MessageCircle, Navigation, Home, FileText, CheckCircle, PhoneCall, CalendarPlus, Share2, Gift, Building2,
  Camera, FileSignature, Handshake, Check
} from 'lucide-react'
import { Modal } from './Modal'
import { Avatar } from './Avatar'
import { useLeads } from '../lib/leadsContext'
import { STAGES, type Lead, type StageKey } from '../lib/supabase'
import { formatCZK, formatDateTime, formatDate, followUpState } from '../lib/format'
import { isEstimate, whatsappUrl, mapUrl, PRIORITIES, isReferrer } from '../lib/leadDisplay'
import { fetchTemplates, mergeFields, sendEmail, signatureHtml, AGENT_NAME, type Template } from '../lib/email'
import { fetchActivity, addActivity, type Activity, type ActivityKind } from '../lib/activity'
import { uploadLeadPhoto, photoUrl, removePhotoFile } from '../lib/photos'
import { useMakler } from '../lib/maklerContext'
import { EventForm } from './EventForm'
import { eventTypeMeta, type EventType } from '../lib/events'
import { ScorePanel } from './LeadScore'
import { referralsBy, referrerOf } from '../lib/referrals'
import { useLeadDetail } from '../lib/leadDetailContext'
import { useListings } from '../lib/listingsContext'

function dayLabel(iso: string): string {
  const d = new Date(iso); d.setHours(0, 0, 0, 0)
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const diff = Math.round((t.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'Dnes'
  if (diff === 1) return 'Včera'
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}
function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}

const ACT_FILTERS: { id: 'all' | ActivityKind; label: string }[] = [
  { id: 'all', label: 'Vše' },
  { id: 'email', label: 'E-maily' },
  { id: 'call', label: 'Hovory' },
  { id: 'meeting', label: 'Schůzky' },
  { id: 'note', label: 'Poznámky' }
]

function ActIcon({ kind }: { kind: ActivityKind }): JSX.Element {
  if (kind === 'email') return <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand-dark"><Mail className="h-3.5 w-3.5" /></span>
  if (kind === 'call') return <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-soft text-sky"><PhoneCall className="h-3.5 w-3.5" /></span>
  if (kind === 'meeting') return <span className="grid h-7 w-7 place-items-center rounded-full bg-[#F0E7FB] text-[#9333EA]"><Handshake className="h-3.5 w-3.5" /></span>
  if (kind === 'photoshoot') return <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-soft text-amber"><Camera className="h-3.5 w-3.5" /></span>
  if (kind === 'showing') return <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-soft text-emerald"><Home className="h-3.5 w-3.5" /></span>
  if (kind === 'contract') return <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand-dark"><FileSignature className="h-3.5 w-3.5" /></span>
  if (kind === 'note') return <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-soft text-amber"><StickyNote className="h-3.5 w-3.5" /></span>
  return <span className="grid h-7 w-7 place-items-center rounded-full bg-canvas text-tx-soft"><Cog className="h-3.5 w-3.5" /></span>
}

/** Milníky obchodu — zdroj pravdy jsou timestamp sloupce na leadu. */
const MILESTONES = [
  { key: 'schuzka_done_at', label: 'Schůzka', kind: 'meeting', icon: Handshake },
  { key: 'foceni_done_at', label: 'Focení', kind: 'photoshoot', icon: Camera },
  { key: 'prohlidka_done_at', label: 'Prohlídka', kind: 'showing', icon: Home },
  { key: 'smlouva_done_at', label: 'Smlouva', kind: 'contract', icon: FileSignature }
] as const

export function LeadDetail({ lead: initialLead, onClose }: { lead: Lead; onClose: () => void }): JSX.Element {
  const { leads, moveStage, patch, remove } = useLeads()
  const { makler } = useMakler()
  const { openLead } = useLeadDetail()
  const { listings, patch: listingsPatch } = useListings()
  const lead = leads.find((l) => l.id === initialLead.id) ?? initialLead

  const [templates, setTemplates] = useState<Template[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [loadingAct, setLoadingAct] = useState(true)
  const [actFilter, setActFilter] = useState<'all' | ActivityKind>('all')

  const [to, setTo] = useState(lead.email ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [note, setNote] = useState('')
  const [followUp, setFollowUp] = useState(lead.follow_up_at?.slice(0, 10) ?? '')

  const estimate = isEstimate(lead)
  const priceField: 'price' | 'price_estimate' = estimate ? 'price_estimate' : 'price'
  const [editPrice, setEditPrice] = useState(false)
  const [priceVal, setPriceVal] = useState(String(lead[priceField] ?? ''))
  const [crmNote, setCrmNote] = useState(lead.crm_note ?? '')
  const [provizeVal, setProvizeVal] = useState(String(lead.provize ?? ''))

  // editace kontaktních údajů + popisu
  const [editContact, setEditContact] = useState(false)
  const [phoneVal, setPhoneVal] = useState(lead.phone ?? '')
  const [emailVal, setEmailVal] = useState(lead.email ?? '')
  const [addressVal, setAddressVal] = useState(lead.location ?? '')
  const [editMsg, setEditMsg] = useState(false)
  const [msgVal, setMsgVal] = useState(lead.message ?? '')

  // akce
  const [callOpen, setCallOpen] = useState(false)
  const [eventType, setEventType] = useState<EventType | null>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [photoErr, setPhotoErr] = useState<string | null>(null)
  const fotky = lead.fotky ?? []

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

  /** Zaznamená kontakt do historie a posune „poslední kontakt" na teď. */
  const logContact = async (kind: ActivityKind, subj: string | null, n: string | null): Promise<void> => {
    await addActivity(lead.id, kind, subj, n)
    await patch(lead.id, { last_contact_at: new Date().toISOString() })
    reloadActivity()
  }

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
      await logContact('email', subject, `Odesláno na ${to}`)
      setSubject(''); setBody('')
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

  const savePriorita = async (val: string): Promise<void> => {
    await patch(lead.id, { priorita: val || null })
  }

  const savePrice = async (): Promise<void> => {
    const next = priceVal ? Number(priceVal.replace(/\s/g, '')) : null
    const prev = lead[priceField] ?? null
    setEditPrice(false)
    if (next === prev) return
    await patch(lead.id, { [priceField]: next })
    await addActivity(lead.id, 'system', null, `${estimate ? 'Odhadovaná cena' : 'Rozpočet'} upraven z ${prev != null ? formatCZK(Number(prev)) : '—'} na ${next != null ? formatCZK(next) : '—'}`)
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

  const saveReferrer = async (val: string): Promise<void> => {
    await patch(lead.id, { doporucil_id: val || null })
  }

  const saveProperty = async (val: string): Promise<void> => {
    await patch(lead.id, { property_id: val || null })
  }

  // Prodávaná/pronajímaná nemovitost — zdroj pravdy je nemovitost.seller_lead_id (žádný sloupec na leadu).
  const isSeller = lead.deal_type === 'prodej' || lead.deal_type === 'pronájem'
  const sellerListing = listings.find((l) => l.seller_lead_id === lead.id) ?? null
  const saveSellerListing = async (listingId: string): Promise<void> => {
    if (sellerListing && sellerListing.id !== listingId) {
      await listingsPatch(sellerListing.id, { seller_lead_id: null })
    }
    if (listingId) await listingsPatch(listingId, { seller_lead_id: lead.id, seller_contact_id: null })
    await addActivity(lead.id, 'system', null, listingId
      ? `Prodávaná nemovitost: ${listings.find((l) => l.id === listingId)?.title ?? '—'}`
      : 'Prodávaná nemovitost odebrána')
    reloadActivity()
  }

  // Milník obchodu — set/clear timestampu na leadu + doprovodný append-only záznam do logu.
  const toggleMilestone = async (m: typeof MILESTONES[number]): Promise<void> => {
    const done = !!lead[m.key]
    await patch(lead.id, {
      [m.key]: done ? null : new Date().toISOString(),
      ...(done ? {} : { last_contact_at: new Date().toISOString() })
    })
    await addActivity(lead.id, done ? 'system' : m.kind, null, done ? `${m.label} — zrušeno` : `${m.label} proběhlo`)
    reloadActivity()
  }
  const nextMilestone = MILESTONES.findIndex((m) => !lead[m.key])

  const saveSource = async (val: string): Promise<void> => {
    await patch(lead.id, { source: val || null })
  }

  // Ruční potvrzení / odvolání GDPR souhlasu + zápis do historie s časovým razítkem.
  const toggleGdpr = async (): Promise<void> => {
    const next = !lead.gdpr_consent
    await patch(lead.id, { gdpr_consent: next, gdpr_consent_at: next ? new Date().toISOString() : null })
    await addActivity(lead.id, 'system', null, next ? 'GDPR souhlas potvrzen' : 'GDPR souhlas odvolán')
    reloadActivity()
  }

  /** Otevře editaci kontaktu s aktuálními hodnotami leadu. */
  const startEditContact = (): void => {
    setPhoneVal(lead.phone ?? '')
    setEmailVal(lead.email ?? '')
    setAddressVal(lead.location ?? '')
    setEditContact(true)
  }

  const saveContact = async (): Promise<void> => {
    setEditContact(false)
    const next = { phone: phoneVal.trim() || null, email: emailVal.trim() || null, location: addressVal.trim() || null }
    if (next.phone === (lead.phone ?? null) && next.email === (lead.email ?? null) && next.location === (lead.location ?? null)) return
    await patch(lead.id, next) // sdílený stav → propíše se i do karty v pipeline
    await addActivity(lead.id, 'system', null, 'Upraveny kontaktní údaje')
    reloadActivity()
  }

  const saveMessage = async (): Promise<void> => {
    setEditMsg(false)
    const next = msgVal.trim() || null
    if (next === (lead.message ?? null)) return
    await patch(lead.id, { message: next })
  }

  // akce z horní lišty
  const wa = whatsappUrl(lead.phone)
  const map = mapUrl(lead)
  const isClosed = lead.crm_status === 'uzavreno'

  const actCall = (): void => setCallOpen(true)
  const actEmail = (): void => composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const actWhatsApp = (): void => {
    if (!wa) return
    window.open(wa, '_blank')
    logContact('note', null, 'Kontakt přes WhatsApp')
  }
  const actContract = async (): Promise<void> => {
    await moveStage(lead.id, 'nabidka')
    await addActivity(lead.id, 'system', null, 'Zahájena příprava nabídky / smlouvy')
    reloadActivity()
  }
  const actCloseDeal = async (): Promise<void> => {
    await moveStage(lead.id, 'uzavreno')
    await addActivity(lead.id, 'system', null, 'Obchod uzavřen 🎉')
    reloadActivity()
  }

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return
    setUploading(true); setPhotoErr(null)
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
    setDeleting(true); setDelErr(null)
    try { await remove(lead); onClose() } catch (e) {
      setDelErr(e instanceof Error ? e.message : 'Smazání selhalo.'); setDeleting(false)
    }
  }

  const followUpStatus = useMemo(() => {
    const s = followUpState(followUp)
    if (!s) return null
    if (s === 'overdue') return { text: 'Po termínu', cls: 'text-rose' }
    if (s === 'today') return { text: 'Dnes', cls: 'text-amber' }
    return { text: `Naplánováno na ${formatDate(followUp)}`, cls: 'text-tx-soft' }
  }, [followUp])

  // timeline: filtr + seskupení po dnech
  const groups = useMemo(() => {
    const filtered = activity.filter((a) => actFilter === 'all' || a.kind === actFilter)
    const out: { label: string; items: Activity[] }[] = []
    for (const a of filtered) {
      const label = dayLabel(a.created_at)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(a)
      else out.push({ label, items: [a] })
    }
    return out
  }, [activity, actFilter])

  const ACTIONS = [
    { label: 'Zavolat', icon: Phone, on: actCall, show: !!lead.phone },
    { label: 'E-mail', icon: Mail, on: actEmail, show: true },
    { label: 'WhatsApp', icon: MessageCircle, on: actWhatsApp, show: !!wa },
    { label: 'Schůzka', icon: CalendarPlus, on: () => setEventType('schuzka'), show: true },
    { label: 'Prohlídka', icon: Home, on: () => setEventType('prohlidka'), show: true },
    { label: 'Smlouva', icon: FileText, on: actContract, show: lead.crm_status !== 'uzavreno' },
    { label: 'Uzavřít', icon: CheckCircle, on: actCloseDeal, show: lead.crm_status !== 'uzavreno' }
  ].filter((a) => a.show)

  /** Změna fáze; přesun do „Schůzka" nabídne rovnou naplánování prohlídky. */
  const changeStage = (next: StageKey): void => {
    moveStage(lead.id, next)
    if (next === 'schuzka' && lead.crm_status !== 'schuzka') setEventType('prohlidka')
  }

  return (
    <Modal
      open
      size="xl"
      title={lead.name || 'Lead'}
      subtitle={`${lead.source ?? 'Lead'} · přijato ${formatDate(lead.created_at)}`}
      onClose={onClose}
    >
      {/* AKČNÍ LIŠTA — další krok */}
      <div className="-mt-1 mb-5 flex gap-2 overflow-x-auto pb-1">
        {ACTIONS.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              onClick={a.on}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-tx transition hover:border-brand/50 hover:text-brand-dark"
            >
              <Icon className="h-4 w-4" /> {a.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* LEVÝ SLOUPEC */}
        <div className="space-y-5 lg:col-span-3">
          <div className="flex items-start gap-3">
            <Avatar name={lead.name || '?'} size={46} />
            <div className="flex-1 text-sm">
              {editContact ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input className="input" placeholder="Telefon" value={phoneVal} onChange={(e) => setPhoneVal(e.target.value)} autoFocus />
                    <input className="input" type="email" placeholder="E-mail" value={emailVal} onChange={(e) => setEmailVal(e.target.value)} />
                  </div>
                  <input className="input" placeholder="Adresa nemovitosti" value={addressVal} onChange={(e) => setAddressVal(e.target.value)} />
                  <div className="flex gap-2">
                    <button className="btn-primary py-1.5 text-xs" onClick={saveContact}>Uložit</button>
                    <button className="btn-ghost py-1.5 text-xs" onClick={() => setEditContact(false)}>Zrušit</button>
                  </div>
                </div>
              ) : (
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
                  <button onClick={startEditContact} className="flex items-center gap-1 font-medium text-brand-dark hover:underline" title="Upravit kontakt a adresu">
                    <Pencil className="h-3.5 w-3.5" /> Upravit
                  </button>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isReferrer(lead) && <span className="pill bg-ink text-gold"><Share2 className="h-3 w-3" /> Doporučitel</span>}
                {lead.gdpr_consent ? (
                  <button
                    onClick={toggleGdpr}
                    title={lead.gdpr_consent_at ? `Potvrzeno ${formatDateTime(lead.gdpr_consent_at)} — klikni pro odvolání` : 'Klikni pro odvolání'}
                    className="pill bg-emerald-soft text-emerald transition hover:bg-emerald/20"
                  >
                    <ShieldCheck className="h-3 w-3" /> GDPR potvrzeno
                  </button>
                ) : (
                  <button
                    onClick={toggleGdpr}
                    title="Ručně potvrdit GDPR souhlas"
                    className="pill border border-dashed border-line bg-white text-tx-soft transition hover:border-emerald/50 hover:text-emerald"
                  >
                    <ShieldCheck className="h-3 w-3" /> Potvrdit GDPR
                  </button>
                )}
              </div>

              <div className="mt-2">
                {editPrice ? (
                  <div className="flex items-center gap-2">
                    <input className="input w-44 font-mono" inputMode="numeric" value={priceVal} onChange={(e) => setPriceVal(e.target.value)} autoFocus />
                    <button className="btn-primary py-1.5 text-xs" onClick={savePrice}>Uložit</button>
                    <button className="btn-ghost py-1.5 text-xs" onClick={() => { setPriceVal(String(lead[priceField] ?? '')); setEditPrice(false) }}>Zrušit</button>
                  </div>
                ) : (
                  <button onClick={() => setEditPrice(true)} className="group flex items-center gap-2" title="Upravit">
                    <span className="font-mono text-base font-bold text-tx">{estimate ? '~ ' : ''}{formatCZK(value, true)}</span>
                    <span className="text-xs font-normal text-tx-faint">{estimate ? 'odhad' : 'rozpočet'}</span>
                    <Pencil className="h-3.5 w-3.5 text-tx-faint opacity-0 transition group-hover:opacity-100" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* popis poptávky — editovatelný */}
          <div>
            <div className="mb-1 flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-tx-faint">Popis poptávky</label>
              {!editMsg && (
                <button onClick={() => { setMsgVal(lead.message ?? ''); setEditMsg(true) }} className="text-tx-faint transition hover:text-brand-dark" title="Upravit popis">
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            {editMsg ? (
              <div className="space-y-2">
                <textarea className="input min-h-[80px] resize-y" value={msgVal} onChange={(e) => setMsgVal(e.target.value)} autoFocus placeholder="Popis poptávky…" />
                <div className="flex gap-2">
                  <button className="btn-primary py-1.5 text-xs" onClick={saveMessage}>Uložit</button>
                  <button className="btn-ghost py-1.5 text-xs" onClick={() => setEditMsg(false)}>Zrušit</button>
                </div>
              </div>
            ) : lead.message ? (
              <p className="rounded-xl bg-canvas p-3 text-sm text-tx">{lead.message}</p>
            ) : (
              <button onClick={() => { setMsgVal(''); setEditMsg(true) }} className="w-full rounded-xl bg-canvas p-3 text-left text-sm italic text-tx-faint hover:text-brand-dark">
                Bez popisu — klikni pro doplnění.
              </button>
            )}
          </div>

          {/* klasifikace — nákup / prodej / pronájem / doporučení */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-tx-faint">Klasifikace</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'koupě', label: 'Nákup' },
                { key: 'prodej', label: 'Prodej' },
                { key: 'pronájem', label: 'Pronájem' },
                { key: 'doporuceni', label: 'Doporučení' }
              ].map((c) => {
                const active = isReferrer(lead) ? c.key === 'doporuceni' : (lead.deal_type ?? '') === c.key
                return (
                  <button
                    key={c.key}
                    onClick={() => c.key === 'doporuceni'
                      ? patch(lead.id, { lead_type: 'doporucitel', deal_type: null })
                      : patch(lead.id, { lead_type: 'poptavka', deal_type: c.key })}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? (c.key === 'doporuceni' ? 'bg-ink text-gold' : 'bg-ink text-white') : 'border border-line bg-white text-tx-soft hover:text-tx'}`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
            {isReferrer(lead) && <p className="mt-1.5 text-xs text-tx-soft">Jen doporučitel — eviduje se v Kontaktech a nezobrazuje se v pipeline.</p>}
          </div>

          {/* priorita / fáze / follow-up — jen u reálných obchodů */}
          {!isReferrer(lead) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-tx-faint">Priorita</label>
                <select className="input" value={lead.priorita ?? ''} onChange={(e) => savePriorita(e.target.value)}>
                  <option value="">— žádná —</option>
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint"><Cog className="h-3.5 w-3.5" /> Fáze</label>
                <select className="input" value={lead.crm_status} onChange={(e) => changeStage(e.target.value as StageKey)}>
                  {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint"><CalendarClock className="h-3.5 w-3.5" /> Follow-up</label>
                <input type="date" className="input" value={followUp} onChange={(e) => saveFollowUp(e.target.value)} />
                {followUpStatus && <div className={`mt-1 text-xs font-semibold ${followUpStatus.cls}`}>{followUpStatus.text}</div>}
              </div>
            </div>
          )}

          {isClosed && (
            <div className="rounded-xl border border-emerald/30 bg-emerald-soft/50 p-4">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald"><Coins className="h-3.5 w-3.5" /> Provize z obchodu</label>
              <div className="flex items-center gap-2">
                <input className="input w-44 font-mono" inputMode="numeric" placeholder="např. 250000" value={provizeVal} onChange={(e) => setProvizeVal(e.target.value)} onBlur={saveProvize} />
                <span className="text-xs text-tx-soft">Kč — započítá se do dashboardu a karty makléře.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint"><Cake className="h-3.5 w-3.5" /> Datum narození</label>
              <input type="date" className="input" defaultValue={lead.birthdate?.slice(0, 10) ?? ''} onChange={(e) => saveBirthdate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint"><Share2 className="h-3.5 w-3.5" /> Doporučil(a)</label>
              <select className="input" value={lead.doporucil_id ?? ''} onChange={(e) => saveReferrer(e.target.value)}>
                <option value="">— nikdo / z webu —</option>
                {leads.filter((l) => l.id !== lead.id).map((l) => <option key={l.id} value={l.id}>{l.name || 'Bez jména'}</option>)}
              </select>
            </div>
            {isSeller ? (
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint"><Building2 className="h-3.5 w-3.5" /> {lead.deal_type === 'pronájem' ? 'Pronajímaná' : 'Prodávaná'} nemovitost</label>
                <select className="input" value={sellerListing?.id ?? ''} onChange={(e) => saveSellerListing(e.target.value)}>
                  <option value="">— žádná —</option>
                  {listings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint"><Building2 className="h-3.5 w-3.5" /> Nemovitost (zájem)</label>
                <select className="input" value={lead.property_id ?? ''} onChange={(e) => saveProperty(e.target.value)}>
                  <option value="">— žádná —</option>
                  {listings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint"><Navigation className="h-3.5 w-3.5" /> Odkud přišel</label>
              <select className="input" value={lead.source ?? ''} onChange={(e) => saveSource(e.target.value)}>
                <option value="">— neuvedeno —</option>
                {(() => {
                  const opts = ['Web', 'Sreality', 'Telefonát', 'Email', 'Dopis']
                  const cur = lead.source ?? ''
                  const list = cur && !opts.includes(cur) ? [cur, ...opts] : opts
                  return list.map((s) => <option key={s} value={s}>{s}</option>)
                })()}
              </select>
            </div>
          </div>

          {/* doporučení — kdo přivedl + co tento člověk přinesl */}
          {(() => {
            const referrer = referrerOf(leads, lead)
            const made = referralsBy(leads, lead.id)
            if (!referrer && made.count === 0) return null
            return (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft/40 p-3 text-sm">
                <Gift className="h-4 w-4 shrink-0 text-brand-dark" />
                {referrer && (
                  <span className="text-tx-soft">Doporučen od <button onClick={() => openLead(referrer)} className="font-bold text-tx hover:text-brand-dark hover:underline">{referrer.name}</button></span>
                )}
                {referrer && made.count > 0 && <span className="text-tx-faint">·</span>}
                {made.count > 0 && (
                  <span className="text-tx-soft">
                    Sám doporučil <b className="text-tx">{made.count} {made.count === 1 ? 'klienta' : made.count < 5 ? 'klienty' : 'klientů'}</b>
                    {made.value > 0 && <> · přinesl <b className="text-emerald">{formatCZK(made.value, true)}</b></>}
                  </span>
                )}
              </div>
            )
          })()}

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint"><StickyNote className="h-3.5 w-3.5" /> Poznámka k leadu</label>
            <textarea className="input min-h-[70px] resize-y" placeholder="Interní poznámka…" value={crmNote} onChange={(e) => setCrmNote(e.target.value)} onBlur={saveCrmNote} />
          </div>

          {/* fotky */}
          <div className="rounded-xl border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><ImagePlus className="h-4 w-4 text-brand-dark" /><h3 className="font-bold text-tx">Fotky {fotky.length > 0 && <span className="text-tx-faint">({fotky.length})</span>}</h3></div>
              <button className="btn-soft py-1.5 text-sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{uploading ? 'Nahrávám…' : 'Přidat fotky'}
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
                    {i === 0 && <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-ink"><Star className="h-2.5 w-2.5" /> Úvodní</span>}
                    <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                      {i !== 0 && <button onClick={() => makeCover(path)} title="Nastavit jako úvodní" className="grid h-6 w-6 place-items-center rounded bg-white/90 text-tx hover:text-brand-dark"><Star className="h-3.5 w-3.5" /></button>}
                      <button onClick={() => removePhoto(path)} title="Smazat" className="grid h-6 w-6 place-items-center rounded bg-white/90 text-rose"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {photoErr && <p className="mt-2 text-sm font-medium text-rose">{photoErr}</p>}
          </div>

          {/* psaní e-mailu */}
          <div ref={composerRef} className="rounded-xl border border-line p-4">
            <div className="mb-3 flex items-center gap-2"><Send className="h-4 w-4 text-brand-dark" /><h3 className="font-bold text-tx">Napsat e-mail</h3></div>
            <div className="space-y-2.5">
              <select className="input" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">— vyberte šablonu —</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input className="input" placeholder="Příjemce" value={to} onChange={(e) => setTo(e.target.value)} />
              <input className="input" placeholder="Předmět" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea className="input min-h-[150px] resize-y" placeholder="Text e-mailu… (oslovení se skloňuje; podpis a fotka makléře se přidají automaticky)" value={body} onChange={(e) => setBody(e.target.value)} />
              <div className="flex items-center justify-between">
                {sendMsg ? (
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${sendMsg.ok ? 'text-emerald' : 'text-rose'}`}>
                    {sendMsg.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{sendMsg.text}
                  </span>
                ) : (
                  <span className="text-xs text-tx-faint">Odesílá se jako {makler?.name || AGENT_NAME}</span>
                )}
                <button className="btn-primary" onClick={handleSend} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? 'Odesílám…' : 'Odeslat e-mail'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PRAVÝ SLOUPEC: skóre + milníky + timeline */}
        <div className="lg:col-span-2">
          <div className="mb-5"><ScorePanel lead={lead} /></div>

          {/* milníky obchodu — proběhlé fáze + „co dál" (bez vazby na kalendář, ovlivňuje skóre) */}
          {!isReferrer(lead) && (
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint"><CheckCircle className="h-3.5 w-3.5" /> Milníky obchodu</div>
              <div className="flex items-stretch gap-1.5">
                {MILESTONES.map((m, i) => {
                  const Icon = m.icon
                  const done = !!lead[m.key]
                  const isNext = !done && i === nextMilestone
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleMilestone(m)}
                      title={done ? `${m.label} — proběhlo (klik zruší)` : `Označit „${m.label}" jako proběhlé`}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition ${
                        done ? 'border-transparent bg-brand text-ink shadow-card'
                          : isNext ? 'border-brand/50 bg-brand-soft/40 text-brand-dark ring-2 ring-brand/25'
                            : 'border-line bg-white text-tx-faint hover:text-tx'
                      }`}
                    >
                      <span className="relative">
                        <Icon className="h-5 w-5" />
                        {done && <Check className="absolute -right-2 -top-2 h-3.5 w-3.5 rounded-full bg-emerald p-[1px] text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-[11px] font-bold">{m.label}</span>
                    </button>
                  )
                })}
              </div>
              {nextMilestone >= 0 && <p className="mt-1.5 text-[11px] text-tx-soft">Další krok: <b className="text-tx">{MILESTONES[nextMilestone].label}</b></p>}
            </div>
          )}

          <h3 className="mb-3 flex items-center gap-2 font-bold text-tx"><Clock className="h-4 w-4 text-tx-soft" /> Historie a aktivita</h3>

          {/* filtry */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {ACT_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${actFilter === f.id ? 'bg-ink text-white' : 'border border-line bg-white text-tx-soft hover:text-tx'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex gap-2">
            <input className="input" placeholder="Přidat poznámku…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} />
            <button className="btn-ghost px-3" onClick={handleAddNote} title="Přidat poznámku"><MessageSquarePlus className="h-4 w-4" /></button>
          </div>

          {loadingAct ? (
            <div className="py-8 text-center text-sm text-tx-faint"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-tx-faint">Žádná aktivita v této kategorii.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-tx-faint">{g.label}</div>
                  <ul className="space-y-3 border-l border-line pl-4">
                    {g.items.map((a) => (
                      <li key={a.id} className="relative flex gap-3">
                        <span className="absolute -left-[25px] top-0.5"><ActIcon kind={a.kind} /></span>
                        <div className="min-w-0 flex-1">
                          {a.subject && <div className="text-sm font-semibold text-tx">{a.subject}</div>}
                          {a.note && <div className="text-sm text-tx-soft">{a.note}</div>}
                          <div className="text-[11px] text-tx-faint">{timeOf(a.created_at)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* smazání */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {confirmDel ? (
          <>
            <span className="text-sm text-tx-soft">Smazat lead včetně historie a fotek? <b className="text-tx">Kontakt zůstane v Kontaktech.</b></span>
            <div className="flex gap-2">
              <button className="btn-ghost py-2 text-sm" onClick={() => setConfirmDel(false)} disabled={deleting}>Zrušit</button>
              <button className="btn bg-rose py-2 text-sm text-white hover:bg-rose/90" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{deleting ? 'Mažu…' : 'Ano, smazat lead'}
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

      {callOpen && (
        <CallModal
          phone={lead.phone}
          onClose={() => setCallOpen(false)}
          onLog={async (min) => {
            await logContact('call', null, `Voláno klientovi${min ? ` (${min} min)` : ''}`)
            setCallOpen(false)
          }}
        />
      )}
      {eventType && (
        <EventForm
          open
          initialLeadId={lead.id}
          initialPropertyId={lead.property_id}
          initialType={eventType}
          initialTitle={`${eventTypeMeta(eventType).label} — ${lead.name ?? ''}`.trim().replace(/—\s*$/, '').trim()}
          onClose={() => setEventType(null)}
          onSaved={async (ev) => {
            await patch(lead.id, { meeting_at: ev.start_at })
            await logContact('meeting', ev.title, `${eventTypeMeta(ev.type).label} naplánována na ${formatDateTime(ev.start_at)}`)
          }}
        />
      )}
    </Modal>
  )
}

function CallModal({ phone, onClose, onLog }: { phone: string | null; onClose: () => void; onLog: (min: string) => Promise<void> }): JSX.Element {
  const [min, setMin] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <Modal open size="md" title="Zaznamenat hovor" onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Zrušit</button>
          <button className="btn-primary" disabled={saving} onClick={async () => { setSaving(true); await onLog(min) }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />} Zaznamenat
          </button>
        </>
      }
    >
      {phone && (
        <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn-soft mb-3 w-full"><Phone className="h-4 w-4" /> Zavolat {phone}</a>
      )}
      <label className="mb-1 block text-sm font-semibold text-tx-soft">Délka hovoru (min)</label>
      <input className="input w-32 font-mono" inputMode="numeric" placeholder="5" value={min} onChange={(e) => setMin(e.target.value)} autoFocus />
      <p className="mt-2 text-xs text-tx-soft">Zapíše se do historie a posune „poslední kontakt" na dnešek.</p>
    </Modal>
  )
}

