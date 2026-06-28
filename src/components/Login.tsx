import { useState } from 'react'
import { Loader2, Mail, Lock, LogIn } from 'lucide-react'
import { useAuth } from '../lib/authContext'

export function Login(): JSX.Element {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!email.trim() || !password) return setErr('Vyplňte e-mail i heslo.')
    setBusy(true); setErr(null)
    const { error } = await signIn(email, password)
    if (error) { setErr(error); setBusy(false) }
    // při úspěchu se appka přepne sama (onAuthStateChange)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink p-6 text-white">
      <div className="pointer-events-none absolute inset-0 aurora opacity-90" />
      <div className="pointer-events-none absolute inset-0 grain opacity-[0.06] mix-blend-overlay" />

      <div className="relative w-full max-w-sm">
        {/* logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[.06] text-gold ring-1 ring-white/10 backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
              <path d="M5 19.5V11l7-6 7 6v8.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 19.5v-4a2 2 0 0 1 4 0v4Z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">BeReEst CRM</h1>
          <p className="mt-1 text-sm text-white/50">Přihlaste se do realitního pultu</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white/[.05] p-5 ring-1 ring-white/10 backdrop-blur">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-white/55">E-mail</span>
            <span className="flex items-center gap-2 rounded-xl bg-white/[.06] px-3 ring-1 ring-white/10 focus-within:ring-gold/50">
              <Mail className="h-4 w-4 text-white/40" />
              <input
                type="email" autoComplete="username" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm text-white placeholder-white/30 outline-none"
                placeholder="vas@email.cz" autoFocus
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-white/55">Heslo</span>
            <span className="flex items-center gap-2 rounded-xl bg-white/[.06] px-3 ring-1 ring-white/10 focus-within:ring-gold/50">
              <Lock className="h-4 w-4 text-white/40" />
              <input
                type="password" autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm text-white placeholder-white/30 outline-none"
                placeholder="••••••••"
              />
            </span>
          </label>

          {err && <p className="rounded-lg bg-rose/15 px-3 py-2 text-sm font-medium text-rose">{err}</p>}

          <button
            type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-bold text-ink transition hover:bg-gold/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {busy ? 'Přihlašuji…' : 'Přihlásit se'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-white/35">
          Přístup jen pro makléře. Zapomenuté heslo vám obnoví správce systému.
        </p>
      </div>
    </div>
  )
}
