import { useEffect, useMemo, useState } from 'react'
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
  Cog
} from 'lucide-react'
import { Modal } from './Modal'
import { Avatar } from './Avatar'
import { useLeads } from '../lib/leadsContext'
import { STAGES, type Lead, type StageKey } from '../lib/supabase'
import { formatCZK, formatDateTime, formatDate } from '../lib/format'
import { isEstimate } from '../lib/leadDisplay'
import { fetchTemplates, mergeFields, sendEmail, AGENT_NAME, type Template } from '../lib/email'
import { fetchActivity, addActivity, type Activity } from '../lib/activity'

export function LeadDetail({ lead: initialLead, onClose }: { lead: Lead; onClose: () => void }): JSX.Element {
  const { leads, moveStage, patch } = useLeads()
  // Živá verze leadu z contextu — odráží okamžité změny fáze / follow-upu.
  const lead = leads.find((l) => l.id === initialLead.id) ?? initialLead

  const [templates, setTemplates] = useState<Template[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [loadingAct, setLoadingAct] = useState(true)

  // compose stav
  const [to, setTo] = useState(lead.email ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [note, setNote] = useState('')
  const [followUp, setFollowUp] = useState(lead.follow_up_at?.slice(0, 10) ?? '')

  const reloadActivity = (): void => {
    setLoadingAct(true)
    fetchActivity(lead.id)
      .then(setActivity)
      .catch(() => setActivity([]))
      .finally(() => setLoadingAct(false))
  }

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => setTemplates([]))
    reloadActivity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id])

  const estimate = isEstimate(lead)
  const value = Number(lead.price ?? lead.price_estimate ?? 0)

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
    const res = await sendEmail({ to, subject, body })
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

  const followUpStatus = useMemo(() => {
    if (!followUp) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(followUp)
    if (d < today) return { text: 'Po termínu', cls: 'text-rose' }
    if (d.getTime() === today.getTime()) return { text: 'Dnes', cls: 'text-amber' }
    return { text: `Naplánováno na ${formatDate(followUp)}`, cls: 'text-tx-soft' }
  }, [followUp])

  return (
    <Modal
      open
      size="xl"
      title={lead.name || 'Lead'}
      subtitle={`${lead.source ?? 'Lead'} · přijato ${formatDate(lead.created_at)}`}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* LEVÝ SLOUPEC: info, fáze, follow-up, e-mail */}
        <div className="space-y-5 lg:col-span-3">
          {/* kontakt */}
          <div className="flex items-start gap-3">
            <Avatar name={lead.name || '?'} size={46} />
            <div className="flex-1 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-tx-soft">
                {lead.phone && (
                  <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-brand">
                    <Phone className="h-3.5 w-3.5" /> {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-brand">
                    <Mail className="h-3.5 w-3.5" /> {lead.email}
                  </a>
                )}
                {lead.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {lead.location}
                  </span>
                )}
              </div>
              <div className="mt-2 font-mono text-base font-bold text-tx">
                {estimate ? '~ ' : ''}
                {formatCZK(value, true)}
                <span className="ml-1 text-xs font-normal text-tx-faint">
                  {estimate ? 'odhad' : 'rozpočet'}
                </span>
              </div>
            </div>
          </div>

          {lead.message && (
            <p className="rounded-xl bg-canvas p-3 text-sm text-tx">{lead.message}</p>
          )}

          {/* fáze + follow-up */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint">
                <Cog className="h-3.5 w-3.5" /> Fáze
              </label>
              <select
                className="input"
                value={lead.crm_status}
                onChange={(e) => moveStage(lead.id, e.target.value as StageKey)}
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tx-faint">
                <CalendarClock className="h-3.5 w-3.5" /> Follow-up
              </label>
              <input
                type="date"
                className="input"
                value={followUp}
                onChange={(e) => saveFollowUp(e.target.value)}
              />
              {followUpStatus && (
                <div className={`mt-1 text-xs font-semibold ${followUpStatus.cls}`}>
                  {followUpStatus.text}
                </div>
              )}
            </div>
          </div>

          {/* psaní e-mailu */}
          <div className="rounded-xl border border-line p-4">
            <div className="mb-3 flex items-center gap-2">
              <Send className="h-4 w-4 text-brand" />
              <h3 className="font-bold text-tx">Napsat e-mail</h3>
            </div>
            <div className="space-y-2.5">
              <select className="input" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">— vyberte šablonu —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Příjemce"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <input
                className="input"
                placeholder="Předmět"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <textarea
                className="input min-h-[150px] resize-y"
                placeholder="Text e-mailu… (z šablony se doplní jméno, lokalita, cena)"
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
                  <span className="text-xs text-tx-faint">Odesílá se jako {AGENT_NAME}</span>
                )}
                <button className="btn-primary" onClick={handleSend} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Odesílám…' : 'Odeslat e-mail'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PRAVÝ SLOUPEC: časová osa aktivit */}
        <div className="lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-tx">
            <Clock className="h-4 w-4 text-tx-soft" /> Historie a aktivita
          </h3>

          <div className="mb-3 flex gap-2">
            <input
              className="input"
              placeholder="Přidat poznámku…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <button className="btn-ghost px-3" onClick={handleAddNote} title="Přidat poznámku">
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>

          {loadingAct ? (
            <div className="py-8 text-center text-sm text-tx-faint">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-tx-faint">Zatím žádná aktivita.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <div className="mt-0.5">
                    {a.kind === 'email' ? (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand"><Mail className="h-3.5 w-3.5" /></span>
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
    </Modal>
  )
}
