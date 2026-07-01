import { Avatar } from './Avatar'
import { useMakler } from '../lib/maklerContext'

/** Horní lišta jen pro mobil — logo vlevo, kruhový profil makléře vpravo (barva sidebaru). */
export function MobileTopBar(): JSX.Element {
  const { makler, avatarUrl, openAgent } = useMakler()
  return (
    <header className="bg-[#0D0D0D] md:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div
        className="flex h-14 items-center justify-between"
        style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
      >
        <img src="./logo-mobil.png" alt="AUREA — Real Estate CRM" className="h-[38px] w-auto object-contain" />
        <button onClick={openAgent} aria-label="Profil makléře" className="rounded-full ring-2 ring-gold/60 transition active:scale-95">
          <Avatar name={makler?.name || 'Petra Zábranská'} src={avatarUrl} size={38} />
        </button>
      </div>
    </header>
  )
}
