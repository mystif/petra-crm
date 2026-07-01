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
 * Semafor viditelnosti nemovitosti na webu — tři svítící tečky:
 * zelená (online) / oranžová (koncept) / červená (skryto).
 * Aktivní tečka je sytá a září jemnou aurou, ostatní jsou zašlé. Bez tmavého pozadí.
 */
export function WebStatusLight({ value, onChange, showLabel = false, size = 12, className = '' }: Props): JSX.Element {
  const active = WEB_STATUSES.find((s) => s.value === value) ?? WEB_STATUSES[0]
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="inline-flex items-center gap-1.5">
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
              className="shrink-0 rounded-full transition-all duration-150 hover:scale-110"
              style={{
                width: size,
                height: size,
                background: s.color,
                opacity: on ? 1 : 0.22,
                boxShadow: on ? `0 0 0 3px ${s.color}2e, 0 0 5px ${s.color}` : 'none'
              }}
            />
          )
        })}
      </div>
      {showLabel && (
        <span className="text-xs font-bold" style={{ color: active.color }}>{active.label}</span>
      )}
    </div>
  )
}
