import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Mail, Loader2 } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Modal } from '../components/Modal'
import { Loading, ErrorState, Empty } from '../components/States'
import {
  fetchTemplates,
  saveTemplate,
  deleteTemplate,
  MERGE_FIELDS,
  type Template
} from '../lib/email'

export function Templates(): JSX.Element {
  const [list, setList] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Template | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Template | null>(null)

  const load = (): void => {
    setLoading(true)
    setError(null)
    fetchTemplates()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Načtení selhalo.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="E-mailové šablony"
        subtitle="Předpřipravené texty pro follow-up a oslovení"
        showSearch={false}
        actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Nová šablona</button>}
      />

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : list.length === 0 ? (
          <Empty label="Zatím žádné šablony. Vytvořte první." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((t) => (
              <article key={t.id} className="card flex flex-col p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                      <Mail className="h-4.5 w-4.5" />
                    </span>
                    <h3 className="font-bold text-tx">{t.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button className="grid h-8 w-8 place-items-center rounded-lg text-tx-soft hover:bg-canvas" onClick={() => setEditing(t)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="grid h-8 w-8 place-items-center rounded-lg text-rose hover:bg-rose-soft" onClick={() => setDeleting(t)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-sm font-semibold text-tx-soft">{t.subject || '(bez předmětu)'}</div>
                <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-sm text-tx-faint">{t.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <TemplateEditor
          template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}

      {deleting && (
        <Modal
          open
          size="md"
          title="Smazat šablonu"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setDeleting(null)}>Zrušit</button>
              <button
                className="btn bg-rose text-white hover:bg-rose/90"
                onClick={async () => {
                  await deleteTemplate(deleting.id)
                  setDeleting(null)
                  load()
                }}
              >
                Smazat
              </button>
            </>
          }
        >
          <p className="text-sm text-tx-soft">Opravdu smazat šablonu „{deleting.name}"?</p>
        </Modal>
      )}
    </div>
  )
}

function TemplateEditor({
  template,
  onClose,
  onSaved
}: {
  template: Template | null
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const [name, setName] = useState(template?.name ?? '')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async (): Promise<void> => {
    if (!name.trim()) return setErr('Zadejte název šablony.')
    setSaving(true)
    setErr(null)
    try {
      await saveTemplate({ id: template?.id, name, subject, body })
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Uložení selhalo.')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      size="lg"
      title={template ? 'Upravit šablonu' : 'Nová šablona'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Zrušit</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Ukládám…' : 'Uložit'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-tx-soft">Název šablony</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="např. První kontakt" autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-tx-soft">Předmět</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-tx-soft">Text</label>
          <textarea className="input min-h-[200px] resize-y" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="rounded-lg bg-canvas p-3 text-xs text-tx-soft">
          <span className="font-semibold text-tx">Prolinkovací pole:</span>{' '}
          {MERGE_FIELDS.map((f) => (
            <code key={f.token} className="mr-1.5 rounded bg-white px-1.5 py-0.5 text-tx" title={f.label}>
              {f.token}
            </code>
          ))}
          <span className="mt-1 block text-tx-faint">Při odeslání se nahradí údaji konkrétního leadu.</span>
        </div>
        {err && <p className="text-sm font-medium text-rose">{err}</p>}
      </div>
    </Modal>
  )
}
