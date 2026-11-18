// Merch aus dem Spreadshop "palmbandits" (https://palmbandits.myspreadshop.at), Stand 18.11.2026 (Umbau: vorne Figur, hinten 5 Sterne + NORDWALD-Logo).
// Reihenfolge = Reihenfolge auf der Seite. Die Startseite zeigt die ersten 6.
// Werte aus der Produktliste des Spreadshops (/all):
// - path       = Produktpfad im Spreadshop (/<slug>-A<designId>)
// - sellable   = Token aus dem Produkt-Link (?sellable=...)
// - appearance = Farb-ID (Shirt/Windbreaker schwarz = 2, Hoodie schwarz = 1257)
// - img        = Produkt-ID des Spreadshirt-Bildservers (image.spreadshirtmedia.net/image-server/v1/products/<img>/views/<view>/...)
// - view       = Ansicht fuer das Bild: 1 = vorne (Standard), 2 = hinten (Nordwald: Figur auf dem Ruecken)
// Preise in EUR inkl. MwSt. wie im Spreadshop.
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
}

const LOGO = '/palm+bandits+logo-A6afbe0a6855804508a0fa2b9';
const ELDRUNA = '/eldruna+nordwald-A6afce57c855804508a521a1d';
// Nordwald Collection (seit 18.11.2026): vorne die Figur (Bild = Ansicht 1), hinten 5 Sterne + NORDWALD-Logo.
// Eldruna: das neue Design hat Spreadshirt am 18.11.2026 abgelehnt ("Community Standards"), deshalb läuft die alte Version
// weiter (vorne kleines Nordwald-Logo, hinten die Figur -> Bild = Ansicht 2). Mike: "Alte Version wieder an".
const NW_HOODIE = { de: 'Nordwald Collection · Hoodie · Schwarz', en: 'Nordwald Collection · Hoodie · Black' };
const NW_TEE = { de: 'Nordwald Collection · Shirt · Schwarz', en: 'Nordwald Collection · Tee · Black' };

// PALM BANDITS Hase (seit 18.11.2026, Mike: "mach mal nur ein hasenkopf als design", Entwurf A): nur vorne, nur Schwarz.
// Druck v1 hat am Unterkinn einen halbtransparenten Schleier; die korrigierte v2 (merch/nordwald/druck-hasenkopf-v2.png)
// kommt hoch, sobald das Spreadshirt-Tageslimit für Uploads wieder frei ist. Dann path/sellable/img hier tauschen.
const HASE = '/palm+bandits+hase-A6afd3061855804508a86a421';

export const MERCH_ITEMS: MerchItem[] = [
  {
    id: 'hase-hoodie', name: { de: 'Hasen Hoodie', en: 'Bunny Hoodie' },
    type: { de: 'Oversized Heavyweight Hoodie · Schwarz', en: 'Oversized heavyweight hoodie · Black' },
    path: HASE, sellable: '0kdjDJvVaeS040704j5p-2963-22', appearance: 1257, price: 39.99, isNew: true,
    img: 'T2963A1257PA9736PT17X98Y3D360822839W18399H26344',
  },
  {
    id: 'hase-tee', name: { de: 'Hasen Shirt', en: 'Bunny Tee' },
    type: { de: 'Oversized Heavyweight T-Shirt · Schwarz', en: 'Oversized heavyweight tee · Black' },
    path: HASE, sellable: '0kdjDJvVaeS040704j5p-3502-7', appearance: 2, price: 26.99, isNew: true,
    img: 'T3502A2PA8089PT17X50Y34D360822839W27999H40090',
  },
  {
    id: 'domsgard-hoodie', name: { de: 'Domsgard Hoodie', en: 'Domsgard Hoodie' }, type: NW_HOODIE,
    path: '/domsgard+nordwald-A6afd107e83173c19cab0830e', sellable: 'nA0EDz3YXbSk01LXqg9o-2963-22', appearance: 1257, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X65Y11D360822668W25000H15642PA9736PT17X86Y3D360822669W20799H26400',
  },
  {
    id: 'skulgard-tee', name: { de: 'Skulgard Shirt', en: 'Skulgard Tee' }, type: NW_TEE,
    path: '/skulgard+nordwald-A6afd10b1855804508a063046', sellable: 'x50kqpZYNjCApAOoOLbr-3502-7', appearance: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X50Y29D360822717W27999H38505PA8090PT17X66Y13D360822668W25000H15642',
  },
  {
    id: 'ravhena-hoodie', name: { de: 'Ravhena Hoodie', en: 'Ravhena Hoodie' }, type: NW_HOODIE,
    path: '/ravhena+nordwald-A6afd109e855804508a05e736', sellable: '40dnv4Nb92f0E0aBa0eZ-2963-22', appearance: 1257, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X65Y11D360822668W25000H15642PA9736PT17X93Y3D360822718W19299H26376',
  },
  {
    id: 'pronx-tee', name: { de: 'PRONX Shirt', en: 'PRONX Tee' }, type: NW_TEE,
    path: '/pronx+nordwald-A6afd109213bea62fcab420d0', sellable: 'x50kqEEdkzIeXweAnR9l-3502-7', appearance: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X50Y34D360822716W27999H36161PA8090PT17X66Y13D360822668W25000H15642',
  },
  {
    id: 'skaedra-hoodie', name: { de: 'Skaedra Hoodie', en: 'Skaedra Hoodie' }, type: NW_HOODIE,
    path: '/skaedra+nordwald-A6afd105e13bea62fcab35dbd', sellable: 'zv0mpQkEOzclwGldvabe-2963-22', appearance: 1257, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X65Y11D360822668W25000H15642PA9736PT17X83Y3D360822714W21399H26361',
  },
  {
    id: 'runvyr-tee', name: { de: 'Runvyr Shirt', en: 'Runvyr Tee' }, type: NW_TEE,
    path: '/runvyr+nordwald-A6afd107283173c19cab04cb9', sellable: '9OgJ7pzZVXT4N7ZlBJxX-3502-7', appearance: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X50Y37D360822670W27999H34761PA8090PT17X66Y13D360822668W25000H15642',
  },
  {
    id: 'ravnir-hoodie', name: { de: 'Ravnir Hoodie', en: 'Ravnir Hoodie' }, type: NW_HOODIE,
    path: '/ravnir+nordwald-A6afd10bc83173c19cab184f6', sellable: '0kdj90kmGafrE9DNBbwY-2963-22', appearance: 1257, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X65Y12D360822668W25000H15642PA9736PT17X96Y3D360822715W18799H26380',
  },
  {
    id: 'eldruna-hoodie', name: { de: 'Eldruna Hoodie', en: 'Eldruna Hoodie' }, type: NW_HOODIE,
    path: ELDRUNA, sellable: 'zv0mb5eO7YHdZd1ydvYe-2963-22', appearance: 1257, view: 2, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X20Y31D360822225W33999H41763PA9736PT17X204Y25D360822278W11000H9166',
  },
  {
    id: 'domsgard-tee', name: { de: 'Domsgard Shirt', en: 'Domsgard Tee' }, type: NW_TEE,
    path: '/domsgard+nordwald-A6afd107e83173c19cab0830e', sellable: 'nA0EDz3YXbSk01LXqg9o-3502-7', appearance: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X50Y26D360822669W27999H35539PA8090PT17X66Y13D360822668W25000H15642',
  },
  {
    id: 'skulgard-hoodie', name: { de: 'Skulgard Hoodie', en: 'Skulgard Hoodie' }, type: NW_HOODIE,
    path: '/skulgard+nordwald-A6afd10b1855804508a063046', sellable: 'x50kqpZYNjCApAOoOLbr-2963-22', appearance: 1257, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X65Y11D360822668W25000H15642PA9736PT17X94Y3D360822717W19199H26402',
  },
  {
    id: 'ravhena-tee', name: { de: 'Ravhena Shirt', en: 'Ravhena Tee' }, type: NW_TEE,
    path: '/ravhena+nordwald-A6afd109e855804508a05e736', sellable: '40dnv4Nb92f0E0aBa0eZ-3502-7', appearance: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X50Y29D360822718W27999H38266PA8090PT17X66Y13D360822668W25000H15642',
  },
  {
    id: 'pronx-hoodie', name: { de: 'PRONX Hoodie', en: 'PRONX Hoodie' }, type: NW_HOODIE,
    path: '/pronx+nordwald-A6afd109213bea62fcab420d0', sellable: 'x50kqEEdkzIeXweAnR9l-2963-22', appearance: 1257, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X65Y11D360822668W25000H15642PA9736PT17X88Y3D360822716W20399H26345',
  },
  {
    id: 'skaedra-tee', name: { de: 'Skaedra Shirt', en: 'Skaedra Tee' }, type: NW_TEE,
    path: '/skaedra+nordwald-A6afd105e13bea62fcab35dbd', sellable: 'zv0mpQkEOzclwGldvabe-3502-7', appearance: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X50Y37D360822714W27999H34491PA8090PT17X66Y13D360822668W25000H15642',
  },
  {
    id: 'runvyr-hoodie', name: { de: 'Runvyr Hoodie', en: 'Runvyr Hoodie' }, type: NW_HOODIE,
    path: '/runvyr+nordwald-A6afd107283173c19cab04cb9', sellable: '9OgJ7pzZVXT4N7ZlBJxX-2963-22', appearance: 1257, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X65Y11D360822668W25000H15642PA9736PT17X83Y3D360822670W21299H26443',
  },
  {
    id: 'ravnir-tee', name: { de: 'Ravnir Shirt', en: 'Ravnir Tee' }, type: NW_TEE,
    path: '/ravnir+nordwald-A6afd10bc83173c19cab184f6', sellable: '0kdj90kmGafrE9DNBbwY-3502-7', appearance: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X50Y33D360822715W27999H39289PA8090PT17X66Y14D360822668W25000H15642',
  },
  {
    id: 'eldruna-tee', name: { de: 'Eldruna Shirt', en: 'Eldruna Tee' }, type: NW_TEE,
    path: ELDRUNA, sellable: 'zv0mb5eO7YHdZd1ydvYe-3502-7', appearance: 2, view: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X222Y36D360822278W11000H9166PA8090PT17X21Y33D360822225W33999H41763',
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

export const merchImage = (m: MerchItem, size = 600) =>
  `https://image.spreadshirtmedia.net/image-server/v1/products/${m.img}/views/${m.view ?? 1}/palm-bandits-${m.id}.png?width=${size}&height=${size}&appearanceId=${m.appearance}`;

// Kaufen öffnet den eingebetteten Spreadshop auf /shop/ direkt beim Produkt (wie auf eldruna.com)
export const merchRoute = (m: MerchItem) => `#!${m.path}?sellable=${encodeURIComponent(m.sellable)}&appearance=${m.appearance}`;

export const merchPrice = (p: number, lang: 'de' | 'en') =>
  lang === 'en' ? `€${p.toFixed(2)}` : `${p.toFixed(2).replace('.', ',')} €`;
