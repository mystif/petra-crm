import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode
} from 'react'
import { fetchLeads, updateLeadStage, updateLead, type Lead, type StageKey } from './supabase'
import { deleteLeadKeepContact } from './leadActions'

interface LeadsState {
  leads: Lead[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  moveStage: (id: string, stage: StageKey) => Promise<void>
  patch: (id: string, patch: Partial<Lead>) => Promise<void>
  remove: (lead: Lead) => Promise<void>
}

const LeadsContext = createContext<LeadsState | null>(null)

export function useLeads(): LeadsState {
  const ctx = useContext(LeadsContext)
  if (!ctx) throw new Error('useLeads musí být uvnitř LeadsProvider')
  return ctx
}

export function LeadsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLeads(await fetchLeads())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodařilo se načíst data ze serveru.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  // Optimistický přesun fáze — UI reaguje hned, při chybě se vrátí zpět.
  const moveStage = useCallback(
    async (id: string, stage: StageKey) => {
      const prev = leads
      setLeads((cur) =>
        cur.map((l) =>
          l.id === id ? { ...l, crm_status: stage, crm_updated_at: new Date().toISOString() } : l
        )
      )
      try {
        await updateLeadStage(id, stage)
      } catch (e) {
        setLeads(prev) // rollback
        setError(e instanceof Error ? e.message : 'Změnu se nepodařilo uložit.')
      }
    },
    [leads]
  )

  // Obecná úprava leadu (follow-up termín, poznámka, fáze…) s lokální aktualizací.
  const patch = useCallback(async (id: string, p: Partial<Lead>) => {
    const prev = leads
    setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, ...p } : l)))
    try {
      await updateLead(id, p)
    } catch (e) {
      setLeads(prev)
      setError(e instanceof Error ? e.message : 'Změnu se nepodařilo uložit.')
      throw e
    }
  }, [leads])

  // Smazání leadu (s zachováním kontaktu) + odebrání z lokálního stavu.
  const remove = useCallback(async (lead: Lead) => {
    await deleteLeadKeepContact(lead)
    setLeads((cur) => cur.filter((l) => l.id !== lead.id))
  }, [])

  return (
    <LeadsContext.Provider value={{ leads, loading, error, refetch, moveStage, patch, remove }}>
      {children}
    </LeadsContext.Provider>
  )
}
