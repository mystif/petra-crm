import { useEffect, useState } from 'react'
import { Loader2, Clock } from 'lucide-react'
import { STAGES, type StageKey } from '../lib/supabase'
import {
  fetchFollowUpSettings,
  updateFollowUpSetting,
  followUpOptionKey,
  FOLLOWUP_OPTIONS,
  type FollowUpSetting,
  type FollowUpUnit
} from '../lib/followupSettings'

export function FollowUpSettingsCard(): JSX.Element {
  const [settings, setSettings] = useState<FollowUpSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<StageKey | null>(null)

  useEffect(() => {
    fetchFollowUpSettings().then(setSettings).finally(() => setLoading(false))
  }, [])

  const byStage = Object.fromEntries(settings.map((s) => [s.stage, s]))

  const change = async (stage: StageKey, key: string): Promise<void> => {
    const opt = FOLLOWUP_OPTIONS.find((o) => followUpOptionKey(o.amount, o.unit) === key)
    if (!opt) return
    const prev = byStage[stage]
    setSaving(stage)
    setSettings((cur) => cur.map((s) => (s.stage === stage ? { ...s, amount: opt.amount, unit: opt.unit } : s))) // optimisticky
    try {
      await updateFollowUpSetting(stage, opt.amount, opt.unit as FollowUpUnit | null)
    } catch {
      if (prev) setSettings((cur) => cur.map((s) => (s.stage === stage ? prev : s)))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-gold">
          <Clock className="h-5 w-5" />
        </span>
        <div>
          <div className="font-bold text-tx">Follow-up</div>
          <div className="text-xs text-tx-soft">Za jak dlouho se má lead automaticky připomenout, když vstoupí do dané fáze.</div>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-tx-faint" /></div>
      ) : (
        <div className="mt-3 space-y-2">
          {STAGES.map((stage) => {
            const s = byStage[stage.key]
            const value = s ? followUpOptionKey(s.amount, s.unit) : 'off'
            return (
              <div key={stage.key} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stage.accent }} />
                <span className="min-w-0 flex-1 text-sm font-semibold text-tx">{stage.label}</span>
                {saving === stage.key && <Loader2 className="h-3.5 w-3.5 animate-spin text-tx-faint" />}
                <select
                  className="input w-auto min-w-[140px] py-1.5 text-sm"
                  value={value}
                  onChange={(e) => change(stage.key, e.target.value)}
                  disabled={saving === stage.key}
                >
                  {FOLLOWUP_OPTIONS.map((o) => (
                    <option key={followUpOptionKey(o.amount, o.unit)} value={followUpOptionKey(o.amount, o.unit)}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-3 px-1 text-xs text-tx-faint">
        Platí jen když lead ještě žádný termín „ozvat se" nemá — ručně nastavený termín se nikdy nepřepíše.
      </p>
    </div>
  )
}
