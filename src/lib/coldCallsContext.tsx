import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode
} from 'react'
import { supabase } from './supabase'
import {
  fetchColdCalls, createColdCall, updateColdCall, deleteColdCall, type ColdCall
} from './coldCalls'

interface ColdCallsState {
  calls: ColdCall[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (input: Partial<Omit<ColdCall, 'id' | 'created_at'>>) => Promise<ColdCall>
  patch: (id: string, patch: Partial<ColdCall>) => Promise<void>
  remove: (id: string) => Promise<void>
}

const ColdCallsContext = createContext<ColdCallsState | null>(null)

export function useColdCalls(): ColdCallsState {
  const ctx = useContext(ColdCallsContext)
  if (!ctx) throw new Error('useColdCalls musí být uvnitř ColdCallsProvider')
  return ctx
}

export function ColdCallsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [calls, setCalls] = useState<ColdCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      setCalls(await fetchColdCalls())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodařilo se načíst Cold Cally.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    const ch = supabase
      .channel('rt-cold-calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cold_calls' }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  const add = useCallback(async (input: Partial<Omit<ColdCall, 'id' | 'created_at'>>) => {
    const created = await createColdCall(input)
    setCalls((cur) => [created, ...cur])
    return created
  }, [])

  const patch = useCallback(async (id: string, p: Partial<ColdCall>) => {
    setCalls((cur) => cur.map((c) => (c.id === id ? { ...c, ...p } : c)))
    try {
      await updateColdCall(id, p)
    } catch (e) {
      await refetch()
      setError(e instanceof Error ? e.message : 'Změnu se nepodařilo uložit.')
      throw e
    }
  }, [refetch])

  const remove = useCallback(async (id: string) => {
    setCalls((cur) => cur.filter((c) => c.id !== id))
    await deleteColdCall(id)
  }, [])

  return (
    <ColdCallsContext.Provider value={{ calls, loading, error, refetch, add, patch, remove }}>
      {children}
    </ColdCallsContext.Provider>
  )
}
