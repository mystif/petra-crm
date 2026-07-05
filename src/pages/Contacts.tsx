import { useEffect, useMemo, useState } from 'react'
import { Phone, Mail, Search, MoreHorizontal, Plus, Download, ShieldCheck, CalendarClock, Clock } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { Loading, ErrorState, Empty } from '../components/States'
import { useLeads } from '../lib/leadsContext'
import { useLeadDetail } from '../lib/leadDetailContext'
import { useNewLead } from '../lib/newLeadContext'
import { formatDate, relativeDays, followUpState } from '../lib/format'
import { contactRole, leadValue } from '../lib/leadDisplay'
import { CLOSED_STAGES } from '../lib/supabase'
import { fetchSavedContacts, type SavedContact } from '../lib/contacts'

interface DerivedContact {
  key: string
  leadId: string | null // odkaz na lead pro otevření karty (null = jen uložený kontakt)
  name: string
  phone: string | null
  email: string | null
  role: string
  city: string | null
  value: number
  lastContact: string
  nextFollowUp: string | null
  deals: number
  won: number
  source: string | null
  tags: string[]
  gdpr: boolean
}

const ROLE_STYLE: Record<string, string> = {
  Kupující: 'bg-sky-soft text-sky',
  Prodávající: 'bg-emerald-soft text-emerald',
  Pronajímatel: 'bg-brand-soft text-brand-dark',
  Zájemce: 'bg-amber-soft text-amber',
  Doporučitel: 'bg-ink text-gold'
}
const ROLES = ['Vše', 'Kupující', 'Prodávající', 'Pronajímatel', 'Zájemce', 'Doporučitel'] as const

/** Barva štítku (tagu) — VIP/Investor zlatě, ostatní neutrálně. */
function tagStyle(tag: string): string {
  if (/vip/i.test(tag)) return 'bg-brand text-ink'
  if (/investor|developer/i.test(tag)) return 'bg-[#F0E7FB] text-[#9333EA]'
  return ROLE_STYLE[tag] ?? 'bg-canvas text-tx-soft'
}

const uniq = (arr: string[]): string[] => [...new Set(arr.filter(Boolean))]

/** Stáhne kontakty jako CSV (oddělené středníkem kvůli Excelu v CZ). */
function exportContactsCsv(rows: DerivedContact[]): void {
  const head = ['Jméno', 'Telefon', 'E-mail', 'Role', 'Lokalita', 'Hodnota (Kč)', 'Poslední kontakt', 'Další follow-up', 'Obchody', 'Zdroj', 'Tagy']
  const esc = (v: string | number | null | undefined): string => {
    const s = String(v ?? '')
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map((c) =>
    [c.name, c.phone, c.email, c.role, c.city, c.value || '', c.lastContact?.slice(0, 10), c.nextFollowUp?.slice(0, 10), c.deals, c.source, c.tags.join(', ')].map(esc).join(';')
  )
  const csv = '﻿' + [head.join(';'), ...lines].join('\r\n') // BOM kvůli diakritice v Excelu
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `kontakty-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function Contacts(): JSX.Element {
  const { leads, loading, error, refetch } = useLeads()
  const { openLead } = useLeadDetail()
  const { open: openNewLead } = useNewLead()
  const openContact = (leadId: string | null): void => {
    const l = leadId ? leads.find((x) => x.id === leadId) : null
    if (l) openLead(l)
  }
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<(typeof ROLES)[number]>('Vše')
  const [saved, setSaved] = useState<SavedContact[]>([])

  // Uložené kontakty (zůstávají i po smazání leadu z pipeline).
  useEffect(() => {
    fetchSavedContacts().then(setSaved).catch(() => setSaved([]))
  }, [leads])

  // Kontakty = odvozené z leadů (seskupené podle kontakt_id, případně e-mailu/telefonu) + samostatně uložené.
  // Lead propojený s kontaktem (kontakt_id, viz DB trigger link_lead_to_kontakt) se sloučí do JEDNÉ karty,
  // aby jeden reálný člověk nesl více rolí (zájemce/prodávající/pronajímatel/…) místo dvou samostatných řádků.
  const contacts = useMemo<DerivedContact[]>(() => {
    const groups = new Map<string, typeof leads>()
    for (const l of leads) {
      const key = l.kontakt_id ? `k:${l.kontakt_id}` : (l.email || l.phone || l.id).toLowerCase()
      const arr = groups.get(key) ?? []
      arr.push(l)
      groups.set(key, arr)
    }

    const out: DerivedContact[] = []
    const byKontaktId = new Map<string, DerivedContact>()
    for (const [key, arr] of groups) {
      const sorted = [...arr].sort((a, b) => (b.crm_updated_at || b.created_at).localeCompare(a.crm_updated_at || a.created_at))
      const primary = sorted[0]
      const contactDates = arr.map((l) => l.last_contact_at || l.crm_updated_at || l.created_at).sort()
      const lastContact = contactDates[contactDates.length - 1] ?? primary.created_at
      // nejbližší naplánovaný follow-up u otevřených leadů
      const nextFollowUp = arr
        .filter((l) => !CLOSED_STAGES.includes(l.crm_status) && l.follow_up_at)
        .map((l) => l.follow_up_at as string)
        .sort()[0] ?? null
      // role ze VŠECH leadů ve skupině (jeden kontakt může nést více rolí)
      const tags = uniq([...arr.flatMap((l) => l.tags ?? []), ...arr.map((l) => contactRole(l))])
      const dc: DerivedContact = {
        key,
        leadId: primary.id,
        name: primary.name || 'Bez jména',
        phone: primary.phone,
        email: primary.email,
        role: contactRole(primary),
        city: primary.location,
        value: arr.reduce((s, l) => s + leadValue(l), 0),
        lastContact,
        nextFollowUp,
        deals: arr.length,
        won: arr.filter((l) => l.crm_status === 'uzavreno').length,
        source: primary.source,
        tags,
        gdpr: arr.some((l) => !!l.gdpr_consent)
      }
      out.push(dc)
      if (key.startsWith('k:')) byKontaktId.set(key.slice(2), dc)
    }

    // Doplníme uložené kontakty: pokud už mají kartu (propojený lead), jen přidáme jejich roli;
    // jinak (kontakt bez aktivního leadu) přidáme novou kartu.
    for (const c of saved) {
      const linked = byKontaktId.get(c.id)
      if (linked) {
        if (c.role && !linked.tags.includes(c.role)) linked.tags.push(c.role)
        continue
      }
      const key = (c.email || c.phone || c.id).toLowerCase()
      if (!groups.has(key)) {
        out.push({
          key: `k:${c.id}`,
          leadId: null,
          name: c.name || 'Bez jména',
          phone: c.phone,
          email: c.email,
          role: c.role || 'Zájemce',
          city: c.city,
          value: 0,
          lastContact: c.updated_at,
          nextFollowUp: null,
          deals: 0,
          won: 0,
          source: 'Uložený kontakt',
          tags: uniq([c.role || 'Zájemce']),
          gdpr: !!c.gdpr_consent
        })
      }
    }
    return out.sort((a, b) => b.lastContact.localeCompare(a.lastContact))
  }, [leads, saved])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contacts.filter((c) => {
      const matchRole = role === 'Vše' || c.tags.includes(role)
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
            <button className="btn-ghost" onClick={() => exportContactsCsv(filtered)} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> Export
            </button>
            <button className="btn-primary" onClick={openNewLead}><Plus className="h-4 w-4" /> Nový kontakt</button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
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
              <>
              {/* mobil: karty */}
              <ul className="space-y-2.5 md:hidden">
                {filtered.map((c) => <ContactCard key={c.key} c={c} onOpen={() => openContact(c.leadId)} />)}
              </ul>

              {/* desktop: tabulka */}
              <div className="card hidden overflow-x-auto md:block">
                <table className="w-full min-w-[940px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-tx-faint">
                      <th className="px-5 py-3.5">Jméno</th>
                      <th className="px-5 py-3.5">Telefon</th>
                      <th className="hidden px-5 py-3.5 lg:table-cell">Poslední kontakt</th>
                      <th className="hidden px-5 py-3.5 lg:table-cell">Další follow-up</th>
                      <th className="hidden px-5 py-3.5 text-center md:table-cell">Obchody</th>
                      <th className="hidden px-5 py-3.5 xl:table-cell">Zdroj</th>
                      <th className="px-5 py-3.5">Tagy</th>
                      <th className="px-5 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((c) => {
                      const lcDays = Math.floor((Date.now() - new Date(c.lastContact).getTime()) / 86_400_000)
                      const fuState = followUpState(c.nextFollowUp)
                      return (
                        <tr key={c.key} onClick={() => openContact(c.leadId)} className={`group transition hover:bg-canvas ${c.leadId ? 'cursor-pointer' : ''}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={c.name} size={38} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-tx">
                                  {c.name}
                                  {c.gdpr && <ShieldCheck className="h-3.5 w-3.5 text-emerald" aria-label="GDPR potvrzeno" />}
                                </div>
                                {c.email ? (
                                  <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 truncate text-xs text-tx-soft hover:text-brand-dark">
                                    <Mail className="h-3 w-3" /> {c.email}
                                  </a>
                                ) : c.city ? <div className="text-xs text-tx-faint">{c.city}</div> : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {c.phone ? (
                              <a
                                href={`tel:${c.phone.replace(/\s/g, '')}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 whitespace-nowrap font-mono text-[13px] text-tx-soft transition hover:text-brand-dark"
                              >
                                <Phone className="h-3.5 w-3.5 text-tx-faint" />
                                {c.phone}
                              </a>
                            ) : (
                              <span className="text-tx-faint">—</span>
                            )}
                          </td>
                          <td className="hidden px-5 py-3 lg:table-cell">
                            <span className={`flex items-center gap-1.5 whitespace-nowrap text-sm ${lcDays > 14 ? 'font-semibold text-rose' : 'text-tx-soft'}`}>
                              <Clock className="h-3.5 w-3.5" /> {relativeDays(c.lastContact)}
                            </span>
                          </td>
                          <td className="hidden px-5 py-3 lg:table-cell">
                            {c.nextFollowUp ? (
                              <span className={`flex items-center gap-1.5 whitespace-nowrap text-sm font-medium ${fuState === 'overdue' ? 'text-rose' : fuState === 'today' ? 'text-amber' : 'text-tx-soft'}`}>
                                <CalendarClock className="h-3.5 w-3.5" /> {formatDate(c.nextFollowUp)}
                              </span>
                            ) : <span className="text-tx-faint">—</span>}
                          </td>
                          <td className="hidden px-5 py-3 text-center md:table-cell">
                            <span className="font-mono text-[13px] font-semibold text-tx">{c.deals}</span>
                            {c.won > 0 && <span className="ml-1 text-[11px] font-bold text-emerald">· {c.won}✓</span>}
                          </td>
                          <td className="hidden px-5 py-3 text-sm text-tx-soft xl:table-cell whitespace-nowrap">{c.source || '—'}</td>
                          <td className="px-5 py-3">
                            <div className="flex max-w-[220px] flex-wrap gap-1">
                              {c.tags.slice(0, 3).map((t) => (
                                <span key={t} className={`pill ${tagStyle(t)}`}>{t}</span>
                              ))}
                              {c.tags.length > 3 && <span className="pill bg-canvas text-tx-faint">+{c.tags.length - 3}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="grid h-8 w-8 place-items-center rounded-lg text-tx-faint opacity-0 transition group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** Kompaktní karta kontaktu pro mobilní zobrazení. */
function ContactCard({ c, onOpen }: { c: DerivedContact; onOpen: () => void }): JSX.Element {
  const lcDays = Math.floor((Date.now() - new Date(c.lastContact).getTime()) / 86_400_000)
  const fuState = followUpState(c.nextFollowUp)
  return (
    <li className={`card p-3.5 ${c.leadId ? 'cursor-pointer' : ''}`} onClick={onOpen}>
      <div className="flex items-center gap-3">
        <Avatar name={c.name} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-bold text-tx">
            <span className="truncate">{c.name}</span>
            {c.gdpr && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald" aria-label="GDPR potvrzeno" />}
          </div>
          <div className="truncate text-xs text-tx-soft">
            {c.source || 'Lead'} · {c.deals} {c.deals === 1 ? 'obchod' : c.deals < 5 ? 'obchody' : 'obchodů'}
            {c.won > 0 && <span className="font-semibold text-emerald"> · {c.won}✓</span>}
          </div>
        </div>
        {c.tags[0] && <span className={`pill shrink-0 ${tagStyle(c.tags[0])}`}>{c.tags[0]}</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-tx-faint">Poslední kontakt</div>
          <div className={`flex items-center gap-1 font-medium ${lcDays > 14 ? 'text-rose' : 'text-tx-soft'}`}>
            <Clock className="h-3 w-3" /> {relativeDays(c.lastContact)}
          </div>
        </div>
        <div>
          <div className="text-tx-faint">Další follow-up</div>
          {c.nextFollowUp ? (
            <div className={`flex items-center gap-1 font-medium ${fuState === 'overdue' ? 'text-rose' : fuState === 'today' ? 'text-amber' : 'text-tx-soft'}`}>
              <CalendarClock className="h-3 w-3" /> {formatDate(c.nextFollowUp)}
            </div>
          ) : <div className="text-tx-faint">—</div>}
        </div>
      </div>

      {(c.phone || c.email) && (
        <div className="mt-3 flex gap-2 border-t border-line pt-3">
          {c.phone && (
            <a href={`tel:${c.phone.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-canvas py-2 text-sm font-semibold text-tx-soft transition active:bg-line">
              <Phone className="h-4 w-4" /> Volat
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-canvas py-2 text-sm font-semibold text-tx-soft transition active:bg-line">
              <Mail className="h-4 w-4" /> E-mail
            </a>
          )}
        </div>
      )}
    </li>
  )
}
