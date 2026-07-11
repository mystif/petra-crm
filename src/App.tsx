import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Sidebar, type Page } from './components/Sidebar'
import { MobileNav } from './components/MobileNav'
import { MobileTopBar } from './components/MobileTopBar'
import { MaklerCard } from './components/MaklerCard'
import { HelpModal } from './components/HelpModal'
import { Login } from './components/Login'
import { AuthProvider, useAuth } from './lib/authContext'
import { LeadsProvider } from './lib/leadsContext'
import { EventsProvider } from './lib/eventsContext'
import { ListingsProvider } from './lib/listingsContext'
import { ContactsProvider } from './lib/contactsContext'
import { DocumentsProvider } from './lib/documentsContext'
import { MaklerProvider } from './lib/maklerContext'
import { LeadDetailProvider } from './lib/leadDetailContext'
import { NewLeadProvider } from './lib/newLeadContext'
import { SearchProvider } from './lib/searchContext'
import { HelpProvider } from './lib/helpContext'
import { Dashboard } from './pages/Dashboard'
import { Pipeline } from './pages/Pipeline'
import { Leads, type LeadsFilter } from './pages/Leads'
import { Contacts } from './pages/Contacts'
import { Tasks } from './pages/Tasks'
import { Calendar } from './pages/Calendar'
import { Nemovitosti } from './pages/Nemovitosti'
import { Documents } from './pages/Documents'
import { Marketing } from './pages/Marketing'
import { Settings } from './pages/Settings'

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

/** Brána přihlášení — bez session ukáže Login, data se načítají až po přihlášení. */
function AuthGate(): JSX.Element {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-canvas">
        <Loader2 className="h-7 w-7 animate-spin text-brand-dark" />
      </div>
    )
  }
  if (!session) return <Login />
  return <CRMApp />
}

function CRMApp(): JSX.Element {
  const [page, setPage] = useState<Page>('dashboard')
  const [leadsFilter, setLeadsFilter] = useState<LeadsFilter>('vse')

  // Navigace s volitelným „ohniskem" — banner follow-upu rovnou nastaví filtr Poptávek.
  const go = (p: Page, focus?: LeadsFilter): void => {
    setPage(p)
    if (p === 'leads') setLeadsFilter(focus ?? 'vse')
  }

  return (
    <LeadsProvider>
      <EventsProvider>
      <ListingsProvider>
      <ContactsProvider>
      <DocumentsProvider>
      <MaklerProvider>
      <LeadDetailProvider>
      <NewLeadProvider>
      <SearchProvider>
      <HelpProvider>
      <div className="flex h-[100dvh] overflow-hidden bg-canvas">
        <Sidebar current={page} onNavigate={go} />
        <main className="flex flex-1 flex-col overflow-hidden pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0">
          <MobileTopBar />
          <div className="min-h-0 flex-1">
            {page === 'dashboard' && <Dashboard onNavigate={go} />}
            {page === 'pipeline' && <Pipeline />}
            {page === 'leads' && <Leads filter={leadsFilter} onFilter={setLeadsFilter} />}
            {page === 'contacts' && <Contacts />}
            {page === 'properties' && <Nemovitosti />}
            {page === 'documents' && <Documents />}
            {page === 'tasks' && <Tasks />}
            {page === 'calendar' && <Calendar />}
            {page === 'marketing' && <Marketing />}
            {page === 'settings' && <Settings />}
          </div>
        </main>
        <MobileNav current={page} onNavigate={go} />
      </div>
      <MaklerCard />
      <HelpModal />
      </HelpProvider>
      </SearchProvider>
      </NewLeadProvider>
      </LeadDetailProvider>
      </MaklerProvider>
      </DocumentsProvider>
      </ContactsProvider>
      </ListingsProvider>
      </EventsProvider>
    </LeadsProvider>
  )
}
