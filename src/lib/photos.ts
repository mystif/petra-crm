import { supabase } from './supabase'

export const BUCKET = 'foto_CRM'
const MAX_BYTES = 1.5 * 1024 * 1024 // 1,5 MB
const MAX_DIMENSION = 1920 // delší strana po zmenšení

/**
 * Zmenší / zkomprimuje obrázek, pokud je větší než 1,5 MB. Postupně snižuje
 * rozměr i kvalitu JPEG, dokud se nevejde pod limit. Menší soubory vrací beze změny.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (file.size <= MAX_BYTES || !file.type.startsWith('image/')) return file

  const bitmap = await createImageBitmap(file)
  let scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))

  // Zkusíme několik kombinací měřítka a kvality, dokud se nevejdeme pod limit.
  for (let attempt = 0; attempt < 6; attempt++) {
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) break
    ctx.drawImage(bitmap, 0, 0, w, h)

    const quality = Math.max(0.5, 0.85 - attempt * 0.1)
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    if (blob && blob.size <= MAX_BYTES) return blob
    if (blob && attempt === 5) return blob // poslední pokus vrátíme i tak
    scale *= 0.8 // zmenšíme rozměr a zkusíme znovu
  }
  return file
}

/** Nahraje fotku leadu do bucketu foto_CRM, vrátí cestu k objektu. */
export async function uploadLeadPhoto(leadId: string, file: File): Promise<string> {
  const blob = await compressImage(file)
  const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg')
  const path = `${leadId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false
  })
  if (error) throw new Error(error.message)
  return path
}

/** Veřejná URL fotky pro zobrazení. */
export function photoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Smaže fotku z bucketu. */
export async function removePhotoFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(error.message)
}
