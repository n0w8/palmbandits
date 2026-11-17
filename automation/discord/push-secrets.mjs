// Uebertraegt Bot-Token, Server-ID und Webhook-URLs als GitHub-Secrets, ohne sie anzuzeigen.
// Aufruf (nachdem das Repo existiert): node discord/push-secrets.mjs <besitzer/repo>
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { AUTOMATION_DIR, env, loadDotEnv } from '../lib/util.mjs';

loadDotEnv();
const repo = process.argv[2];
if (!repo) { console.log('Aufruf: node discord/push-secrets.mjs <besitzer/repo>'); process.exit(1); }
const secrets = JSON.parse(readFileSync(path.join(AUTOMATION_DIR, 'discord', '.secrets.json'), 'utf8'));
const stateFile = path.join(AUTOMATION_DIR, 'discord', 'state.json');
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};

const MAP = { news6: 'DISCORD_WEBHOOK_GTA6', newsOnline: 'DISCORD_WEBHOOK_ONLINE', newsAll: 'DISCORD_WEBHOOK_NEWS', cheats: 'DISCORD_WEBHOOK_CHEATS', approvals: 'DISCORD_WEBHOOK_STAFF' };
const items = Object.entries(MAP).filter(([k]) => secrets.webhooks?.[k]).map(([k, name]) => [name, secrets.webhooks[k]]);
if (env('DISCORD_BOT_TOKEN')) items.push(['DISCORD_BOT_TOKEN', env('DISCORD_BOT_TOKEN')]);

function set(name, value) {
  const r = spawnSync('gh', ['secret', 'set', name, '--repo', repo], { input: value, encoding: 'utf8' });
  console.log(`${r.status === 0 ? 'OK  ' : 'FEHLER'} ${name}${r.status === 0 ? '' : `: ${r.stderr.trim().slice(0, 160)}`}`);
}
function setVar(name, value) {
  const r = spawnSync('gh', ['variable', 'set', name, '--repo', repo, '--body', value], { encoding: 'utf8' });
  console.log(`${r.status === 0 ? 'OK  ' : 'FEHLER'} Variable ${name}`);
}
for (const [name, value] of items) set(name, value);
if (state.guildId) setVar('DISCORD_GUILD_ID', state.guildId);
if (state.roles?.pingNews) setVar('DISCORD_ROLE_ALERT', state.roles.pingNews);
if (state.roles?.pingWeekly) setVar('DISCORD_ROLE_WEEKLY', state.roles.pingWeekly);
