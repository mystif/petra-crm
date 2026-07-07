import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode
} from 'react'
import { supabase } from './supabase'
import { fetchDocuments, fetchDocumentLinks, type DocumentItem, type DocumentLink } from './documents'

interface DocumentsState {
  docs: DocumentItem[]
  links: DocumentLink[]
  loading: boolean
  refetch: () => Promise<void>
}

const DocumentsContext = createContext<DocumentsState | null>(null)

export function useDocuments(): DocumentsState {
  const ctx = useContext(DocumentsContext)
  if (!ctx) throw new Error('useDocuments musí být uvnitř DocumentsProvider')
  return ctx
}

export function DocumentsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [links, setLinks] = useState<DocumentLink[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const [d, l] = await Promise.all([fetchDocuments(), fetchDocumentLinks()])
      setDocs(d); setLinks(l)
    } catch {
      setDocs([]); setLinks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    const ch = supabase
      .channel('rt-dokumenty')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dokumenty' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dokument_vazby' }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  return (
    <DocumentsContext.Provider value={{ docs, links, loading, refetch }}>
      {children}
    </DocumentsContext.Provider>
  )
}
