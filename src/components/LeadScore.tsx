import { Gauge } from 'lucide-react'
import type { Lead } from '../lib/supabase'
import { scoreLead } from '../lib/score'

/** Kompaktní kruhový ukazatel skóre — na kartu v pipeline. */
export function ScoreChip({ lead, size = 30 }: { lead: Lead; size?: number }): JSX.Element {
  const { score, color } = scoreLead(lead)
  const r = (size - 4) / 2
  const c = 2 * Math.PI * r
  const dash = (score / 100) * c
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`Lead score ${score}/100`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF0F4" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[10px] font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

/** Detailní panel skóre s rozpadem faktorů — do detailu leadu. */
export function ScorePanel({ lead }: { lead: Lead }): JSX.Element {
  const { score, factors, color, band } = scoreLead(lead)
  const bandLabel = band === 'vysoke' ? 'Vysoká priorita' : band === 'stredni' ? 'Střední priorita' : 'Nízká priorita'
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-brand-dark" />
        <h3 className="font-bold text-tx">Lead score</h3>
        <span className="ml-auto font-mono text-lg font-bold" style={{ color }}>{score}<span className="text-sm text-tx-faint">/100</span></span>
      </div>

      <div className="mb-1 h-2 overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <div className="mb-3 text-xs font-semibold" style={{ color }}>{bandLabel}</div>

      {factors.length === 0 ? (
        <p className="text-sm text-tx-faint">Zatím žádné faktory pro výpočet.</p>
      ) : (
        <ul className="space-y-1">
          {factors.map((f) => (
            <li key={f.label} className="flex items-center justify-between text-sm">
              <span className="text-tx-soft">{f.label}</span>
              <span className={`font-mono font-bold ${f.points >= 0 ? 'text-emerald' : 'text-rose'}`}>
                {f.points >= 0 ? '+' : ''}{f.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
