// Text fuer den Freigabe-Pull-Request eines Radar-Guides (auf Deutsch, fuer das Handy gedacht).
const GAME_NAMES = {
  'gta-6': 'GTA 6', 'gta-online': 'GTA Online', 'gta-5': 'GTA 5', 'gta-4': 'GTA 4',
  'gta-san-andreas': 'GTA San Andreas', 'gta-vice-city': 'GTA Vice City', 'gta-3': 'GTA 3', allgemein: 'Allgemein',
};
const CATEGORY_NAMES = {
  geld: 'Geld', fundorte: 'Fundorte', glitches: 'Glitches', cheats: 'Cheats', tipps: 'Tipps', 'easter-eggs': 'Easter Eggs', wissen: 'Wissen',
};

export function prTitle(meta) {
  return `Guide-Freigabe: ${meta.title}`;
}

export function buildPrBody(meta) {
  const src = meta.promptSources ?? [];
  const nameOf = (nr) => {
    const s = src[nr - 1];
    return s ? `[${nr}] ${s.name}` : `[${nr}]`;
  };
  const lines = [
    '**Guide-Radar: neuer Guide-Entwurf.** Er geht erst online, wenn du ihn freigibst.',
    '',
    `Warum: ${meta.reason ?? 'unbekannt'}${meta.score != null ? ` (Radar-Punkte ${meta.score})` : ''}`,
    `Spiel: ${GAME_NAMES[meta.game] ?? meta.game} · Kategorie: ${CATEGORY_NAMES[meta.category] ?? meta.category}${meta.keyword ? ` · Suchwort: "${meta.keyword}"` : ''}`,
    '',
    meta.en
      ? `**Zweisprachig:** Dieser Pull Request enthält den deutschen und den englischen Guide ("${meta.en.title}"). Beim Merge gehen beide online, beim Close keiner.`
      : '**Nur Deutsch:** Eine englische Fassung gibt es für diesen Guide nicht.',
    '',
  ];
  if (meta.exploitRisk) {
    lines.push('> **Achtung, Glitch in GTA Online:** Der Guide darf nur erklären, was der Glitch ist und welches Ban- oder Reset-Risiko besteht. Keine Schritte zum Nachmachen. Im Zweifel: Close.', '');
  }
  if (meta.warnings?.length) {
    lines.push('**Hinweise vom Bot:**', ...meta.warnings.map((w) => `- ${w}`), '');
  }
  if (meta.belege?.length) {
    lines.push('**Belege (bitte mit den Quellen vergleichen):**');
    for (const b of meta.belege) lines.push(`- ${b.fakt}${b.quellen?.length ? ` (${b.quellen.map(nameOf).join(', ')})` : ' (OHNE QUELLE, bitte prüfen)'}`);
    lines.push('');
  }
  if (src.length) {
    lines.push('**Quellen, die Claude bekommen hat:**', ...src.map((s, i) => `${i + 1}. [${s.name}](${s.url})`), '');
  } else if (meta.sources?.length) {
    lines.push('**Quellen:**', ...meta.sources.map((s, i) => `${i + 1}. [${s.name}](${s.url})`), '');
  }
  lines.push(
    '**Checkliste vor dem Mergen:**',
    '- [ ] Fakten mit Quellen verglichen',
    '- [ ] Keine Exploit-Anleitung (keine Schritte für Geld- oder Dupe-Glitches in GTA Online)',
    '- [ ] Nichts erfunden, offene Punkte stehen unter "Was noch unklar ist"',
    '- [ ] Titel und Beschreibung passen, kein Clickbait',
    ...(meta.en ? ['- [ ] Englische Fassung überflogen: gleiche Fakten, nichts dazuerfunden'] : []),
    '',
    `Spätere Adresse: ${meta.url ?? ''}`,
    ...(meta.en ? [`Englisch: ${meta.en.url}`] : []),
    '',
    '---',
    '**So gibst du frei:** Reiter "Files changed" öffnen und den Guide lesen (deutsch und englisch), Belege oben mit den Quellen vergleichen, Häkchen setzen, dann **Merge pull request**. Cloudflare baut die Seite danach automatisch neu.',
    '**Nicht veröffentlichen:** **Close pull request**. Der Radar schlägt das Thema 30 Tage lang nicht noch einmal vor.',
    '**Ändern:** Datei öffnen, Stift-Symbol, Text korrigieren, speichern (Commit), dann Merge.',
  );
  return lines.join('\n');
}
