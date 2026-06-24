import { createContext, useContext, useState, type ReactNode } from 'react'
import { LeadDetail } from '../components/LeadDetail'
import type { Lead } from './supabase'

interface LeadDetailApi {
  openLead: (lead: Lead) => void
}

const LeadDetailContext = createContext<LeadDetailApi | null>(null)

export function useLeadDetail(): LeadDetailApi {
  const ctx = useContext(LeadDetailContext)
  if (!ctx) throw new Error('useLeadDetail musí být uvnitř LeadDetailProvider')
  return ctx
}

/** Globální detail leadu — otevíratelný odkudkoli (karty, hledání, notifikace). */
export function LeadDetailProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lead, setLead] = useState<Lead | null>(null)
  return (
    <LeadDetailContext.Provider value={{ openLead: setLead }}>
      {children}
      {lead && <LeadDetail key={lead.id} lead={lead} onClose={() => setLead(null)} />}
    </LeadDetailContext.Provider>
  )
}
