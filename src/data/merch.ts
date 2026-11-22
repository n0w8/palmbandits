// Merch aus dem Spreadshop "palmbandits" (https://palmbandits.myspreadshop.at), Stand 18.11.2026.
// Reihenfolge = Reihenfolge auf der Seite. Die Startseite zeigt die ersten 6.
// Werte aus der Produktliste des Spreadshops (/all):
// - path       = Produktpfad im Spreadshop (/<slug>-A<designId>)
// - sellable   = Token aus dem Produkt-Link (?sellable=...)
// - appearance = Farb-ID (Shirt/Windbreaker schwarz = 2, Hoodie schwarz = 1257)
// - img        = Produkt-ID des Spreadshirt-Bildservers (image.spreadshirtmedia.net/image-server/v1/products/<img>/views/<view>/...)
//                Aufbau: T<Produkttyp>A<Farbe>PA<Druckbereich>PT17X<mm>Y<mm>D<Design-ID>W<Breite mm*100>H<Höhe mm*100>
// - view       = Ansicht fuer das Bild: 1 = vorne (Standard), 2 = hinten
// - soon       = noch nicht kaufbar (z. B. Spreadshirt prüft das Design): Karte zeigt "Bald im Shop", kein Kauf-Link
// Preise in EUR inkl. MwSt. wie im Spreadshop.
//
// 18.11.2026: Mike: "nein, die designs gefallen mir nicht" -> die 7 Nordwald-Figuren (Domsgard, Skulgard, Ravhena, PRONX,
// Skaedra, Runvyr, Ravnir) und das alte Eldruna sind aus dem Spreadshop genommen (nicht gelöscht, nur Verkaufskanal aus)
// und hier entfernt. Die alten Einträge stehen in der Git-Historie (Commit bcc925e).
export interface MerchItem {
  id: string;
  name: { de: string; en: string };
  type: { de: string; en: string };
  path: string;
  sellable: string;
  appearance: number;
  img: string;
  price: number;
  view?: number;
  isNew?: boolean;
  soon?: boolean;
}

const LOGO = '/palm+bandits+logo-A6afbe0a6855804508a0fa2b9';

// Design-IDs, die nicht mehr im Spreadshop sind (18.11.2026 aus dem Verkauf genommen). Alte Links darauf
// (z. B. aus geteilten Seiten oder dem Browser-Verlauf) zeigen im eingebetteten Shop sonst "Page not found";
// SpreadShop.astro leitet sie deshalb auf die Produktübersicht um. Alles mit "nordwald" im Pfad zählt ebenfalls.
const REMOVED_DESIGNS = [
  '6afd107e83173c19cab0830e', // Domsgard Nordwald
  '6afd10b1855804508a063046', // Skulgard Nordwald
  '6afd109e855804508a05e736', // Ravhena Nordwald
  '6afd109213bea62fcab420d0', // PRONX Nordwald
  '6afd105e13bea62fcab35dbd', // Skaedra Nordwald
  '6afd107283173c19cab04cb9', // Runvyr Nordwald
  '6afd10bc83173c19cab184f6', // Ravnir Nordwald
  '6afce57c855804508a521a1d', // Eldruna Nordwald (alte Version)
  // PALM BANDITS Hase (Entwurf A, 18.11.2026): am 19.11.2026 von Spreadshirt abgelehnt, Grund "Copyright".
  // Website-Karten am 22.11.2026 entfernt (alte Einträge in der Git-Historie). Einspruch: Mikes Entscheidung offen.
  '6afd3061855804508a86a421',
  // 22.11.2026: erste Fassungen mit Farbresten am unteren Rand, ersetzt durch bereinigte Kombis
  '6b02713d855804508a4425ba', // PRONX v1
  '6b02716013bea62fcad8dfa6', // Ravnir v1
];

// 22.11.2026 (Mike: "will mehr designs oben haben und zwar schnell"): 7 Figuren im Hasen-Stil und das Kritzel
// "Palme + Maske" als Kombi, vorne das Motiv (Shirt 20 cm, Hoodie 15,5 bis 18 cm über der Tasche), hinten
// "PALM BANDITS Logo" 25 cm unter dem Kragen. Nur Schwarz, Shirt 32,99 / Hoodie 45,99. Domsgard fehlt bewusst
// (trägt die Hasenmaske, die Spreadshirt wegen Copyright abgelehnt hat). Werte aus der Spreadshop-Liste /all.
const KOMBIS = [
  { key: 'palme', de: 'Palme + Maske', en: 'Palm + Mask', path: '/palme+maske+palm+bandits-A6b026fdf855804508a3e8832', sell: 'QwvRZxqg30HkRk1r1bxY',
    tee: 'T3502A2PA8089PT17X90Y64D360868310W20000H12486PA8090PT17X66Y2D360811485W25000H6550',
    hoodie: 'T2963A1257PA9737PT17X65Y3D360811485W25000H6550PA9736PT17X100Y47D360868310W18000H11237' },
  // PRONX und Ravnir am 22.11.2026 gegen bereinigte Druckdateien getauscht (v2, Farbreste unten entfernt)
  { key: 'pronx', de: 'PRONX', en: 'PRONX', path: '/pronx+palm+bandits-A6b028571855804508a97244b', sell: 'krA4lVDbY1Hlkl3lLbpR',
    tee: 'T3502A2PA8089PT17X90Y1D360868364W19999H23927PA8090PT17X66Y0D360811485W25000H6550',
    hoodie: 'T2963A1257PA9737PT17X65Y1D360811485W25000H6550PA9736PT17X100Y13D360868364W17999H21534' },
  { key: 'eldruna', de: 'Eldruna', en: 'Eldruna', path: '/eldruna+palm+bandits-A6b02729b13bea62fcadd7cb8', sell: 'zv0YyLGmByilwGldEok2',
    tee: 'T3502A2PA8089PT17X90Y2D360868263W19999H29672PA8090PT17X66Y2D360811485W25000H6550',
    hoodie: 'T2963A1257PA9737PT17X65Y3D360811485W25000H6550PA9736PT17X101Y3D360868263W17799H26408' },
  { key: 'skaedra', de: 'Skaedra', en: 'Skaedra', path: '/skaedra+palm+bandits-A6b02724613bea62fcadc6fca', sell: 'yb01xa4bB3fwVvw3Gmyl',
    tee: 'T3502A2PA8089PT17X90Y2D360868237W19999H29908PA8090PT17X66Y2D360811485W25000H6550',
    hoodie: 'T2963A1257PA9737PT17X65Y3D360811485W25000H6550PA9736PT17X102Y4D360868237W17499H26170' },
  { key: 'ravnir', de: 'Ravnir', en: 'Ravnir', path: '/ravnir+palm+bandits-A6b0287b1855804508aa0024b', sell: 'nA0m7vg8jJtQGQpQzYM8',
    tee: 'T3502A2PA8089PT17X90Y0D360868293W19999H28381PA8090PT17X66Y0D360811485W25000H6550',
    hoodie: 'T2963A1257PA9737PT17X65Y1D360811485W25000H6550PA9736PT17X100Y2D360868293W17999H25543' },
  { key: 'skulgard', de: 'Skulgard', en: 'Skulgard', path: '/skulgard+palm+bandits-A6b02717e83173c19ca9486c1', sell: '5wdyRn7yOBfE4lL4rAJp',
    tee: 'T3502A2PA8089PT17X90Y2D360868260W19999H31618PA8090PT17X66Y2D360811485W25000H6550',
    hoodie: 'T2963A1257PA9737PT17X65Y3D360811485W25000H6550PA9736PT17X107Y4D360868260W16500H26085' },
  { key: 'runvyr', de: 'Runvyr', en: 'Runvyr', path: '/runvyr+palm+bandits-A6b0271d5855804508a46c3d0', sell: 'x50LMkjJaEsApAO8Q7bA',
    tee: 'T3502A2PA8089PT17X90Y0D360868261W19999H34436PA8090PT17X66Y2D360811485W25000H6550',
    hoodie: 'T2963A1257PA9737PT17X65Y3D360811485W25000H6550PA9736PT17X112Y1D360868261W15499H26688' },
  { key: 'ravhena', de: 'Ravhena', en: 'Ravhena', path: '/ravhena+palm+bandits-A6b02725f13bea62fcadcc55e', sell: 'EmdJXJAOy8c2aY2BD954',
    tee: 'T3502A2PA8089PT17X90Y1D360868313W19999H32145PA8090PT17X66Y2D360811485W25000H6550',
    hoodie: 'T2963A1257PA9737PT17X65Y3D360811485W25000H6550PA9736PT17X107Y2D360868313W16500H26520' },
];

// Erst alle Shirts (die Startseite zeigt die ersten 6, so sind dort 6 verschiedene Motive), dann alle Hoodies.
const KOMBI_ITEMS: MerchItem[] = [
  ...KOMBIS.map((k): MerchItem => ({
    id: `${k.key}-tee`, isNew: true,
    name: { de: `${k.de} Shirt`, en: `${k.en} Tee` },
    type: { de: 'Oversized Heavyweight T-Shirt · Schwarz · hinten PALM BANDITS', en: 'Oversized heavyweight tee · Black · PALM BANDITS on the back' },
    path: k.path, sellable: `${k.sell}-3502-7`, appearance: 2, img: k.tee, price: 32.99,
  })),
  ...KOMBIS.map((k): MerchItem => ({
    id: `${k.key}-hoodie`, isNew: true,
    name: { de: `${k.de} Hoodie`, en: `${k.en} Hoodie` },
    type: { de: 'Oversized Heavyweight Hoodie · Schwarz · hinten PALM BANDITS', en: 'Oversized heavyweight hoodie · Black · PALM BANDITS on the back' },
    path: k.path, sellable: `${k.sell}-2963-22`, appearance: 1257, img: k.hoodie, price: 45.99,
  })),
];

export const MERCH_ITEMS: MerchItem[] = [
  ...KOMBI_ITEMS,
  {
    id: 'logo-hoodie',
    name: { de: 'Palm Bandits Logo Hoodie', en: 'Palm Bandits Logo Hoodie' },
    type: { de: 'Oversized Heavyweight Hoodie · Schwarz', en: 'Oversized heavyweight hoodie · Black' },
    path: LOGO, sellable: '5wdQqnbok8S0z0m1yZ4Z-2963-22', appearance: 1257,
    img: 'T2963A1257PA9736PT17X65Y37D360811485W25000H6550', price: 39.99,
  },
  {
    id: 'logo-tee',
    name: { de: 'Palm Bandits Logo Shirt', en: 'Palm Bandits Logo Tee' },
    type: { de: 'Oversized Heavyweight T-Shirt · Schwarz', en: 'Oversized heavyweight tee · Black' },
    path: LOGO, sellable: '5wdQqnbok8S0z0m1yZ4Z-3502-7', appearance: 2,
    img: 'T3502A2PA8089PT17X65Y118D360811485W25000H6550', price: 26.99,
  },
  {
    id: 'logo-windbreaker',
    name: { de: 'Palm Bandits Windbreaker', en: 'Palm Bandits Windbreaker' },
    type: { de: 'Funktions-Windbreaker, recycelt · Schwarz', en: 'Recycled performance windbreaker · Black' },
    path: LOGO, sellable: '5wdQqnbok8S0z0m1yZ4Z-5117-29', appearance: 2,
    img: 'T5117A2PA11068PT32X0Y25D360811485W9900H2593', price: 60.99,
  },
  // 18.11.2026 (Mike: "nur shirt, hoodie und regenjacke, kappe und haube fürs erste. weiß schwarz"): Cap und Beanie neu.
  // Farben im Spreadshop: Shirt und Hoodie Schwarz + Weiß, Cap Schwarz + Weiß/Schwarz, Regenjacke und Beanie nur Schwarz.
  {
    id: 'logo-cap', isNew: true,
    name: { de: 'Palm Bandits Snapback Cap', en: 'Palm Bandits Snapback Cap' },
    type: { de: 'Snapback Cap · Schwarz', en: 'Snapback cap · Black' },
    path: LOGO, sellable: '5wdQqnbok8S0z0m1yZ4Z-905-34', appearance: 14,
    img: 'T905A14PA1890PT32X0Y11D360811485W14197H3719', price: 18.49,
  },
  {
    id: 'logo-beanie', isNew: true,
    name: { de: 'Palm Bandits Beanie', en: 'Palm Bandits Beanie' },
    type: { de: 'Recycelte Patch-Beanie · Schwarz', en: 'Recycled patch beanie · Black' },
    path: LOGO, sellable: '5wdQqnbok8S0z0m1yZ4Z-3339-36', appearance: 2,
    img: 'T3339A2PA8044PT32X0Y13D360811485W8998H2357', price: 17.99,
  },
];

// Nicht (mehr) kaufbare Designs: entfernte + noch in Prüfung (soon)
export const merchDeadIds = () => [
  ...REMOVED_DESIGNS,
  ...MERCH_ITEMS.filter((m) => m.soon).map((m) => m.path.match(/-A([0-9a-f]{24})/)?.[1] ?? '').filter(Boolean),
];

export const merchImage = (m: MerchItem, size = 600) =>
  `https://image.spreadshirtmedia.net/image-server/v1/products/${m.img}/views/${m.view ?? 1}/palm-bandits-${m.id}.png?width=${size}&height=${size}&appearanceId=${m.appearance}`;

// Kaufen öffnet den eingebetteten Spreadshop auf /shop/ direkt beim Produkt (wie auf eldruna.com)
export const merchRoute = (m: MerchItem) => `#!${m.path}?sellable=${encodeURIComponent(m.sellable)}&appearance=${m.appearance}`;

export const merchPrice = (p: number, lang: 'de' | 'en') =>
  lang === 'en' ? `€${p.toFixed(2)}` : `${p.toFixed(2).replace('.', ',')} €`;
