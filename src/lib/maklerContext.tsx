import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { fetchMakler, type Makler } from './makler'
import { photoUrl } from './photos'

interface MaklerState {
  makler: Makler | null
  setMakler: (m: Makler | null) => void
  refetch: () => Promise<void>
  /** Veřejná URL profilové fotky makléře, nebo null. */
  avatarUrl: string | null
}

const MaklerContext = createContext<MaklerState | null>(null)

export function useMakler(): MaklerState {
  const ctx = useContext(MaklerContext)
  if (!ctx) throw new Error('useMakler musí být uvnitř MaklerProvider')
  return ctx
}

export function MaklerProvider({ children }: { children: ReactNode }): JSX.Element {
  const [makler, setMakler] = useState<Makler | null>(null)

  const refetch = useCallback(async () => {
    try {
      setMakler(await fetchMakler())
    } catch {
      setMakler(null)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const avatarUrl = makler?.photo_path ? photoUrl(makler.photo_path) : null

  return (
    <MaklerContext.Provider value={{ makler, setMakler, refetch, avatarUrl }}>
      {children}
    </MaklerContext.Provider>
  )
}
