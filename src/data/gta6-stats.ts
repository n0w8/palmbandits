// =====================================================================
// "GTA 6 in Zahlen" / "GTA 6 by the numbers"
// Seiten: /gta-6-zahlen/ (DE) und /en/gta-6-stats/ (EN), beide aus src/pages/gta-6-zahlen.astro
//
// SO PFLEGST DU DIESE DATEI (Mensch oder Bot):
// 1. Zahl ändern: value (de + en), asOf (Stand) und src (Quellen-IDs aus SOURCES) anpassen.
// 2. Neue Quelle: Eintrag in SOURCES (name, short, url, date). date = Veröffentlichung bzw. Abrufdatum.
// 3. status ehrlich setzen:
//    'confirmed' = Hersteller, Plattform oder Primärquelle (Rockstar, Take-Two, Sony, Microsoft, Netflix, Guinness, Metacritic)
//    'reported'  = Medienbericht, nicht offiziell bestätigt
//    'estimate'  = Schätzung von Analysten/Marktforschern (z. B. Sensor Tower, Newzoo), Prognose
//    'pending'   = folgt noch (z. B. Metascore vor dem Test-Embargo)
//    'own'       = eigene Messung oder Rechnung von Palm Bandits
// 4. UPDATED auf den neuen Stand setzen und oben in CHANGELOG eine Zeile ergänzen.
// Keine langen Gedankenstriche in Texten, Bereiche mit "bis" schreiben.
// =====================================================================

export type L2 = { de: string; en: string };
export type Status = 'confirmed' | 'reported' | 'estimate' | 'pending' | 'own';

export const STATUS_LABEL: Record<Status, L2 & { hint: L2 }> = {
  confirmed: { de: 'Bestätigt', en: 'Confirmed', hint: { de: 'Rockstar, Take-Two, Sony, Microsoft, Netflix, Guinness oder Metacritic', en: 'Rockstar, Take-Two, Sony, Microsoft, Netflix, Guinness or Metacritic' } },
  reported: { de: 'Bericht', en: 'Reported', hint: { de: 'Medienbericht, nicht offiziell bestätigt', en: 'Media report, not officially confirmed' } },
  estimate: { de: 'Schätzung', en: 'Estimate', hint: { de: 'Analysten oder Marktforscher, keine offizielle Zahl', en: 'Analysts or market research, not an official figure' } },
  pending: { de: 'Folgt', en: 'Pending', hint: { de: 'Steht noch aus, wir tragen es nach', en: 'Not out yet, we will add it' } },
  own: { de: 'Eigene Messung', en: 'Own count', hint: { de: 'Von uns abgelesen oder berechnet', en: 'Read or calculated by us' } },
};

/** 'YYYY-MM-DD' -> 05.12.2023 / 5 Dec 2023, 'YYYY-MM' -> Dez. 2023 / Dec 2023 */
export function fmtDay(lang: 'de' | 'en', s: string): string {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  if (!d) return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'de-DE', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(dt);
  if (lang === 'en') return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(dt);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

export interface Source {
  name: string; // ausführlicher Name für die Quellenliste
  short: string; // kurzer Name für Tabellen und Kacheln
  url: string;
  date: string; // 'YYYY-MM-DD' oder 'YYYY-MM'
}

/** Letzte Aktualisierung der gesamten Seite (Europe/Berlin). */
export const UPDATED = '2026-11-18T06:10:00+01:00';
/** Erste Veröffentlichung der Seite. */
export const PUBLISHED = '2026-11-18T06:10:00+01:00';
export const GTA5_RELEASE = '2013-09-17';
export const GTA6_RELEASE_DAY = '2026-11-19';

// ---------------------------------------------------------------------
// QUELLEN
// ---------------------------------------------------------------------
export const SOURCES = {
  tt8k: { name: 'Take-Two: Ergebnisse 2. Quartal Geschäftsjahr 2027 (SEC Form 8-K)', short: 'Take-Two (8-K)', url: 'https://www.sec.gov/Archives/edgar/data/0000946581/000162828026072175/ttwo2q27earningsrelease.htm', date: '2026-11-09' },
  ttCall: { name: 'Take-Two Earnings Call Q2 GJ 2027, Transkript (The Motley Fool)', short: 'Take-Two (Call)', url: 'https://www.fool.com/earnings/call-transcripts/2026/11/10/take-two-ttwo-q2-2027-earnings-call-transcript/', date: '2026-11-09' },
  igSales: { name: 'Insider Gaming: GTA 5 bei rund 235 Mio., GTA-Reihe bei fast 480 Mio. Einheiten', short: 'Take-Two via Insider Gaming', url: 'https://insider-gaming.com/gta-5-sales-reach-235-million-copies-since-launch/', date: '2026-11-09' },
  outlookQ1: { name: 'Outlook Respawn: Take-Two Q1 GJ 2027, GTA V über 230 Mio., RDR2 über 87 Mio.', short: 'Take-Two via Outlook Respawn', url: 'https://respawn.outlookindia.com/gaming/gaming-news/gta-v-crosses-230m-sales-as-gta-vi-nears-release', date: '2026-08-09' },
  psBlog: { name: 'PlayStation Blog: Pre-Load von Grand Theft Auto VI auf PS5 startet heute', short: 'PlayStation Blog', url: 'https://blog.playstation.com/2026/11/10/pre-load-grand-theft-auto-vi-on-ps5-starting-today/', date: '2026-11-10' },
  xboxWire: { name: 'Xbox Wire: Grand Theft Auto VI kommt am 19. November in Xbox Cloud Gaming', short: 'Xbox Wire', url: 'https://news.xbox.com/en-us/2026/11/10/grand-theft-auto-6-comes-to-xbox-cloud-gaming-november-19/', date: '2026-11-10' },
  gameInformer: { name: 'Game Informer: GTA VI ist das meistvorbestellte Spiel bei PlayStation und Xbox', short: 'Game Informer', url: 'https://gameinformer.com/2026/11/10/surprising-literally-nobody-grand-theft-auto-vi-is-the-most-pre-ordered-game-in', date: '2026-11-10' },
  ggreconST: { name: 'GGRecon: Sensor Tower schätzt 7,71 Mio. Vorbestellungen', short: 'Sensor Tower via GGRecon', url: 'https://www.ggrecon.com/articles/gta-6-pre-orders-sensor-tower/', date: '2026-11-05' },
  tweaktownST: { name: 'TweakTown: Sensor Tower schätzt über 1 Mrd. US-Dollar und 10,3 Mio. Vorbestellungen', short: 'Sensor Tower via TweakTown', url: 'https://www.tweaktown.com/news/114626/gta-6-pre-orders-break-dollars1-billion-with-10-million-sales-analyst-firm-estimates/index.html', date: '2026-11-11' },
  cnbc: { name: 'CNBC: How Rockstar\'s GTA VI release could reshape gaming, streaming and even paid time off', short: 'CNBC', url: 'https://www.cnbc.com/2026/11/14/gta-6-grand-theft-auto-launch.html', date: '2026-11-14' },
  shackUltimate: { name: 'Shacknews: Fast 90 % der Vorbestellungen sind die Ultimate Edition (Sensor Tower)', short: 'Sensor Tower via Shacknews', url: 'https://www.shacknews.com/article/150356/grand-theft-auto-6-ultimate-preorder-percent', date: '2026-08-13' },
  wccPiper: { name: 'Wccftech: Piper Sandler erwartet über 45 Mio. verkaufte Einheiten zum Launch', short: 'Piper Sandler via Wccftech', url: 'https://wccftech.com/gta-6-45m-day-one-launch-sales/', date: '2026-06-16' },
  vgcNewzoo: { name: 'VGC: Newzoo sieht 37 bis 51 Mio. verkaufte Einheiten in der ersten Woche', short: 'Newzoo via VGC', url: 'https://videogameschronicle.com/news/analytics-firm-says-gta-6-has-the-strongest-pre-order-campaign-on-record-is-on-track-to-sell-37-51-million-in-its-first-week/', date: '2026-07-16' },
  igKonvoy: { name: 'Insider Gaming: Konvoy erwartet 7,6 Mrd. US-Dollar in den ersten 60 Tagen', short: 'Konvoy via Insider Gaming', url: 'https://insider-gaming.com/gta-6-make-7-billion-two-months-analyst-predict/', date: '2025-07-15' },
  gamesbeat800: { name: 'GamesBeat: GTA V setzt am ersten Tag 800 Mio. US-Dollar um', short: 'Take-Two via GamesBeat', url: 'https://gamesbeat.com/grand-theft-auto-v-sells-800m-worth-on-its-first-day/', date: '2013-09-18' },
  gamespot1b: { name: 'GameSpot: GTA V erreicht 1 Mrd. US-Dollar Umsatz in drei Tagen', short: 'Take-Two via GameSpot', url: 'https://gamespot.com/news/grand-theft-auto-v-sales-reach-1-billion-in-three-days-6414762/', date: '2013-09-20' },
  gamespotGuinness: { name: 'GameSpot: Guinness nennt 11,2 Mio. verkaufte GTA V am ersten Tag', short: 'Guinness via GameSpot', url: 'https://www.gamespot.com/news/guinness-claims-gtav-day-one-sales-total-112-million-copies-6415455', date: '2013-10-08' },
  ytT1: { name: 'YouTube, Rockstar Games: Grand Theft Auto VI Trailer 1 (Aufrufe abgelesen)', short: 'YouTube', url: 'https://www.youtube.com/watch?v=QdBZY2fkU-0', date: '2026-11-18' },
  ytT2: { name: 'YouTube, Rockstar Games: Grand Theft Auto VI Trailer 2 (Aufrufe abgelesen)', short: 'YouTube', url: 'https://www.youtube.com/watch?v=VQRLujxTm3c', date: '2026-11-18' },
  ytExt: { name: 'YouTube, Rockstar Games: Grand Theft Auto VI: An Extended Look (Aufrufe abgelesen)', short: 'YouTube', url: 'https://www.youtube.com/watch?v=tJbzMqJGH4k', date: '2026-11-18' },
  ytLaunch: { name: 'YouTube, Rockstar Games: Grand Theft Auto VI Launch Trailer (Aufrufe abgelesen)', short: 'YouTube', url: 'https://www.youtube.com/watch?v=rz1B4B2yBZY', date: '2026-11-18' },
  pushsquareT1: { name: 'Push Square: GTA 6 Trailer holt 90 Mio. Aufrufe in 24 Stunden und Guinness-Rekorde', short: 'Guinness via Push Square', url: 'https://pushsquare.com/news/2023/12/gta-6-trailer-pulls-90-million-views-in-24-hours-sets-new-world-records', date: '2023-12-06' },
  thrT2: { name: 'The Hollywood Reporter: GTA 6 Trailer 2 mit 475 Mio. Aufrufen in 24 Stunden', short: 'Rockstar via THR', url: 'https://www.hollywoodreporter.com/business/business-news/gta-6-trailer-2-views-record-1236210396/', date: '2025-05' },
  vgcNetflix: { name: 'VGC: Netflix meldet 31,1 Mio. Aufrufe für GTA VI: An Extended Look', short: 'Netflix via VGC', url: 'https://www.videogameschronicle.com/news/netflix-says-gta-6-an-extended-look-got-31-1-million-views-and-topped-its-charts-in-nearly-every-country/', date: '2026-09-02' },
  t4gLaunch: { name: 'Tech4Gamers: Launch-Trailer mit 51 Mio. Aufrufen in 4 Tagen', short: 'Tech4Gamers', url: 'https://tech4gamers.com/gta-6-launch-trailer-51-million-views-4-days/', date: '2026-10-20' },
  gtaintelPreload: { name: 'GTA Intel: Preload, Dateigröße und Startzeiten (nach Rockstar-FAQ)', short: 'Rockstar via GTA Intel', url: 'https://gtaintel.com/news/gta-6-preload-file-size-launch-times', date: '2026-11-04' },
  ggreconPatch: { name: 'GGRecon: GTA 6 bekommt Tage vor dem Launch Update 1.002', short: 'GGRecon', url: 'https://www.ggrecon.com/articles/gta-6-update-1-002-before-launch/', date: '2026-11-14' },
  cbPatch2: { name: 'ComicBook: Zweites GTA-6-Update 1.002.001 vor dem Release', short: 'ComicBook', url: 'https://comicbook.com/gaming/news/gta-6-grand-theft-auto-vi-rockstar-games-update-1-002-today-ps5-xbox/', date: '2026-11-16' },
  vgc30fps: { name: 'VGC: GTA 6 läuft zum Start mit 30 Bildern pro Sekunde', short: 'Rockstar via VGC', url: 'https://www.videogameschronicle.com/news/gta-6-is-confirmed-to-be-30-frames-per-second-at-launch-no-performance-mode-at-launch/', date: '2026-11-10' },
  pcghPrices: { name: 'PC Games Hardware: GTA 6 vorbestellen, 79,99 und 99,99 Euro sind offiziell', short: 'PCGH', url: 'https://www.pcgameshardware.de/GTA-6-Spiel-55239/News/GTA-6-vorbestellen-Standard-Ultimate-Edition-Europreise-1546282/', date: '2026-06-25' },
  techradarUK: { name: 'TechRadar: GTA 6 UK-Vorbestellungen und Preise', short: 'TechRadar', url: 'https://techradar.com/gaming/ps5/gta-6-uk-pre-orders-are-live-and-we-finally-have-a-price-heres-where-you-can-order-it-and-what-it-costs', date: '2026-06-25' },
  ocPreorder: { name: 'OpenCritic: Rockstar bestätigt Vorbestellungen ab 25. Juni', short: 'Rockstar via OpenCritic', url: 'https://opencritic.com/news/33245/rockstar-games-confirms-grand-theft-auto-vi-pre-orders-begin-june-25', date: '2026-06-18' },
  insiderEmbargo: { name: 'Insider Gaming: Wann das Test-Embargo für GTA 6 fällt', short: 'Insider Gaming', url: 'https://insider-gaming.com/grand-theft-auto-6-review-embargo/', date: '2026-11-17' },
  mcVI: { name: 'Metacritic: Grand Theft Auto VI (abgerufen)', short: 'Metacritic', url: 'https://www.metacritic.com/game/grand-theft-auto-vi/', date: '2026-11-18' },
  mcV: { name: 'Metacritic: Grand Theft Auto V (abgerufen)', short: 'Metacritic', url: 'https://www.metacritic.com/game/grand-theft-auto-v/', date: '2026-11-18' },
  mcIV: { name: 'Metacritic: Grand Theft Auto IV (abgerufen)', short: 'Metacritic', url: 'https://www.metacritic.com/game/grand-theft-auto-iv/', date: '2026-11-18' },
  mcRDR2: { name: 'Metacritic: Red Dead Redemption 2 (abgerufen)', short: 'Metacritic', url: 'https://www.metacritic.com/game/red-dead-redemption-2/', date: '2026-11-18' },
  vgtimesBloomberg: { name: 'VGTimes: Die wichtigsten Punkte aus Bloombergs GTA-6-Bericht (Jason Schreier)', short: 'Bloomberg via VGTimes', url: 'https://vgtimes.com/articles/171078-key-takeaways-from-bloomberg-gta6.html', date: '2026-10-14' },
  gtaintelGI: { name: 'GTA Intel: Game-Informer-Titelstory, Karte doppelt so groß wie GTA 5, über 170 Tierarten', short: 'Game Informer via GTA Intel', url: 'https://gtaintel.com/news/gta-6-game-informer-cover-story-new-details', date: '2026-09-29' },
  rockstarVI: { name: 'Rockstar Games: Offizielle Seite zu Grand Theft Auto VI', short: 'Rockstar Games', url: 'https://www.rockstargames.com/VI', date: '2026-11-18' },
  tr2022: { name: 'TechRadar: Rockstar bestätigt aktive Entwicklung des nächsten GTA', short: 'Rockstar via TechRadar', url: 'https://www.techradar.com/news/gta-6-is-in-active-development-and-well-underway-according-to-rockstar', date: '2022-02-04' },
  varietyLeak: { name: 'Variety: Rockstar bestätigt Hack und GTA-6-Leak', short: 'Variety', url: 'https://variety.com/2022/digital/news/grand-theft-auto-6-leak-rockstar-games-hack-1235376727', date: '2022-09-19' },
  vgc2023: { name: 'VGC: Erster GTA-6-Trailer kommt im Dezember', short: 'Rockstar via VGC', url: 'https://www.videogameschronicle.com/news/confirmed-the-first-grand-theft-auto-6-trailer-will-premier-next-month', date: '2023-11-08' },
  nlDelay: { name: 'Nintendo Life: GTA 6 verschoben auf 26. Mai 2026', short: 'Rockstar via Nintendo Life', url: 'https://www.nintendolife.com/news/2025/05/grand-theft-auto-6-has-been-delayed-and-will-now-launch-in-may-2026', date: '2025-05-02' },
  trDelay: { name: 'TechRadar: GTA 6 erneut verschoben, erscheint aber 2026', short: 'Rockstar via TechRadar', url: 'https://www.techradar.com/gaming/grand-theft-auto-6-delayed-again-but-itll-still-ship-in-2026', date: '2025-11-06' },
} satisfies Record<string, Source>;

export type SrcId = keyof typeof SOURCES;

export interface Stat {
  label: L2;
  value: L2;
  note?: L2;
  status: Status;
  asOf: string; // Stand der Zahl: 'YYYY-MM-DD' oder 'YYYY-MM'
  src: SrcId[];
}

// ---------------------------------------------------------------------
// KACHELN OBEN (große Zahlen)
// ---------------------------------------------------------------------
export interface Kpi {
  big: L2; // die große Zahl
  unit?: L2; // Einheit daneben
  label: L2;
  note?: L2;
  status: Status;
  asOf: string;
  src: SrcId[];
}

export const KPIS: Kpi[] = [
  {
    big: { de: '~235', en: '~235' }, unit: { de: 'Mio.', en: 'M' },
    label: { de: 'GTA V verkauft', en: 'GTA V copies sold' },
    note: { de: 'Laut Take-Two „fast 235 Mio.“ Einheiten weltweit', en: 'Take-Two: "nearly 235 million" units worldwide' },
    status: 'confirmed', asOf: '2026-09-30', src: ['ttCall'],
  },
  {
    big: { de: '12+', en: '12+' }, unit: { de: 'Mio.', en: 'M' },
    label: { de: 'GTA VI digital vorbestellt', en: 'GTA VI digital pre-orders' },
    note: { de: 'Schätzung von Sensor Tower bis 13.11., keine offizielle Zahl', en: 'Sensor Tower estimate through Nov 13, not an official figure' },
    status: 'estimate', asOf: '2026-11-13', src: ['cnbc'],
  },
  {
    big: { de: 'Nr. 1', en: 'No. 1' },
    label: { de: 'Vorbestell-Rekord bei PlayStation und Xbox', en: 'Pre-order record on PlayStation and Xbox' },
    note: { de: 'Meistvorbestelltes Spiel im PlayStation Store und im Microsoft Store', en: 'Most pre-ordered game ever on PlayStation Store and Microsoft Store' },
    status: 'confirmed', asOf: '2026-11-10', src: ['psBlog', 'xboxWire'],
  },
  {
    big: { de: '475', en: '475' }, unit: { de: 'Mio.', en: 'M' },
    label: { de: 'Aufrufe für Trailer 2 in 24 Std.', en: 'Trailer 2 views in 24 hours' },
    note: { de: 'Alle Plattformen zusammen, laut Rockstar', en: 'All platforms combined, per Rockstar' },
    status: 'confirmed', asOf: '2025-05', src: ['thrT2'],
  },
  {
    big: { de: '90,4', en: '90.4' }, unit: { de: 'Mio.', en: 'M' },
    label: { de: 'YouTube-Aufrufe für Trailer 1 in 24 Std.', en: 'Trailer 1 YouTube views in 24 hours' },
    note: { de: 'Guinness-Weltrekord für die meistgesehene Spiele-Enthüllung', en: 'Guinness World Record for most viewed video game reveal' },
    status: 'confirmed', asOf: '2023-12', src: ['pushsquareT1'],
  },
  {
    big: { de: '~480', en: '~480' }, unit: { de: 'Mio.', en: 'M' },
    label: { de: 'GTA-Reihe gesamt verkauft', en: 'GTA series copies sold' },
    note: { de: 'Alle GTA-Spiele zusammen, laut Take-Two', en: 'All GTA games combined, per Take-Two' },
    status: 'confirmed', asOf: '2026-09-30', src: ['igSales'],
  },
  {
    big: { de: '212', en: '212' }, unit: { de: 'GB', en: 'GB' },
    label: { de: 'Speicherplatz (maximal)', en: 'Storage needed (max)' },
    note: { de: 'Laut Rockstar „bis zu“, je nach Konsole', en: 'Rockstar: "up to", depending on device' },
    status: 'confirmed', asOf: '2026-11-04', src: ['gtaintelPreload'],
  },
  {
    big: { de: '79,99', en: '$79.99' }, unit: { de: '€', en: '' },
    label: { de: 'Standard Edition', en: 'Standard Edition (US)' },
    note: { de: 'Ultimate Edition: 99,99 €', en: 'Ultimate Edition: $99.99. In Europe €79.99 / €99.99' },
    status: 'confirmed', asOf: '2026-06-25', src: ['pcghPrices', 'xboxWire'],
  },
  {
    big: { de: '4.711', en: '4,711' },
    label: { de: 'Rockstar-Mitarbeiter', en: 'Rockstar employees' },
    note: { de: 'In 12 Büros, 2018 waren es 2.441', en: 'Across 12 offices, up from 2,441 in 2018' },
    status: 'reported', asOf: '2026-10-14', src: ['vgtimesBloomberg'],
  },
  {
    big: { de: 'folgt', en: 'TBA' },
    label: { de: 'Metascore', en: 'Metascore' },
    note: { de: 'Test-Embargo laut Berichten am 18.11. gegen 12 Uhr MEZ. GTA V hat 97.', en: 'Review embargo reportedly Nov 18, around 11:00 GMT. GTA V scored 97.' },
    status: 'pending', asOf: '2026-11-18', src: ['mcVI', 'insiderEmbargo'],
  },
];

// ---------------------------------------------------------------------
// VERKÄUFE & VORBESTELLUNGEN
// ---------------------------------------------------------------------
export const SALES: Stat[] = [
  {
    label: { de: 'Offizielle Verkaufszahl GTA VI', en: 'Official GTA VI sales figure' },
    value: { de: 'Noch keine. Take-Two will Zahlen nennen, „sobald wir Erfahrung nach dem Launch haben“', en: 'None yet. Take-Two will share numbers "as soon as we have some experience post launch"' },
    status: 'pending', asOf: '2026-11-09', src: ['ttCall'],
  },
  {
    label: { de: 'Rekord im PlayStation Store', en: 'PlayStation Store record' },
    value: { de: 'Meistvorbestelltes Spiel in der Geschichte des PlayStation Store', en: 'Most pre-ordered game in PlayStation Store history' },
    note: { de: 'Ohne Stückzahl', en: 'No unit count given' },
    status: 'confirmed', asOf: '2026-11-10', src: ['psBlog'],
  },
  {
    label: { de: 'Rekord im Microsoft Store', en: 'Microsoft Store record' },
    value: { de: 'Meistvorbestellter Titel aller Zeiten im Microsoft Store', en: 'Most pre-ordered title of all time on the Microsoft Store' },
    note: { de: 'Ohne Stückzahl', en: 'No unit count given' },
    status: 'confirmed', asOf: '2026-11-10', src: ['xboxWire'],
  },
  {
    label: { de: 'Take-Two zu den Vorbestellungen', en: 'Take-Two on pre-orders' },
    value: { de: 'Weit über den ursprünglichen Erwartungen, auf „beispiellosem“ Niveau', en: 'Far above initial expectations, at "unprecedented" levels' },
    status: 'confirmed', asOf: '2026-11-09', src: ['ttCall', 'tt8k'],
  },
  {
    label: { de: 'Vorbestellungen, Schätzung 05.11.', en: 'Pre-orders, estimate Nov 5' },
    value: { de: '7,71 Mio. digital, rund 751 Mio. US-Dollar', en: '7.71M digital, about $751M' },
    note: { de: 'Sensor Tower, nur digitale Konsolen-Vorbestellungen', en: 'Sensor Tower, digital console pre-orders only' },
    status: 'estimate', asOf: '2026-11-05', src: ['ggreconST'],
  },
  {
    label: { de: 'Vorbestellungen, Schätzung 11.11.', en: 'Pre-orders, estimate Nov 11' },
    value: { de: '10,31 Mio. nach Rückgaben, über 1 Mrd. US-Dollar', en: '10.31M net of returns, over $1B' },
    note: { de: 'Sensor Tower', en: 'Sensor Tower' },
    status: 'estimate', asOf: '2026-11-11', src: ['tweaktownST'],
  },
  {
    label: { de: 'Vorbestellungen, Schätzung 13.11.', en: 'Pre-orders, estimate Nov 13' },
    value: { de: 'über 12 Mio.', en: 'over 12M' },
    note: { de: 'Sensor Tower laut CNBC', en: 'Sensor Tower, per CNBC' },
    status: 'estimate', asOf: '2026-11-13', src: ['cnbc'],
  },
  {
    label: { de: 'Anteil PS5 / Xbox', en: 'PS5 / Xbox split' },
    value: { de: 'rund 75 % PS5, 25 % Xbox', en: 'about 75% PS5, 25% Xbox' },
    note: { de: 'Sensor Tower, digitale Vorbestellungen', en: 'Sensor Tower, digital pre-orders' },
    status: 'estimate', asOf: '2026-11-11', src: ['tweaktownST', 'ggreconST'],
  },
  {
    label: { de: 'Anteil Ultimate Edition', en: 'Ultimate Edition share' },
    value: { de: '89 % der Vorbestellungen', en: '89% of pre-orders' },
    note: { de: 'Sensor Tower, üblich sind 10 bis 20 %', en: 'Sensor Tower, typical premium share is 10 to 20%' },
    status: 'estimate', asOf: '2026-08-13', src: ['shackUltimate'],
  },
  {
    label: { de: 'Bisheriger Vorbestell-Rekord', en: 'Previous pre-order record' },
    value: { de: 'Cyberpunk 2077 mit über 8 Mio. (2020, laut CD Projekt)', en: 'Cyberpunk 2077 with over 8M (2020, per CD Projekt)' },
    status: 'reported', asOf: '2026-11-05', src: ['ggreconST'],
  },
  {
    label: { de: 'Take-Two-Prognose Geschäftsjahr bis März 2027', en: 'Take-Two outlook, fiscal year to March 2027' },
    value: { de: '8,0 bis 8,2 Mrd. US-Dollar Net Bookings', en: '$8.0 to $8.2B net bookings' },
    note: { de: 'Ganzer Konzern, nicht nur GTA VI', en: 'Whole company, not GTA VI alone' },
    status: 'confirmed', asOf: '2026-11-09', src: ['tt8k'],
  },
];

// ---------------------------------------------------------------------
// PROGNOSEN & ERWARTUNGEN (alles Schätzungen)
// ---------------------------------------------------------------------
export const FORECASTS: Stat[] = [
  {
    label: { de: 'Piper Sandler (Investmentbank)', en: 'Piper Sandler (investment bank)' },
    value: { de: 'über 45 Mio. Einheiten am Launch-Tag', en: 'over 45M units on launch day' },
    note: { de: 'Modell auf Basis von Reddit-Besuchern, bestes Ergebnis rund 46 Mio.', en: 'Model based on Reddit traffic, best estimate about 46M' },
    status: 'estimate', asOf: '2026-06-16', src: ['wccPiper'],
  },
  {
    label: { de: 'Newzoo (Marktforschung)', en: 'Newzoo (market research)' },
    value: { de: '37 bis 51 Mio. Einheiten in Woche 1, 3,25 bis 5,2 Mrd. US-Dollar', en: '37M to 51M units in week one, $3.25B to $5.2B' },
    status: 'estimate', asOf: '2026-07-16', src: ['vgcNewzoo'],
  },
  {
    label: { de: 'Morgan Stanley', en: 'Morgan Stanley' },
    value: { de: 'bis zu 40 Mio. Einheiten bis März 2027', en: 'up to 40M units by March 2027' },
    status: 'estimate', asOf: '2026-11-14', src: ['cnbc'],
  },
  {
    label: { de: 'Konvoy (Risikokapital)', en: 'Konvoy (venture capital)' },
    value: { de: '7,6 Mrd. US-Dollar und 85 Mio. Einheiten in 60 Tagen', en: '$7.6B and 85M units in 60 days' },
    note: { de: 'Annahme damals: 80 US-Dollar Preis, inklusive GTA+', en: 'Assumed an $80 price, including GTA+' },
    status: 'estimate', asOf: '2025-07-15', src: ['igKonvoy'],
  },
  {
    label: { de: 'Urlaubsanträge zum Launch (USA)', en: 'Time-off requests at launch (US)' },
    value: { de: 'rund 13 % mehr als an vergleichbaren Tagen 2024 und 2025', en: 'about 13% higher than comparable days in 2024 and 2025' },
    note: { de: 'Auswertung des HR-Anbieters BambooHR', en: 'Data from HR provider BambooHR' },
    status: 'reported', asOf: '2026-11-14', src: ['cnbc'],
  },
];

// ---------------------------------------------------------------------
// GTA V gegen GTA VI
// ---------------------------------------------------------------------
export interface Cell { value: L2; status: Status; src: SrcId[] }
export interface CompareRow { label: L2; v: Cell; vi: Cell }

const pend = (src: SrcId[] = []): Cell => ({ value: { de: 'folgt', en: 'TBA' }, status: 'pending', src });

export const COMPARE: CompareRow[] = [
  {
    label: { de: 'Release', en: 'Release' },
    v: { value: { de: '17.09.2013', en: '17 Sep 2013' }, status: 'confirmed', src: ['gamespot1b'] },
    vi: { value: { de: '19.11.2026', en: '19 Nov 2026' }, status: 'confirmed', src: ['tt8k'] },
  },
  {
    label: { de: 'Plattformen zum Start', en: 'Launch platforms' },
    v: { value: { de: 'PS3, Xbox 360', en: 'PS3, Xbox 360' }, status: 'confirmed', src: ['gamespot1b'] },
    vi: { value: { de: 'PS5, Xbox Series X|S', en: 'PS5, Xbox Series X|S' }, status: 'confirmed', src: ['tt8k'] },
  },
  {
    label: { de: 'Umsatz am ersten Tag', en: 'Day-one revenue' },
    v: { value: { de: '800 Mio. US-Dollar', en: '$800M' }, status: 'confirmed', src: ['gamesbeat800'] },
    vi: pend(),
  },
  {
    label: { de: '1 Mrd. US-Dollar Umsatz nach', en: '$1B revenue reached after' },
    v: { value: { de: '3 Tagen', en: '3 days' }, status: 'confirmed', src: ['gamespot1b'] },
    vi: pend(),
  },
  {
    label: { de: 'Verkauft in den ersten 24 Stunden', en: 'Sold in the first 24 hours' },
    v: { value: { de: '11,21 Mio. (Guinness)', en: '11.21M (Guinness)' }, status: 'confirmed', src: ['gamespotGuinness'] },
    vi: { value: { de: 'folgt (Prognosen: über 45 Mio.)', en: 'TBA (forecasts: over 45M)' }, status: 'pending', src: ['wccPiper'] },
  },
  {
    label: { de: 'Verkauft insgesamt', en: 'Sold to date' },
    v: { value: { de: 'fast 235 Mio. (Stand 30.09.2026)', en: 'nearly 235M (as of 30 Sep 2026)' }, status: 'confirmed', src: ['ttCall'] },
    vi: { value: { de: 'folgt (über 12 Mio. Vorbestellungen geschätzt)', en: 'TBA (over 12M pre-orders estimated)' }, status: 'pending', src: ['cnbc'] },
  },
  {
    label: { de: 'Metascore', en: 'Metascore' },
    v: { value: { de: '97', en: '97' }, status: 'confirmed', src: ['mcV'] },
    vi: pend(['mcVI']),
  },
  {
    label: { de: 'Launch-Trailer auf YouTube', en: 'Launch trailer on YouTube' },
    v: { value: { de: 'rund 34 Mio. Aufrufe', en: 'about 34M views' }, status: 'reported', src: ['t4gLaunch'] },
    vi: { value: { de: '82,5 Mio. Aufrufe in 34 Tagen', en: '82.5M views in 34 days' }, status: 'own', src: ['ytLaunch'] },
  },
];

/** Rockstar-Reihen im Überblick (Take-Two-Angaben, "sold-in" = an den Handel ausgeliefert bzw. digital verkauft). */
export const SERIES: Stat[] = [
  { label: { de: 'GTA-Reihe gesamt', en: 'GTA series total' }, value: { de: 'fast 480 Mio.', en: 'nearly 480M' }, status: 'confirmed', asOf: '2026-09-30', src: ['igSales'] },
  { label: { de: 'GTA V', en: 'GTA V' }, value: { de: 'fast 235 Mio.', en: 'nearly 235M' }, status: 'confirmed', asOf: '2026-09-30', src: ['ttCall'] },
  { label: { de: 'Red Dead Redemption 2', en: 'Red Dead Redemption 2' }, value: { de: 'über 87 Mio.', en: 'over 87M' }, status: 'confirmed', asOf: '2026-06-30', src: ['outlookQ1'] },
  { label: { de: 'Red-Dead-Reihe gesamt', en: 'Red Dead series total' }, value: { de: 'fast 116 Mio.', en: 'nearly 116M' }, status: 'confirmed', asOf: '2026-06-30', src: ['outlookQ1'] },
];

// ---------------------------------------------------------------------
// RELEASE, PREISE & TECHNIK
// ---------------------------------------------------------------------
export const RELEASE: Stat[] = [
  {
    label: { de: 'Release', en: 'Release' },
    value: { de: 'Donnerstag, 19.11.2026', en: 'Thursday, 19 November 2026' },
    status: 'confirmed', asOf: '2026-11-10', src: ['psBlog', 'tt8k'],
  },
  {
    label: { de: 'Start in Deutschland, Österreich, Schweiz', en: 'Unlock time' },
    value: { de: '19.11., 00:00 Uhr Ortszeit (Mitternacht)', en: '19 Nov, midnight local time in each country' },
    note: { de: 'Rollender Start nach Zeitzone', en: 'Rolling launch by time zone' },
    status: 'confirmed', asOf: '2026-11-10', src: ['psBlog'],
  },
  {
    label: { de: 'Erster Start weltweit', en: 'First country to unlock' },
    value: { de: 'Neuseeland: 19.11., 00:00 Uhr NZDT, das ist 18.11., 12:00 Uhr MEZ', en: 'New Zealand: 19 Nov, 00:00 NZDT (18 Nov, 11:00 GMT)' },
    status: 'confirmed', asOf: '2026-11-10', src: ['psBlog'],
  },
  {
    label: { de: 'Xbox Cloud Gaming', en: 'Xbox Cloud Gaming' },
    value: { de: 'ab 19.11., 1:00 Uhr US-Ostküste (7:00 Uhr MEZ), auch auf Xbox One per Cloud', en: 'from 19 Nov, 1am ET, also on Xbox One via the cloud' },
    note: { de: 'Spiel muss gekauft werden', en: 'Game must be purchased' },
    status: 'confirmed', asOf: '2026-11-10', src: ['xboxWire'],
  },
  {
    label: { de: 'Plattformen', en: 'Platforms' },
    value: { de: 'PS5 (mit PS5-Pro-Verbesserungen), Xbox Series X, Xbox Series S', en: 'PS5 (with PS5 Pro enhancements), Xbox Series X, Xbox Series S' },
    status: 'confirmed', asOf: '2026-11-10', src: ['psBlog', 'tt8k'],
  },
  {
    label: { de: 'PC-Version', en: 'PC version' },
    value: { de: 'nicht angekündigt', en: 'not announced' },
    note: { de: 'Take-Two nennt nur PS5 und Xbox Series X|S', en: 'Take-Two lists only PS5 and Xbox Series X|S' },
    status: 'confirmed', asOf: '2026-11-09', src: ['tt8k'],
  },
  {
    label: { de: 'Preise Euro', en: 'Prices in euros' },
    value: { de: 'Standard 79,99 €, Ultimate 99,99 €', en: 'Standard €79.99, Ultimate €99.99' },
    status: 'confirmed', asOf: '2026-06-25', src: ['pcghPrices'],
  },
  {
    label: { de: 'Preise USA', en: 'US prices' },
    value: { de: 'Standard 79,99 $, Ultimate 99,99 $', en: 'Standard $79.99, Ultimate $99.99' },
    status: 'confirmed', asOf: '2026-11-10', src: ['xboxWire'],
  },
  {
    label: { de: 'Preise Großbritannien', en: 'UK prices' },
    value: { de: 'Standard 69,99 £, Ultimate 89,99 £', en: 'Standard £69.99, Ultimate £89.99' },
    status: 'reported', asOf: '2026-06-25', src: ['techradarUK'],
  },
  {
    label: { de: 'Vorbestellbar seit', en: 'Pre-orders opened' },
    value: { de: '25.06.2026', en: '25 June 2026' },
    status: 'confirmed', asOf: '2026-06-18', src: ['ocPreorder'],
  },
  {
    label: { de: 'Vorbesteller-Bonus', en: 'Pre-order bonus' },
    value: { de: 'Vintage Vice City Pack plus 1 Monat GTA+, bei Kauf bis 19.11.2026, 23:59:59 Uhr', en: 'Vintage Vice City Pack plus 1 month of GTA+, for purchases until 19 Nov 2026, 23:59:59' },
    note: { de: 'GTA+ verlängert sich danach, wenn du nicht kündigst', en: 'GTA+ renews unless you cancel' },
    status: 'confirmed', asOf: '2026-11-10', src: ['xboxWire'],
  },
  {
    label: { de: 'Preload', en: 'Pre-load' },
    value: { de: 'seit 10.11.2026: PS5 ab 0:00 Uhr Ortszeit, Xbox ab 0:00 Uhr GMT (1:00 Uhr MEZ)', en: 'since 10 Nov 2026: PS5 from midnight local time, Xbox from 00:00 GMT' },
    status: 'confirmed', asOf: '2026-11-04', src: ['gtaintelPreload', 'psBlog'],
  },
  {
    label: { de: 'Speicherplatz', en: 'Storage' },
    value: { de: 'bis zu 212 GB, je nach Gerät', en: 'up to 212 GB, depending on device' },
    status: 'confirmed', asOf: '2026-11-04', src: ['gtaintelPreload'],
  },
  {
    label: { de: 'Box-Version', en: 'Boxed copy' },
    value: { de: 'Download-Code statt Disc, im Handel seit 12.11.2026', en: 'Download code instead of a disc, in stores since 12 Nov 2026' },
    status: 'confirmed', asOf: '2026-11-04', src: ['gtaintelPreload'],
  },
  {
    label: { de: '1. Update vor dem Start', en: 'First pre-launch update' },
    value: { de: 'Version 1.002.000 seit 13.11.2026, auf PS5 rund 1,07 GB, Pflicht-Update', en: 'Version 1.002.000 since 13 Nov 2026, about 1.07 GB on PS5, mandatory' },
    note: { de: 'Keine Patchnotes von Rockstar. Xbox: rund 2,18 GB laut einem Bericht, unbestätigt', en: 'No patch notes from Rockstar. Xbox: about 2.18 GB per one report, unconfirmed' },
    status: 'reported', asOf: '2026-11-14', src: ['ggreconPatch'],
  },
  {
    label: { de: '2. Update vor dem Start', en: 'Second pre-launch update' },
    value: { de: 'Version 1.002.001 seit 16.11.2026, rund 600 MB auf PS5 und Xbox', en: 'Version 1.002.001 since 16 Nov 2026, about 600 MB on PS5 and Xbox' },
    note: { de: 'Ebenfalls ohne Patchnotes', en: 'Also without patch notes' },
    status: 'reported', asOf: '2026-11-16', src: ['cbPatch2'],
  },
  {
    label: { de: 'Day-One-Patch', en: 'Day-one patch' },
    value: { de: 'Größe noch nicht bekannt', en: 'size not known yet' },
    status: 'pending', asOf: '2026-11-18', src: ['ggreconPatch'],
  },
  {
    label: { de: 'Bildrate', en: 'Frame rate' },
    value: { de: 'Ziel 30 FPS auf allen Konsolen, auch PS5 Pro', en: 'targets 30 FPS on all consoles, including PS5 Pro' },
    note: { de: 'Kein 60-FPS-Modus angekündigt', en: 'No 60 FPS mode announced' },
    status: 'confirmed', asOf: '2026-11-10', src: ['vgc30fps'],
  },
  {
    label: { de: 'PS5 Pro', en: 'PS5 Pro' },
    value: { de: 'PSSR-Hochskalierung und Raytracing-Schatten', en: 'PSSR upscaling and ray-traced shadows' },
    status: 'confirmed', asOf: '2026-11-10', src: ['psBlog'],
  },
  {
    label: { de: 'Spielmodus zum Start', en: 'Mode at launch' },
    value: { de: 'Einzelspieler-Erlebnis, kein Online-Modus angekündigt', en: 'single-player experience, no online mode announced' },
    status: 'confirmed', asOf: '2026-11-10', src: ['xboxWire'],
  },
];

// ---------------------------------------------------------------------
// TRAILER & REICHWEITE
// YouTube-Aufrufe: Video auf YouTube öffnen, Zahl ablesen, views + VIEWS_AS_OF anpassen.
// ---------------------------------------------------------------------
export const VIEWS_AS_OF = '2026-11-18T06:06:00+01:00';

export interface Trailer {
  name: L2;
  date: string; // Veröffentlichung (deutsche Zeit)
  views: number; // aktuelle Aufrufe auf dem YouTube-Kanal von Rockstar Games
  yt: SrcId;
  first: Stat; // Rekord / Wert in den ersten Tagen
}

export const TRAILERS: Trailer[] = [
  {
    name: { de: 'Trailer 1', en: 'Trailer 1' }, date: '2023-12-05', views: 305_726_032, yt: 'ytT1',
    first: {
      label: { de: 'Erste 24 Stunden', en: 'First 24 hours' },
      value: { de: '90.421.491 Aufrufe auf YouTube, 8,9 Mio. Likes', en: '90,421,491 YouTube views, 8.9M likes' },
      note: { de: 'Guinness-Rekorde: meistgesehene Spiele-Enthüllung und meistgelikter Spiele-Trailer auf YouTube in 24 Std. Nach einem Leak vorgezogen.', en: 'Guinness records: most viewed video game reveal and most liked video game trailer on YouTube in 24 hours. Released early after a leak.' },
      status: 'confirmed', asOf: '2023-12-06', src: ['pushsquareT1'],
    },
  },
  {
    name: { de: 'Trailer 2', en: 'Trailer 2' }, date: '2025-05-06', views: 189_915_281, yt: 'ytT2',
    first: {
      label: { de: 'Erste 24 Stunden', en: 'First 24 hours' },
      value: { de: '475 Mio. Aufrufe auf allen Plattformen', en: '475M views across all platforms' },
      note: { de: 'Laut Rockstar der größte Video-Launch aller Zeiten (vorher: Deadpool & Wolverine mit 365 Mio.)', en: 'Per Rockstar the biggest video launch ever (previous: Deadpool & Wolverine with 365M)' },
      status: 'confirmed', asOf: '2025-05', src: ['thrT2'],
    },
  },
  {
    name: { de: 'An Extended Look (Netflix)', en: 'An Extended Look (Netflix)' }, date: '2026-08-27', views: 38_596_163, yt: 'ytExt',
    first: {
      label: { de: 'Erste 4 Tage', en: 'First 4 days' },
      value: { de: '31,1 Mio. Netflix-Aufrufe, Platz 1 in 87 von 93 Ländern', en: '31.1M Netflix views, No. 1 in 87 of 93 countries' },
      note: { de: '27 Minuten lang, sechs Stunden nach Netflix auch auf YouTube', en: '27 minutes long, on YouTube six hours after Netflix' },
      status: 'confirmed', asOf: '2026-09-02', src: ['vgcNetflix'],
    },
  },
  {
    name: { de: 'Launch-Trailer', en: 'Launch Trailer' }, date: '2026-10-15', views: 82_504_462, yt: 'ytLaunch',
    first: {
      label: { de: 'Erste 4 Tage', en: 'First 4 days' },
      value: { de: 'über 51 Mio. Aufrufe auf YouTube', en: 'over 51M YouTube views' },
      note: { de: 'Mehr als der GTA-V-Launch-Trailer in 13 Jahren (rund 34 Mio.)', en: 'More than the GTA V launch trailer in 13 years (about 34M)' },
      status: 'reported', asOf: '2026-10-20', src: ['t4gLaunch'],
    },
  },
];

// ---------------------------------------------------------------------
// ENTWICKLUNG, TEAM & BUDGET
// ---------------------------------------------------------------------
export const DEV: Stat[] = [
  {
    label: { de: 'Erste Recherche', en: 'Early research' },
    value: { de: '2015: Recherche-Reise nach Miami, Projektname „Project Americas“', en: '2015: research trip to Miami, project name "Project Americas"' },
    status: 'reported', asOf: '2026-10-14', src: ['vgtimesBloomberg'],
  },
  {
    label: { de: 'Offiziell bestätigt', en: 'Officially confirmed' },
    value: { de: '04.02.2022: aktive Entwicklung „well underway“', en: '4 Feb 2022: active development "well underway"' },
    status: 'confirmed', asOf: '2022-02-04', src: ['tr2022'],
  },
  {
    label: { de: 'Mitarbeiter bei Rockstar', en: 'Rockstar headcount' },
    value: { de: '4.711 in 12 Büros (2018: 2.441)', en: '4,711 across 12 offices (2018: 2,441)' },
    note: { de: 'Bloomberg-Bericht von Jason Schreier', en: 'Bloomberg report by Jason Schreier' },
    status: 'reported', asOf: '2026-10-14', src: ['vgtimesBloomberg'],
  },
  {
    label: { de: 'Spielleitung', en: 'Game directors' },
    value: { de: 'drei Game Directors: Rob Nelson, Aaron Garbut, Phil Hooker', en: 'three game directors: Rob Nelson, Aaron Garbut, Phil Hooker' },
    status: 'reported', asOf: '2026-10-14', src: ['vgtimesBloomberg'],
  },
  {
    label: { de: 'Budget offiziell', en: 'Official budget' },
    value: { de: 'nicht veröffentlicht. Rockstar weist das Gerücht von über 1,5 Mrd. US-Dollar zurück', en: 'not disclosed. Rockstar rejects the rumor of over $1.5B' },
    status: 'reported', asOf: '2026-10-14', src: ['vgtimesBloomberg'],
  },
  {
    label: { de: 'Budget-Schätzung', en: 'Budget estimate' },
    value: { de: 'über 1 Mrd. US-Dollar Entwicklungskosten', en: 'over $1B in development costs' },
    note: { de: 'Analyst Eric Handler (Roth)', en: 'Analyst Eric Handler (Roth)' },
    status: 'estimate', asOf: '2026-11-14', src: ['cnbc'],
  },
  {
    label: { de: 'Verschiebungen', en: 'Delays' },
    value: { de: '2: von Herbst 2025 auf 26.05.2026, dann auf 19.11.2026', en: '2: from fall 2025 to 26 May 2026, then to 19 Nov 2026' },
    status: 'confirmed', asOf: '2025-11-06', src: ['nlDelay', 'trDelay'],
  },
];

// ---------------------------------------------------------------------
// SPIELWELT (nur Offizielles)
// ---------------------------------------------------------------------
export const WORLD: Stat[] = [
  {
    label: { de: 'Schauplatz', en: 'Setting' },
    value: { de: 'Bundesstaat Leonida (an Florida angelehnt) mit Vice City', en: 'the state of Leonida (inspired by Florida) with Vice City' },
    status: 'confirmed', asOf: '2026-11-18', src: ['rockstarVI'],
  },
  {
    label: { de: 'Regionen', en: 'Regions' },
    value: { de: '6: Vice City, Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia, Mount Kalaga National Park', en: '6: Vice City, Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia, Mount Kalaga National Park' },
    status: 'confirmed', asOf: '2026-11-18', src: ['rockstarVI'],
  },
  {
    label: { de: 'Kartengröße', en: 'Map size' },
    value: { de: 'etwa doppelt so groß wie GTA V, die größte Welt von Rockstar', en: 'around twice the size of GTA V, Rockstar\'s biggest world' },
    note: { de: 'Aaron Garbut (Rockstar) bei Game Informer. Eine Fläche in km² gibt es offiziell nicht', en: 'Aaron Garbut (Rockstar) to Game Informer. No official area in km² or square miles' },
    status: 'confirmed', asOf: '2026-09-29', src: ['gtaintelGI'],
  },
  {
    label: { de: 'Tierarten', en: 'Animal species' },
    value: { de: 'über 170, davon über 60 Vogelarten und über 30 Landsäugetiere', en: 'over 170, including 60+ bird and 30+ land mammal species' },
    status: 'confirmed', asOf: '2026-09-29', src: ['gtaintelGI'],
  },
  {
    label: { de: 'Wetter', en: 'Weather' },
    value: { de: 'Hurrikans und Tropenstürme', en: 'hurricanes and tropical storms' },
    status: 'confirmed', asOf: '2026-09-29', src: ['gtaintelGI'],
  },
  {
    label: { de: 'Hauptfiguren', en: 'Protagonists' },
    value: { de: '2: Lucia Caminos und Jason Duval', en: '2: Lucia Caminos and Jason Duval' },
    status: 'confirmed', asOf: '2026-11-18', src: ['rockstarVI'],
  },
];

// ---------------------------------------------------------------------
// WERTUNGEN
// ---------------------------------------------------------------------
export const REVIEWS: Stat[] = [
  {
    label: { de: 'GTA VI Metascore', en: 'GTA VI Metascore' },
    value: { de: 'folgt (Metacritic zeigt am 18.11. um 6 Uhr noch „tbd“)', en: 'TBA (Metacritic still showed "tbd" on 18 Nov, 05:00 GMT)' },
    status: 'pending', asOf: '2026-11-18', src: ['mcVI'],
  },
  {
    label: { de: 'Test-Embargo', en: 'Review embargo' },
    value: { de: '18.11.2026, laut Insider Gaming gegen 12:00 Uhr MEZ', en: '18 Nov 2026, around 11:00 GMT per Insider Gaming' },
    note: { de: 'Von Rockstar nicht offiziell bestätigt', en: 'Not officially confirmed by Rockstar' },
    status: 'reported', asOf: '2026-11-17', src: ['insiderEmbargo'],
  },
  {
    label: { de: 'GTA IV (Rekord der Reihe)', en: 'GTA IV (series record)' },
    value: { de: '98 aus 86 Kritiken', en: '98 from 86 critic reviews' },
    status: 'confirmed', asOf: '2026-11-18', src: ['mcIV'],
  },
  {
    label: { de: 'GTA V', en: 'GTA V' },
    value: { de: '97 aus 58 Kritiken', en: '97 from 58 critic reviews' },
    status: 'confirmed', asOf: '2026-11-18', src: ['mcV'],
  },
  {
    label: { de: 'Red Dead Redemption 2', en: 'Red Dead Redemption 2' },
    value: { de: '97 aus 109 Kritiken', en: '97 from 109 critic reviews' },
    status: 'confirmed', asOf: '2026-11-18', src: ['mcRDR2'],
  },
];

// ---------------------------------------------------------------------
// ZEITSTRAHL
// ---------------------------------------------------------------------
export interface Milestone {
  date: string;
  kind: 'info' | 'trailer' | 'delay' | 'business' | 'release';
  title: L2;
  text: L2;
  src: SrcId[];
}

export const TIMELINE: Milestone[] = [
  { date: '2013-09-17', kind: 'release', title: { de: 'GTA V erscheint', en: 'GTA V launches' }, text: { de: '800 Mio. US-Dollar Umsatz am ersten Tag, 1 Mrd. nach drei Tagen.', en: '$800M on day one, $1B after three days.' }, src: ['gamesbeat800', 'gamespot1b'] },
  { date: '2022-02-04', kind: 'info', title: { de: 'Rockstar bestätigt das nächste GTA', en: 'Rockstar confirms the next GTA' }, text: { de: 'Die aktive Entwicklung sei „well underway“.', en: 'Active development is "well underway".' }, src: ['tr2022'] },
  { date: '2022-09-18', kind: 'info', title: { de: 'Großer Leak', en: 'Massive leak' }, text: { de: 'Über 90 Videoclips aus einer frühen Version landen im Netz. Rockstar bestätigt den Hack am 19.09.', en: 'More than 90 clips from an early build leak online. Rockstar confirms the hack on 19 Sep.' }, src: ['varietyLeak'] },
  { date: '2023-11-08', kind: 'info', title: { de: 'Trailer angekündigt', en: 'Trailer announced' }, text: { de: 'Sam Houser kündigt zum 25. Geburtstag von Rockstar den ersten Trailer für Dezember an.', en: 'Sam Houser announces the first trailer for December on Rockstar\'s 25th anniversary.' }, src: ['vgc2023'] },
  { date: '2023-12-05', kind: 'trailer', title: { de: 'Trailer 1', en: 'Trailer 1' }, text: { de: 'Nach einem Leak vorgezogen. 90,4 Mio. YouTube-Aufrufe in 24 Stunden, Release für 2025 angekündigt.', en: 'Released early after a leak. 90.4M YouTube views in 24 hours, release set for 2025.' }, src: ['pushsquareT1'] },
  { date: '2025-05-02', kind: 'delay', title: { de: '1. Verschiebung', en: 'First delay' }, text: { de: 'Von Herbst 2025 auf den 26.05.2026.', en: 'From fall 2025 to 26 May 2026.' }, src: ['nlDelay'] },
  { date: '2025-05-06', kind: 'trailer', title: { de: 'Trailer 2', en: 'Trailer 2' }, text: { de: '475 Mio. Aufrufe in 24 Stunden auf allen Plattformen.', en: '475M views in 24 hours across all platforms.' }, src: ['thrT2'] },
  { date: '2025-11-06', kind: 'delay', title: { de: '2. Verschiebung', en: 'Second delay' }, text: { de: 'Neuer Termin: 19.11.2026. Rockstar will mehr Zeit für den Feinschliff.', en: 'New date: 19 Nov 2026. Rockstar wants more time for polish.' }, src: ['trDelay'] },
  { date: '2026-06-18', kind: 'info', title: { de: 'Cover und Vorbestell-Termin', en: 'Cover art and pre-order date' }, text: { de: 'Rockstar zeigt das Cover und nennt den Start der Vorbestellungen.', en: 'Rockstar reveals the cover art and the pre-order date.' }, src: ['ocPreorder'] },
  { date: '2026-06-25', kind: 'business', title: { de: 'Vorbestellungen starten', en: 'Pre-orders open' }, text: { de: 'Standard 79,99 €, Ultimate 99,99 €.', en: 'Standard $79.99 / €79.99, Ultimate $99.99 / €99.99.' }, src: ['pcghPrices', 'xboxWire'] },
  { date: '2026-08-27', kind: 'trailer', title: { de: 'An Extended Look auf Netflix', en: 'An Extended Look on Netflix' }, text: { de: '27 Minuten Spielszenen, 31,1 Mio. Netflix-Aufrufe in vier Tagen.', en: '27 minutes of footage, 31.1M Netflix views in four days.' }, src: ['vgcNetflix'] },
  { date: '2026-09-29', kind: 'info', title: { de: 'Game-Informer-Titelstory', en: 'Game Informer cover story' }, text: { de: 'Karte etwa doppelt so groß wie GTA V, über 170 Tierarten, Hurrikans.', en: 'Map around twice the size of GTA V, 170+ animal species, hurricanes.' }, src: ['gtaintelGI'] },
  { date: '2026-10-14', kind: 'info', title: { de: 'Bloomberg-Bericht', en: 'Bloomberg report' }, text: { de: 'Rockstar wächst auf 4.711 Mitarbeiter in 12 Büros.', en: 'Rockstar has grown to 4,711 employees across 12 offices.' }, src: ['vgtimesBloomberg'] },
  { date: '2026-10-15', kind: 'trailer', title: { de: 'Launch-Trailer', en: 'Launch Trailer' }, text: { de: 'Über 51 Mio. YouTube-Aufrufe in vier Tagen.', en: 'Over 51M YouTube views in four days.' }, src: ['t4gLaunch'] },
  { date: '2026-11-09', kind: 'business', title: { de: 'Take-Two-Quartalszahlen', en: 'Take-Two earnings' }, text: { de: 'Vorbestellungen weit über den Erwartungen, GTA V bei fast 235 Mio.', en: 'Pre-orders far above expectations, GTA V at nearly 235M.' }, src: ['ttCall'] },
  { date: '2026-11-10', kind: 'business', title: { de: 'Preload und Vorbestell-Rekorde', en: 'Pre-load and pre-order records' }, text: { de: 'Preload startet, Sony und Microsoft melden Rekorde in ihren Stores.', en: 'Pre-load opens, Sony and Microsoft report store records.' }, src: ['psBlog', 'xboxWire'] },
  { date: '2026-11-12', kind: 'info', title: { de: 'Box-Version im Handel', en: 'Boxed copies in stores' }, text: { de: 'Mit Download-Code statt Disc.', en: 'With a download code instead of a disc.' }, src: ['gtaintelPreload'] },
  { date: '2026-11-13', kind: 'info', title: { de: 'Update 1.002.000', en: 'Update 1.002.000' }, text: { de: 'Erstes Update vor dem Start, auf PS5 rund 1,07 GB.', en: 'First pre-launch update, about 1.07 GB on PS5.' }, src: ['ggreconPatch'] },
  { date: '2026-11-16', kind: 'info', title: { de: 'Update 1.002.001', en: 'Update 1.002.001' }, text: { de: 'Zweites Update vor dem Start, rund 600 MB.', en: 'Second pre-launch update, about 600 MB.' }, src: ['cbPatch2'] },
  { date: '2026-11-18', kind: 'info', title: { de: 'Test-Embargo (laut Berichten)', en: 'Review embargo (reported)' }, text: { de: 'Erste Wertungen erwartet, gegen 12 Uhr MEZ startet Neuseeland in den Release-Tag.', en: 'First reviews expected, New Zealand hits release day at 11:00 GMT.' }, src: ['insiderEmbargo', 'psBlog'] },
  { date: '2026-11-19', kind: 'release', title: { de: 'Release von GTA VI', en: 'GTA VI launches' }, text: { de: '0:00 Uhr Ortszeit auf PS5 und Xbox Series X|S.', en: 'Midnight local time on PS5 and Xbox Series X|S.' }, src: ['psBlog'] },
];

// ---------------------------------------------------------------------
// HÄUFIGE FRAGEN (sichtbar auf der Seite und als FAQPage-Daten)
// ---------------------------------------------------------------------
export const FAQ: { q: L2; a: L2 }[] = [
  {
    q: { de: 'Wie oft wurde GTA 6 schon verkauft?', en: 'How many copies has GTA 6 sold?' },
    a: { de: 'Offizielle Verkaufszahlen gibt es noch nicht. Sony und Microsoft melden das meistvorbestellte Spiel ihrer Stores, Take-Two spricht von Vorbestellungen weit über den Erwartungen. Sensor Tower schätzt über 12 Mio. digitale Vorbestellungen bis zum 13.11.2026.', en: 'There are no official sales figures yet. Sony and Microsoft report the most pre-ordered game in their stores, and Take-Two says pre-orders are far above expectations. Sensor Tower estimates over 12 million digital pre-orders through 13 Nov 2026.' },
  },
  {
    q: { de: 'Wie oft wurde GTA 5 verkauft?', en: 'How many copies has GTA 5 sold?' },
    a: { de: 'Laut Take-Two fast 235 Mio. Einheiten weltweit (Stand 30.09.2026). Die ganze GTA-Reihe liegt bei fast 480 Mio.', en: 'Nearly 235 million units worldwide according to Take-Two (as of 30 Sep 2026). The whole GTA series is at nearly 480 million.' },
  },
  {
    q: { de: 'Ab wann kann man GTA 6 spielen?', en: 'When can you play GTA 6?' },
    a: { de: 'Am 19.11.2026 um 0:00 Uhr Ortszeit, in Deutschland also in der Nacht von Mittwoch auf Donnerstag. Neuseeland startet zuerst, das ist am 18.11. um 12:00 Uhr MEZ.', en: 'On 19 November 2026 at midnight local time. New Zealand goes first, at 11:00 GMT on 18 November.' },
  },
  {
    q: { de: 'Wie groß ist GTA 6 zum Download?', en: 'How big is the GTA 6 download?' },
    a: { de: 'Rockstar nennt bis zu 212 GB, je nach Konsole. Dazu kamen vor dem Start zwei Updates: am 13.11. rund 1,07 GB (PS5) und am 16.11. rund 600 MB.', en: 'Rockstar says up to 212 GB, depending on the console. Two updates followed before launch: about 1.07 GB (PS5) on 13 Nov and about 600 MB on 16 Nov.' },
  },
  {
    q: { de: 'Wie groß ist die Karte von GTA 6?', en: 'How big is the GTA 6 map?' },
    a: { de: 'Laut Rockstar etwa doppelt so groß wie die Karte von GTA V. Eine offizielle Fläche in Quadratkilometern gibt es nicht.', en: 'According to Rockstar around twice the size of the GTA V map. There is no official area figure.' },
  },
];

// ---------------------------------------------------------------------
// ÄNDERUNGEN (neueste oben)
// ---------------------------------------------------------------------
export const CHANGELOG: { at: string; text: L2 }[] = [
  { at: '2026-11-18T06:10:00+01:00', text: { de: 'Seite gestartet mit allen Zahlen bis zum Vortag des Release. YouTube-Aufrufe am 18.11. um 6:06 Uhr abgelesen.', en: 'Page launched with every figure up to the day before release. YouTube views read on 18 Nov at 05:06 GMT.' } },
];

/** Was als Nächstes eingetragen wird. */
export const NEXT_UP: L2[] = [
  { de: 'Metascore und erste Wertungen (Test-Embargo laut Berichten 18.11. gegen 12 Uhr MEZ)', en: 'Metascore and first reviews (embargo reportedly 18 Nov, around 11:00 GMT)' },
  { de: 'Erste offizielle Verkaufszahlen von Take-Two oder Rockstar nach dem Launch', en: 'First official sales figures from Take-Two or Rockstar after launch' },
  { de: 'Größe des Day-One-Patches', en: 'Day-one patch size' },
  { de: 'Spielerzahlen und Rekorde am Launch-Wochenende', en: 'Player counts and records on launch weekend' },
];
