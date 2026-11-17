import type { APIContext } from 'astro';
import { rssFor } from '../lib/feeds';

export const GET = (context: APIContext) => rssFor('de', context);
