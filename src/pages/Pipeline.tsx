import { useState } from 'react'
import { MapPin, Plus, GripVertical, Building2, CalendarClock } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { Loading, ErrorState } from '../components/States'
import { LeadDetail } from '../components/LeadDetail'
import { useLeads } from '../lib/leadsContext'
import { STAGES, CLOSED_STAGES, type StageKey, type Lead } from '../lib/supabase'
import { formatCZK, formatDate } from '../lib/format'
import { propertyLabel, leadValue, hueFromId } from '../lib/leadDisplay'

export function Pipeline(): JSX.Element {
  const { leads, loading, error, refetch, moveStage } = useLeads()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<StageKey | null>(null)
  const [selected, setSelected] = useState<Lead | null>(null)

  const totalOpen = leads
    .filter((l) => !CLOSED_STAGES.includes(l.crm_status))
    .reduce((s, l) => s + leadValue(l), 0)

  const maxVal = Math.max(
    1,
    ...STAGES.map((s) =>
      leads.filter((l) => l.crm_status === s.key).reduce((a, l) => a + leadValue(l), 0)
    )
  )

  function drop(stage: StageKey): void {
    if (dragId) moveStage(dragId, stage)
    setDragId(null)
    setOverStage(null)
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Pipeline"
        subtitle={`Otevřená hodnota ${formatCZK(totalOpen, true)} · ${leads.length} leadů`}
        showSearch={false}
        actions={<button className="btn-primary"><Plus className="h-4 w-4" /> Nový lead</button>}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex h-full min-w-max gap-4">
            {STAGES.map((stage) => {
              const items = leads.filter((l) => l.crm_status === stage.key)
              const value = items.reduce((a, l) => a + leadValue(l), 0)
              const meter = (value / maxVal) * 100
              const isOver = overStage === stage.key
              return (
                <div
                  key={stage.key}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setOverStage(stage.key)
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage(null)
                  }}
                  onDrop={() => drop(stage.key)}
                  className={`flex w-[300px] flex-col rounded-2xl border transition ${
                    isOver ? 'border-brand/50 bg-brand-soft/50' : 'border-line bg-canvas/60'
                  }`}
                >
                  {/* hlavička fáze + hodnota */}
                  <div className="rounded-t-2xl border-b border-line bg-white/70 px-4 pb-3 pt-3.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.accent }} />
                      <span className="text-sm font-bold text-tx">{stage.label}</span>
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-canvas px-1.5 text-[11px] font-bold text-tx-soft">
                        {items.length}
                      </span>
                    </div>
                    <div className="mt-2 font-mono text-[13px] font-bold text-tx">
                      {formatCZK(value, true)}
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-canvas">
                      <div className="h-full rounded-full" style={{ width: `${meter}%`, background: stage.accent }} />
                    </div>
                  </div>

                  {/* karty */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5">
                    {items.map((l) => {
                      const hue = hueFromId(l.id)
                      return (
                        <article
                          key={l.id}
                          draggable
                          onDragStart={() => setDragId(l.id)}
                          onDragEnd={() => {
                            setDragId(null)
                            setOverStage(null)
                          }}
                          onClick={() => setSelected(l)}
                          className={`group card cursor-grab p-3 transition hover:shadow-lift active:cursor-grabbing ${
                            dragId === l.id ? 'drag-ghost' : ''
                          }`}
                        >
                          <div
                            className="relative mb-2.5 flex h-20 items-end overflow-hidden rounded-xl p-2.5 text-white"
                            style={{
                              background: `linear-gradient(135deg, hsl(${hue} 58% 52%), hsl(${(hue + 40) % 360} 60% 38%))`
                            }}
                          >
                            <span className="pill bg-black/25 text-white backdrop-blur">
                              {propertyLabel(l.property_type)}
                            </span>
                            <Building2 className="absolute right-2.5 top-2.5 h-6 w-6 opacity-40" />
                          </div>

                          <div className="flex items-start gap-1.5">
                            <h4 className="flex-1 text-sm font-bold leading-snug text-tx">
                              {l.name || 'Bez jména'}
                            </h4>
                            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-tx-faint opacity-0 transition group-hover:opacity-100" />
                          </div>

                          <div className="mt-1 flex items-center gap-1 text-xs text-tx-soft">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{l.location || '—'}</span>
                          </div>

                          {l.meeting_at && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-amber">
                              <CalendarClock className="h-3.5 w-3.5" /> {formatDate(l.meeting_at)}
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                            <div className="flex items-center gap-1.5">
                              <Avatar name={l.name || '?'} size={22} />
                              <span className="text-xs font-medium text-tx-soft">
                                {l.source || 'Lead'}
                              </span>
                            </div>
                            <span className="font-mono text-[13px] font-bold text-tx">
                              {formatCZK(leadValue(l), true)}
                            </span>
                          </div>
                        </article>
                      )
                    })}

                    {items.length === 0 && (
                      <div
                        className={`grid h-20 place-items-center rounded-xl border-2 border-dashed text-xs font-medium ${
                          isOver ? 'border-brand/50 text-brand' : 'border-line text-tx-faint'
                        }`}
                      >
                        Přetáhni lead sem
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selected && <LeadDetail lead={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
