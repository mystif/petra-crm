import { useState, type ComponentType } from 'react'
import { Zap, Mail } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Automatizace } from './Automatizace'
import { Templates } from './Templates'

type Tab = 'automatizace' | 'sablony'

/** Marketing = Automatizace + Email Follow-up pod jednou střechou (záložky). */
export function Marketing(): JSX.Element {
  const [tab, setTab] = useState<Tab>('automatizace')
  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Marketing"
        subtitle="Automatizace a e-mailové follow-upy na jednom místě"
        showSearch={false}
      />

      {/* záložky */}
      <div className="sticky top-0 z-10 border-b border-line bg-canvas/80 px-4 backdrop-blur-xl md:px-8">
        <div className="flex gap-1">
          <TabBtn active={tab === 'automatizace'} onClick={() => setTab('automatizace')} icon={Zap}>Automatizace</TabBtn>
          <TabBtn active={tab === 'sablony'} onClick={() => setTab('sablony')} icon={Mail}>Email Follow-up</TabBtn>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'automatizace' ? <Automatizace embedded /> : <Templates embedded />}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, children }: {
  active: boolean; onClick: () => void; icon: ComponentType<{ className?: string }>; children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
        active ? 'border-brand-dark text-tx' : 'border-transparent text-tx-soft hover:text-tx'
      }`}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  )
}
