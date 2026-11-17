// Merch aus dem Spreadshop "palmbandits" (https://palmbandits.myspreadshop.at), Stand 18.11.2026.
// Reihenfolge = Reihenfolge auf der Seite. Die Startseite zeigt die ersten 6 (je Figur ein Teil + Logo-Hoodie und -Shirt).
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
const SKAEDRA = '/skaedra+nordwald-A6afce59613bea62fca067c9d';
const RUNVYR = '/runvyr+nordwald-A6afce5b783173c19ca03cc7e';
const DOMSGARD = '/domsgard+nordwald-A6afce5d1855804508a538748';

const NW_HOODIE = { de: 'Nordwald Collection · Hoodie · Schwarz', en: 'Nordwald Collection · Hoodie · Black' };
const NW_TEE = { de: 'Nordwald Collection · Shirt · Schwarz', en: 'Nordwald Collection · Tee · Black' };

export const MERCH_ITEMS: MerchItem[] = [
  {
    id: 'eldruna-hoodie', name: { de: 'Eldruna Hoodie', en: 'Eldruna Hoodie' }, type: NW_HOODIE,
    path: ELDRUNA, sellable: 'zv0mb5eO7YHdZd1ydvYe-2963-22', appearance: 1257, view: 2, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X20Y31D360822225W33999H41763PA9736PT17X204Y25D360822278W11000H9166',
  },
  {
    id: 'domsgard-tee', name: { de: 'Domsgard Shirt', en: 'Domsgard Tee' }, type: NW_TEE,
    path: DOMSGARD, sellable: 'J12RY85eDBtmLmaxb0q0-3502-7', appearance: 2, view: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X204Y36D360822278W11000H9166PA8090PT17X21Y43D360822307W33999H39734',
  },
  {
    id: 'skaedra-hoodie', name: { de: 'Skaedra Hoodie', en: 'Skaedra Hoodie' }, type: NW_HOODIE,
    path: SKAEDRA, sellable: 'Qwvqa7Myr3uXbeXOm3LN-2963-22', appearance: 1257, view: 2, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X20Y28D360822226W33999H42443PA9736PT17X221Y25D360822278W11000H9166',
  },
  {
    id: 'runvyr-tee', name: { de: 'Runvyr Shirt', en: 'Runvyr Tee' }, type: NW_TEE,
    path: RUNVYR, sellable: 'pNe7A3ZB88Tn5kbXqjmQ-3502-7', appearance: 2, view: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X222Y36D360822278W11000H9166PA8090PT17X21Y28D360822308W34000H42738',
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
    id: 'eldruna-tee', name: { de: 'Eldruna Shirt', en: 'Eldruna Tee' }, type: NW_TEE,
    path: ELDRUNA, sellable: 'zv0mb5eO7YHdZd1ydvYe-3502-7', appearance: 2, view: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X222Y36D360822278W11000H9166PA8090PT17X21Y33D360822225W33999H41763',
  },
  {
    id: 'domsgard-hoodie', name: { de: 'Domsgard Hoodie', en: 'Domsgard Hoodie' }, type: NW_HOODIE,
    path: DOMSGARD, sellable: 'J12RY85eDBtmLmaxb0q0-2963-22', appearance: 1257, view: 2, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X20Y41D360822307W33999H39734PA9736PT17X221Y25D360822278W11000H9166',
  },
  {
    id: 'skaedra-tee', name: { de: 'Skaedra Shirt', en: 'Skaedra Tee' }, type: NW_TEE,
    path: SKAEDRA, sellable: 'Qwvqa7Myr3uXbeXOm3LN-3502-7', appearance: 2, view: 2, price: 32.99, isNew: true,
    img: 'T3502A2PA8089PT17X222Y36D360822278W11000H9166PA8090PT17X21Y29D360822226W33999H42443',
  },
  {
    id: 'runvyr-hoodie', name: { de: 'Runvyr Hoodie', en: 'Runvyr Hoodie' }, type: NW_HOODIE,
    path: RUNVYR, sellable: 'pNe7A3ZB88Tn5kbXqjmQ-2963-22', appearance: 1257, view: 2, price: 45.99, isNew: true,
    img: 'T2963A1257PA9737PT17X20Y26D360822308W34000H42738PA9736PT17X221Y25D360822278W11000H9166',
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
