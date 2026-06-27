import { useEffect, useRef, useState } from 'react'
import { Loader2, Camera, Coins, TrendingUp, TrendingDown, User } from 'lucide-react'
import { Modal } from './Modal'
import { useLeads } from '../lib/leadsContext'
import { useMakler } from '../lib/maklerContext'
import { updateMakler, type Makler } from '../lib/makler'
import { uploadPhoto, photoUrl } from '../lib/photos'
import { formatCZK } from '../lib/format'

export function MaklerCard({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element | null {
  const { leads } = useLeads()
  const { makler, setMakler } = useMakler()
  const [form, setForm] = useState<Partial<Makler>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setForm(makler ?? {})
  }, [open, makler])

  // Provize: tento vs. minulý měsíc (uzavřené obchody dle data úpravy).
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const won = leads.filter((l) => l.crm_status === 'uzavreno')
  const sumIf = (from: Date, to: Date | null): number =>
    won.filter((l) => {
      if (!l.crm_updated_at) return false
      const d = new Date(l.crm_updated_at)
      return d >= from && (to ? d < to : true)
    }).reduce((s, l) => s + Number(l.provize || 0), 0)
  const provThis = sumIf(monthStart, null)
  const provLast = sumIf(lastMonthStart, monthStart)
  const delta = provThis - provLast
  const pct = provLast > 0 ? Math.round((delta / provLast) * 100) : null

  if (!open) return null

  const set = (p: Partial<Makler>): void => setForm((f) => ({ ...f, ...p }))

  const handlePhoto = async (file: File | undefined): Promise<void> => {
    if (!file || !makler) return
    setUploading(true)
    try {
      const path = await uploadPhoto('makler', file)
      await updateMakler(makler.id, { photo_path: path })
      setForm((f) => ({ ...f, photo_path: path }))
      setMakler({ ...makler, photo_path: path })
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const save = async (): Promise<void> => {
    if (!makler) return
    setSaving(true)
    setMsg(null)
    try {
      const patch = {
        name: form.name ?? null,
        email: form.email ?? null,
        phone: form.phone ?? null,
        signature: form.signature ?? null
      }
      await updateMakler(makler.id, patch)
      setMakler({ ...makler, ...patch })
      setMsg('Uloženo.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Uložení selhalo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      size="lg"
      title="Profil makléře"
      subtitle="Údaje, podpis a provize"
      onClose={onClose}
      footer={
        <>
          {msg && <span className="mr-auto text-sm font-medium text-emerald">{msg}</span>}
          <button className="btn-ghost" onClick={onClose}>Zavřít</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Uložit
          </button>
        </>
      }
    >
      {/* provize panel */}
      <div className="mb-5 flex items-center gap-4 rounded-2xl bg-ink p-5 text-white">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold/20 text-gold">
          <Coins className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-white/55">Provize tento měsíc</div>
          <div className="font-display text-3xl font-bold">{formatCZK(provThis, true)}</div>
        </div>
        <div className="text-right">
          <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${delta >= 0 ? 'text-emerald' : 'text-rose'}`}>
            {delta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {pct != null ? `${pct >= 0 ? '+' : ''}${pct} %` : (delta >= 0 ? '+' : '') + formatCZK(delta, true)}
          </div>
          <div className="text-[11px] text-white/45">minulý měsíc {formatCZK(provLast, true)}</div>
        </div>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row">
        {/* fotka */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-canvas ring-1 ring-line">
            {form.photo_path ? (
              <img src={photoUrl(form.photo_path)} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-tx-faint"><User className="h-10 w-10" /></div>
            )}
          </div>
          <button className="btn-soft py-1.5 text-xs" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {uploading ? 'Nahrávám…' : 'Změnit fotku'}
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
          <p className="max-w-[120px] text-center text-[11px] text-tx-faint">Fotka se vkládá do odchozích e-mailů.</p>
        </div>

        {/* údaje */}
        <div className="flex-1 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-tx-soft">Jméno</label>
            <input className="input" value={form.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-tx-soft">E-mail</label>
              <input className="input" value={form.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-tx-soft">Telefon</label>
              <input className="input" value={form.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-tx-soft">Podpis do e-mailů</label>
            <textarea className="input min-h-[90px] resize-y" value={form.signature ?? ''} onChange={(e) => set({ signature: e.target.value })} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
