// BAUPLAN des Discord-Servers. Alles hier aendern, dann `npm run discord:setup` erneut ausfuehren.
// Das Setup ist wiederholbar: bestehende Rollen/Kanaele (gleicher Schluessel) werden aktualisiert, nicht doppelt angelegt.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from '../lib/util.mjs';
import { P, bits } from './api.mjs';

// Name und URL kommen aus der Website-Konfiguration (eine Quelle fuer alles)
const cfg = readFileSync(path.join(ROOT_DIR, 'src', 'config.ts'), 'utf8');
export const BRAND = process.env.BRAND || cfg.match(/name:\s*'([^']+)'/)?.[1] || 'Palm Bandits';
export const SITE = (process.env.SITE_URL || cfg.match(/url:\s*'([^']+)'/)?.[1] || 'https://example.com').replace(/\/$/, '');
const u = (p, src = 'discord') => `${SITE}${p}${p.includes('?') ? '&' : '?'}utm_source=${src}&utm_medium=social`;

export const GUILD = {
  name: `${BRAND} · GTA Community`,
  description: 'Die deutsche GTA-Community: GTA 6 News in Minuten, Guides, Cheats, Crew-Suche und GTA RP.',
  locale: 'de',
};

// ---------- ROLLEN (oben = maechtiger) ----------
// key = stabiler Schluessel fuer das Setup. Farben im Seiten-Look.
export const ROLES = [
  { key: 'boss', name: '👑 Boss', color: 0xff2d87, hoist: true, perms: bits(P.ADMIN) },
  { key: 'mod', name: '🚔 Sheriff', color: 0x19e3c8, hoist: true, mentionable: true,
    perms: bits(P.KICK, P.BAN, P.MANAGE_MESSAGES, P.MANAGE_THREADS, P.TIMEOUT, P.MANAGE_NICKS, P.VIEW_AUDIT_LOG, P.MOVE, P.MUTE, P.MANAGE_EVENTS) },
  { key: 'bot', name: '🤖 Bots', color: 0x6f6880, hoist: false },
  // Sonder-Badges (werden automatisch oder von Hand vergeben)
  { key: 'og', name: '⭐ OG', color: 0xffd23f, hoist: true, note: 'Die ersten 1.000 Mitglieder. Automatisch, nie wieder erhaeltlich.' },
  { key: 'dayone', name: '🌴 Day One', color: 0xff8a1f, hoist: false, note: 'Beim GTA-VI-Launch dabei. Automatisch bis Ende Launch-Wochenende.' },
  { key: 'creator', name: '🎬 Creator', color: 0x8b3dff, hoist: true, note: 'Streamer, YouTuber, TikToker. Auf Anfrage.' },
  { key: 'helper', name: '🧭 Guide-Helfer', color: 0x2bd96b, hoist: false, note: 'Hat Tipps geliefert, die auf der Website gelandet sind. Automatisch, sobald der Artikel mit deinem Namen online ist.' },
  { key: 'buyer', name: '🧰 Script-Kunde', color: 0x33e6ff, hoist: false, note: 'Fuer spaeter: Kaeufer von RP-Scripts.' },
  // Fahndungslevel: vergibt der stuendliche Job (discord/levels.mjs) nach Aktivitaet.
  // xp = gezaehlte Nachrichten (hoechstens 1 pro Minute zaehlt). Schwellen hier aendern, Setup erneut laufen lassen.
  { key: 'lvl6', name: '★★★★★★ Legende', color: 0xff2d87, hoist: true, xp: 1500 },
  { key: 'lvl5', name: '★★★★★ Staatsfeind', color: 0xff5a5f, hoist: false, xp: 600 },
  { key: 'lvl4', name: '★★★★ Heist-Profi', color: 0xff8a1f, hoist: false, xp: 250 },
  { key: 'lvl3', name: '★★★ Gangster', color: 0xffb13b, hoist: false, xp: 100 },
  { key: 'lvl2', name: '★★ Autoknacker', color: 0xffd23f, hoist: false, xp: 25 },
  { key: 'lvl1', name: '★ Taschendieb', color: 0xd9cfa3, hoist: false, xp: 1 },
  // Selbst gewaehlt im Onboarding
  { key: 'g6', name: 'GTA VI', color: 0, selfRole: true },
  { key: 'gon', name: 'GTA Online', color: 0, selfRole: true },
  { key: 'grp', name: 'GTA RP', color: 0, selfRole: true },
  { key: 'gold', name: 'Klassiker', color: 0, selfRole: true },
  { key: 'ps', name: 'PlayStation', color: 0, selfRole: true },
  { key: 'xbox', name: 'Xbox', color: 0, selfRole: true },
  { key: 'pc', name: 'PC', color: 0, selfRole: true },
  { key: 'pingNews', name: '🔔 News-Alarm', color: 0, selfRole: true, mentionable: false },
  { key: 'pingWeekly', name: '🔔 Weekly-Update', color: 0, selfRole: true },
  { key: 'pingEvents', name: '🔔 Events', color: 0, selfRole: true },
  { key: 'en', name: '🇬🇧 English', color: 0, selfRole: true },
];

// ---------- KANAELE ----------
// type: text | news (Ankuendigung, folgbar) | forum | voice
// mode: readonly (nur Team/Bots schreiben) | staff (nur Team sieht) | open (Standard)
const T = (o) => ({ type: 'text', mode: 'open', ...o });
export const CATEGORIES = [
  {
    key: 'start', name: '📌 START',
    channels: [
      T({ key: 'welcome', name: '👋・willkommen', mode: 'readonly', topic: `Willkommen in der ${BRAND} Crew. Hier geht es los.` }),
      T({ key: 'rules', name: '📜・regeln', mode: 'readonly', topic: 'Fünf Sterne, fünf Regeln.' }),
      { key: 'announce', name: '📢・ankündigungen', type: 'news', mode: 'readonly', topic: 'Wichtiges zum Server und zur Website.' },
      T({ key: 'roles', name: '🏅・badges-und-rollen', mode: 'readonly', topic: 'So bekommst du Sterne und Badges.' }),
    ],
  },
  {
    key: 'news', name: '📰 NEWSROOM',
    channels: [
      { key: 'news6', name: '🌴・gta6-news', type: 'news', mode: 'readonly', topic: `Bestätigte GTA-6-News in Minuten, automatisch von ${SITE.replace(/^https?:\/\//, '')}. Folgen = in deinen Server holen.`, webhook: true },
      { key: 'newsOnline', name: '💸・online-news', type: 'news', mode: 'readonly', topic: 'GTA Online: Weekly Updates, Boni, Rabatte.', webhook: true },
      { key: 'newsAll', name: '🗞️・gta-news', type: 'news', mode: 'readonly', topic: 'Alle anderen GTA-News: GTA 5, Klassiker, Rockstar, Take-Two.', webhook: true },
      T({ key: 'newsTalk', name: '💬・news-talk', topic: 'Diskutier die neuesten Meldungen. Quellen bitte immer mit Link.', slowmode: 5 }),
      T({ key: 'leaks', name: '🕵️・leaks-und-gerüchte', topic: 'Gerüchte nur mit Quelle und als Gerücht markieren. Keine illegal beschafften Dateien.', slowmode: 10 }),
    ],
  },
  {
    key: 'g6', name: '🌴 GTA VI',
    channels: [
      T({ key: 'chat6', name: '💬・gta6-chat', topic: 'Alles zu GTA VI. Spoiler nur in #gta6-spoiler!' }),
      { key: 'help6', name: '🆘・gta6-hilfe', type: 'forum', topic: 'Frage stellen, Tag wählen, Lösung markieren. Gute Lösungen landen (mit Credit) auf der Website.',
        tags: ['Story', 'Missionen', 'Geld', 'Fundorte', 'Glitches', 'Fahrzeuge', 'Technik', 'Gelöst ✅'], requireTag: true },
      T({ key: 'spoiler6', name: '⚠️・gta6-spoiler', topic: 'Hier wird gespoilert. Du wurdest gewarnt.' }),
      { key: 'shots', name: '📸・screenshots', type: 'forum', topic: 'Deine besten Shots. Jede Woche kommt der Gewinner auf die Website und auf Pinterest (mit deinem Namen).',
        tags: ['GTA VI', 'GTA Online', 'GTA 5', 'Klassiker', 'Foto-Modus'] },
    ],
  },
  {
    key: 'online', name: '💰 GTA ONLINE',
    channels: [
      T({ key: 'chatOnline', name: '💬・online-chat', topic: 'GTA Online quatschen. Keine Mod-Menüs, kein Account-Handel.' }),
      { key: 'crew', name: '🤝・crew-suche', type: 'forum', topic: 'Crew oder Mitspieler finden: Plattform-Tag wählen, Zeiten angeben, los gehts.',
        tags: ['PS5', 'Xbox', 'PC', 'Heists', 'Rennen', 'Grinden', 'Chill', 'RP'], requireTag: true },
      T({ key: 'money', name: '💵・geld-und-heists', topic: 'Methoden, Boni der Woche, Heist-Setups.' }),
    ],
  },
  {
    key: 'classic', name: '🕹️ KLASSIKER',
    channels: [
      T({ key: 'gta5', name: '💬・gta5-chat', topic: 'GTA V Story-Modus.' }),
      T({ key: 'retro', name: '📼・iii-vc-sa-iv', topic: 'GTA III, Vice City, San Andreas, IV und die Definitive Editions.' }),
      T({ key: 'cheats', name: '🧾・cheats-und-tricks', topic: 'Cheats, Tricks, Glitches. Jeden Tag ein Cheat des Tages.', webhook: true }),
    ],
  },
  {
    key: 'rp', name: '🎭 GTA RP',
    channels: [
      T({ key: 'rpChat', name: '💬・rp-chat', topic: 'Roleplay, Charaktere, Server-Erfahrungen.' }),
      { key: 'rpServers', name: '🏙️・rp-server-vorstellung', type: 'forum', topic: 'Stell deinen RP-Server vor: Ein Beitrag pro Server, Infos und Einladung hier erlaubt.',
        tags: ['FiveM', 'RedM', 'Whitelist', 'Offen', 'Deutsch', 'Englisch'] },
      { key: 'rpWishes', name: '🧩・script-wünsche', type: 'forum', topic: 'Welches Script fehlt deinem Server? Die Wünsche mit den meisten Reaktionen bauen wir zuerst.',
        tags: ['ESX', 'QBCore', 'Qbox', 'Standalone', 'Job', 'UI', 'Fahrzeuge'] },
    ],
  },
  {
    key: 'community', name: '🎨 COMMUNITY',
    channels: [
      T({ key: 'general', name: '💬・allgemein', topic: 'Für alles, was sonst nirgends passt.' }),
      { key: 'clips', name: '🎬・clips-und-highlights', type: 'forum', topic: 'Deine besten Clips. Creator: eigene Inhalte gern verlinken.', tags: ['Stunt', 'Fail', 'Heist', 'RP', 'Lustig'] },
      T({ key: 'memes', name: '😂・memes', topic: 'GTA-Memes. Keine Hetze, kein NSFW.' }),
      T({ key: 'music', name: '🎧・bandits-fm', topic: 'Musik, Playlists, Radiosender-Favoriten. Der Sound der Community.' }),
      { key: 'ideas', name: '💡・vorschläge', type: 'forum', topic: 'Ideen für Server und Website. Mit Reaktionen abstimmen.', tags: ['Server', 'Website', 'Events', 'Bot'] },
      T({ key: 'botcmd', name: '🤖・bot-befehle', topic: 'Hier meldet der Bot neue Sterne. Wie du Sterne sammelst, steht in #badges-und-rollen.' }),
    ],
  },
  {
    key: 'voice', name: '🔊 VOICE',
    channels: [
      { key: 'vLobby', name: '🔊 Lobby', type: 'voice' },
      { key: 'vHeist1', name: '🔊 Heist-Crew 1', type: 'voice', userLimit: 4 },
      { key: 'vHeist2', name: '🔊 Heist-Crew 2', type: 'voice', userLimit: 4 },
      { key: 'vChill', name: '🔊 Chill', type: 'voice' },
      { key: 'vEvent', name: '🎙️ Events', type: 'voice' },
    ],
  },
  {
    key: 'intl', name: '🌍 INTERNATIONAL',
    channels: [
      T({ key: 'enChat', name: '🇬🇧・english-chat', topic: 'English speakers welcome! GTA VI, Online, RP, everything.' }),
      T({ key: 'enHelp', name: '🇬🇧・english-help', topic: 'Questions in English. Answers in English.' }),
    ],
  },
  {
    key: 'team', name: '🛡️ TEAM', mode: 'staff',
    channels: [
      T({ key: 'modChat', name: '🛡️・team-chat', mode: 'staff' }),
      T({ key: 'modLog', name: '📋・mod-log', mode: 'staff', topic: 'AutoMod-Meldungen landen hier.' }),
      T({ key: 'approvals', name: '🚦・freigaben', mode: 'staff', topic: 'Gelbe News warten hier auf Freigabe (GitHub-Link).', webhook: true }),
      T({ key: 'updates', name: '📮・discord-updates', mode: 'staff', topic: 'Pflichtkanal für Community-Server: Hinweise von Discord.' }),
      T({ key: 'botData', name: '🗄️・bot-daten', mode: 'staff', topic: 'Speicher des Bots: Aktivitätspunkte für die Sterne. Bitte nichts löschen.' }),
    ],
  },
];

// ---------- ONBOARDING (Fragen beim Beitritt) ----------
export const ONBOARDING = {
  defaultChannels: ['welcome', 'rules', 'announce', 'news6', 'newsTalk', 'chat6', 'chatOnline', 'general', 'memes', 'cheats', 'gta5'],
  prompts: [
    { title: 'Was zockst du?', single: false, required: true, options: [
      { title: 'GTA VI', emoji: '🌴', roles: ['g6'], channels: ['chat6', 'help6'] },
      { title: 'GTA Online', emoji: '💸', roles: ['gon'], channels: ['chatOnline', 'crew'] },
      { title: 'GTA RP', emoji: '🎭', roles: ['grp'], channels: ['rpChat', 'rpServers'] },
      { title: 'Klassiker (III bis V)', emoji: '📼', roles: ['gold'], channels: ['retro', 'gta5'] },
    ] },
    { title: 'Auf welcher Plattform?', single: false, required: false, options: [
      { title: 'PlayStation', emoji: '🎮', roles: ['ps'] },
      { title: 'Xbox', emoji: '🟩', roles: ['xbox'] },
      { title: 'PC', emoji: '🖥️', roles: ['pc'] },
    ] },
    { title: 'Worüber sollen wir dich pingen?', single: false, required: false, options: [
      { title: 'Breaking News', description: 'Nur wirklich Wichtiges, z. B. Release, Trailer, große Updates', emoji: '🚨', roles: ['pingNews'] },
      { title: 'GTA Online Weekly', description: 'Jeden Donnerstag: Boni und Rabatte der Woche', emoji: '💸', roles: ['pingWeekly'] },
      { title: 'Events', description: 'Crew-Abende, Screenshot-Contests, Giveaways', emoji: '🎉', roles: ['pingEvents'] },
    ] },
    { title: 'Sprache / Language', single: true, required: false, options: [
      { title: 'Deutsch', emoji: '🇩🇪', channels: ['general'] },
      { title: 'English', description: 'Unlocks pings for the international corner', emoji: '🇬🇧', roles: ['en'], channels: ['enChat', 'enHelp'] },
    ] },
  ],
};

// ---------- WILLKOMMENS-BILDSCHIRM ----------
export const WELCOME_SCREEN = {
  description: 'GTA 6 News in Minuten, Crew-Suche, Hilfe und Badges. Schneller als die Cops.',
  channels: [
    { key: 'news6', emoji: '🌴', description: 'GTA-6-News in Minuten' },
    { key: 'crew', emoji: '🤝', description: 'Crew oder Mitspieler finden' },
    { key: 'help6', emoji: '🆘', description: 'Frage stellen, Hilfe bekommen' },
    { key: 'roles', emoji: '🏅', description: 'Sterne und Badges sammeln' },
    { key: 'general', emoji: '💬', description: 'Einfach quatschen' },
  ],
};

// ---------- AUTOMOD (Schutz vor Spam, Scams, Hetze) ----------
export const AUTOMOD = [
  { key: 'preset', name: 'Hetze und Sexuelles', trigger: 4, meta: { presets: [2, 3] }, actions: ['block', 'alert'] },
  { key: 'spam', name: 'Spam-Erkennung', trigger: 3, meta: {}, actions: ['block', 'alert'] },
  { key: 'mentions', name: 'Massen-Erwähnungen', trigger: 5, meta: { mention_total_limit: 5, mention_raid_protection_enabled: true }, actions: ['block', 'timeout', 'alert'] },
  { key: 'scam', name: 'Scam-Links', trigger: 1, actions: ['block', 'timeout', 'alert'], meta: {
    keyword_filter: ['*free nitro*', '*gratis nitro*', '*nitro gratis*', '*nitro for free*', '*steamcommunlty*', '*steamcomunity*', '*steamcommnunity*', '*discord-nitro*', '*discordgift*', '*shark card generator*', '*money generator*'],
  } },
  { key: 'trade', name: 'Mod-Menüs und Account-Handel', trigger: 1, actions: ['block', 'alert'], meta: {
    keyword_filter: ['*modded account*', '*modded acc*', '*verkaufe account*', '*verkaufe acc*', '*money drop service*', '*recovery service*', '*mod menu kaufen*', '*modmenu kaufen*', '*buy mod menu*'],
  } },
  { key: 'invites', name: 'Fremde Einladungen', trigger: 1, actions: ['block'], exemptChannels: ['rpServers'], meta: {
    regex_patterns: ['(?i)(discord\\.gg|discord(app)?\\.com/invite)/[a-z0-9-]+'],
  } },
];

// ---------- EINLADUNGEN pro Quelle (zeigt, woher die Mitglieder kommen) ----------
export const INVITES = ['website', 'pinterest', 'youtube', 'tiktok', 'instagram', 'partner'];

// ---------- FESTE NACHRICHTEN (werden beim Setup gepostet und spaeter aktualisiert) ----------
const BTN = (label, url) => ({ type: 2, style: 5, label, url });
export const MESSAGES = [
  {
    key: 'welcomeMsg', channel: 'welcome',
    embeds: [{
      title: `Willkommen in der ${BRAND} Crew 🌴`,
      description: [
        `Du bist jetzt Teil der deutschen GTA-Community. **Schneller als die Cops.**`,
        '',
        '**Was dich hier erwartet**',
        '🌴 GTA-6-News in Minuten (automatisch, mit Quelle)',
        '🤝 Crew-Suche für GTA Online und GTA VI',
        '🆘 Hilfe-Forum, gute Lösungen landen mit deinem Namen auf der Website',
        '📸 Screenshot der Woche auf Website und Pinterest',
        '🎭 GTA RP und bald eigene RP-Scripts',
        '',
        '**Erst lesen:** <#rules> · **Badges holen:** <#roles>',
      ].join('\n'),
      color: 0xff2d87,
    }],
    components: [{ type: 1, components: [BTN('Zur Website', u('/')), BTN('GTA 6 Hub', u('/spiele/gta-6/')), BTN('Alle Cheats', u('/cheats/'))] }],
  },
  {
    key: 'rulesMsg', channel: 'rules',
    embeds: [{
      title: '📜 Fünf Sterne, fünf Regeln',
      description: [
        '**★ Respekt.** Kein Hate, kein Rassismus, keine Belästigung. Streit ja, Beleidigung nein.',
        '**★★ Fair Play.** Keine Mod-Menüs, Cheats für GTA Online, Account- oder Geld-Handel.',
        '**★★★ Spoiler-Schutz.** GTA-VI-Spoiler nur in #gta6-spoiler oder mit ||Spoiler-Tags||.',
        '**★★★★ Keine Leaks aus illegalen Quellen.** Gerüchte nur mit Quelle.',
        '**★★★★★ Keine Werbung.** Eigene Server nur in #rp-server-vorstellung, Clips in #clips-und-highlights.',
        '',
        'Es gelten außerdem die Discord-Richtlinien. Verstöße: Verwarnung, Timeout, Bann. Meldungen bitte per Rechtsklick → App → Nachricht melden, oder an einen 🚔 Sheriff.',
      ].join('\n'),
      color: 0x19e3c8,
    }],
  },
  {
    key: 'rolesMsg', channel: 'roles',
    embeds: [
      {
        title: '🏅 Fahndungslevel: sammel deine Sterne',
        description: [
          'Wer aktiv ist, steigt im Fahndungslevel. Jede Nachricht zählt, aber höchstens eine pro Minute (Spam bringt nichts).',
          '',
          ...ROLES.filter((r) => r.xp).sort((a, b) => a.xp - b.xp).map((r) => `**${r.name}** ab ${r.xp === 1 ? 'deiner ersten Nachricht' : `${r.xp} Nachrichten`}`),
          '',
          'Der Bot prüft jede Stunde. Neue Sterne ab ★★ meldet er in <#botcmd>.',
        ].join('\n'),
        color: 0xffd23f,
      },
      {
        title: '💎 Sonder-Badges',
        description: ROLES.filter((r) => r.note && r.key !== 'buyer').map((r) => `**${r.name}**: ${r.note.replace('Automatisch, nie wieder erhaeltlich.', 'Automatisch, gibt es nie wieder.').replace('erhaeltlich', 'erhältlich')}`).join('\n'),
        color: 0x8b3dff,
      },
      {
        title: '🔔 Pings und Interessen',
        description: 'Spiele, Plattform, Sprache und Pings wählst du oben im Kanal-Menü unter **Kanäle & Rollen**. Jederzeit änderbar.',
        color: 0xff8a1f,
      },
    ],
  },
  {
    key: 'enMsg', channel: 'enChat',
    embeds: [{
      title: '🇬🇧 Welcome, international crew!',
      description: 'This is the English corner of a German GTA community. Chat, ask for help, find a crew. News are posted in German, but feel free to discuss them here in English.',
      color: 0x33e6ff,
    }],
  },
];
