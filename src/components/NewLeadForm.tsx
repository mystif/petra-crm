import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from './Modal'
import { createLead, STAGES, type StageKey } from '../lib/supabase'
import { PRIORITIES } from '../lib/leadDisplay'
import { useLeads } from '../lib/leadsContext'

interface NewLeadFormProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const PROPERTY_OPTIONS = ['byt', 'dům', 'pozemek', 'komerční', 'pronájem']
const DEAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'koupě', label: 'Koupě' },
  { value: 'prodej', label: 'Prodej' },
  { value: 'pronájem', label: 'Pronájem' }
]

type LeadType = 'poptavka' | 'odhad' | 'doporucitel'

interface FormState {
  name: string
  phone: string
  email: string
  lead_type: LeadType
  deal_type: string
  property_type: string
  location: string
  price: string
  crm_status: StageKey
  priorita: string
  doporucil_id: string
  follow_up_at: string
  message: string
}

const EMPTY: FormState = {
  name: '',
  phone: '',
  email: '',
  lead_type: 'poptavka',
  deal_type: 'koupě',
  property_type: 'byt',
  location: '',
  price: '',
  crm_status: 'novy',
  priorita: '',
  doporucil_id: '',
  follow_up_at: '',
  message: ''
}

export function NewLeadForm({ open, onClose, onCreated }: NewLeadFormProps): JSX.Element {
  const { leads } = useLeads()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const set = (patch: Partial<FormState>): void => setForm((f) => ({ ...f, ...patch }))
  const isRef = form.lead_type === 'doporucitel'

  const close = (): void => {
    setForm(EMPTY)
    setErr(null)
    onClose()
  }

  const save = async (): Promise<void> => {
    if (!form.name.trim()) {
      setErr('Vyplňte alespoň jméno kontaktu.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const isRef = form.lead_type === 'doporucitel'
      const priceNum = form.price ? Number(form.price.replace(/\s/g, '')) : null
      await createLead({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        lead_type: form.lead_type,
        deal_type: isRef ? null : (form.deal_type || null),
        property_type: isRef ? null : (form.property_type || null),
        location: isRef ? null : (form.location.trim() || null),
        price: !isRef && form.lead_type === 'poptavka' ? priceNum : null,
        price_estimate: !isRef && form.lead_type === 'odhad' ? priceNum : null,
        crm_status: isRef ? 'novy' : form.crm_status,
        priorita: isRef ? null : (form.priorita || null),
        doporucil_id: form.doporucil_id || null,
        source: isRef ? 'Doporučitel' : (form.doporucil_id ? 'Doporučení' : 'Ručně'),
        follow_up_at: isRef ? null : (form.follow_up_at || null),
        message: form.message.trim() || null
      })
      setForm(EMPTY)
      onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Uložení selhalo.')
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      size="lg"
      title="Nový lead"
      subtitle="Ruční přidání poptávky / kontaktu"
      onClose={close}
      footer={
        <>
          <button className="btn-ghost" onClick={close}>Zrušit</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Ukládám…' : 'Vytvořit lead'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Typ záznamu" full>
          <select className="input" value={form.lead_type} onChange={(e) => set({ lead_type: e.target.value as LeadType })}>
            <option value="poptavka">Poptávka (hledá nebo nabízí)</option>
            <option value="odhad">Odhad ceny</option>
            <option value="doporucitel">Doporučitel (jen přivádí klienty, sám nic neřeší)</option>
          </select>
        </Field>

        <Field label="Jméno *" full>
          <input className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </Field>
        <Field label="Telefon">
          <input className="input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="E-mail">
          <input className="input" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>

        {!isRef && (
          <>
            <Field label="Druh obchodu">
              <select className="input" value={form.deal_type} onChange={(e) => set({ deal_type: e.target.value })}>
                {DEAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Typ nemovitosti">
              <select className="input" value={form.property_type} onChange={(e) => set({ property_type: e.target.value })}>
                {PROPERTY_OPTIONS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </Field>

            <Field label="Lokalita">
              <input className="input" value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="např. Praha 6 — Dejvice" />
            </Field>
            <Field label={form.lead_type === 'odhad' ? 'Odhadovaná cena (Kč)' : 'Rozpočet (Kč)'}>
              <input className="input" inputMode="numeric" value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="např. 8500000" />
            </Field>

            <Field label="Fáze">
              <select className="input" value={form.crm_status} onChange={(e) => set({ crm_status: e.target.value as StageKey })}>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Zavolat zpět (follow-up)">
              <input className="input" type="date" value={form.follow_up_at} onChange={(e) => set({ follow_up_at: e.target.value })} />
            </Field>
            <Field label="Priorita">
              <select className="input" value={form.priorita} onChange={(e) => set({ priorita: e.target.value })}>
                <option value="">— žádná —</option>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>)}
              </select>
            </Field>
            <div className="hidden sm:block" />
          </>
        )}

        <Field label="Doporučil(a)" full>
          <select className="input" value={form.doporucil_id} onChange={(e) => set({ doporucil_id: e.target.value })}>
            <option value="">— nikdo / z webu —</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.name || 'Bez jména'}</option>)}
          </select>
        </Field>

        <Field label="Poznámka" full>
          <textarea className="input min-h-[80px] resize-y" value={form.message} onChange={(e) => set({ message: e.target.value })} placeholder={isRef ? 'např. realitní makléř ze sítě, posílá kupce…' : undefined} />
        </Field>
      </div>

      {err && <p className="mt-3 text-sm font-medium text-rose">{err}</p>}
    </Modal>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }): JSX.Element {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-sm font-semibold text-tx-soft">{label}</label>
      {children}
    </div>
  )
}
