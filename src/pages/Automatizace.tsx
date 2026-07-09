import { useEffect, useMemo, useState } from 'react'
import { Zap, Inbox, Trophy, Cake, ArrowDown, Loader2, UserPlus, PhoneCall, Mail } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Loading, ErrorState } from '../components/States'
import { fetchRules, setRuleEnabled, FLOWS, type Rule } from '../lib/automatizace'

const STEP_ICON: Record<string, typeof UserPlus> = {
  novy_lead_kontakt: UserPlus,
  novy_lead_ukol: PhoneCall,
  novy_lead_email: Mail,
  narozeniny_email: Cake
}

export function Automatizace({ embedded = false }: { embedded?: boolean } = {}): JSX.Element {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const load = (): void => {
    setLoading(true); setError(null)
    fetchRules().then(setRules).catch((e) => setError(e instanceof Error ? e.message : 'Nepodařilo se načíst pravidla.')).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const byKey = useMemo(() => Object.fromEntries(rules.map((r) => [r.key, r])), [rules])
  const activeCount = rules.filter((r) => r.enabled).length

  const toggle = async (key: string, next: boolean): Promise<void> => {
    setSaving(key)
    setRules((cur) => cur.map((r) => (r.key === key ? { ...r, enabled: next } : r))) // optimisticky
    try {
      await setRuleEnabled(key, next)
    } catch {
      setRules((cur) => cur.map((r) => (r.key === key ? { ...r, enabled: !next } : r)))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {!embedded && (
        <Topbar
          title="Automatizace"
          subtitle={loading ? 'Pravidla, která pracují za vás' : `${activeCount} z ${rules.length} pravidel aktivních`}
          showSearch={false}
        />
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* úvod */}
            <div className="relative overflow-hidden rounded-2xl text-white shadow-lift">
              <div className="absolute inset-0 aurora" />
              <div className="absolute inset-0 grain opacity-[0.07] mix-blend-overlay" />
              <div className="relative flex items-start gap-4 p-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-gold ring-1 ring-white/15"><Zap className="h-6 w-6" /></span>
                <div>
                  <h2 className="font-display text-xl font-bold">CRM, které pracuje za vás</h2>
                  <p className="mt-1 text-sm text-white/70">
                    Pravidla běží na serveru — spustí se i u leadů z webu, když máte appku zavřenou.
                    Žádný lead nezůstane bez reakce a po obchodu se sami připomenete pro opakovaný byznys.
                  </p>
                </div>
              </div>
            </div>

            {/* toky */}
            {FLOWS.map((flow) => {
              const TriggerIcon = flow.triggerIcon === 'lead' ? Inbox : flow.triggerIcon === 'deal' ? Trophy : Cake
              const steps = flow.steps.map((s) => byKey[s.key]).filter(Boolean)
              return (
                <div key={flow.trigger} className="card p-5">
                  {/* spouštěč */}
                  <div className="mb-1 flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-gold"><TriggerIcon className="h-5 w-5" /></span>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-tx-faint">Spouštěč</div>
                      <div className="font-bold text-tx">{flow.trigger}</div>
                    </div>
                  </div>

                  <div className="ml-5 flex items-center gap-2 py-1 text-tx-faint">
                    <ArrowDown className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Akce</span>
                  </div>

                  {/* kroky */}
                  <div className="space-y-2">
                    {steps.map((rule) => {
                      const Icon = STEP_ICON[rule.key] ?? Zap
                      const on = rule.enabled
                      return (
                        <div key={rule.key} className={`flex items-center gap-3 rounded-xl border p-3 transition ${on ? 'border-line bg-white' : 'border-line bg-canvas/60'}`}>
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${on ? 'bg-brand-soft text-brand-dark' : 'bg-canvas text-tx-faint'}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-bold ${on ? 'text-tx' : 'text-tx-soft'}`}>{rule.label}</div>
                            {rule.popis && <div className="text-xs text-tx-soft">{rule.popis}</div>}
                          </div>
                          <Switch on={on} busy={saving === rule.key} onChange={(v) => toggle(rule.key, v)} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            <p className="px-1 text-center text-xs text-tx-faint">
              Uvítací e-mail je ve výchozím stavu vypnutý — zapněte ho, až budete připraveni rozesílat automaticky.
            </p>
            <p className="px-1 text-center text-xs text-tx-faint">
              Za kolik dní se má připomenout follow-up v jednotlivých fázích pipeline nastavíte v Nastavení → Follow-up.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Switch({ on, busy, onChange }: { on: boolean; busy: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      onClick={() => onChange(!on)}
      disabled={busy}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-emerald' : 'bg-line'}`}
      title={on ? 'Vypnout' : 'Zapnout'}
    >
      <span className={`absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}>
        {busy && <Loader2 className="h-3 w-3 animate-spin text-tx-faint" />}
      </span>
    </button>
  )
}
