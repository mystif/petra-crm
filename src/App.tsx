import { useState } from 'react'
import { Sidebar, type Page } from './components/Sidebar'
import { LeadsProvider } from './lib/leadsContext'
import { Dashboard } from './pages/Dashboard'
import { Pipeline } from './pages/Pipeline'
import { Leads } from './pages/Leads'
import { Contacts } from './pages/Contacts'

export default function App(): JSX.Element {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <LeadsProvider>
      <div className="flex h-screen overflow-hidden bg-canvas">
        <Sidebar current={page} onNavigate={setPage} />
        <main className="flex-1 overflow-hidden">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'pipeline' && <Pipeline />}
          {page === 'leads' && <Leads />}
          {page === 'contacts' && <Contacts />}
        </main>
      </div>
    </LeadsProvider>
  )
}
