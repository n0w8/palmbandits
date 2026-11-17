// Macht aus jedem Radar-Entwurf (automation/drafts/guides/*.md) einen eigenen Pull Request
// (Branch guide-radar/<slug>, Datei nach src/content/guides/), Label "guide-radar",
// und meldet ihn im privaten Discord-Team-Kanal. Kein Radar-Guide geht ohne Freigabe online.
// Zweisprachig: Die englische Fassung (automation/drafts/guides/en/*.md) kommt in DENSELBEN Pull Request,
// nach src/content/en/guides/. Die Zuordnung in src/data/en-slugs.json hat der Radar schon eingetragen.
// Laeuft nur in GitHub Actions (braucht git, gh und GH_TOKEN). Lokal zum Testen: --force.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT_DIR, env, hasFlag, loadDotEnv } from '../lib/util.mjs';
import { discord } from '../news-bot/notify.mjs';
import { EN_GUIDE_DRAFTS_DIR, EN_GUIDES_DIR, GUIDE_DRAFTS_DIR, GUIDES_DIR } from './output.mjs';
import { buildPrBody, prTitle } from './pr.mjs';

const LABEL = 'guide-radar';

const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gitPath = (p) => path.relative(ROOT_DIR, p).split(path.sep).join('/');

// Welche Dateien wandern fuer einen Entwurf in den Pull Request? Deutsch immer, Englisch wenn vorhanden.
export function guideMoves(file, meta, dirs = {}) {
  const { draftsDir = GUIDE_DRAFTS_DIR, guidesDir = GUIDES_DIR, enDraftsDir = EN_GUIDE_DRAFTS_DIR, enGuidesDir = EN_GUIDES_DIR } = dirs;
  const moves = [{ lang: 'de', from: path.join(draftsDir, file), to: path.join(guidesDir, file) }];
  const enName = meta?.en?.fileName;
  if (enName) {
    const from = path.join(enDraftsDir, enName);
    if (existsSync(from)) moves.push({ lang: 'en', from, to: path.join(enGuidesDir, enName) });
    else console.warn(`Englischer Entwurf ${enName} fehlt, Pull Request nur mit der deutschen Fassung.`);
  }
  return moves;
}

export async function openGuidePrs({ exec = run, notify = discord, force = hasFlag('force'), base = env('BASE_BRANCH', 'main'), dirs = {} } = {}) {
  const draftsDir = dirs.draftsDir ?? GUIDE_DRAFTS_DIR;
  const git = (...args) => exec('git', args);
  if (!existsSync(draftsDir)) return console.log('Keine Guide-Entwuerfe.');
  const drafts = readdirSync(draftsDir).filter((f) => f.endsWith('.md'));
  if (!drafts.length) return console.log('Keine Guide-Entwuerfe.');
  if (!process.env.GITHUB_ACTIONS && !force) {
    console.log(`${drafts.length} Guide-Entwurf/Entwuerfe liegen in ${draftsDir}. Pull Requests werden nur in GitHub Actions erstellt.`);
    return;
  }
  try {
    exec('gh', ['label', 'create', LABEL, '--color', '19E3C8', '--description', 'Guide vom Guide-Radar: wartet auf Freigabe', '--force']);
  } catch { /* Label ist optional */ }

  let failed = 0;
  for (const file of drafts) {
    const slug = file.replace(/\.md$/, '');
    const branch = `guide-radar/${slug}`;
    const metaFile = path.join(draftsDir, `${slug}.json`);
    const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : { title: slug, sources: [], warnings: [] };
    const moves = guideMoves(file, meta, { ...dirs, draftsDir });
    try {
      if (git('ls-remote', '--heads', 'origin', branch)) {
        console.log(`Branch ${branch} gibt es schon, uebersprungen.`);
      } else {
        git('switch', '-c', branch, `origin/${base}`);
        for (const m of moves) {
          if (existsSync(m.to)) throw new Error(`${gitPath(m.to)} gibt es schon`);
        }
        for (const m of moves) {
          mkdirSync(path.dirname(m.to), { recursive: true });
          copyFileSync(m.from, m.to);
          git('add', gitPath(m.to));
        }
        git('commit', '-m', `Guide-Radar Entwurf: ${meta.title}${moves.length > 1 ? ' (DE + EN)' : ''}`);
        git('push', '-u', 'origin', branch);
        const bodyFile = path.join(os.tmpdir(), `guide-pr-${slug}.md`);
        writeFileSync(bodyFile, buildPrBody(meta), 'utf8');
        const args = ['pr', 'create', '--base', base, '--head', branch, '--title', prTitle(meta), '--body-file', bodyFile];
        let url;
        try {
          url = exec('gh', [...args, '--label', LABEL]);
        } catch {
          url = exec('gh', args);
        }
        console.log(`PR erstellt: ${url}`);
        await notify({
          title: `Guide-Freigabe: ${meta.title}`,
          url,
          description: `${meta.reason ?? ''}${meta.exploitRisk ? '\nAchtung: Glitch in GTA Online, keine Anleitung zulassen.' : ''}${meta.en ? '\nEnthaelt auch die englische Fassung.' : ''}\nIn der GitHub-App Fakten mit den Quellen vergleichen, dann mergen oder schliessen.`,
          color: 'yellow',
          channel: 'staff',
          game: meta.game,
        });
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

if (process.argv[1]?.replace(/\\/g, '/').endsWith('guide-radar/open-prs.mjs')) {
  loadDotEnv();
  openGuidePrs().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
