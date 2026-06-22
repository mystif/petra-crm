import { createContext, useContext, useState, type ReactNode } from 'react'
import { NewLeadForm } from '../components/NewLeadForm'
import { useLeads } from './leadsContext'

interface NewLeadApi {
  open: () => void
}

const NewLeadContext = createContext<NewLeadApi | null>(null)

export function useNewLead(): NewLeadApi {
  const ctx = useContext(NewLeadContext)
  if (!ctx) throw new Error('useNewLead musí být uvnitř NewLeadProvider')
  return ctx
}

/** Poskytuje globální „Nový lead" formulář dostupný z libovolného tlačítka. */
export function NewLeadProvider({ children }: { children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState(false)
  const { refetch } = useLeads()

  return (
    <NewLeadContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <NewLeadForm
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false)
          refetch()
        }}
      />
    </NewLeadContext.Provider>
  )
}
