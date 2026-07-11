import {
  LayoutGrid,
  KanbanSquare,
  Inbox,
  Users,
  Building2,
  FolderOpen,
  CheckSquare,
  CalendarDays,
  Megaphone,
  Settings,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import { Modal } from './Modal'
import { useHelp } from '../lib/helpContext'

interface Section {
  icon: LucideIcon
  title: string
  text: string
}

const SECTIONS: Section[] = [
  {
    icon: LayoutGrid,
    title: 'Dashboard',
    text: 'První obrazovka po přihlášení. Vidíš tu, co dnes potřebuješ udělat, kolik jsi tento měsíc vydělala a jak si vedou tvoje obchody.'
  },
  {
    icon: Inbox,
    title: 'Poptávky',
    text: 'Sem padají noví zájemci — z webu petrazabranska.com, z realitních portálů, nebo je sem ručně přidáš sama. Modrý pruh vlevo znamená, že poptávka přišla z webu.'
  },
  {
    icon: KanbanSquare,
    title: 'Pipeline',
    text: 'Přehled všech rozjednaných obchodů podle fáze — Nový, Kontaktován, Schůzka, Nabídka, Uzavřeno. Kartu obchodu přetáhneš myší do další fáze, jak postupuješ.'
  },
  {
    icon: Users,
    title: 'Kontakty',
    text: 'Adresář všech lidí, se kterými jsi někdy jednala — klienti, doporučitelé. Telefon, e-mail a historie na jednom místě.'
  },
  {
    icon: Building2,
    title: 'Nemovitosti',
    text: 'Nabízené byty, domy a pozemky. U každé je semafor „Online / Koncept" — dokud ho ručně nepřepneš na Online, nemovitost se na webu nezobrazí.'
  },
  {
    icon: FolderOpen,
    title: 'Dokumenty',
    text: 'Smlouvy, PENB, plné moci a další soubory. Každý dokument je propojený s klientem, nemovitostí nebo obchodem, takže ho vždy najdeš na správném místě.'
  },
  {
    icon: CheckSquare,
    title: 'Úkoly',
    text: 'Seznam telefonátů, schůzek a věcí k vyřízení. Co je po termínu, se zvýrazní červeně.'
  },
  {
    icon: CalendarDays,
    title: 'Kalendář',
    text: 'Stejné události jako v Úkolech, ale v kalendáři. Dá se propojit s kalendářem na iPhonu (v Profilu makléře).'
  },
  {
    icon: Megaphone,
    title: 'Marketing',
    text: 'Automatizace (věci, co CRM dělá samo — třeba vytvoří kontakt k novému leadu) a e-mailové šablony, které používáš při psaní klientům.'
  },
  {
    icon: Settings,
    title: 'Nastavení',
    text: 'Konfigurace CRM — třeba za kolik dní se má lead připomenout v jednotlivých fázích. Postupně tu přibydou další možnosti.'
  }
]

export function HelpModal(): JSX.Element {
  const { open, closeHelp } = useHelp()

  return (
    <Modal open={open} size="xl" title="Podpora a nápověda" subtitle="Jak CRM funguje a kde co najdeš" onClose={closeHelp}>
      <div className="space-y-6 text-sm text-tx-soft">
        {/* úvod */}
        <div className="relative overflow-hidden rounded-2xl text-white shadow-lift">
          <div className="absolute inset-0 aurora" />
          <div className="absolute inset-0 grain opacity-[0.07] mix-blend-overlay" />
          <div className="relative flex items-start gap-4 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-gold ring-1 ring-white/15">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold">Jak to celé funguje</h3>
              <p className="mt-1 text-sm text-white/70">
                Nový zájemce napíše na webu nebo zavolá → objeví se v <b className="text-white">Poptávkách</b>. Otevřeš ho a založíš
                z něj obchod, který dál posouváš v <b className="text-white">Pipeline</b> — od prvního kontaktu až po podpis smlouvy.
                Kontakt, dokumenty i schůzky k obchodu se drží pohromadě, takže je vždycky najdeš na jednom místě.
              </p>
            </div>
          </div>
        </div>

        {/* kde co najdu */}
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-tx-faint">Kde co najdeš</div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.title} className="flex items-start gap-3 rounded-xl border border-line p-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-canvas text-tx-soft">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-tx">{s.title}</div>
                    <div className="text-xs text-tx-soft">{s.text}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* základní pojmy */}
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-tx-faint">Pár pojmů, ať se v tom neztratíš</div>
          <ul className="space-y-2 rounded-xl border border-line p-4">
            <li>
              <b className="text-tx">Fáze obchodu</b> — Nový → Kontaktován → Schůzka → Nabídka → Uzavřeno (nebo Ztracený).
              Podle toho, jak s klientem postupuješ, přetáhneš kartu v Pipeline dál.
            </li>
            <li>
              <b className="text-tx">Role klienta</b> — u každého obchodu je vidět, jestli je klient Prodávající, Nakupující,
              Pronajímatel nebo Nájemce.
            </li>
            <li>
              <b className="text-tx">Follow-up</b> — termín „kdy se ozvat". CRM ho umí sám navrhnout podle fáze (nastavíš v
              Nastavení → Follow-up), ale klidně ho můžeš kdykoliv změnit ručně.
            </li>
            <li>
              <b className="text-tx">Provize</b> — zapíšeš celkovou (hrubou) provizi z obchodu, CRM z ní sám spočítá tvůj reálný
              výdělek po odečtení podílu kanceláře (výchozí 50 %).
            </li>
          </ul>
        </div>

        {/* rychlé tipy */}
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li><b className="text-tx">Nový lead</b> přidáš tlačítkem vlevo nahoře.</li>
          <li><b className="text-tx">Vyhledávání</b> otevřeš klávesou <kbd className="rounded bg-canvas px-1 text-xs">⌘K</kbd>.</li>
          <li>Klikni na jméno klienta kdekoliv v CRM — otevře se ti jeho detail, historie a psaní e-mailu.</li>
        </ul>

        <p className="border-t border-line pt-4">
          Potřebuješ pomoc nebo úpravu?{' '}
          <a className="font-semibold text-brand-dark hover:underline" href="mailto:jirka.zabransky@gmail.com?subject=Petra%20CRM%20%E2%80%93%20podpora">
            Napiš na podporu
          </a>.
        </p>
      </div>
    </Modal>
  )
}
