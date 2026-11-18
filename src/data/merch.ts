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
];

// PALM BANDITS Hase (seit 18.11.2026, Mike: "mach mal nur ein hasenkopf als design", Entwurf A): nur Schwarz.
// Mike danach: "den haasen am short kleiner und am rücken oben beim kragen immer die 5 sterne" -> Shirt-Motiv von 28 auf 20 cm
// (Hoodie bleibt 18,4 cm). Die Sterne hinten brauchen ein neues Design (Upload-Limit 18.11. erreicht) -> am 19.11. als
// neue Kombi (vorne Hase, hinten 5 Sterne am Kragen) anlegen und path/sellable/img hier tauschen.
// Druck v1 hat am Unterkinn einen halbtransparenten Schleier (QA: Freigabe mit kleinen Mängeln), v2 nicht freigegeben.
// soon: Spreadshirt prüft das Design noch ("Wird geprüft"), bis dahin ist es im Shop unsichtbar.
const HASE = '/palm+bandits+hase-A6afd3061855804508a86a421';

export const MERCH_ITEMS: MerchItem[] = [
  {
    id: 'hase-hoodie', name: { de: 'Hasen Hoodie', en: 'Bunny Hoodie' },
    type: { de: 'Oversized Heavyweight Hoodie · Schwarz', en: 'Oversized heavyweight hoodie · Black' },
    path: HASE, sellable: '0kdjDJvVaeS040704j5p-2963-22', appearance: 1257, price: 39.99, isNew: true, soon: true,
    img: 'T2963A1257PA9736PT17X98Y3D360822839W18399H26344',
  },
  {
    id: 'hase-tee', name: { de: 'Hasen Shirt', en: 'Bunny Tee' },
    type: { de: 'Oversized Heavyweight T-Shirt · Schwarz', en: 'Oversized heavyweight tee · Black' },
    path: HASE, sellable: '0kdjDJvVaeS040704j5p-3502-7', appearance: 2, price: 26.99, isNew: true, soon: true,
    img: 'T3502A2PA8089PT17X90Y34D360822839W20000H28636',
  },
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
