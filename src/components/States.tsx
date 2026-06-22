import { Loader2, AlertTriangle, Inbox } from 'lucide-react'

export function Loading({ label = 'Načítám data…' }: { label?: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-tx-soft">
      <Loader2 className="h-7 w-7 animate-spin text-brand-dark" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): JSX.Element {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-rose-soft text-rose">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-bold text-tx">Chyba připojení</h3>
      <p className="mt-1 text-sm text-tx-soft">{message}</p>
      {onRetry && (
        <button className="btn-primary mt-5" onClick={onRetry}>
          Zkusit znovu
        </button>
      )}
    </div>
  )
}

export function Empty({ label }: { label: string }): JSX.Element {
  return (
    <div className="py-16 text-center text-tx-faint">
      <Inbox className="mx-auto mb-2 h-8 w-8" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
