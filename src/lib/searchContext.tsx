import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { SearchPalette } from '../components/SearchPalette'

interface SearchApi {
  openSearch: () => void
}

const SearchContext = createContext<SearchApi | null>(null)

export function useSearch(): SearchApi {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch musí být uvnitř SearchProvider')
  return ctx
}

/** Globální vyhledávací paleta + klávesová zkratka ⌘K / Ctrl+K. */
export function SearchProvider({ children }: { children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <SearchContext.Provider value={{ openSearch: () => setOpen(true) }}>
      {children}
      <SearchPalette open={open} onClose={() => setOpen(false)} />
    </SearchContext.Provider>
  )
}
