import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode
} from 'react'
import { supabase } from './supabase'
import { fetchSavedContacts, type SavedContact } from './contacts'

interface ContactsState {
  contacts: SavedContact[]
  loading: boolean
  refetch: () => Promise<void>
}

const ContactsContext = createContext<ContactsState | null>(null)

export function useContacts(): ContactsState {
  const ctx = useContext(ContactsContext)
  if (!ctx) throw new Error('useContacts musí být uvnitř ContactsProvider')
  return ctx
}

export function ContactsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [contacts, setContacts] = useState<SavedContact[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      setContacts(await fetchSavedContacts())
    } catch {
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    const ch = supabase
      .channel('rt-kontakty')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kontakty' }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  return (
    <ContactsContext.Provider value={{ contacts, loading, refetch }}>
      {children}
    </ContactsContext.Provider>
  )
}
