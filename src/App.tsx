import { useState } from 'react'
import { Sidebar, type Page } from './components/Sidebar'
import { MobileNav } from './components/MobileNav'
import { MaklerCard } from './components/MaklerCard'
import { LeadsProvider } from './lib/leadsContext'
import { EventsProvider } from './lib/eventsContext'
import { MaklerProvider } from './lib/maklerContext'
import { LeadDetailProvider } from './lib/leadDetailContext'
import { NewLeadProvider } from './lib/newLeadContext'
import { SearchProvider } from './lib/searchContext'
import { Dashboard } from './pages/Dashboard'
import { Pipeline } from './pages/Pipeline'
import { Leads, type LeadsFilter } from './pages/Leads'
import { Contacts } from './pages/Contacts'
import { Tasks } from './pages/Tasks'
import { Calendar } from './pages/Calendar'
import { Automatizace } from './pages/Automatizace'
import { Templates } from './pages/Templates'

export default function App(): JSX.Element {
  const [page, setPage] = useState<Page>('dashboard')
  const [leadsFilter, setLeadsFilter] = useState<LeadsFilter>('vse')
  const [agentOpen, setAgentOpen] = useState(false)
  const openAgent = (): void => setAgentOpen(true)

  // Navigace s volitelným „ohniskem" — banner follow-upu rovnou nastaví filtr Poptávek.
  const go = (p: Page, focus?: LeadsFilter): void => {
    setPage(p)
    if (p === 'leads') setLeadsFilter(focus ?? 'vse')
  }

  return (
    <LeadsProvider>
      <EventsProvider>
      <MaklerProvider>
      <LeadDetailProvider>
      <NewLeadProvider>
      <SearchProvider>
      <div className="flex h-screen overflow-hidden bg-canvas">
        <Sidebar current={page} onNavigate={go} onOpenAgent={openAgent} />
        <main className="flex-1 overflow-hidden pb-[72px] md:pb-0">
          {page === 'dashboard' && <Dashboard onNavigate={go} />}
          {page === 'pipeline' && <Pipeline />}
          {page === 'leads' && <Leads filter={leadsFilter} onFilter={setLeadsFilter} />}
          {page === 'contacts' && <Contacts />}
          {page === 'tasks' && <Tasks />}
          {page === 'calendar' && <Calendar />}
          {page === 'automatizace' && <Automatizace />}
          {page === 'templates' && <Templates />}
        </main>
        <MobileNav current={page} onNavigate={go} onOpenAgent={openAgent} />
      </div>
      <MaklerCard open={agentOpen} onClose={() => setAgentOpen(false)} />
      </SearchProvider>
      </NewLeadProvider>
      </LeadDetailProvider>
      </MaklerProvider>
      </EventsProvider>
    </LeadsProvider>
  )
}
