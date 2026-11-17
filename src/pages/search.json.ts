// Suchindex fuer die Seitensuche (News, Guides, Spiele, Cheats)
import { searchIndex } from '../lib/feeds';

export const GET = () => searchIndex('de');
