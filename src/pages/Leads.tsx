import { useState } from 'react'
import { Phone, Mail, MapPin, ArrowRight, CalendarClock } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { Loading, ErrorState, Empty } from '../components/States'
import { LeadDetail } from '../components/LeadDetail'
import { useLeads } from '../lib/leadsContext'
import { STAGE_MAP, type Lead } from '../lib/supabase'
import { formatCZK, relativeDays, formatDate } from '../lib/format'
import { sourceStyle, isEstimate } from '../lib/leadDisplay'

/** Stav follow-up termínu vůči dnešku. */
function followUpInfo(lead: Lead): { text: string; cls: string } | null {
  if (!lead.follow_up_at) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(lead.follow_up_at)
  if (d < today) return { text: 'Follow-up po termínu', cls: 'bg-rose-soft text-rose' }
  if (d.getTime() === today.getTime()) return { text: 'Follow-up dnes', cls: 'bg-amber-soft text-amber' }
  return { text: `Follow-up ${formatDate(lead.follow_up_at)}`, cls: 'bg-canvas text-tx-soft' }
}

type Filter = 'vse' | 'poptavka' | 'odhad'

export function Leads(): JSX.Element {
  const { leads, loading, error, refetch } = useLeads()
  const [filter, setFilter] = useState<Filter>('vse')
  const [selected, setSelected] = useState<Lead | null>(null)

  const list = leads.filter((l) => {
    if (filter === 'odhad') return isEstimate(l)
    if (filter === 'poptavka') return !isEstimate(l)
    return true
  })

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'vse', label: 'Vše', count: leads.length },
    { id: 'poptavka', label: 'Poptávky', count: leads.filter((l) => !isEstimate(l)).length },
    { id: 'odhad', label: 'Odhady ceny', count: leads.filter((l) => isEstimate(l)).length }
  ]

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Poptávky"
        subtitle="Leady z webových formulářů a žádosti o odhad"
        actions={<button className="btn-primary">Přidat poptávku</button>}
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
                  onClick={() => setFilter(t.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    filter === t.id ? 'bg-brand text-white shadow-sm' : 'text-tx-soft hover:text-tx'
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
              <Empty label="Žádné poptávky v této kategorii." />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {list.map((l) => {
                  const src = sourceStyle(l.source)
                  const SrcIcon = src.icon
                  const stage = STAGE_MAP[l.crm_status]
                  const estimate = isEstimate(l)
                  const fu = followUpInfo(l)
                  return (
                    <article
                      key={l.id}
                      onClick={() => setSelected(l)}
                      className="card flex cursor-pointer flex-col p-5 transition hover:shadow-lift"
                    >
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
                          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-tx-soft transition hover:border-brand/40 hover:text-brand"
                          title={l.phone || ''}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                        <a
                          href={l.email ? `mailto:${l.email}` : undefined}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-tx-soft transition hover:border-brand/40 hover:text-brand"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                        <button className="btn-soft ml-auto py-2 text-sm" onClick={() => setSelected(l)}>
                          Otevřít a napsat <ArrowRight className="h-4 w-4" />
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

      {selected && <LeadDetail lead={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
