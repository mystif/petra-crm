import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface HelpState {
  open: boolean
  openHelp: () => void
  closeHelp: () => void
}

const HelpContext = createContext<HelpState | null>(null)

export function useHelp(): HelpState {
  const ctx = useContext(HelpContext)
  if (!ctx) throw new Error('useHelp musí být uvnitř HelpProvider')
  return ctx
}

export function HelpProvider({ children }: { children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState(false)
  const openHelp = useCallback(() => setOpen(true), [])
  const closeHelp = useCallback(() => setOpen(false), [])

  return <HelpContext.Provider value={{ open, openHelp, closeHelp }}>{children}</HelpContext.Provider>
}
