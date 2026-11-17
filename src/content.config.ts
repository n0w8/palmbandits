import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { GAME_SLUGS } from './data/games';
import { CATEGORY_SLUGS } from './data/categories';

const newsSchema = z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    game: z.enum(GAME_SLUGS),
    tags: z.array(z.string()).default([]),
    sources: z.array(z.object({ name: z.string(), url: z.string() })).min(1),
    author: z.string().default('Palm Bandits Redaktion'),
    bot: z.boolean().default(false),
    breaking: z.boolean().default(false),
    rumor: z.boolean().default(false),
    hype: z.number().int().min(1).max(5).default(3),
    image: z.object({ src: z.string(), alt: z.string(), credit: z.string().optional() }).optional(),
    translationOf: z.string().optional(),
    // Tipps aus dem Discord: Name wird unter dem Artikel gedankt, discord = Discord-Nutzername oder ID (vergibt automatisch die Rolle Guide-Helfer)
    helpers: z.array(z.object({ name: z.string(), discord: z.string().optional() })).optional(),
});

const guideSchema = z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    game: z.enum(GAME_SLUGS),
    category: z.enum(CATEGORY_SLUGS),
    tags: z.array(z.string()).default([]),
    difficulty: z.enum(['leicht', 'mittel', 'schwer']).optional(),
    featured: z.boolean().default(false),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    sources: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
    image: z.object({ src: z.string(), alt: z.string(), credit: z.string().optional() }).optional(),
    bot: z.boolean().default(false),
    author: z.string().default('Palm Bandits Redaktion'),
    translationOf: z.string().optional(),
    // Tipps aus dem Discord: Name wird unter dem Artikel gedankt, discord = Discord-Nutzername oder ID (vergibt automatisch die Rolle Guide-Helfer)
    helpers: z.array(z.object({ name: z.string(), discord: z.string().optional() })).optional(),
});

// Deutsch: src/content/news + guides. Englisch: src/content/en/news + guides (translationOf = deutsche Datei-ID).
const news = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/news' }), schema: newsSchema });
const guides = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/guides' }), schema: guideSchema });
const newsEn = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/en/news' }), schema: newsSchema });
const guidesEn = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/en/guides' }), schema: guideSchema });

export const collections = { news, guides, newsEn, guidesEn };
