import { useEffect, useMemo, useState } from 'react'
import { Search, Phone, Mail, MapPin, CornerDownLeft } from 'lucide-react'
import { Avatar } from './Avatar'
import { useLeads } from '../lib/leadsContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { STAGE_MAP, type Lead } from '../lib/supabase'
import { formatCZK } from '../lib/format'
import { leadValue } from '../lib/leadDisplay'

/** Vyhledávací paleta přes všechny leady. Otevírá se ⌘K / Ctrl+K. */
export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element | null {
  const { leads } = useLeads()
  const { openLead } = useLeadDetail()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
    }
  }, [open])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    const base = s
      ? leads.filter(
          (l) =>
            (l.name ?? '').toLowerCase().includes(s) ||
            (l.email ?? '').toLowerCase().includes(s) ||
            (l.phone ?? '').replace(/\s/g, '').includes(s.replace(/\s/g, '')) ||
            (l.location ?? '').toLowerCase().includes(s) ||
            (l.message ?? '').toLowerCase().includes(s)
        )
      : leads
    return base.slice(0, 8)
  }, [q, leads])

  if (!open) return null

  const choose = (l: Lead): void => {
    onClose()
    openLead(l)
  }

  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      choose(results[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div className="card w-full max-w-xl overflow-hidden animate-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-tx-faint" />
          <input
            autoFocus
            className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-tx-faint"
            placeholder="Hledat lead podle jména, e-mailu, telefonu, lokality…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKey}
          />
          <kbd className="rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-tx-faint">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-tx-faint">Nic nenalezeno.</div>
          ) : (
            results.map((l, i) => {
              const stage = STAGE_MAP[l.crm_status]
              return (
                <button
                  key={l.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(l)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                    i === active ? 'bg-brand-soft' : 'hover:bg-canvas'
                  }`}
                >
                  <Avatar name={l.name || '?'} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-tx">{l.name || 'Bez jména'}</div>
                    <div className="flex items-center gap-3 text-xs text-tx-soft">
                      {l.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>}
                      {l.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{l.email}</span>}
                      {!l.phone && !l.email && l.location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.location}</span>
                      )}
                    </div>
                  </div>
                  {stage && (
                    <span className="pill shrink-0" style={{ background: `${stage.accent}1f`, color: stage.accent }}>
                      {stage.label}
                    </span>
                  )}
                  <span className="font-mono text-xs font-semibold text-tx-soft">{formatCZK(leadValue(l), true)}</span>
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-tx-faint" />}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
