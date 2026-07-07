// Dokumenty — soubory navázané na entity (nemovitost / obchod-lead / klient-kontakt / událost).
// Dokument není samostatný objekt: vzniká vždy s ≥1 vazbou. Private bucket + signed URL.
import { supabase } from './supabase'
import {
  FileText, FileSignature, FileCheck, Handshake, KeyRound, ShieldCheck, Gauge,
  LayoutTemplate, Scale, Landmark, ClipboardCheck, PenTool, Receipt, type LucideIcon
} from 'lucide-react'

export const DOCS_BUCKET = 'dokumenty'
export const DOC_MAX_BYTES = 20 * 1024 * 1024 // 20 MB

export interface DocumentItem {
  id: string
  name: string
  kategorie: string
  file_path: string
  mime_type: string | null
  size_bytes: number | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface DocumentLink {
  id: string
  dokument_id: string
  lead_id: string | null
  kontakt_id: string | null
  nemovitost_id: string | null
  udalost_id: string | null
  created_at: string
}

/** Cíl vazby — vždy právě jedno pole vyplněné. */
export interface DocTarget {
  lead_id?: string | null
  kontakt_id?: string | null
  nemovitost_id?: string | null
  udalost_id?: string | null
}

export interface DocCategory { value: string; label: string; cls: string; icon: LucideIcon }
export const DOC_CATEGORIES: DocCategory[] = [
  { value: 'kupni_smlouva', label: 'Kupní smlouva', cls: 'bg-emerald-soft text-emerald', icon: FileSignature },
  { value: 'rezervacni_smlouva', label: 'Rezervační smlouva', cls: 'bg-sky-soft text-sky', icon: FileCheck },
  { value: 'zprostredkovatelska', label: 'Zprostředkovatelská smlouva', cls: 'bg-brand-soft text-brand-dark', icon: Handshake },
  { value: 'najemni_smlouva', label: 'Nájemní smlouva', cls: 'bg-amber-soft text-amber', icon: KeyRound },
  { value: 'gdpr', label: 'GDPR souhlas', cls: 'bg-canvas text-tx-soft', icon: ShieldCheck },
  { value: 'penb', label: 'Energetický štítek (PENB)', cls: 'bg-emerald-soft text-emerald', icon: Gauge },
  { value: 'pudorys', label: 'Půdorys', cls: 'bg-sky-soft text-sky', icon: LayoutTemplate },
  { value: 'posudek', label: 'Znalecký posudek / odhad', cls: 'bg-brand-soft text-brand-dark', icon: Scale },
  { value: 'list_vlastnictvi', label: 'List vlastnictví', cls: 'bg-[#F0E7FB] text-[#9333EA]', icon: Landmark },
  { value: 'predavaci_protokol', label: 'Předávací protokol', cls: 'bg-amber-soft text-amber', icon: ClipboardCheck },
  { value: 'plna_moc', label: 'Plná moc', cls: 'bg-canvas text-tx-soft', icon: PenTool },
  { value: 'faktura', label: 'Faktura', cls: 'bg-rose-soft text-rose', icon: Receipt },
  { value: 'jine', label: 'Jiné', cls: 'bg-canvas text-tx-soft', icon: FileText }
]
export function docCategoryMeta(v: string | null): DocCategory {
  return DOC_CATEGORIES.find((c) => c.value === v) ?? DOC_CATEGORIES[DOC_CATEGORIES.length - 1]
}

/** Bezpečný název souboru pro storage klíč (bez diakritiky, mezer, speciálních znaků). */
export function sanitizeFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize('NFKD').replace(/[̀-ͯ]/g, '')
  const ext = (dot > 0 ? name.slice(dot + 1) : '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
  const safeBase = base.toLowerCase().replace(/[^a-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'soubor'
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return safeExt ? `${safeBase}.${safeExt}` : safeBase
}

export function formatBytes(n: number | null): string {
  if (!n) return ''
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} kB`
  return `${n} B`
}

export async function fetchDocuments(): Promise<DocumentItem[]> {
  const { data, error } = await supabase.from('dokumenty').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as DocumentItem[]
}
export async function fetchDocumentLinks(): Promise<DocumentLink[]> {
  const { data, error } = await supabase.from('dokument_vazby').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []) as DocumentLink[]
}

/** Nahraje soubor do private bucketu + založí dokument + vazby. Při chybě uklidí nahraný soubor. */
export async function uploadDocument(
  file: File,
  meta: { name: string; kategorie: string; note?: string | null },
  targets: DocTarget[]
): Promise<void> {
  const path = `${crypto.randomUUID()}/${sanitizeFileName(file.name)}`
  const up = await supabase.storage.from(DOCS_BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream', upsert: false
  })
  if (up.error) throw new Error(up.error.message)

  const { data: doc, error: docErr } = await supabase.from('dokumenty').insert({
    name: meta.name.trim() || file.name,
    kategorie: meta.kategorie,
    file_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
    note: meta.note?.trim() || null
  }).select().single()
  if (docErr || !doc) {
    await supabase.storage.from(DOCS_BUCKET).remove([path]).catch(() => {})
    throw new Error(docErr?.message ?? 'Uložení dokumentu selhalo.')
  }

  const rows = targets
    .filter((t) => t.lead_id || t.kontakt_id || t.nemovitost_id || t.udalost_id)
    .map((t) => ({ dokument_id: doc.id, lead_id: t.lead_id ?? null, kontakt_id: t.kontakt_id ?? null, nemovitost_id: t.nemovitost_id ?? null, udalost_id: t.udalost_id ?? null }))
  if (rows.length > 0) {
    const { error: linkErr } = await supabase.from('dokument_vazby').insert(rows)
    if (linkErr) {
      await supabase.from('dokumenty').delete().eq('id', doc.id)
      await supabase.storage.from(DOCS_BUCKET).remove([path]).catch(() => {})
      throw new Error(linkErr.message)
    }
  }
}

export async function updateDocument(id: string, patch: Partial<Pick<DocumentItem, 'name' | 'kategorie' | 'note'>>): Promise<void> {
  const { error } = await supabase.from('dokumenty').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function addDocumentLink(dokumentId: string, target: DocTarget): Promise<void> {
  const { error } = await supabase.from('dokument_vazby').insert({
    dokument_id: dokumentId,
    lead_id: target.lead_id ?? null, kontakt_id: target.kontakt_id ?? null,
    nemovitost_id: target.nemovitost_id ?? null, udalost_id: target.udalost_id ?? null
  })
  if (error) throw new Error(error.message)
}
export async function removeDocumentLink(linkId: string): Promise<void> {
  const { error } = await supabase.from('dokument_vazby').delete().eq('id', linkId)
  if (error) throw new Error(error.message)
}

export async function deleteDocument(doc: DocumentItem): Promise<void> {
  await supabase.storage.from(DOCS_BUCKET).remove([doc.file_path]).catch(() => {})
  const { error } = await supabase.from('dokumenty').delete().eq('id', doc.id)
  if (error) throw new Error(error.message)
}

/** Krátkodobý podepsaný odkaz (300 s). `download` = vynutí stažení s daným názvem. */
export async function documentSignedUrl(path: string, downloadName?: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(DOCS_BUCKET)
    .createSignedUrl(path, 300, downloadName ? { download: downloadName } : undefined)
  if (error) return null
  return data?.signedUrl ?? null
}
