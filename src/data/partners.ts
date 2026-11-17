// Partner-Streamer und Creator fuer /partner/ und /en/partner/.
// Neuen Partner eintragen: Block unten kopieren, Kommentarzeichen weg, Werte anpassen, Seite neu bauen.
// Reihenfolge hier = Reihenfolge auf der Seite. Keine Logos von Rockstar, keine fremden Bilder.

export type Platform = 'twitch' | 'youtube' | 'tiktok' | 'kick';

export interface Partner {
  /** Kanalname, so wie er auf der Plattform steht */
  name: string;
  platform: Platform;
  /** Voller Link zum Kanal (https://...) */
  url: string;
  /** Kurzbeschreibung auf Deutsch, ein bis zwei Saetze */
  desc: string;
  /** Kurzbeschreibung auf Englisch (fehlt sie, steht auf /en/partner/ der deutsche Text) */
  descEn?: string;
  /** Sprache des Kanals, wird als kleines Kuerzel angezeigt */
  lang?: 'de' | 'en' | 'de+en';
}

export const PARTNERS: Partner[] = [
  // {
  //   name: 'BeispielStreamer',
  //   platform: 'twitch',
  //   url: 'https://www.twitch.tv/beispielstreamer',
  //   desc: 'Streamt jeden Abend GTA RP und GTA VI. Ruhiger Chat, viel Story.',
  //   descEn: 'Streams GTA RP and GTA VI every evening. Chill chat, lots of story.',
  //   lang: 'de',
  // },
];

/** Anzeige-Name und Farbe je Plattform (nur Text, keine Markenlogos) */
export const PLATFORMS: Record<Platform, { label: string; color: string }> = {
  twitch: { label: 'Twitch', color: '#9146ff' },
  youtube: { label: 'YouTube', color: '#ff2a2a' },
  tiktok: { label: 'TikTok', color: '#25f4ee' },
  kick: { label: 'Kick', color: '#53fc18' },
};

// Discord-Einladung fuer Partner-Anfragen (Quelle "partner" aus automation/discord/state.json).
// Jeder Partner bekommt danach seinen EIGENEN Link: Discord, Servereinstellungen, Einladungen, neue Einladung.
export const PARTNER_INVITE = 'https://discord.gg/RdMpKfTTTg';
