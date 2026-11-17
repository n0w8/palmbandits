// Zentrale Einstellungen. Name, Domain und Links nur HIER ändern.
export const SITE = {
  name: 'Palm Bandits',
  claim: 'Schneller als die Cops.',
  url: 'https://palmbandits.com',
  lang: 'de',
  locale: 'de_DE',
  description:
    'Die deutsche GTA-Community: GTA 6 News in Minuten, Guides, Cheats, Geld-Tipps, versteckte Orte und Glitches für GTA VI, GTA Online, GTA 5 und alle Klassiker.',
  // Leer lassen, bis der echte Link steht: dann blendet die Seite den Button aus bzw. verweist auf /community/
  discord: 'https://discord.gg/R7mNwd4YYk',
  pinterest: '',
  youtube: '',
  tiktok: '',
  instagram: '',
};

// Discord-Buttons: externer Link, sobald SITE.discord gesetzt ist, sonst Community-Seite
export const DISCORD_LIVE = Boolean(SITE.discord);
export const discordAttrs = DISCORD_LIVE
  ? { href: SITE.discord, target: '_blank', rel: 'noopener' }
  : { href: '/community/' };
/** Discord-Link je Sprache (solange der Server nicht live ist: Community-Seite der jeweiligen Sprache) */
export const discordFor = (lang: 'de' | 'en') => (DISCORD_LIVE ? discordAttrs : { href: lang === 'en' ? '/en/community/' : '/community/' });

// Newsletter: Formular-Ziel eines Anbieters mit Double-Opt-in (z. B. Brevo). Leer = Hinweis "startet bald".
export const NEWSLETTER_ACTION = '';

// Kontakt (aus dem Impressum)
export const CONTACT_EMAIL = 'office@fuchsmedia.at';

// Hosting fuer die Datenschutzerklaerung: 'cloudflare' | 'github'
export const HOSTING: 'cloudflare' | 'github' = 'cloudflare';

// Merch-Shop bei Spreadshirt (Spreadshop). Leer = "öffnet in Kürze".
export const MERCH = {
  url: 'https://palmbandits.myspreadshop.at/',
  items: ['T-Shirts', 'Hoodies', 'wasserabweisende Windbreaker'],
};

// GTA VI Release (Mitternacht Ortszeit laut Store-Angaben)
export const GTA6_RELEASE = '2026-11-19T00:00:00+01:00';

// Song im Radio "Bandits FM".
// Sobald youtubeId oder spotifyUri gesetzt ist, spielt der Player ueber den Dienst (zaehlt als Aufruf/Stream).
// youtubeId = die 11 Zeichen nach "watch?v=". spotifyUri = z. B. "spotify:track:XXXX" (Teilen -> Song-Link kopieren, ID nehmen).
// Ohne beides: lokale Vorschau-Datei aus public/audio/.
export const RADIO = {
  station: 'Bandits FM',
  title: 'GTA (Snippet)',
  artist: 'Eldruna',
  youtubeId: '',
  spotifyUri: '',
  src: '/audio/song.mp3',
  links: {
    spotify: '',
    youtube: '',
  },
};
