import { WEB_STATUSES, type WebStatus } from '../lib/listings'

interface Props {
  value: WebStatus
  onChange: (v: WebStatus) => void
  /** Zobrazit textový popisek aktivního stavu vedle světel. */
  showLabel?: boolean
  size?: number
  className?: string
}

/**
 * Semafor viditelnosti nemovitosti na webu — tři svítící světla:
 * zelená (online) / oranžová (koncept) / červená (skryto). Aktivní světlo září.
 */
export function WebStatusLight({ value, onChange, showLabel = false, size = 20, className = '' }: Props): JSX.Element {
  const active = WEB_STATUSES.find((s) => s.value === value) ?? WEB_STATUSES[0]
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#161616] px-2 py-1.5 ring-1 ring-white/10">
        {WEB_STATUSES.map((s) => {
          const on = value === s.value
          return (
            <button
              key={s.value}
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(s.value) }}
              title={`${s.label} — ${s.hint}`}
              aria-label={`${s.label} — ${s.hint}`}
              aria-pressed={on}
              className="rounded-full transition-transform duration-150 hover:scale-110"
              style={{
                width: size,
                height: size,
                background: on
                  ? `radial-gradient(circle at 35% 30%, #ffffffcc, ${s.color} 62%)`
                  : s.color,
                opacity: on ? 1 : 0.22,
                boxShadow: on ? `0 0 10px 1px ${s.color}, 0 0 3px ${s.color} inset` : 'none',
                transform: on ? 'scale(1)' : 'scale(0.86)'
              }}
            />
          )
        })}
      </div>
      {showLabel && (
        <span className="text-sm font-semibold" style={{ color: active.color }}>{active.label}</span>
      )}
    </div>
  )
}
