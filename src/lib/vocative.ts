// Skloňování křestního jména do 5. pádu (oslovení) pro e-maily.
// Čeština má spoustu výjimek — časté jméno řeší přímo mapa, zbytek obecná pravidla.

const EXCEPTIONS: Record<string, string> = {
  // mužská
  petr: 'Petře', pavel: 'Pavle', karel: 'Karle', marek: 'Marku', radek: 'Radku',
  zdeněk: 'Zdeňku', jan: 'Jane', honza: 'Honzo', tomáš: 'Tomáši', lukáš: 'Lukáši',
  aleš: 'Aleši', ondřej: 'Ondřeji', matěj: 'Matěji', michal: 'Michale', david: 'Davide',
  martin: 'Martine', jiří: 'Jiří', josef: 'Josefe', pepa: 'Pepo', václav: 'Václave',
  filip: 'Filipe', adam: 'Adame', vojtěch: 'Vojtěchu', daniel: 'Danieli', dominik: 'Dominiku',
  patrik: 'Patriku', robert: 'Roberte', roman: 'Romane', štěpán: 'Štěpáne', libor: 'Libore',
  miroslav: 'Miroslave', stanislav: 'Stanislave', vladimír: 'Vladimíre', jakub: 'Jakube',
  kuba: 'Kubo', ivan: 'Ivane', igor: 'Igore', oldřich: 'Oldřichu', bohuslav: 'Bohuslave',
  // ženská (kde pravidlo nestačí)
  dagmar: 'Dagmar', ingrid: 'Ingrid', miriam: 'Miriam'
}

export function vocative(name: string | null | undefined): string {
  if (!name) return ''
  const first = name.trim().split(/\s+/)[0]
  if (!first) return ''
  const key = first.toLowerCase()
  if (EXCEPTIONS[key]) return EXCEPTIONS[key]

  const last = first.slice(-1).toLowerCase()
  const base = first.slice(0, -1)

  // ženská na -a → -o (Petra→Petro, Jana→Jano)
  if (last === 'a') return base + 'o'
  // končí samohláskou (Marie, Lucie, Jiří, Bára-ne…) → beze změny
  if ('eěiíouůy'.includes(last)) return first
  // měkké/sykavé souhlásky → +i (Tomáš→Tomáši, Ondřej→Ondřeji)
  if ('šžčřcszj'.includes(last)) return first + 'i'
  // tvrdé souhlásky → +e (David→Davide, Robert→Roberte)
  return first + 'e'
}
