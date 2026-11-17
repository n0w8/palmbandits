// Suchindex fuer die Seitensuche (News, Guides, Spiele)
import { searchIndex } from '../lib/feeds';

export const GET = () => searchIndex('de');
