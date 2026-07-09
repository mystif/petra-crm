import { Topbar } from '../components/Topbar'
import { FollowUpSettingsCard } from '../components/FollowUpSettingsCard'

export function Settings(): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <Topbar title="Nastavení" subtitle="Konfigurace chování CRM." showSearch={false} />
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <FollowUpSettingsCard />
          {/* další sekce nastavení se přidávají sem jako další karty */}
        </div>
      </div>
    </div>
  )
}
