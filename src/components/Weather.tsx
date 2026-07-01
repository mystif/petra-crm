import { useEffect, useState } from 'react'
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning,
  type LucideIcon
} from 'lucide-react'

interface Current { temp: number; code: number }

/** WMO weather code → ikona + český popis. */
function weatherMeta(code: number): { Icon: LucideIcon; label: string } {
  if (code === 0) return { Icon: Sun, label: 'Jasno' }
  if (code === 1 || code === 2) return { Icon: CloudSun, label: 'Polojasno' }
  if (code === 3) return { Icon: Cloud, label: 'Zataženo' }
  if (code === 45 || code === 48) return { Icon: CloudFog, label: 'Mlha' }
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, label: 'Mrholení' }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, label: 'Déšť' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icon: CloudSnow, label: 'Sněžení' }
  if (code >= 95) return { Icon: CloudLightning, label: 'Bouřka' }
  return { Icon: Cloud, label: 'Oblačno' }
}

/** Aktuální počasí pro Prahu (Open-Meteo, bez API klíče). */
export function Weather(): JSX.Element | null {
  const [cur, setCur] = useState<Current | null>(null)

  useEffect(() => {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=50.0755&longitude=14.4378&current=temperature_2m,weather_code&timezone=Europe%2FPrague'
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const c = d?.current
        if (c) setCur({ temp: Math.round(c.temperature_2m), code: c.weather_code })
      })
      .catch(() => {})
  }, [])

  if (!cur) return null
  const { Icon, label } = weatherMeta(cur.code)
  return (
    <div
      title={`Praha — ${label}, ${cur.temp} °C`}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1"
    >
      <Icon className="h-4 w-4 text-brand-dark" />
      <span className="text-sm font-bold text-tx">{cur.temp}°</span>
      <span className="hidden text-xs font-medium text-tx-soft sm:inline">Praha · {label}</span>
    </div>
  )
}
