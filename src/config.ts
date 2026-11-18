// Zentrale Einstellungen. Name, Domain und Links nur HIER ändern.
export const SITE = {
  name: 'Palm Bandits',
  claim: 'Schneller als die Cops.',
  url: 'https://palmbandits.com',
  lang: 'de',
  locale: 'de_DE',
  description:
    'Die deutsche GTA-Community: GTA 6 News in Minuten, Guides, Geld-Tipps, versteckte Orte, Easter Eggs und Glitches für GTA VI, GTA Online, GTA 5 und alle Klassiker.',
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
export const HOSTING: 'easyname' | 'cloudflare' | 'github' = 'easyname';

// Merch-Shop bei Spreadshirt (Spreadshop). Leer = "öffnet in Kürze".
export const MERCH = {
  url: 'https://palmbandits.myspreadshop.at/',
  items: ['T-Shirts', 'Hoodies', 'wasserabweisende Windbreaker', 'Caps', 'Beanies'],
};

// GTA VI Release (Mitternacht Ortszeit laut Store-Angaben)
export const GTA6_RELEASE = '2026-11-19T00:00:00+01:00';

// Video auf der Startseite (Mike 18.11.2026: "will dann auf jeden fall das video auch mit einbinden").
// youtubeId = die 11 Zeichen nach "watch?v=" bzw. nach "youtu.be/". Leer = Block ist ausgeblendet.
// Datenschutz: YouTube (youtube-nocookie) lädt erst nach Klick, vorher kein Kontakt zu Google.
export const VIDEO = {
  youtubeId: '',
  title: { de: 'Das Video zum Release', en: 'The release video' },
  text: {
    de: 'GTA VI ist da. Unser Video zum Start, mit allem, was du jetzt wissen musst.',
    en: 'GTA VI is here. Our launch video with everything you need to know right now.',
  },
};

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
