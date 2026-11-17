// Foto-Pool: eigene, KI-generierte Symbolbilder (keine fremden Rechte). Zuordnung nach Spiel und Thema.
// Neue Fotos: Datei nach src/assets/pool/ legen und hier mit Alt-Text und Tags eintragen.
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/pool/*.jpg', { eager: true });

const META: Record<string, { alt: string; en: string; tags: string[] }> = {
  '00-sunset-skyline': { alt: 'Küstenstadt mit Palmen und Art-déco-Hotels im Sonnenuntergang', en: 'Coastal city with palm trees and Art Deco hotels at sunset', tags: ['gta-6', 'allgemein', 'wissen'] },
  '01-neon-avenue': { alt: 'Neon-Boulevard bei Nacht mit Sportwagen auf nasser Straße', en: 'Neon boulevard at night with a sports car on a wet street', tags: ['gta-6', 'gta-vice-city', 'tipps'] },
  '02-overseas-bridge': { alt: 'Lange Brücke über türkises Wasser, ein Cabrio fährt zu den Inseln', en: 'Long bridge over turquoise water, a convertible driving to the islands', tags: ['gta-6', 'fundorte', 'wissen'] },
  '03-swamp-gator': { alt: 'Sumpf in der Dämmerung mit Airboat und Alligator im Wasser', en: 'Swamp at dusk with an airboat and an alligator in the water', tags: ['gta-6', 'fundorte', 'easter-eggs'] },
  '04-beach-sunset': { alt: 'Strand mit Rettungsschwimmer-Turm und Palmen im Abendrot', en: 'Beach with a lifeguard tower and palm trees at sunset', tags: ['gta-6', 'allgemein'] },
  '05-police-chase': { alt: 'Polizeiwagen mit Blaulicht verfolgt einen Sportwagen bei Nacht', en: 'Police car with flashing lights chasing a sports car at night', tags: ['gta-6', 'gta-5', 'gta-online', 'tipps'] },
  '06-heli-searchlight': { alt: 'Helikopter mit Suchscheinwerfer über einer Großstadt bei Nacht', en: 'Helicopter with a searchlight over a big city at night', tags: ['gta-6', 'gta-5', 'allgemein'] },
  '07-marina': { alt: 'Luxus-Marina mit Speedbooten und Hochhäusern bei Sonnenuntergang', en: 'Luxury marina with speedboats and high-rises at sunset', tags: ['gta-6', 'gta-online', 'geld'] },
  '08-cash': { alt: 'Geldbündel und offene Sporttasche im Neonlicht', en: 'Bundles of cash and an open sports bag in neon light', tags: ['geld', 'gta-online'] },
  '09-heist-crew': { alt: 'Vier maskierte Gestalten gehen nachts von einem Geldtransporter weg', en: 'Four masked figures walking away from an armored truck at night', tags: ['geld', 'gta-online', 'gta-5'] },
  '10-vault': { alt: 'Geöffnete Tresortür mit Goldbarren', en: 'Open vault door with gold bars', tags: ['geld', 'gta-online', 'glitches'] },
  '11-nightclub': { alt: 'Nachtclub mit Lasershow und tanzender Menge', en: 'Nightclub with a laser show and a dancing crowd', tags: ['gta-online', 'geld'] },
  '12-garage': { alt: 'Tiefgarage mit einer Reihe Supersportwagen', en: 'Underground garage with a row of supercars', tags: ['gta-online', 'gta-5', 'tipps'] },
  '13-desert-highway': { alt: 'Muscle-Car am Wüsten-Highway im Sonnenuntergang', en: 'Muscle car on a desert highway at sunset', tags: ['gta-5', 'gta-san-andreas', 'gta-online'] },
  '14-retro-80s': { alt: 'Weißes 80er-Cabrio vor Neon-Hotels bei Nacht', en: 'White 80s convertible in front of neon hotels at night', tags: ['gta-vice-city', 'easter-eggs'] },
  '15-90s-street': { alt: 'Wohnstraße der 90er mit Lowrider und Palmen', en: '90s residential street with a lowrider and palm trees', tags: ['gta-san-andreas', 'easter-eggs'] },
  '16-grey-city': { alt: 'Graue Ostküsten-Stadt mit Stahlbrücke in der Dämmerung', en: 'Grey East Coast city with a steel bridge at dusk', tags: ['gta-4', 'gta-3'] },
  '17-crt-retro': { alt: 'Röhrenfernseher und Controller im Kinderzimmer der 2000er', en: 'CRT TV and a controller in a 2000s bedroom', tags: ['cheats', 'gta-3', 'gta-vice-city', 'gta-san-andreas'] },
  '18-ufo-mountain': { alt: 'Leuchtendes UFO über einem Berggipfel bei Nacht', en: 'Glowing UFO above a mountain peak at night', tags: ['easter-eggs', 'fundorte', 'gta-5'] },
  '19-glitch-city': { alt: 'Nächtliche Stadtstraße mit digitalem Glitch-Effekt', en: 'City street at night with a digital glitch effect', tags: ['glitches'] },
  '20-controller': { alt: 'Hände halten einen Controller im Licht eines Bildschirms', en: 'Hands holding a controller in the light of a screen', tags: ['tipps', 'cheats', 'allgemein'] },
  '21-map-pins': { alt: 'Alte Karte einer Küste mit Stecknadeln, Taschenlampe und Handy', en: 'Old coastal map with pins, a flashlight and a phone', tags: ['fundorte', 'easter-eggs', 'tipps'] },
  '22-radio-studio': { alt: 'Retro-Radiostudio mit Mikrofon und Neonlicht', en: 'Retro radio studio with a microphone and neon light', tags: ['radio'] },
  '23-launch-night': { alt: 'Feuerwerk über einer Küstenstadt mit Palmen um Mitternacht', en: 'Fireworks over a coastal city with palm trees at midnight', tags: ['gta-6', 'allgemein'] },
};

export interface Photo { key: string; src: ImageMetadata; alt: string; en: string; tags: string[] }

export const PHOTOS: Photo[] = Object.entries(files)
  .map(([p, m]) => {
    const key = p.split('/').pop()!.replace(/\.jpg$/, '');
    const meta = META[key] ?? { alt: 'Symbolbild', en: 'Illustrative image', tags: ['allgemein'] };
    return { key, src: m.default, ...meta };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Waehlt ein passendes Foto. tags in Prioritaet (z. B. [kategorie, spiel]); gleiche Seed = gleiches Foto. */
export function photoFor(seed: string, tags: string[]): Photo {
  const [a, b] = tags;
  const both = a && b ? PHOTOS.filter((p) => p.tags.includes(a) && p.tags.includes(b)) : [];
  const pool = both.length ? both : PHOTOS.filter((p) => p.tags.includes(a ?? '')).length
    ? PHOTOS.filter((p) => p.tags.includes(a!))
    : PHOTOS.filter((p) => p.tags.includes(b ?? '')).length ? PHOTOS.filter((p) => p.tags.includes(b!)) : PHOTOS;
  return pool[hash(seed) % pool.length];
}

export const photoByKey = (key: string) => PHOTOS.find((p) => p.key === key);
