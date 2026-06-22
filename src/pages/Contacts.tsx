import { useMemo, useState } from 'react'
import { Phone, Mail, Search, MoreHorizontal, Plus, Download } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { Loading, ErrorState, Empty } from '../components/States'
import { useLeads } from '../lib/leadsContext'
import { formatCZK, relativeDays } from '../lib/format'
import { contactRole, leadValue } from '../lib/leadDisplay'

interface DerivedContact {
  key: string
  name: string
  phone: string | null
  email: string | null
  role: string
  city: string | null
  value: number
  last: string
}

const ROLE_STYLE: Record<string, string> = {
  Kupující: 'bg-sky-soft text-sky',
  Prodávající: 'bg-emerald-soft text-emerald',
  Pronajímatel: 'bg-brand-soft text-brand',
  Zájemce: 'bg-amber-soft text-amber'
}
const ROLES = ['Vše', 'Kupující', 'Prodávající', 'Pronajímatel', 'Zájemce'] as const

export function Contacts(): JSX.Element {
  const { leads, loading, error, refetch } = useLeads()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<(typeof ROLES)[number]>('Vše')

  // Kontakty odvodíme z leadů — sloučíme podle e-mailu (nebo telefonu).
  const contacts = useMemo<DerivedContact[]>(() => {
    const map = new Map<string, DerivedContact>()
    for (const l of leads) {
      const key = (l.email || l.phone || l.id).toLowerCase()
      const existing = map.get(key)
      const last = l.crm_updated_at || l.created_at
      if (existing) {
        existing.value += leadValue(l)
        if (last > existing.last) existing.last = last
      } else {
        map.set(key, {
          key,
          name: l.name || 'Bez jména',
          phone: l.phone,
          email: l.email,
          role: contactRole(l),
          city: l.location,
          value: leadValue(l),
          last
        })
      }
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last))
  }, [leads])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contacts.filter((c) => {
      const matchRole = role === 'Vše' || c.role === role
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      return matchRole && matchQuery
    })
  }, [contacts, query, role])

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Kontakty"
        subtitle={`${contacts.length} osob z poptávek`}
        showSearch={false}
        actions={
          <>
            <button className="btn-ghost"><Download className="h-4 w-4" /> Export</button>
            <button className="btn-primary"><Plus className="h-4 w-4" /> Nový kontakt</button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tx-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input pl-10"
                  placeholder="Hledat podle jména, e-mailu nebo telefonu…"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      role === r
                        ? 'bg-ink text-white'
                        : 'border border-line bg-white text-tx-soft hover:text-tx'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <Empty label="Žádné kontakty neodpovídají hledání." />
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-tx-faint">
                      <th className="px-5 py-3.5">Jméno</th>
                      <th className="px-5 py-3.5">Telefon</th>
                      <th className="px-5 py-3.5">E-mail</th>
                      <th className="hidden px-5 py-3.5 lg:table-cell">Role</th>
                      <th className="hidden px-5 py-3.5 text-right xl:table-cell">Hodnota</th>
                      <th className="hidden px-5 py-3.5 md:table-cell">Aktivita</th>
                      <th className="px-5 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((c) => (
                      <tr key={c.key} className="group transition hover:bg-canvas">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.name} size={38} />
                            <div>
                              <div className="whitespace-nowrap text-sm font-bold text-tx">{c.name}</div>
                              {c.city && <div className="text-xs text-tx-faint">{c.city}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {c.phone ? (
                            <a
                              href={`tel:${c.phone.replace(/\s/g, '')}`}
                              className="flex items-center gap-2 whitespace-nowrap font-mono text-[13px] text-tx-soft transition hover:text-brand"
                            >
                              <Phone className="h-3.5 w-3.5 text-tx-faint" />
                              {c.phone}
                            </a>
                          ) : (
                            <span className="text-tx-faint">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {c.email ? (
                            <a
                              href={`mailto:${c.email}`}
                              className="flex items-center gap-2 text-sm text-tx-soft transition hover:text-brand"
                            >
                              <Mail className="h-3.5 w-3.5 text-tx-faint" />
                              {c.email}
                            </a>
                          ) : (
                            <span className="text-tx-faint">—</span>
                          )}
                        </td>
                        <td className="hidden px-5 py-3 lg:table-cell">
                          <span className={`pill ${ROLE_STYLE[c.role] ?? 'bg-canvas text-tx-soft'}`}>
                            {c.role}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3 text-right xl:table-cell">
                          <span className="font-mono text-[13px] font-semibold text-tx">
                            {c.value ? formatCZK(c.value, true) : '—'}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3 text-sm text-tx-soft md:table-cell">
                          {relativeDays(c.last)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button className="grid h-8 w-8 place-items-center rounded-lg text-tx-faint opacity-0 transition hover:bg-line group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
