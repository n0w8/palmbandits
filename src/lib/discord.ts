// Live-Zahlen des Discord-Servers, beim Bauen der Seite abgefragt (oeffentliche Einladungs-API, kein Token).
// Jeder Bot-Commit baut die Seite neu, die Zahlen bleiben also aktuell.
import { SITE } from '../config';

export const SHOW_COUNT_FROM = 100; // kleinere Zahlen wirken eher abschreckend, deshalb erst ab hier anzeigen
export const OG_LIMIT = 1000;

export interface DiscordStats { members: number; online: number }
let cache: Promise<DiscordStats | null> | null = null;

export function discordStats(): Promise<DiscordStats | null> {
  if (cache) return cache;
  const code = SITE.discord.match(/discord\.gg\/([\w-]+)/)?.[1];
  if (!code) return (cache = Promise.resolve(null));
  cache = fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, { signal: AbortSignal.timeout(5000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (j ? { members: j.approximate_member_count ?? 0, online: j.approximate_presence_count ?? 0 } : null))
    .catch(() => null);
  return cache;
}

export const fmtNum = (n: number) => new Intl.NumberFormat('de-DE').format(n);
