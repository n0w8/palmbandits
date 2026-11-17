// Taegliche/stuendliche Discord-Automatik (laeuft auf GitHub Actions, kein eigener Bot-Server noetig).
//   node discord/daily.mjs cheat    -> "Cheat des Tages" in #cheats-und-tricks (Webhook DISCORD_WEBHOOK_CHEATS)
//   node discord/daily.mjs badges   -> stuendlich alle automatischen Rollen:
//                                      OG (erste 1.000), Day One (Beitritt bis Stichtag), Guide-Helfer (Name im Artikel)
//                                      und Fahndungslevel-Sterne nach Aktivitaet (siehe levels.mjs)
//                                      braucht DISCORD_BOT_TOKEN, DISCORD_GUILD_ID und im Developer Portal "Server Members Intent"
//   --dry-run                       -> nur anzeigen, nichts aendern
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { AUTOMATION_DIR, ROOT_DIR, env, hasFlag, loadDotEnv } from '../lib/util.mjs';
import { api, postWebhook } from './api.mjs';
import { BRAND, ROLES, SITE } from './blueprint.mjs';
import { STAR_ROLES, applyMessages, collectNew, helperHandles, loadActivity, matchesHandle, planStars, saveActivity } from './levels.mjs';

loadDotEnv();
const DRY = hasFlag('dry-run');
const mode = process.argv[2];
const stateFile = path.join(AUTOMATION_DIR, 'discord', 'state.json');
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};
const secretsFile = path.join(AUTOMATION_DIR, 'discord', '.secrets.json');
const localHooks = existsSync(secretsFile) ? JSON.parse(readFileSync(secretsFile, 'utf8')).webhooks ?? {} : {};

const OG_LIMIT = Number(env('OG_LIMIT', '1000'));
const DAY_ONE_UNTIL = new Date(env('DAY_ONE_UNTIL', '2026-11-23T23:59:59+01:00'));
const GAME_NAMES = { 'gta-5': 'GTA V', 'gta-san-andreas': 'GTA San Andreas', 'gta-vice-city': 'GTA Vice City', 'gta-4': 'GTA IV', 'gta-3': 'GTA III' };

function cheatOfTheDay(date = new Date()) {
  const dir = path.join(ROOT_DIR, 'src', 'data', 'cheats');
  const all = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().flatMap((f) => {
    const j = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    return j.cheats.map((c) => ({ ...c, game: j.game }));
  });
  const day = Math.floor(date.getTime() / 86_400_000);
  // feste, aber gut gemischte Reihenfolge: jeder Cheat kommt dran, bevor sich etwas wiederholt
  const idx = (day * 7919) % all.length;
  return all[idx];
}

async function postCheat() {
  const c = cheatOfTheDay();
  const game = GAME_NAMES[c.game] ?? c.game;
  const url = `${SITE}/cheats/${c.game}/?utm_source=discord&utm_medium=social&utm_campaign=cheat-des-tages#${c.id}`;
  const fields = [
    c.pc && { name: 'PC', value: `\`${c.pc}\``, inline: true },
    c.phone && { name: 'Handy', value: `\`${c.phone}\``, inline: true },
    c.playstation && { name: 'PlayStation', value: c.playstation, inline: false },
    c.xbox && { name: 'Xbox', value: c.xbox, inline: false },
  ].filter(Boolean);
  const payload = {
    username: `${BRAND} Bot`,
    allowed_mentions: { parse: [] },
    embeds: [{
      title: `🧾 Cheat des Tages: ${c.effect}`,
      description: `**${game}**${c.note ? `\n${c.note}` : ''}\n\n[Alle ${game} Cheats mit Kopier-Button](${url})`,
      url,
      color: 0x19e3c8,
      fields,
      footer: { text: 'Cheats funktionieren nie in GTA Online · Spielstand vorher sichern' },
    }],
  };
  const hook = env('DISCORD_WEBHOOK_CHEATS') || localHooks.cheats;
  if (DRY || !hook) { console.log(`${hook ? 'PROBELAUF' : 'Kein Webhook'}: wuerde posten:`, JSON.stringify(payload.embeds[0], null, 1)); return; }
  await postWebhook(hook, payload);
  console.log(`Cheat des Tages gepostet: ${c.effect} (${game})`);
}

// Rolle geben/nehmen (im Probelauf nur anzeigen)
const ROLE_NAME = Object.fromEntries(ROLES.map((r) => [r.key, r.name]));
async function setRole(guild, m, key, on, reason) {
  const id = state.roles?.[key];
  if (!id) return false;
  if (DRY) { console.log(`PROBELAUF: ${m.user.username} ${on ? 'bekaeme' : 'verloere'} ${ROLE_NAME[key] ?? key}`); return true; }
  await api(on ? 'PUT' : 'DELETE', `/guilds/${guild}/members/${m.user.id}/roles/${id}`, undefined, { reason });
  return true;
}

async function badges() {
  const guild = env('DISCORD_GUILD_ID') || state.guildId;
  const og = state.roles?.og;
  const dayone = state.roles?.dayone;
  if (!guild || !og || !dayone) throw new Error('state.json ohne guildId/Rollen: zuerst discord/setup.mjs ausfuehren.');
  const members = [];
  let after = '0';
  for (;;) {
    const page = await api('GET', `/guilds/${guild}/members?limit=1000&after=${after}`);
    members.push(...page);
    if (page.length < 1000) break;
    after = page[page.length - 1].user.id;
  }
  const humans = members.filter((m) => !m.user.bot).sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));
  const ogSet = new Set(humans.slice(0, OG_LIMIT).map((m) => m.user.id));
  let given = 0;
  for (const m of humans) {
    if (ogSet.has(m.user.id) && !m.roles.includes(og) && await setRole(guild, m, 'og', true, 'Automatisches Badge')) given++;
    if (new Date(m.joined_at) <= DAY_ONE_UNTIL && !m.roles.includes(dayone) && await setRole(guild, m, 'dayone', true, 'Automatisches Badge')) given++;
  }
  console.log(`Mitglieder: ${humans.length}, OG-Plaetze vergeben: ${Math.min(humans.length, OG_LIMIT)}/${OG_LIMIT}, neue Badges: ${given}`);

  await guideHelpers(guild, humans);
  await stars(guild, humans);
}

// Guide-Helfer: wer in einem Artikel unter helpers steht, bekommt die Rolle (wird nie automatisch entfernt)
async function guideHelpers(guild, humans) {
  const helper = state.roles?.helper;
  if (!helper) return;
  const handles = helperHandles(path.join(ROOT_DIR, 'src', 'content'));
  let n = 0;
  for (const m of humans) {
    if (!m.roles.includes(helper) && matchesHandle(m, handles) && await setRole(guild, m, 'helper', true, 'Tipp auf der Website veroeffentlicht')) n++;
  }
  console.log(`Guide-Helfer: ${handles.size} Namen in Artikeln, neu vergeben: ${n}`);
}

// Fahndungslevel: Punkte aus neuen Nachrichten, Stern-Rollen anpassen, Aufstiege ab ★★ melden
async function stars(guild, humans) {
  const store = state.channels?.botData;
  if (!store || STAR_ROLES.some((r) => !state.roles?.[r.key])) {
    console.log('Sterne: Kanal #bot-daten oder Stern-Rollen fehlen, zuerst discord/setup.mjs ausfuehren.');
    return;
  }
  const me = await api('GET', '/users/@me');
  const { data, stored } = await loadActivity(store, me.id);
  const before = JSON.stringify(data.cursors);
  const { msgs, cursors } = await collectNew(guild, data.cursors, new Set([store]));
  const counted = applyMessages(data.users, msgs);
  data.cursors = cursors;
  const moved = JSON.stringify(cursors) !== before;

  const keyById = Object.fromEntries(STAR_ROLES.map((r) => [state.roles[r.key], r.key]));
  const ups = [];
  let changes = 0;
  for (const m of humans) {
    const xp = data.users[m.user.id]?.xp ?? 0;
    const held = m.roles.map((id) => keyById[id]).filter(Boolean);
    if (!xp && !held.length) continue;
    const plan = planStars(xp, held);
    if (plan.add && await setRole(guild, m, plan.add, true, `Fahndungslevel (${xp} Punkte)`)) changes++;
    for (const k of plan.remove) if (await setRole(guild, m, k, false, 'Fahndungslevel: nur der hoechste Stern bleibt')) changes++;
    if (plan.levelUp && plan.levelUp !== STAR_ROLES[0].key) ups.push({ id: m.user.id, key: plan.levelUp });
  }
  console.log(`Sterne: ${msgs.length} neue Nachrichten, ${counted} gezaehlt, ${Object.keys(data.users).length} Mitglieder mit Punkten, Rollen-Aenderungen: ${changes}`);

  const botcmd = state.channels?.botcmd;
  if (ups.length && botcmd) {
    const lines = ups.map((u) => `🚨 <@${u.id}> ist jetzt **${ROLE_NAME[u.key]}**`);
    for (let i = 0; i < lines.length; i += 20) {
      const content = lines.slice(i, i + 20).join('\n');
      if (DRY) { console.log(`PROBELAUF: wuerde in #bot-befehle posten:\n${content}`); continue; }
      await api('POST', `/channels/${botcmd}/messages`, { content, allowed_mentions: { users: ups.slice(i, i + 20).map((u) => u.id) } });
    }
  }
  if (DRY) { console.log('PROBELAUF: Punktestand nicht gespeichert.'); return; }
  if (moved || !stored.length) await saveActivity(store, data, stored);
}

if (mode === 'cheat') await postCheat();
else if (mode === 'badges') await badges();
else console.log('Aufruf: node discord/daily.mjs cheat|badges [--dry-run]');
