// Merch aus dem Spreadshop "palmbandits" (https://palmbandits.myspreadshop.at), Stand 17.11.2026.
// Neue Produkte VORN einfügen. Werte aus der Produktliste des Spreadshops (/all):
// - path       = Produktpfad im Spreadshop (/<slug>-A<designId>)
// - sellable   = Token aus dem Produkt-Link (?sellable=...)
// - appearance = Farb-ID (Shirt/Windbreaker schwarz = 2, Hoodie schwarz = 1257)
// - img        = Produkt-ID des Spreadshirt-Bildservers (image.spreadshirtmedia.net/image-server/v1/products/<img>/views/1/...)
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
  isNew?: boolean;
}

const LOGO = '/palm+bandits+logo-A6afbe0a6855804508a0fa2b9';

export const MERCH_ITEMS: MerchItem[] = [
  {
    id: 'logo-hoodie',
    name: { de: 'Palm Bandits Logo Hoodie', en: 'Palm Bandits Logo Hoodie' },
    type: { de: 'Oversized Heavyweight Hoodie · Schwarz', en: 'Oversized heavyweight hoodie · Black' },
    path: LOGO, sellable: '5wdQqnbok8S0z0m1yZ4Z-2963-22', appearance: 1257,
    img: 'T2963A1257PA9736PT17X65Y37D360811485W25000H6550', price: 39.99, isNew: true,
  },
  {
    id: 'logo-tee',
    name: { de: 'Palm Bandits Logo Shirt', en: 'Palm Bandits Logo Tee' },
    type: { de: 'Oversized Heavyweight T-Shirt · Schwarz', en: 'Oversized heavyweight tee · Black' },
    path: LOGO, sellable: '5wdQqnbok8S0z0m1yZ4Z-3502-7', appearance: 2,
    img: 'T3502A2PA8089PT17X65Y118D360811485W25000H6550', price: 26.99, isNew: true,
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
  `https://image.spreadshirtmedia.net/image-server/v1/products/${m.img}/views/1/palm-bandits-${m.id}.png?width=${size}&height=${size}&appearanceId=${m.appearance}`;

// Kaufen öffnet den eingebetteten Spreadshop auf /shop/ direkt beim Produkt (wie auf eldruna.com)
export const merchRoute = (m: MerchItem) => `#!${m.path}?sellable=${encodeURIComponent(m.sellable)}&appearance=${m.appearance}`;

export const merchPrice = (p: number, lang: 'de' | 'en') =>
  lang === 'en' ? `€${p.toFixed(2)}` : `${p.toFixed(2).replace('.', ',')} €`;
