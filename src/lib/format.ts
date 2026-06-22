// Formátování do českých konvencí + drobné UI pomůcky.

export function formatCZK(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} mil. Kč`
  }
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0
  }).format(value)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** „před 2 dny" apod. — vztaženo k aktuálnímu času. */
export function relativeDays(iso: string | null, today: string = new Date().toISOString()): string {
  if (!iso) return '—'
  const a = new Date(iso).getTime()
  const b = new Date(today).getTime()
  const days = Math.floor((b - a) / 86_400_000)
  if (days <= 0) return 'dnes'
  if (days === 1) return 'včera'
  if (days < 7) return `před ${days} dny`
  if (days < 14) return 'před týdnem'
  return `před ${Math.round(days / 7)} týdny`
}

export function initials(name: string): string {
  const parts = name.replace(/s\.r\.o\.|a\.s\./gi, '').trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Deterministický gradient pozadí avataru podle jména. */
export function avatarGradient(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 70% 58%), hsl(${(h + 38) % 360} 72% 46%))`
}
