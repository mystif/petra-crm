import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode
} from 'react'
import {
  fetchListings, createListing, updateListing, deleteListing,
  type Listing, type ListingInput
} from './listings'

interface ListingsState {
  listings: Listing[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (input: ListingInput) => Promise<Listing>
  patch: (id: string, patch: ListingInput) => Promise<void>
  remove: (id: string) => Promise<void>
}

const ListingsContext = createContext<ListingsState | null>(null)

export function useListings(): ListingsState {
  const ctx = useContext(ListingsContext)
  if (!ctx) throw new Error('useListings musí být uvnitř ListingsProvider')
  return ctx
}

export function ListingsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      setListings(await fetchListings())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodařilo se načíst nemovitosti.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const add = useCallback(async (input: ListingInput) => {
    const created = await createListing(input)
    setListings((cur) => [created, ...cur])
    return created
  }, [])

  const patch = useCallback(async (id: string, p: ListingInput) => {
    setListings((cur) => cur.map((l) => (l.id === id ? { ...l, ...p } : l)))
    try {
      await updateListing(id, p)
    } catch (e) {
      await refetch()
      setError(e instanceof Error ? e.message : 'Změnu se nepodařilo uložit.')
      throw e
    }
  }, [refetch])

  const remove = useCallback(async (id: string) => {
    setListings((cur) => cur.filter((l) => l.id !== id))
    await deleteListing(id)
  }, [])

  return (
    <ListingsContext.Provider value={{ listings, loading, error, refetch, add, patch, remove }}>
      {children}
    </ListingsContext.Provider>
  )
}
