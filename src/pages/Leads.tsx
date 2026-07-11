import { useState } from 'react'
import { Phone, Mail, MapPin, CalendarClock, MessageCircle, Trash2, Loader2, ShieldCheck, Plus } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { Modal } from '../components/Modal'
import { Loading, ErrorState, Empty } from '../components/States'
import { useLeads } from '../lib/leadsContext'
import { useNewLead } from '../lib/newLeadContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { STAGE_MAP, CLOSED_STAGES, type Lead } from '../lib/supabase'
import { formatCZK, relativeDays, formatDate, followUpState } from '../lib/format'
import { sourceStyle, isEstimate, whatsappUrl, isReferrer, isWebLead } from '../lib/leadDisplay'

export type LeadsFilter = 'vse' | 'poptavka' | 'odhad' | 'followup'

/** Lead je „k vyřízení" — otevřený s follow-up termínem dnes nebo po termínu. */
function isFollowUpDue(l: Lead): boolean {
  if (CLOSED_STAGES.includes(l.crm_status)) return false
  const s = followUpState(l.follow_up_at)
  return s === 'overdue' || s === 'today'
}

/** Štítek follow-up termínu na kartě poptávky. */
function followUpInfo(lead: Lead): { text: string; cls: string } | null {
  const s = followUpState(lead.follow_up_at)
  if (!s) return null
  if (s === 'overdue') return { text: 'Follow-up po termínu', cls: 'bg-rose-soft text-rose' }
  if (s === 'today') return { text: 'Follow-up dnes', cls: 'bg-amber-soft text-amber' }
  return { text: `Follow-up ${formatDate(lead.follow_up_at ?? '')}`, cls: 'bg-canvas text-tx-soft' }
}

export function Leads({ filter, onFilter }: { filter: LeadsFilter; onFilter: (f: LeadsFilter) => void }): JSX.Element {
  const { leads, loading, error, refetch, remove } = useLeads()
  const { open: openNewLead } = useNewLead()
  const { openLead } = useLeadDetail()
  const [toDelete, setToDelete] = useState<Lead | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Doporučitelé nejsou poptávky → patří do Kontaktů, ne sem.
  const activeLeads = leads.filter((l) => !isReferrer(l))
  const list = activeLeads.filter((l) => {
    if (filter === 'odhad') return isEstimate(l)
    if (filter === 'poptavka') return !isEstimate(l)
    if (filter === 'followup') return isFollowUpDue(l)
    return true
  })

  const dueCount = activeLeads.filter(isFollowUpDue).length
  const tabs: { id: LeadsFilter; label: string; count: number }[] = [
    { id: 'vse', label: 'Vše', count: activeLeads.length },
    { id: 'poptavka', label: 'Poptávky', count: activeLeads.filter((l) => !isEstimate(l)).length },
    { id: 'odhad', label: 'Odhady ceny', count: activeLeads.filter((l) => isEstimate(l)).length },
    { id: 'followup', label: 'K vyřízení', count: dueCount }
  ]

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Poptávky"
        subtitle="Leady z webových formulářů a žádosti o odhad"
        actions={<button className="btn-primary" onClick={openNewLead} title="Přidat poptávku" aria-label="Přidat poptávku"><Plus className="h-4 w-4" /> <span className="hidden md:inline">Přidat poptávku</span></button>}
      />

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <>
            <div className="mb-6 inline-flex rounded-xl border border-line bg-white p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onFilter(t.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    filter === t.id ? 'bg-brand text-ink shadow-sm' : 'text-tx-soft hover:text-tx'
                  }`}
                >
                  {t.label}
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] ${
                      filter === t.id ? 'bg-white/20' : 'bg-canvas text-tx-faint'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {list.length === 0 ? (
              <Empty label={filter === 'followup' ? 'Nic k vyřízení — žádné follow-upy dnes ani po termínu.' : 'Žádné poptávky v této kategorii.'} />
            ) : (
              <>
                {/* mobil: kompaktní řádky */}
                <ul className="space-y-2 md:hidden">
                  {list.map((l) => <LeadRowMobile key={l.id} l={l} onOpen={() => openLead(l)} />)}
                </ul>

                {/* desktop: tabulka */}
                <div className="card hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[980px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-tx-faint">
                        <th className="px-5 py-3.5">Lead</th>
                        <th className="px-5 py-3.5">Fáze</th>
                        <th className="px-5 py-3.5">Zdroj</th>
                        <th className="px-5 py-3.5">Kontakt</th>
                        <th className="px-5 py-3.5 text-right">Rozpočet</th>
                        <th className="px-5 py-3.5">Follow-up</th>
                        <th className="px-5 py-3.5">Přijato</th>
                        <th className="px-5 py-3.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {list.map((l) => {
                        const src = sourceStyle(l.source)
                        const SrcIcon = src.icon
                        const stage = STAGE_MAP[l.crm_status]
                        const estimate = isEstimate(l)
                        const fu = followUpInfo(l)
                        const isNew = l.crm_status === 'novy'
                        const wa = whatsappUrl(l.phone)
                        const web = isWebLead(l)
                        return (
                          <tr key={l.id} onClick={() => openLead(l)} className="group cursor-pointer transition hover:bg-canvas">
                            <td className={`px-5 py-3 ${web ? 'border-l-[3px] border-sky bg-sky-soft/25' : ''}`}>
                              <div className="flex items-center gap-3">
                                <Avatar name={l.name || '?'} size={38} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-tx">
                                    {l.name || 'Bez jména'}
                                    {isNew && <span className="pill bg-brand text-ink">Nové</span>}
                                    {l.gdpr_consent && <ShieldCheck className="h-3.5 w-3.5 text-emerald" aria-label="GDPR potvrzeno" />}
                                  </div>
                                  <div className="flex items-center gap-1 truncate text-xs text-tx-faint">
                                    <MapPin className="h-3 w-3 shrink-0" /> {l.location || '—'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              {stage && (
                                <span className="pill whitespace-nowrap" style={{ background: `${stage.accent}1f`, color: stage.accent }}>
                                  {stage.label}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {l.source ? (
                                <span className={`pill whitespace-nowrap ${src.cls}`}>
                                  <SrcIcon className="h-3 w-3" /> {l.source}
                                </span>
                              ) : <span className="text-tx-faint">—</span>}
                            </td>
                            <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={l.phone ? `tel:${l.phone.replace(/\s/g, '')}` : undefined}
                                  className="grid h-7 w-7 place-items-center rounded-lg border border-line text-tx-soft transition hover:border-brand/40 hover:text-brand-dark"
                                  title={l.phone || 'Telefon'}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                                {wa && (
                                  <a href={wa} target="_blank" rel="noreferrer" className="grid h-7 w-7 place-items-center rounded-lg border border-line text-emerald transition hover:border-emerald/40" title="WhatsApp">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  </a>
                                )}
                                <a
                                  href={l.email ? `mailto:${l.email}` : undefined}
                                  className="grid h-7 w-7 place-items-center rounded-lg border border-line text-tx-soft transition hover:border-brand/40 hover:text-brand-dark"
                                  title={l.email || 'E-mail'}
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="whitespace-nowrap font-mono text-[13px] font-semibold text-tx">
                                {estimate && l.price_estimate
                                  ? `~ ${formatCZK(l.price_estimate, true)}`
                                  : formatCZK(Number(l.price ?? 0), true)}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              {fu ? (
                                <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold ${fu.cls}`}>
                                  <CalendarClock className="h-3.5 w-3.5" /> {fu.text}
                                </span>
                              ) : <span className="text-tx-faint">—</span>}
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap text-sm text-tx-faint">{relativeDays(l.created_at)}</td>
                            <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="grid h-8 w-8 place-items-center rounded-lg text-tx-faint opacity-0 transition hover:bg-rose-soft hover:text-rose group-hover:opacity-100"
                                title="Smazat poptávku"
                                onClick={() => setToDelete(l)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {toDelete && (
        <Modal
          open
          size="md"
          title="Smazat poptávku"
          subtitle={toDelete.name || 'Lead'}
          onClose={() => setToDelete(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setToDelete(null)} disabled={deleting}>Zrušit</button>
              <button
                className="btn bg-rose text-white hover:bg-rose/90"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await remove(toDelete)
                    setToDelete(null)
                  } finally {
                    setDeleting(false)
                  }
                }}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Smazat
              </button>
            </>
          }
        >
          <p className="text-sm text-tx-soft">
            Smaže poptávku včetně historie a fotek. <b className="text-tx">Kontakt zůstane v Kontaktech.</b>
          </p>
        </Modal>
      )}
    </div>
  )
}

/** Kompaktní řádek poptávky pro mobil (náhrada za tabulku, která se na malé obrazovce nevejde). */
function LeadRowMobile({ l, onOpen }: { l: Lead; onOpen: () => void }): JSX.Element {
  const src = sourceStyle(l.source)
  const SrcIcon = src.icon
  const stage = STAGE_MAP[l.crm_status]
  const estimate = isEstimate(l)
  const fu = followUpInfo(l)
  const isNew = l.crm_status === 'novy'
  const web = isWebLead(l)

  return (
    <li
      onClick={onOpen}
      className={`card flex cursor-pointer items-center gap-3 p-3.5 ${web ? 'border-l-[3px] border-sky bg-sky-soft/25' : ''}`}
    >
      <Avatar name={l.name || '?'} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-bold text-tx">
          <span className="truncate">{l.name || 'Bez jména'}</span>
          {isNew && <span className="pill shrink-0 bg-brand text-ink">Nové</span>}
          {l.gdpr_consent && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald" />}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {stage && (
            <span className="pill" style={{ background: `${stage.accent}1f`, color: stage.accent }}>
              {stage.label}
            </span>
          )}
          {l.source && (
            <span className={`pill ${src.cls}`}>
              <SrcIcon className="h-3 w-3" /> {l.source}
            </span>
          )}
        </div>
        {fu && (
          <div className={`mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${fu.cls}`}>
            <CalendarClock className="h-3 w-3" /> {fu.text}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="whitespace-nowrap font-mono text-sm font-bold text-tx">
          {estimate && l.price_estimate ? `~ ${formatCZK(l.price_estimate, true)}` : formatCZK(Number(l.price ?? 0), true)}
        </div>
        <div className="mt-0.5 text-[11px] text-tx-faint">{relativeDays(l.created_at)}</div>
      </div>
    </li>
  )
}
