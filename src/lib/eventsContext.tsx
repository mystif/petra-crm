import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode
} from 'react'
import {
  fetchEvents, createEvent, updateEvent, deleteEvent,
  type EventItem, type EventInput
} from './events'

interface EventsState {
  events: EventItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (input: EventInput) => Promise<EventItem>
  patch: (id: string, patch: Partial<EventItem>) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

const EventsContext = createContext<EventsState | null>(null)

export function useEvents(): EventsState {
  const ctx = useContext(EventsContext)
  if (!ctx) throw new Error('useEvents musí být uvnitř EventsProvider')
  return ctx
}

export function EventsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await fetchEvents())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodařilo se načíst události.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const add = useCallback(async (input: EventInput) => {
    const created = await createEvent(input)
    setEvents((cur) => [...cur, created].sort((a, b) => a.start_at.localeCompare(b.start_at)))
    return created
  }, [])

  const patch = useCallback(async (id: string, p: Partial<EventItem>) => {
    setEvents((cur) => cur.map((e) => (e.id === id ? { ...e, ...p } : e)))
    try {
      await updateEvent(id, p)
    } catch (e) {
      await refetch()
      setError(e instanceof Error ? e.message : 'Změnu se nepodařilo uložit.')
      throw e
    }
  }, [refetch])

  const toggleDone = useCallback(async (id: string) => {
    setEvents((cur) => {
      const ev = cur.find((e) => e.id === id)
      if (ev) updateEvent(id, { done: !ev.done }).catch(() => refetch())
      return cur.map((e) => (e.id === id ? { ...e, done: !e.done } : e))
    })
  }, [refetch])

  const remove = useCallback(async (id: string) => {
    setEvents((cur) => cur.filter((e) => e.id !== id))
    await deleteEvent(id)
  }, [])

  return (
    <EventsContext.Provider value={{ events, loading, error, refetch, add, patch, toggleDone, remove }}>
      {children}
    </EventsContext.Provider>
  )
}
