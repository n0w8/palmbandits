// Cheat des Tages: gleiche Auswahl fuer Discord (daily.mjs) und Reels (social/), damit alles zusammenpasst.
import { loadContent } from '../pinterest/content.mjs';

// feste, aber gut gemischte Reihenfolge: jeder Cheat kommt dran, bevor sich etwas wiederholt
export function pickCheat(all, date = new Date()) {
  if (!all?.length) return null;
  const day = Math.floor(date.getTime() / 86_400_000);
  return all[(day * 7919) % all.length];
}

export function cheatOfTheDay(date = new Date(), useFixtures = false) {
  return pickCheat(loadContent(useFixtures).cheats, date);
}
