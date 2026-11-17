// Richtet den Discord-Server nach blueprint.mjs ein. Wiederholbar (legt nichts doppelt an).
// Aufruf: node discord/setup.mjs            -> echte Einrichtung (braucht DISCORD_BOT_TOKEN, optional DISCORD_GUILD_ID)
//         node discord/setup.mjs --dry-run  -> nur pruefen und anzeigen, nichts aendern
// Geheimnisse (Webhook-URLs) landen in automation/discord/.secrets.json (nicht im Repo) und werden nie ausgegeben.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { AUTOMATION_DIR, ROOT_DIR, env, hasFlag, loadDotEnv } from '../lib/util.mjs';
import { api, snowflake, P, bits } from './api.mjs';
import { AUTOMOD, BRAND, CATEGORIES, GUILD, INVITES, MESSAGES, ONBOARDING, ROLES, WELCOME_SCREEN } from './blueprint.mjs';

loadDotEnv();
const DIR = path.join(AUTOMATION_DIR, 'discord');
const STATE_FILE = path.join(DIR, 'state.json');
const SECRETS_FILE = path.join(DIR, '.secrets.json');
const DRY = hasFlag('dry-run') || !env('DISCORD_BOT_TOKEN');
const TYPE = { text: 0, voice: 2, category: 4, news: 5, forum: 15 };

const readJ = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d);
const state = readJ(STATE_FILE, { roles: {}, channels: {}, messages: {}, invites: {}, automod: {} });
const secrets = readJ(SECRETS_FILE, { webhooks: {} });
const save = () => {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2) + '\n');
};
const allChannels = CATEGORIES.flatMap((c) => c.channels.map((ch) => ({ ...ch, cat: c })));
const log = (...a) => console.log(...a);
const warn = [];

// ---------- Pruefung des Bauplans (laeuft immer) ----------
function validate() {
  const keys = new Set();
  for (const r of ROLES) { if (r.name.length > 100) warn.push(`Rolle zu lang: ${r.name}`); }
  for (const c of allChannels) {
    if (keys.has(c.key)) warn.push(`Kanal-Schluessel doppelt: ${c.key}`);
    keys.add(c.key);
    if (c.name.length > 100) warn.push(`Kanalname zu lang: ${c.name}`);
    if ((c.topic ?? '').length > 1024) warn.push(`Thema zu lang: ${c.key}`);
    if (c.tags && (c.tags.length > 20 || c.tags.some((t) => t.length > 20))) warn.push(`Forum-Tags ungueltig: ${c.key}`);
  }
  const chan = (k) => allChannels.find((c) => c.key === k);
  const def = ONBOARDING.defaultChannels.map(chan);
  if (def.some((c) => !c)) warn.push('Onboarding: unbekannter Standard-Kanal');
  if (def.length < 7) warn.push('Onboarding: mindestens 7 Standard-Kanaele noetig');
  if (def.filter((c) => c && c.mode === 'open' && c.type !== 'voice').length < 5) warn.push('Onboarding: mindestens 5 Standard-Kanaele zum Schreiben noetig');
  for (const p of ONBOARDING.prompts) for (const o of p.options) {
    if (!(o.roles?.length || o.channels?.length)) warn.push(`Onboarding-Option ohne Rolle/Kanal: ${o.title}`);
    for (const r of o.roles ?? []) if (!ROLES.find((x) => x.key === r)) warn.push(`Onboarding: Rolle fehlt ${r}`);
    for (const c of o.channels ?? []) if (!chan(c)) warn.push(`Onboarding: Kanal fehlt ${c}`);
  }
  for (const m of MESSAGES) {
    if (!chan(m.channel)) warn.push(`Nachricht ${m.key}: Kanal fehlt`);
    for (const e of m.embeds) if ((e.description ?? '').length > 4096) warn.push(`Nachricht ${m.key}: Text zu lang`);
  }
}

// ---------- Hilfen ----------
const roleId = (k) => state.roles[k];
const chanId = (k) => state.channels[k];
function overwrites(mode, guildId) {
  const everyone = guildId;
  const mod = roleId('mod');
  if (mode === 'staff') {
    return [
      { id: everyone, type: 0, deny: bits(P.VIEW), allow: '0' },
      ...(mod ? [{ id: mod, type: 0, allow: bits(P.VIEW, P.SEND, P.HISTORY, P.ATTACH, P.EMBED), deny: '0' }] : []),
    ];
  }
  if (mode === 'readonly') {
    return [
      { id: everyone, type: 0, deny: bits(P.SEND, P.CREATE_THREADS, P.THREAD_SEND), allow: bits(P.VIEW, P.HISTORY, P.ADD_REACTIONS) },
      ...(mod ? [{ id: mod, type: 0, allow: bits(P.SEND, P.MANAGE_MESSAGES), deny: '0' }] : []),
    ];
  }
  return [];
}
const resolveMentions = (s) => s.replace(/<#([a-zA-Z0-9]+)>/g, (m, k) => (chanId(k) ? `<#${chanId(k)}>` : m));

function iconDataUri() {
  const svg = readFileSync(path.join(ROOT_DIR, 'public', 'favicon.svg'), 'utf8');
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 512 } }).render().asPng();
  return `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
}

// ---------- Schritte ----------
async function findGuild() {
  const id = env('DISCORD_GUILD_ID');
  if (id) return api('GET', `/guilds/${id}?with_counts=true`);
  const guilds = await api('GET', '/users/@me/guilds');
  if (guilds.length !== 1) throw new Error(`Bot ist in ${guilds.length} Servern. Bitte DISCORD_GUILD_ID setzen.`);
  return api('GET', `/guilds/${guilds[0].id}?with_counts=true`);
}

async function syncRoles(g) {
  const existing = await api('GET', `/guilds/${g.id}/roles`);
  for (const r of ROLES) {
    const found = existing.find((x) => x.id === roleId(r.key)) ?? existing.find((x) => x.name === r.name);
    const body = { name: r.name, color: r.color ?? 0, hoist: !!r.hoist, mentionable: !!r.mentionable, permissions: r.perms ?? '0' };
    if (found) {
      await api('PATCH', `/guilds/${g.id}/roles/${found.id}`, body, { reason: 'Setup: Rolle aktualisiert' });
      state.roles[r.key] = found.id;
    } else {
      const created = await api('POST', `/guilds/${g.id}/roles`, body, { reason: 'Setup: Rolle angelegt' });
      state.roles[r.key] = created.id;
      log(`  + Rolle ${r.name}`);
    }
  }
  // Reihenfolge: erste Rolle im Bauplan ganz oben, aber immer UNTER der hoechsten Rolle des Bots
  // (ein Bot darf keine Rolle auf oder ueber seine eigene schieben).
  const n = ROLES.length;
  let top = n + 1;
  let tied = false;
  try {
    const me = await api('GET', '/users/@me');
    const member = await api('GET', `/guilds/${g.id}/members/${me.id}`);
    const all = await api('GET', `/guilds/${g.id}/roles`);
    top = Math.max(...all.filter((x) => member.roles.includes(x.id)).map((x) => x.position), 0);
    // Per API angelegte Rollen landen oft alle auf derselben Position. Die Bot-Rolle steht dann nur
    // optisch oben (Discord sortiert Gleichstand nach Alter), technisch aber gleichauf.
    tied = all.filter((x) => x.position === top).length > 1;
  } catch { /* Fallback: n + 1 */ }
  if (top <= n && tied) {
    warn.push(`Rollen-Reihenfolge nicht gesetzt: Discord hat alle Rollen auf dieselbe Position gesetzt, die Bot-Rolle steht nur optisch oben. In den Servereinstellungen unter Rollen die Rolle "${BRAND} Bot" einmal eine Stelle nach unten und wieder ganz nach oben ziehen (dann speichert Discord echte Positionen), danach Setup erneut starten.`);
  } else if (top <= n) {
    warn.push(`Rollen-Reihenfolge nicht gesetzt: In den Servereinstellungen unter Rollen die Rolle "${BRAND} Bot" ganz nach oben ziehen, dann Setup erneut starten.`);
  } else {
    const positions = ROLES.map((r, i) => ({ id: state.roles[r.key], position: top - 1 - i }));
    try {
      await api('PATCH', `/guilds/${g.id}/roles`, positions, { reason: 'Setup: Rollen sortiert' });
    } catch (e) {
      warn.push(`Rollen-Reihenfolge nicht gesetzt (Bot-Rolle muss ganz oben stehen): ${e.message.slice(0, 120)}`);
    }
  }
  save();
}

async function upsertChannel(g, existing, body, key) {
  const found = existing.find((x) => x.id === chanId(key)) ?? existing.find((x) => x.name === body.name && x.type === body.type);
  if (found) {
    const patch = { ...body };
    delete patch.type;
    if (found.type === TYPE.forum && found.available_tags?.length) delete patch.available_tags; // vorhandene Tags nicht ueberschreiben
    await api('PATCH', `/channels/${found.id}`, patch, { reason: 'Setup: Kanal aktualisiert' });
    state.channels[key] = found.id;
    return found.id;
  }
  const created = await api('POST', `/guilds/${g.id}/channels`, body, { reason: 'Setup: Kanal angelegt' });
  state.channels[key] = created.id;
  log(`  + Kanal ${body.name}`);
  return created.id;
}

function channelBody(ch, parentId, g, communityOn) {
  const mode = ch.cat.mode === 'staff' ? 'staff' : ch.mode ?? 'open';
  let type = TYPE[ch.type] ?? 0;
  if (type === TYPE.news && !communityOn) type = TYPE.text; // Ankuendigungskanaele gibt es nur auf Community-Servern
  const body = { name: ch.name, type, parent_id: parentId, permission_overwrites: overwrites(mode, g.id) };
  if (ch.topic && type !== TYPE.voice) body.topic = ch.topic;
  if (ch.slowmode) body.rate_limit_per_user = ch.slowmode;
  if (type === TYPE.voice && ch.userLimit) body.user_limit = ch.userLimit;
  if (type === TYPE.forum) {
    body.available_tags = (ch.tags ?? []).map((name) => ({ name, moderated: name.startsWith('Gelöst') ? false : false }));
    if (ch.requireTag) body.flags = 1 << 4;
    body.default_reaction_emoji = { emoji_name: '🔥' };
  }
  return body;
}

async function syncChannels(g, communityOn) {
  const existing = await api('GET', `/guilds/${g.id}/channels`);
  const order = [];
  for (const cat of CATEGORIES) {
    const catId = await upsertChannel(g, existing, { name: cat.name, type: TYPE.category, permission_overwrites: overwrites(cat.mode, g.id) }, `cat_${cat.key}`);
    order.push({ id: catId, position: order.length });
    for (const ch of cat.channels) {
      if (ch.type === 'forum' && !communityOn) continue; // Foren erst im zweiten Durchlauf, wenn Community aktiv ist
      const wantNews = ch.type === 'news' && communityOn;
      const id = await upsertChannel(g, existing, channelBody({ ...ch, cat }, catId, g, communityOn), ch.key);
      // Kanal war Text, soll jetzt Ankuendigung werden
      const cur = existing.find((x) => x.id === id);
      if (wantNews && cur && cur.type === TYPE.text) {
        try { await api('PATCH', `/channels/${id}`, { type: TYPE.news }); } catch (e) { warn.push(`${ch.name}: Umwandlung in Ankuendigungskanal fehlgeschlagen`); }
      }
      order.push({ id, position: order.length }); // parent_id ist schon beim Anlegen gesetzt (Discord erlaubt nur einen Wechsel pro Aufruf)
    }
  }
  try { await api('PATCH', `/guilds/${g.id}/channels`, order); } catch (e) { warn.push(`Kanal-Reihenfolge: ${e.message.slice(0, 120)}`); }
  save();
}

async function enableCommunity(g) {
  if (g.features?.includes('COMMUNITY')) return true;
  try {
    await api('PATCH', `/guilds/${g.id}`, {
      features: [...new Set([...(g.features ?? []), 'COMMUNITY'])],
      verification_level: 1,
      explicit_content_filter: 2,
      default_message_notifications: 1,
      rules_channel_id: chanId('rules'),
      public_updates_channel_id: chanId('updates'),
      preferred_locale: GUILD.locale,
      description: GUILD.description,
    }, { reason: 'Setup: Community aktiviert' });
    log('  + Community-Funktionen aktiviert');
    return true;
  } catch (e) {
    warn.push(`Community nicht aktiviert (dann ohne Ankuendigungskanaele/Onboarding): ${e.message.slice(0, 200)}`);
    return false;
  }
}

async function syncAutomod(g) {
  const existing = await api('GET', `/guilds/${g.id}/auto-moderation/rules`);
  const modLog = chanId('modLog');
  for (const r of AUTOMOD) {
    const actions = r.actions.map((a) => {
      if (a === 'block') return { type: 1, metadata: { custom_message: 'Diese Nachricht wurde vom Spam- und Scam-Schutz blockiert. Fragen? Schreib einem Sheriff.' } };
      if (a === 'alert') return { type: 2, metadata: { channel_id: modLog } };
      if (a === 'timeout') return { type: 3, metadata: { duration_seconds: 600 } };
      return null;
    }).filter((a) => a && (a.type !== 2 || modLog));
    const body = {
      name: r.name, event_type: 1, trigger_type: r.trigger, trigger_metadata: r.meta, actions, enabled: true,
      exempt_roles: ['boss', 'mod', 'bot'].map(roleId).filter(Boolean),
      exempt_channels: [...(r.exemptChannels ?? []).map(chanId), chanId('modChat'), chanId('modLog')].filter(Boolean),
    };
    const found = existing.find((x) => x.id === state.automod[r.key]) ?? existing.find((x) => x.name === r.name)
      ?? ([3, 4, 5].includes(r.trigger) ? existing.find((x) => x.trigger_type === r.trigger) : undefined);
    try {
      let patched = false;
      if (found) {
        const patch = { ...body };
        delete patch.trigger_type;
        try {
          await api('PATCH', `/guilds/${g.id}/auto-moderation/rules/${found.id}`, patch);
          state.automod[r.key] = found.id;
          patched = true;
        } catch (e) {
          if (e.status !== 404) throw e; // Regel existiert nicht mehr bzw. ist eine Discord-Vorlage: neu anlegen
          delete state.automod[r.key];
        }
      }
      if (!patched) {
        const c = await api('POST', `/guilds/${g.id}/auto-moderation/rules`, body);
        state.automod[r.key] = c.id;
        log(`  + AutoMod: ${r.name}`);
      }
    } catch (e) {
      warn.push(`AutoMod "${r.name}": ${e.message.slice(0, 160)}`);
    }
  }
  save();
}

async function syncWebhooks() {
  for (const ch of allChannels.filter((c) => c.webhook)) {
    if (secrets.webhooks[ch.key]) continue;
    const name = ch.key === 'cheats' ? `${BRAND} Bot` : ch.key === 'approvals' ? `${BRAND} Freigaben` : `${BRAND} Newsdesk`;
    const w = await api('POST', `/channels/${chanId(ch.key)}/webhooks`, { name });
    secrets.webhooks[ch.key] = `https://discord.com/api/webhooks/${w.id}/${w.token}`;
    log(`  + Webhook fuer ${ch.name} (URL gespeichert, nicht angezeigt)`);
  }
  save();
}

async function syncMessages() {
  for (const m of MESSAGES) {
    const body = {
      embeds: m.embeds.map((e) => ({ ...e, description: e.description ? resolveMentions(e.description) : undefined })),
      components: m.components ?? [],
      allowed_mentions: { parse: [] },
    };
    const cid = chanId(m.channel);
    const mid = state.messages[m.key];
    try {
      if (mid) await api('PATCH', `/channels/${cid}/messages/${mid}`, body);
      else { const c = await api('POST', `/channels/${cid}/messages`, body); state.messages[m.key] = c.id; log(`  + Nachricht ${m.key}`); }
    } catch (e) {
      if (mid && e.status === 404) { delete state.messages[m.key]; const c = await api('POST', `/channels/${cid}/messages`, body); state.messages[m.key] = c.id; }
      else warn.push(`Nachricht ${m.key}: ${e.message.slice(0, 160)}`);
    }
  }
  save();
}

async function syncWelcomeAndOnboarding(g) {
  try {
    await api('PATCH', `/guilds/${g.id}/welcome-screen`, {
      enabled: true,
      description: WELCOME_SCREEN.description,
      welcome_channels: WELCOME_SCREEN.channels.map((c) => ({ channel_id: chanId(c.key), description: c.description, emoji_name: c.emoji })),
    });
  } catch (e) { warn.push(`Willkommens-Bildschirm: ${e.message.slice(0, 160)}`); }
  try {
    await api('PUT', `/guilds/${g.id}/onboarding`, {
      enabled: true,
      mode: 0,
      default_channel_ids: ONBOARDING.defaultChannels.map(chanId).filter(Boolean),
      prompts: ONBOARDING.prompts.map((p) => ({
        id: snowflake(), type: 0, title: p.title, single_select: !!p.single, required: !!p.required, in_onboarding: true,
        options: p.options.map((o) => ({
          id: snowflake(), title: o.title, description: o.description ?? null, emoji_name: o.emoji,
          role_ids: (o.roles ?? []).map(roleId).filter(Boolean), channel_ids: (o.channels ?? []).map(chanId).filter(Boolean),
        })),
      })),
    });
    log('  + Onboarding (Fragen beim Beitritt) aktiv');
  } catch (e) { warn.push(`Onboarding: ${e.message.slice(0, 300)}`); }
}

async function syncInvites() {
  for (const src of INVITES) {
    if (state.invites[src]) continue;
    const inv = await api('POST', `/channels/${chanId('welcome')}/invites`, { max_age: 0, max_uses: 0, unique: true, temporary: false }, { reason: `Einladung fuer Quelle ${src}` });
    state.invites[src] = inv.code;
  }
  save();
  // Website-Link aktualisieren (Einladungscodes sind oeffentlich)
  const cfgPath = path.join(ROOT_DIR, 'src', 'config.ts');
  const cfg = readFileSync(cfgPath, 'utf8');
  const next = cfg.replace(/discord:\s*'[^']*'/, `discord: 'https://discord.gg/${state.invites.website}'`);
  if (next !== cfg) { writeFileSync(cfgPath, next); log(`  + Website verlinkt jetzt auf discord.gg/${state.invites.website}`); }
  writeFileSync(path.join(ROOT_DIR, 'src', 'data', 'discord.json'), JSON.stringify({ guildId: state.guildId, invites: state.invites }, null, 2) + '\n');
}

async function giveOwnerBoss(g) {
  try { await api('PUT', `/guilds/${g.id}/members/${g.owner_id}/roles/${roleId('boss')}`, undefined, { reason: 'Setup: Besitzer ist Boss' }); } catch (e) { warn.push(`Boss-Rolle fuer Besitzer: ${e.message.slice(0, 120)}`); }
  try {
    const me = await api('GET', '/users/@me');
    await api('PUT', `/guilds/${g.id}/members/${me.id}/roles/${roleId('bot')}`);
  } catch { /* optional */ }
}

// ---------- Ablauf ----------
validate();
if (DRY) {
  log(`PROBELAUF (${env('DISCORD_BOT_TOKEN') ? '--dry-run' : 'kein DISCORD_BOT_TOKEN'}): Server "${GUILD.name}"`);
  log(`  Rollen: ${ROLES.length} (davon ${ROLES.filter((r) => r.xp).length} Fahndungslevel, ${ROLES.filter((r) => r.selfRole).length} selbst waehlbar)`);
  for (const c of CATEGORIES) log(`  ${c.name}: ${c.channels.map((x) => `${x.name}${x.type && x.type !== 'text' ? ` [${x.type}]` : ''}`).join(', ')}`);
  log(`  AutoMod-Regeln: ${AUTOMOD.length} · Onboarding-Fragen: ${ONBOARDING.prompts.length} · Webhooks: ${allChannels.filter((c) => c.webhook).length} · Einladungen: ${INVITES.length}`);
  log(warn.length ? `\nWARNUNGEN:\n- ${warn.join('\n- ')}` : '\nBauplan gueltig, keine Warnungen.');
  process.exit(warn.length ? 1 : 0);
}

const g = await findGuild();
state.guildId = g.id;
log(`Server gefunden: ${g.name} (${g.approximate_member_count ?? '?'} Mitglieder)`);
log('1/9 Grundeinstellungen …');
try {
  await api('PATCH', `/guilds/${g.id}`, { name: GUILD.name, icon: iconDataUri(), preferred_locale: GUILD.locale, verification_level: 1, explicit_content_filter: 2, default_message_notifications: 1 });
} catch (e) { warn.push(`Grundeinstellungen: ${e.message.slice(0, 160)}`); }
log('2/9 Rollen …');
await syncRoles(g);
log('3/9 Kanaele …');
await syncChannels(g, g.features?.includes('COMMUNITY'));
log('4/9 Community …');
const communityOn = await enableCommunity(g);
if (communityOn && !g.features?.includes('COMMUNITY')) await syncChannels({ ...g, features: [...(g.features ?? []), 'COMMUNITY'] }, true);
log('5/9 AutoMod …');
await syncAutomod(g);
log('6/9 Webhooks …');
await syncWebhooks();
log('7/9 Nachrichten …');
await syncMessages();
log('8/9 Onboarding und Willkommen …');
if (communityOn) await syncWelcomeAndOnboarding(g);
log('9/9 Einladungen und Rollen fuer Besitzer …');
await syncInvites();
await giveOwnerBoss(g);
save();
log(`\nFertig. Rollen: ${Object.keys(state.roles).length}, Kanaele: ${Object.keys(state.channels).length}, Webhooks: ${Object.keys(secrets.webhooks).length}.`);
if (warn.length) log(`\nHINWEISE:\n- ${warn.join('\n- ')}`);
log('\nNaechste Schritte: siehe automation/discord/README.md (Sterne und Badges vergibt der stuendliche Job `node discord/daily.mjs badges`, Secrets nach GitHub mit `npm run discord:secrets`).');
