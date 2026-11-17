// Macht aus jedem gelben Entwurf (automation/drafts/news/*.md) einen eigenen Pull Request.
// Zweisprachig: Die englische Fassung (automation/drafts/news/en/*.md) kommt in DENSELBEN Pull Request,
// nach src/content/en/news/. Die Zuordnung in src/data/en-slugs.json hat der News-Bot schon eingetragen.
// Der Betreiber gibt ihn in der GitHub-App mit "Merge" frei oder verwirft ihn mit "Close".
// Laeuft nur in GitHub Actions (braucht git, gh und GITHUB_TOKEN). Lokal: --force.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT_DIR, env, hasFlag, loadDotEnv } from '../lib/util.mjs';
import { DRAFTS_DIR, EN_NEWS_DIR, EN_NEWS_DRAFTS_DIR, NEWS_DIR } from './output.mjs';
import { discord } from './notify.mjs';

const LABEL = 'news-freigabe';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const gitPath = (p) => path.relative(ROOT_DIR, p).split(path.sep).join('/');

// Welche Dateien wandern fuer einen Entwurf in den Pull Request? Deutsch immer, Englisch wenn vorhanden.
export function draftMoves(file, meta, dirs = {}) {
  const { draftsDir = DRAFTS_DIR, newsDir = NEWS_DIR, enDraftsDir = EN_NEWS_DRAFTS_DIR, enNewsDir = EN_NEWS_DIR } = dirs;
  const moves = [{ lang: 'de', from: path.join(draftsDir, file), to: path.join(newsDir, file) }];
  const enName = meta?.en?.fileName;
  if (enName) {
    const from = path.join(enDraftsDir, enName);
    if (existsSync(from)) moves.push({ lang: 'en', from, to: path.join(enNewsDir, enName) });
    else console.warn(`Englischer Entwurf ${enName} fehlt, Pull Request nur mit der deutschen Fassung.`);
  }
  return moves;
}

export function buildNewsPrBody(meta) {
  return [
    `**Ampel: GELB.** ${meta.verdict ?? ''}`,
    '',
    meta.rumor ? '> Achtung: Claude stuft den Kern der Meldung als **unbestaetigt** ein (rumor: true).' : '',
    meta.warnings?.length ? `Hinweise vom Bot: ${meta.warnings.join('; ')}` : '',
    '',
    meta.en
      ? `**Zweisprachig:** Dieser Pull Request enthaelt die deutsche und die englische Fassung ("${meta.en.title}"). Beim Merge gehen beide online.`
      : '**Nur Deutsch:** Eine englische Fassung gibt es fuer diese News nicht.',
    '',
    '**Quellen:**',
    ...(meta.sources ?? []).map((s) => `- [${s.name}](${s.url})`),
    '',
    `Spaetere Adresse: ${meta.url ?? ''}`,
    meta.en ? `Englisch: ${meta.en.url}` : '',
    '',
    '---',
    '**So gibst du frei:** Dateien kurz lesen (Reiter "Files changed"), dann **Merge** druecken. Cloudflare baut die Seite danach automatisch neu.',
    '**Nicht veroeffentlichen:** **Close pull request** druecken.',
    'Aendern geht direkt in GitHub: Datei oeffnen, Stift-Symbol, speichern, dann Merge.',
  ].join('\n');
}

export async function openNewsPrs({ exec = run, notify = discord, force = hasFlag('force'), base = env('BASE_BRANCH', 'main'), dirs = {} } = {}) {
  const draftsDir = dirs.draftsDir ?? DRAFTS_DIR;
  const enDraftsDir = dirs.enDraftsDir ?? EN_NEWS_DRAFTS_DIR;
  const git = (...args) => exec('git', args);
  if (!existsSync(draftsDir)) return console.log('Keine Entwuerfe.');
  const drafts = readdirSync(draftsDir).filter((f) => f.endsWith('.md'));
  if (!drafts.length) return console.log('Keine Entwuerfe.');
  if (!process.env.GITHUB_ACTIONS && !force) {
    console.log(`${drafts.length} Entwurf/Entwuerfe liegen in ${draftsDir}. Pull Requests werden nur in GitHub Actions erstellt.`);
    return;
  }
  try {
    exec('gh', ['label', 'create', LABEL, '--color', 'FFD23F', '--description', 'Gelbe News: wartet auf Freigabe', '--force']);
  } catch { /* Label ist optional */ }

  let failed = 0;
  for (const file of drafts) {
    const slug = file.replace(/\.md$/, '');
    const branch = `news-entwurf/${slug}`;
    const metaFile = path.join(draftsDir, `${slug}.json`);
    const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : { title: slug, sources: [], warnings: [] };
    const moves = draftMoves(file, meta, { ...dirs, draftsDir, enDraftsDir });
    try {
      if (git('ls-remote', '--heads', 'origin', branch)) {
        console.log(`Branch ${branch} gibt es schon, uebersprungen.`);
      } else {
        git('switch', '-c', branch, `origin/${base}`);
        for (const m of moves) {
          mkdirSync(path.dirname(m.to), { recursive: true });
          copyFileSync(m.from, m.to);
          git('add', gitPath(m.to));
        }
        git('commit', '-m', `News-Entwurf: ${meta.title}${moves.length > 1 ? ' (DE + EN)' : ''}`);
        git('push', '-u', 'origin', branch);
        const bodyFile = path.join(os.tmpdir(), `pr-${slug}.md`);
        writeFileSync(bodyFile, buildNewsPrBody(meta), 'utf8');
        const args = ['pr', 'create', '--base', base, '--head', branch, '--title', `News-Freigabe: ${meta.title}`, '--body-file', bodyFile];
        let url;
        try {
          url = exec('gh', [...args, '--label', LABEL]);
        } catch {
          url = exec('gh', args);
        }
        console.log(`PR erstellt: ${url}`);
        await notify({ title: `Freigabe noetig: ${meta.title}`, url, description: `${meta.verdict ?? ''}\nIn der GitHub-App pruefen und mergen oder schliessen.${meta.en ? '\nEnthaelt auch die englische Fassung.' : ''}`, color: 'yellow', channel: 'staff' });
        git('switch', base);
      }
      for (const m of moves) rmSync(m.from, { force: true });
      rmSync(metaFile, { force: true });
    } catch (err) {
      failed++;
      console.error(`PR fuer ${file} fehlgeschlagen: ${err.stderr || err.message}`);
      try { git('switch', '-f', base); } catch { /* egal */ }
    }
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('news-bot/open-prs.mjs')) {
  loadDotEnv();
  openNewsPrs().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
