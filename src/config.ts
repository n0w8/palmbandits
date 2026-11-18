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
  youtubeId: '_AlsuA8A37c',
  // Eldruna - GRAND THEFT AUTO (Official Music Video) All-Star, hochgeladen 18.11.2026 (zum Einbauen noch "Privat").
  artist: 'Eldruna',
  song: 'GRAND THEFT AUTO',
  title: { de: 'Eldruna: GRAND THEFT AUTO', en: 'Eldruna: GRAND THEFT AUTO' },
  kicker: { de: 'Premiere · Offizielles Musikvideo', en: 'Premiere · Official music video' },
  text: {
    de: 'Eine Crew, fünf Sterne, kein sicherer Ort mehr. Ein Raubzug im GTA-Stil quer durch Vice City und Leonida, kurz bevor GTA VI erscheint. Präsentiert von PALM BANDITS.',
    en: 'One crew, five stars, no safe place left to go. A GTA-style heist through Vice City and Leonida, right before GTA VI drops. Presented by PALM BANDITS.',
  },
  // Mike 18.11.2026: "ravnir ist emma" (Emma raus), Eldruna, Domsgard, Skaedra, Runvyr und Ravnir verlinken auf ihre Websites
  cast: [
    { name: 'Eldruna', url: 'https://eldruna.com/' },
    { name: 'Domsgard', url: 'https://domsgard.com/' },
    { name: 'Skulgard' },
    { name: 'Ravhena' },
    { name: 'Runvyr', url: 'https://runvyrmusic.com/' },
    { name: 'Skaedra', url: 'https://skaedra.com/' },
    { name: 'Ravnir', url: 'https://ravnirmusic.com/' },
    { name: 'PRONX' },
  ] as { name: string; url?: string }[],
  duration: '4:31',
  durationIso: 'PT4M31S',
  uploadDate: '2026-11-18T17:33:03+01:00',
  // Vorschaubild liegt auf dem eigenen Webspace (kein Kontakt zu Google vor dem Klick)
  poster: '/video/grand-theft-auto-musikvideo.jpg',
  posterSmall: '/video/grand-theft-auto-musikvideo-640.jpg',
  channel: 'https://www.youtube.com/@Eldruna1337',
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
