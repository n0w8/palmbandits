// Zweisprachigkeit: Deutsch (Standard, ohne Prefix) und Englisch unter /en/.
// Alle UI-Texte stehen in ui.ts, Pfade werden hier zwischen den Sprachen umgerechnet.
export type Lang = 'de' | 'en';
export const LANGS: Lang[] = ['de', 'en'];
export const LOCALE: Record<Lang, string> = { de: 'de-DE', en: 'en-GB' };
export const OG_LOCALE: Record<Lang, string> = { de: 'de_DE', en: 'en_GB' };

export function langFromUrl(url: URL): Lang {
  return url.pathname === '/en' || url.pathname.startsWith('/en/') ? 'en' : 'de';
}

// Kategorie-Slugs (intern Deutsch, in der URL je Sprache)
export const CAT_EN: Record<string, string> = {
  geld: 'money', fundorte: 'locations', glitches: 'glitches',
  'easter-eggs': 'easter-eggs', tipps: 'tips', wissen: 'lore',
};
export const CAT_DE = Object.fromEntries(Object.entries(CAT_EN).map(([k, v]) => [v, k]));

/** Wandelt einen deutschen Pfad in den Pfad der Zielsprache um (ohne Artikel-Slugs). */
export function href(lang: Lang, dePath: string): string {
  if (lang === 'de') return dePath;
  if (dePath.startsWith('http') || dePath.startsWith('#') || dePath.startsWith('mailto:')) return dePath;
  let p = dePath;
  p = p.replace(/^\/spiele\//, '/games/');
  p = p.replace(/^\/guides\/kategorie\/([^/]+)\//, (_, c) => `/guides/category/${CAT_EN[c] ?? c}/`);
  if (p === '/impressum/' || p === '/datenschutz/') return p; // Rechtstexte gibt es nur auf Deutsch
  return p === '/' ? '/en/' : `/en${p}`;
}

/** Englischer Pfad zurueck auf Deutsch (fuer den Sprachumschalter). */
export function deFromEn(enPath: string): string {
  let p = enPath.replace(/^\/en(?=\/|$)/, '') || '/';
  p = p.replace(/^\/games\//, '/spiele/');
  p = p.replace(/^\/guides\/category\/([^/]+)\//, (_, c) => `/guides/kategorie/${CAT_DE[c] ?? c}/`);
  return p;
}

export function fmtDateL(lang: Lang, d: Date, withTime = false) {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Europe/Berlin',
  }).format(d);
}

export { ui, useT } from './ui';
