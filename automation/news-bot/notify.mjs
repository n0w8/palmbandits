// Optionale Benachrichtigung in den eigenen Discord-Kanal (nur wenn DISCORD_WEBHOOK_URL gesetzt ist).
// Der Bot postet nur in den eigenen Kanal, er kommentiert nirgends bei fremden Leuten.
import { env, truncate, BRAND } from '../lib/util.mjs';

const COLORS = { green: 0x19e3c8, yellow: 0xffd23f, red: 0xff2d87 };
const withUtm = (u) => `${u}${u.includes('?') ? '&' : '?'}utm_source=discord&utm_medium=social&utm_campaign=news`;

// Kanal-Wahl: GTA 6 -> #gta6-news, GTA Online -> #online-news, Rest -> #gta-news, Freigaben -> privater Team-Kanal.
// Faellt auf DISCORD_WEBHOOK_URL zurueck, wenn ein Kanal-Webhook fehlt.
function hookFor(channel, game) {
  if (channel === 'staff') return env('DISCORD_WEBHOOK_STAFF'); // Freigabe-Links nie oeffentlich posten
  const byGame = { 'gta-6': env('DISCORD_WEBHOOK_GTA6'), 'gta-online': env('DISCORD_WEBHOOK_ONLINE') };
  return byGame[game] || env('DISCORD_WEBHOOK_NEWS') || env('DISCORD_WEBHOOK_URL');
}

export async function discord({ title, url, description, color = 'green', footer, fields = [], game, channel = 'news', ping = false }) {
  const hook = hookFor(channel, game);
  if (!hook) return false;
  // Rollen-Ping nur bei Breaking News (Rolle "News-Alarm") bzw. GTA-Online-Weekly (Rolle "Weekly-Update")
  const role = ping ? (game === 'gta-online' ? env('DISCORD_ROLE_WEEKLY') : env('DISCORD_ROLE_ALERT')) : undefined;
  const body = {
    username: `${BRAND} Newsdesk`,
    content: role ? `<@&${role}>` : undefined,
    allowed_mentions: role ? { roles: [role] } : { parse: [] },
    embeds: [{
      title: truncate(title, 250),
      url,
      description: truncate(description ?? '', 1000),
      color: COLORS[color] ?? COLORS.green,
      fields: fields.slice(0, 5).map((f) => ({ name: truncate(f.name, 250), value: truncate(f.value, 1000) || '-', inline: !!f.inline })),
      footer: footer ? { text: truncate(footer, 200) } : undefined,
      timestamp: new Date().toISOString(),
    }],
    // Link-Button zur Website (bringt Klicks statt nur Vorschau)
    components: url && channel !== 'staff' ? [{ type: 1, components: [{ type: 2, style: 5, label: 'Ganzen Artikel lesen', url: withUtm(url) }] }] : undefined,
  };
  try {
    const res = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn(`Discord: HTTP ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn(`Discord: ${err.message}`);
    return false;
  }
}

// Aufruf aus dem Workflow: node news-bot/notify.mjs "<Titel>" "<URL>" "<Text>" [green|yellow]
if (process.argv[1]?.replace(/\\/g, '/').endsWith('news-bot/notify.mjs')) {
  const [title, url, description, color] = process.argv.slice(2);
  if (title) await discord({ title, url, description, color: color ?? 'yellow', channel: 'staff' });
}
