import { useState } from 'react'
import { MapPin, Plus, GripVertical, Building2, CalendarClock, Navigation, BellRing, Coins, Loader2, Clock } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { ScoreChip } from '../components/LeadScore'
import { Modal } from '../components/Modal'
import { Loading, ErrorState } from '../components/States'
import { useLeads } from '../lib/leadsContext'
import { useNewLead } from '../lib/newLeadContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { STAGES, CLOSED_STAGES, type StageKey, type Lead } from '../lib/supabase'
import { formatCZK, formatDate, followUpState } from '../lib/format'
import { propertyLabel, leadValue, hueFromId, mapUrl, priorityMeta, lastContactInfo } from '../lib/leadDisplay'
import { photoUrl } from '../lib/photos'
import { addActivity } from '../lib/activity'

/** Follow-up tag se zobrazí jen u otevřených leadů s termínem dnes / po termínu. */
function followUpDue(l: Lead): 'overdue' | 'today' | null {
  if (CLOSED_STAGES.includes(l.crm_status)) return null
  const s = followUpState(l.follow_up_at)
  return s === 'overdue' || s === 'today' ? s : null
}

export function Pipeline(): JSX.Element {
  const { leads, loading, error, refetch, moveStage, patch } = useLeads()
  const { open: openNewLead } = useNewLead()
  const { openLead } = useLeadDetail()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<StageKey | null>(null)
  const [commissionLead, setCommissionLead] = useState<Lead | null>(null)

  const totalOpen = leads.filter((l) => !CLOSED_STAGES.includes(l.crm_status)).reduce((s, l) => s + leadValue(l), 0)
  const maxVal = Math.max(1, ...STAGES.map((s) => leads.filter((l) => l.crm_status === s.key).reduce((a, l) => a + leadValue(l), 0)))

  function drop(stage: StageKey): void {
    if (dragId) {
      const l = leads.find((x) => x.id === dragId)
      moveStage(dragId, stage)
      // Po přesunu do „Uzavřeno" se zeptáme na provizi (pokud ještě není).
      if (stage === 'uzavreno' && l && l.provize == null) {
        setCommissionLead({ ...l, crm_status: stage })
      }
    }
    setDragId(null)
    setOverStage(null)
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Pipeline"
        subtitle={`Otevřená hodnota ${formatCZK(totalOpen, true)} · ${leads.length} leadů`}
        showSearch={false}
        actions={<button className="btn-primary" onClick={openNewLead}><Plus className="h-4 w-4" /> Nový lead</button>}
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
                  onDragOver={(e) => { e.preventDefault(); setOverStage(stage.key) }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage(null) }}
                  onDrop={() => drop(stage.key)}
                  className={`flex w-[300px] flex-col rounded-2xl border transition ${isOver ? 'border-brand/50 bg-brand-soft/50' : 'border-line bg-canvas/60'}`}
                >
                  <div className="rounded-t-2xl border-b border-line bg-white/70 px-4 pb-3 pt-3.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.accent }} />
                      <span className="text-sm font-bold text-tx">{stage.label}</span>
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-canvas px-1.5 text-[11px] font-bold text-tx-soft">{items.length}</span>
                    </div>
                    <div className="mt-2 font-mono text-[13px] font-bold text-tx">{formatCZK(value, true)}</div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-canvas">
                      <div className="h-full rounded-full" style={{ width: `${meter}%`, background: stage.accent }} />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5">
                    {items.map((l) => {
                      const hue = hueFromId(l.id)
                      const cover = l.fotky?.[0]
                      const due = followUpDue(l)
                      const map = mapUrl(l)
                      const prio = priorityMeta(l.priorita)
                      const lc = lastContactInfo(l)
                      const danger = lc.stale || due === 'overdue'
                      return (
                        <article
                          key={l.id}
                          draggable
                          onDragStart={() => setDragId(l.id)}
                          onDragEnd={() => { setDragId(null); setOverStage(null) }}
                          onClick={() => openLead(l)}
                          className={`group card cursor-grab p-3 transition hover:shadow-lift active:cursor-grabbing ${dragId === l.id ? 'drag-ghost' : ''} ${
                            danger ? 'ring-2 ring-rose/60' : due === 'today' ? 'ring-2 ring-amber/60' : ''
                          }`}
                        >
                          {/* priorita + follow-up */}
                          {(prio || due) && (
                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                              {prio && (
                                <span className={`pill ${prio.cls}`}>
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: prio.dot }} /> {prio.label}
                                </span>
                              )}
                              {due && (
                                <span className={`pill text-white ${due === 'overdue' ? 'bg-rose' : 'bg-amber'}`}>
                                  <BellRing className="h-3 w-3" /> {due === 'overdue' ? 'Follow-up po termínu' : 'Follow-up dnes'}
                                </span>
                              )}
                            </div>
                          )}

                          <div
                            className="relative mb-2.5 flex h-20 items-end overflow-hidden rounded-xl p-2.5 text-white"
                            style={cover ? undefined : { background: `linear-gradient(135deg, hsl(${hue} 58% 52%), hsl(${(hue + 40) % 360} 60% 38%))` }}
                          >
                            {cover && <img src={photoUrl(cover)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                            <span className="pill relative bg-black/40 text-white backdrop-blur">{propertyLabel(l.property_type)}</span>
                            {!cover && <Building2 className="absolute right-2.5 top-2.5 h-6 w-6 opacity-40" />}
                          </div>

                          <div className="flex items-start gap-1.5">
                            <h4 className="flex-1 text-sm font-bold leading-snug text-tx">{l.name || 'Bez jména'}</h4>
                            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-tx-faint opacity-0 transition group-hover:opacity-100" />
                          </div>

                          <div className="mt-1 flex items-center gap-1 text-xs text-tx-soft">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{l.location || '—'}</span>
                            {map && (
                              <a
                                href={map}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Otevřít v mapě"
                                className="ml-auto shrink-0 text-brand-dark hover:text-brand"
                              >
                                <Navigation className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>

                          {l.meeting_at && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-amber">
                              <CalendarClock className="h-3.5 w-3.5" /> {formatDate(l.meeting_at)}
                            </div>
                          )}

                          <div className={`mt-1 flex items-center gap-1 text-xs ${lc.stale ? 'font-semibold text-rose' : 'text-tx-faint'}`}>
                            <Clock className="h-3.5 w-3.5" /> Poslední kontakt: {lc.text}
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                            <div className="flex items-center gap-1.5">
                              <ScoreChip lead={l} />
                              <span className="text-xs font-medium text-tx-soft">{l.source || 'Lead'}</span>
                            </div>
                            <span className="font-mono text-[13px] font-bold text-tx">{formatCZK(leadValue(l), true)}</span>
                          </div>
                        </article>
                      )
                    })}

                    {items.length === 0 && (
                      <div className={`grid h-20 place-items-center rounded-xl border-2 border-dashed text-xs font-medium ${isOver ? 'border-brand/50 text-brand-dark' : 'border-line text-tx-faint'}`}>
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

      {commissionLead && (
        <CommissionModal
          lead={commissionLead}
          onClose={() => setCommissionLead(null)}
          onSave={async (amount) => {
            await patch(commissionLead.id, { provize: amount })
            await addActivity(commissionLead.id, 'system', null, `Obchod uzavřen · provize ${amount != null ? formatCZK(amount) : '—'}`)
            setCommissionLead(null)
          }}
        />
      )}
    </div>
  )
}

function CommissionModal({ lead, onClose, onSave }: { lead: Lead; onClose: () => void; onSave: (amount: number | null) => Promise<void> }): JSX.Element {
  const [val, setVal] = useState(String(lead.provize ?? ''))
  const [saving, setSaving] = useState(false)
  return (
    <Modal
      open
      size="md"
      title="Obchod uzavřen 🎉"
      subtitle={lead.name || 'Lead'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Přeskočit</button>
          <button
            className="btn-primary"
            disabled={saving}
            onClick={async () => { setSaving(true); await onSave(val ? Number(val.replace(/\s/g, '')) : null) }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />} Uložit provizi
          </button>
        </>
      }
    >
      <label className="mb-1 block text-sm font-semibold text-tx-soft">Výše provize (Kč)</label>
      <input className="input font-mono" inputMode="numeric" placeholder="např. 250000" value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
      <p className="mt-2 text-xs text-tx-soft">Provize se započítá do dashboardu, KPI a karty makléře za aktuální měsíc.</p>
    </Modal>
  )
}
