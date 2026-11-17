// Zeigt die Rollen des Servers in der Reihenfolge, die Discord gerade hat (nur lesen, aendert nichts).
// Aufruf: node discord/roles.mjs   (braucht DISCORD_BOT_TOKEN und DISCORD_GUILD_ID)
import { env, loadDotEnv } from '../lib/util.mjs';
import { api } from './api.mjs';

loadDotEnv();
const gid = env('DISCORD_GUILD_ID');
if (!env('DISCORD_BOT_TOKEN') || !gid) {
  console.log('DISCORD_BOT_TOKEN oder DISCORD_GUILD_ID fehlt.');
  process.exit(1);
}
const me = await api('GET', '/users/@me');
const member = await api('GET', `/guilds/${gid}/members/${me.id}`);
const roles = (await api('GET', `/guilds/${gid}/roles`)).sort((a, b) => b.position - a.position);
console.log(`Bot: ${me.username}, Rollen des Bots: ${member.roles.length}`);
for (const r of roles) {
  const mark = member.roles.includes(r.id) ? '  <-- Bot' : r.managed ? '  (verwaltet)' : '';
  console.log(`${String(r.position).padStart(3)}  ${r.name}${mark}`);
}
