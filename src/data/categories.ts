export const CATEGORIES = [
  { slug: 'geld', label: 'Geld machen', short: 'Geld', icon: 'cash', text: 'Millionen in GTA Online und Story-Modus, legal und ohne Ban-Risiko.' },
  { slug: 'fundorte', label: 'Versteckte Orte', short: 'Fundorte', icon: 'pin', text: 'Geheime Plätze, UFOs, Geister und Orte, die kaum jemand kennt.' },
  { slug: 'glitches', label: 'Glitches', short: 'Glitches', icon: 'glitch', text: 'Was funktioniert, was gepatcht ist und was dich den Account kostet.' },
  { slug: 'easter-eggs', label: 'Easter Eggs', short: 'Easter Eggs', icon: 'egg', text: 'Mythen, Anspielungen und Rockstars versteckte Witze.' },
  { slug: 'tipps', label: 'Tipps & Tricks', short: 'Tipps', icon: 'bolt', text: 'Spar dir Stunden: Profi-Tipps für Einsteiger und Veteranen.' },
  { slug: 'wissen', label: 'Hintergrund', short: 'Wissen', icon: 'book', text: 'Story, Map, Figuren und alles, was offiziell bestätigt ist.' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

export function getCategory(slug: string) {
  // Fallback ist immer "Tipps & Tricks", unabhaengig von der Reihenfolge der Liste
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES.find((c) => c.slug === 'tipps')!;
}

const CAT_EN_TEXT: Record<string, { label: string; short: string; text: string }> = {
  geld: { label: 'Make money', short: 'Money', text: 'Millions in GTA Online and story mode, legit and without ban risk.' },
  fundorte: { label: 'Secret locations', short: 'Locations', text: 'Hidden spots, UFOs, ghosts and places almost nobody knows.' },
  glitches: { label: 'Glitches', short: 'Glitches', text: 'What works, what got patched and what costs you your account.' },
  'easter-eggs': { label: 'Easter eggs', short: 'Easter eggs', text: "Myths, references and Rockstar's hidden jokes." },
  tipps: { label: 'Tips & tricks', short: 'Tips', text: 'Save hours: pro tips for newcomers and veterans.' },
  wissen: { label: 'Lore & facts', short: 'Lore', text: 'Story, map, characters and everything officially confirmed.' },
};

/** Kategorie mit Texten in der gewuenschten Sprache */
export function catL(slug: string, lang: 'de' | 'en') {
  const c = getCategory(slug);
  return lang === 'en' ? { ...c, ...CAT_EN_TEXT[c.slug] } : c;
}
