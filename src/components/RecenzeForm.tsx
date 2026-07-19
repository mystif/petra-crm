import { useRef, useState } from 'react'
import { Loader2, Star, Camera, User, Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import { Avatar } from './Avatar'
import { WebStatusLight } from './WebStatusLight'
import { uploadPhoto, photoUrl, removePhotoFile } from '../lib/photos'
import {
  createRecenze, updateRecenze, deleteRecenze, REVIEW_CATEGORIES,
  type Recenze, type RecenzeInput, type RecenzeWebStatus
} from '../lib/recenze'
import type { WebStatus } from '../lib/listings'

interface Props {
  recenze: Recenze | null
  onClose: () => void
  onSaved: () => void
}

export function RecenzeForm({ recenze, onClose, onSaved }: Props): JSX.Element {
  const editing = !!recenze
  const [jmeno, setJmeno] = useState(recenze?.jmeno ?? '')
  const [lokalita, setLokalita] = useState(recenze?.lokalita ?? '')
  const [textCs, setTextCs] = useState(recenze?.text_cs ?? '')
  const [textEn, setTextEn] = useState(recenze?.text_en ?? '')
  const [hodnoceni, setHodnoceni] = useState(recenze?.hodnoceni ?? 5)
  const [oblast, setOblast] = useState(recenze?.oblast ?? '')
  const [fotoPath, setFotoPath] = useState(recenze?.foto_path ?? null)
  const [webStatus, setWebStatus] = useState<RecenzeWebStatus>(recenze?.web_status ?? 'draft')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const handlePhoto = async (file: File | undefined): Promise<void> => {
    if (!file) return
    setUploading(true)
    try {
      const path = await uploadPhoto('recenze', file)
      setFotoPath(path)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Nahrání fotky selhalo.')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const save = async (): Promise<void> => {
    if (!jmeno.trim()) return setErr('Vyplňte jméno klienta.')
    if (!textCs.trim()) return setErr('Vyplňte text recenze.')
    setSaving(true); setErr(null)
    try {
      const payload: RecenzeInput = {
        jmeno: jmeno.trim(),
        lokalita: lokalita.trim() || null,
        text_cs: textCs.trim(),
        text_en: textEn.trim() || null,
        hodnoceni,
        oblast: oblast || null,
        foto_path: fotoPath,
        web_status: webStatus
      }
      if (editing && recenze) await updateRecenze(recenze.id, payload)
      else await createRecenze(payload)
      onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Uložení selhalo.')
      setSaving(false)
    }
  }

  const del = async (): Promise<void> => {
    if (!recenze) return
    if (!window.confirm(`Opravdu smazat recenzi od „${recenze.jmeno}"?`)) return
    setDeleting(true)
    try {
      await deleteRecenze(recenze.id)
      onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Smazání selhalo.')
      setDeleting(false)
    }
  }

  const categoryList = oblast && !REVIEW_CATEGORIES.includes(oblast) ? [oblast, ...REVIEW_CATEGORIES] : REVIEW_CATEGORIES

  return (
    <Modal
      open
      size="lg"
      title={editing ? 'Upravit recenzi' : 'Nová recenze'}
      subtitle="Zobrazí se v sekci Reference na webu"
      onClose={onClose}
      footer={
        <>
          {editing && (
            <button className="mr-auto flex items-center gap-1.5 text-sm font-semibold text-rose hover:text-rose/80" onClick={del} disabled={deleting || saving}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Smazat
            </button>
          )}
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Zrušit</button>
          <button className="btn-primary" onClick={save} disabled={saving || uploading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {editing ? 'Uložit' : 'Vytvořit recenzi'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        {/* fotka */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-canvas ring-2 ring-brand/50">
            {fotoPath ? (
              <img src={photoUrl(fotoPath)} alt="" className="h-full w-full object-cover" />
            ) : (
              <Avatar name={jmeno || '?'} size={96} />
            )}
          </div>
          <button className="btn-soft py-1.5 text-xs" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {uploading ? 'Nahrávám…' : fotoPath ? 'Změnit' : 'Nahrát fotku'}
          </button>
          {fotoPath && (
            <button
              className="text-[11px] font-semibold text-tx-faint hover:text-rose"
              onClick={async () => { await removePhotoFile(fotoPath).catch(() => {}); setFotoPath(null) }}
            >
              Odebrat fotku
            </button>
          )}
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
          <p className="max-w-[110px] text-center text-[11px] text-tx-faint">Bez fotky se ukáže avatar z iniciál.</p>
        </div>

        {/* údaje */}
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-tx-soft"><User className="mr-1 inline h-3.5 w-3.5" /> Jméno *</label>
              <input className="input" value={jmeno} onChange={(e) => setJmeno(e.target.value)} placeholder="např. Jana Nováková" autoFocus />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-tx-soft">Lokalita</label>
              <input className="input" value={lokalita} onChange={(e) => setLokalita(e.target.value)} placeholder="např. Praha 6 – Dejvice" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-tx-soft">Oblast pomoci</label>
              <select className="input" value={oblast} onChange={(e) => setOblast(e.target.value)}>
                <option value="">— neuvedeno —</option>
                {categoryList.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-tx-soft">Hodnocení</label>
              <div className="flex h-[42px] items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setHodnoceni(n)} title={`${n} z 5`}>
                    <Star className={`h-6 w-6 transition ${n <= hodnoceni ? 'fill-gold text-gold' : 'text-line'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-tx-soft">Text recenze (česky) *</label>
            <textarea className="input min-h-[90px] resize-y" value={textCs} onChange={(e) => setTextCs(e.target.value)} placeholder="Co klient o spolupráci s Petrou řekl…" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-tx-soft">Text recenze (anglicky)</label>
            <textarea className="input min-h-[70px] resize-y" value={textEn} onChange={(e) => setTextEn(e.target.value)} placeholder="Nepovinné — bez překladu se na anglické verzi webu zobrazí česky." />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-tx-soft">Viditelnost na webu</label>
            <WebStatusLight value={webStatus as WebStatus} onChange={(v) => setWebStatus(v as RecenzeWebStatus)} showLabel size={20} />
          </div>
        </div>
      </div>

      {err && <p className="mt-3 text-sm font-medium text-rose">{err}</p>}
    </Modal>
  )
}
