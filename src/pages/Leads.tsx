import { useState } from 'react'
import { Phone, Mail, MapPin, ArrowRight, CalendarClock, MessageCircle, Trash2, Loader2, ShieldCheck } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { Modal } from '../components/Modal'
import { Loading, ErrorState, Empty } from '../components/States'
import { useLeads } from '../lib/leadsContext'
import { useNewLead } from '../lib/newLeadContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { STAGE_MAP, CLOSED_STAGES, type Lead } from '../lib/supabase'
import { formatCZK, relativeDays, formatDate, followUpState } from '../lib/format'
import { sourceStyle, isEstimate, whatsappUrl, isReferrer } from '../lib/leadDisplay'

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
        actions={<button className="btn-primary" onClick={openNewLead}>Přidat poptávku</button>}
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
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {list.map((l) => {
                  const src = sourceStyle(l.source)
                  const SrcIcon = src.icon
                  const stage = STAGE_MAP[l.crm_status]
                  const estimate = isEstimate(l)
                  const fu = followUpInfo(l)
                  const isNew = l.crm_status === 'novy'
                  const wa = whatsappUrl(l.phone)
                  return (
                    <article
                      key={l.id}
                      onClick={() => openLead(l)}
                      className="card relative flex cursor-pointer flex-col overflow-hidden p-5 transition hover:shadow-lift"
                    >
                      {/* rohový štítek NOVÉ */}
                      {isNew && (
                        <div className="pointer-events-none absolute -right-10 top-3.5 rotate-45 bg-brand px-10 py-1 text-center text-[11px] font-bold tracking-wider text-ink shadow-sm">
                          NOVÉ
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <Avatar name={l.name || '?'} size={44} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-bold text-tx">{l.name || 'Bez jména'}</h3>
                            {stage && (
                              <span
                                className="pill"
                                style={{ background: `${stage.accent}1f`, color: stage.accent }}
                              >
                                {stage.label}
                              </span>
                            )}
                            {l.gdpr_consent && (
                              <span className="pill bg-emerald-soft text-emerald" title="GDPR potvrzeno">
                                <ShieldCheck className="h-3 w-3" /> GDPR
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-tx-soft">
                            <MapPin className="h-3.5 w-3.5" /> {l.location || '—'}
                          </div>
                        </div>
                        {l.source && (
                          <span className={`pill ${src.cls}`}>
                            <SrcIcon className="h-3 w-3" /> {l.source}
                          </span>
                        )}
                      </div>

                      {fu && (
                        <div className={`mt-3 inline-flex items-center gap-1.5 self-start rounded-lg px-2.5 py-1 text-xs font-semibold ${fu.cls}`}>
                          <CalendarClock className="h-3.5 w-3.5" /> {fu.text}
                        </div>
                      )}

                      {l.message && <p className="mt-3 text-sm text-tx">{l.message}</p>}

                      <div className="mt-4 rounded-xl bg-canvas p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-tx-soft">
                            {estimate ? 'Odhadovaná cena' : 'Rozpočet klienta'}
                          </span>
                          <span className="font-mono text-base font-bold text-tx">
                            {estimate && l.price_estimate
                              ? `~ ${formatCZK(l.price_estimate, true)}`
                              : formatCZK(Number(l.price ?? 0), true)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={l.phone ? `tel:${l.phone.replace(/\s/g, '')}` : undefined}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-tx-soft transition hover:border-brand/40 hover:text-brand-dark"
                          title={l.phone || 'Telefon'}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-emerald transition hover:border-emerald/40"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        <a
                          href={l.email ? `mailto:${l.email}` : undefined}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-tx-soft transition hover:border-brand/40 hover:text-brand-dark"
                          title={l.email || 'E-mail'}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                        <button
                          className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-line text-rose transition hover:border-rose/40 hover:bg-rose-soft"
                          title="Smazat poptávku"
                          onClick={() => setToDelete(l)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="btn-soft py-2 text-sm" onClick={() => openLead(l)}>
                          Otevřít <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 text-right text-[11px] text-tx-faint">
                        Přijato {relativeDays(l.created_at)}
                      </div>
                    </article>
                  )
                })}
              </div>
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
