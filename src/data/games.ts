export type GameSlug =
  | 'gta-6'
  | 'gta-online'
  | 'gta-5'
  | 'gta-4'
  | 'gta-san-andreas'
  | 'gta-vice-city'
  | 'gta-3'
  | 'allgemein';

export interface Game {
  slug: GameSlug;
  name: string;
  full: string;
  numeral: string;
  year: number;
  setting: string;
  heroes: string;
  platforms: string;
  tagline: string;
  intro: string;
  from: string;
  to: string;
  keywords: string[];
  en?: { setting: string; heroes: string; tagline: string; intro: string };
}

export const GAMES: Game[] = [
  {
    slug: 'gta-6',
    name: 'GTA VI',
    full: 'Grand Theft Auto VI',
    numeral: 'VI',
    year: 2026,
    setting: 'Leonida, Vice City (Gegenwart)',
    heroes: 'Lucia Caminos & Jason Duval',
    platforms: 'PS5, Xbox Series X|S',
    tagline: 'Leonida ruft. Vice City wartet.',
    intro:
      'Alles zu GTA 6: Release am 19. November 2026, Map von Leonida, Lucia und Jason, Tipps zum Start und jede bestätigte News, sobald sie raus ist.',
    from: '#ff2d87',
    to: '#ff8a1f',
    keywords: ['GTA 6', 'GTA VI', 'Leonida', 'Vice City'],
    en: { setting: 'Leonida, Vice City (present day)', heroes: 'Lucia Caminos & Jason Duval', tagline: 'Leonida is calling. Vice City is waiting.', intro: 'Everything on GTA 6: release on November 19, 2026, the map of Leonida, Lucia and Jason, launch tips and every confirmed story the moment it drops.' },
  },
  {
    slug: 'gta-online',
    name: 'GTA Online',
    full: 'Grand Theft Auto Online',
    numeral: 'ON',
    year: 2013,
    setting: 'Los Santos & Blaine County',
    heroes: 'Dein eigener Charakter',
    platforms: 'PC, PlayStation, Xbox',
    tagline: 'Jede Woche neue Boni. Wir sagen dir, welche sich lohnen.',
    intro:
      'GTA Online Weekly Updates, die besten Methoden zum Geld verdienen, Heist-Guides und alles, was sich vor und nach GTA 6 lohnt.',
    from: '#2bd96b',
    to: '#0fa3a3',
    keywords: ['GTA Online', 'Weekly Update', 'Geld verdienen'],
    en: { setting: 'Los Santos & Blaine County', heroes: 'Your own character', tagline: 'New bonuses every week. We tell you which ones are worth it.', intro: 'GTA Online weekly updates, the best ways to make money, heist guides and everything worth doing before and after GTA 6.' },
  },
  {
    slug: 'gta-5',
    name: 'GTA V',
    full: 'Grand Theft Auto V',
    numeral: 'V',
    year: 2013,
    setting: 'Los Santos & Blaine County',
    heroes: 'Michael, Franklin & Trevor',
    platforms: 'PS5, Xbox Series X|S, PC, PS4, Xbox One, PS3, Xbox 360',
    tagline: 'Drei Gangster, ein Los Santos, unendlich Geheimnisse.',
    intro:
      'Alle GTA 5 Cheats für PC, Handy und Konsole, geheime Orte, Easter Eggs, das UFO-Rätsel vom Mount Chiliad und Tipps für 100 %.',
    from: '#19e3c8',
    to: '#1a7bff',
    keywords: ['GTA 5', 'GTA V', 'GTA 5 Cheats', 'Los Santos'],
    en: { setting: 'Los Santos & Blaine County', heroes: 'Michael, Franklin & Trevor', tagline: 'Three criminals, one Los Santos, endless secrets.', intro: 'Every GTA 5 cheat for PC, phone and console, secret locations, easter eggs, the Mount Chiliad UFO mystery and tips for 100% completion.' },
  },
  {
    slug: 'gta-4',
    name: 'GTA IV',
    full: 'Grand Theft Auto IV',
    numeral: 'IV',
    year: 2008,
    setting: 'Liberty City',
    heroes: 'Niko Bellic',
    platforms: 'PS3, Xbox 360, PC',
    tagline: 'Liberty City. Grau, rau, legendär.',
    intro:
      'GTA 4 Handy-Cheats, Tauben-Fundorte, Tipps für Liberty City und alles über Niko Bellic, Lost and Damned und Ballad of Gay Tony.',
    from: '#8aa4c8',
    to: '#3a4a63',
    keywords: ['GTA 4', 'GTA IV', 'Liberty City', 'Niko Bellic'],
    en: { setting: 'Liberty City', heroes: 'Niko Bellic', tagline: 'Liberty City. Grey, gritty, legendary.', intro: 'GTA 4 phone cheats, pigeon locations, Liberty City tips and everything about Niko Bellic, The Lost and Damned and The Ballad of Gay Tony.' },
  },
  {
    slug: 'gta-san-andreas',
    name: 'GTA San Andreas',
    full: 'Grand Theft Auto: San Andreas',
    numeral: 'SA',
    year: 2004,
    setting: 'San Andreas, 1992',
    heroes: 'Carl „CJ“ Johnson',
    platforms: 'PS2, PC, Xbox, Definitive Edition',
    tagline: 'Grove Street, HESOYAM und Legenden. Der Klassiker.',
    intro:
      'Alle GTA San Andreas Cheats (HESOYAM & Co.), Mythen, Easter Eggs, Geld-Tipps und versteckte Orte in Los Santos, San Fierro und Las Venturas.',
    from: '#3ddc5a',
    to: '#f5d63d',
    keywords: ['GTA San Andreas', 'San Andreas Cheats', 'HESOYAM'],
    en: { setting: 'San Andreas, 1992', heroes: 'Carl "CJ" Johnson', tagline: 'Grove Street, HESOYAM and legends. The classic.', intro: 'Every GTA San Andreas cheat (HESOYAM and co.), myths, easter eggs, money tips and hidden places in Los Santos, San Fierro and Las Venturas.' },
  },
  {
    slug: 'gta-vice-city',
    name: 'GTA Vice City',
    full: 'Grand Theft Auto: Vice City',
    numeral: 'VC',
    year: 2002,
    setting: 'Vice City, 1986',
    heroes: 'Tommy Vercetti',
    platforms: 'PS2, PC, Xbox, Definitive Edition',
    tagline: 'Neon, Miami-Vibes, 80er. Das Original.',
    intro:
      'Alle GTA Vice City Cheats, versteckte Pakete, Easter Eggs und Tipps. Plus: was GTA 6 aus dem alten Vice City übernimmt.',
    from: '#ff4fd8',
    to: '#33e6ff',
    keywords: ['GTA Vice City', 'Vice City Cheats'],
    en: { setting: 'Vice City, 1986', heroes: 'Tommy Vercetti', tagline: 'Neon, Miami vibes, the 80s. The original.', intro: 'Every GTA Vice City cheat, hidden packages, easter eggs and tips. Plus: what GTA 6 takes from the original Vice City.' },
  },
  {
    slug: 'gta-3',
    name: 'GTA III',
    full: 'Grand Theft Auto III',
    numeral: 'III',
    year: 2001,
    setting: 'Liberty City',
    heroes: 'Claude',
    platforms: 'PS2, PC, Xbox, Definitive Edition',
    tagline: 'Der Anfang von allem in 3D.',
    intro: 'Alle GTA 3 Cheats, Geheimnisse und Tipps zum Klassiker, der Open-World-Spiele für immer verändert hat.',
    from: '#f5c518',
    to: '#9a7b2f',
    keywords: ['GTA 3', 'GTA III', 'GTA 3 Cheats'],
    en: { setting: 'Liberty City', heroes: 'Claude', tagline: 'Where it all began in 3D.', intro: 'Every GTA 3 cheat, secret and tip for the classic that changed open-world games forever.' },
  },
];

export const ALLGEMEIN: Game = {
  slug: 'allgemein',
  name: 'GTA',
  full: 'Grand Theft Auto',
  numeral: 'GTA',
  year: 1997,
  setting: '',
  heroes: '',
  platforms: '',
  tagline: '',
  intro: '',
  from: '#8b3dff',
  to: '#ff2d87',
  keywords: [],
};

export const GAME_SLUGS = [...GAMES.map((g) => g.slug), 'allgemein'] as [GameSlug, ...GameSlug[]];

export function getGame(slug: string): Game {
  return GAMES.find((g) => g.slug === slug) ?? ALLGEMEIN;
}

/** Spiel mit Texten in der gewuenschten Sprache */
export function gameL(g: Game, lang: 'de' | 'en'): Game {
  return lang === 'en' && g.en ? { ...g, ...g.en } : g;
}
