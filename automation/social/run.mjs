// Reels fuer heute bauen und (optional) posten.
//   node social/run.mjs                    -> alle Reels von heute nach social/out/<datum>/ (Video, Titelbild, Caption)
//   node social/run.mjs --only=cheat       -> nur eine Sorte (cheat | news | guide | fact)
//   node social/run.mjs --post             -> zusaetzlich auf Instagram posten (IG_USER_ID + IG_ACCESS_TOKEN noetig)
//   --date=2026-11-19   --fixtures (Testdaten)
// Schon gepostete Reels stehen in automation/data/social-posted.json und werden nie doppelt gepostet.
import path from 'node:path';
import { AUTOMATION_DIR, DATA_DIR, argValue, hasFlag, loadDotEnv, readJson, writeJson } from '../lib/util.mjs';
import { loadContent } from '../pinterest/content.mjs';
import { igConfig, publishReel } from './instagram.mjs';
import { loadFacts, planReels, renderReel } from './reel.mjs';

loadDotEnv();
const date = argValue('date') ? new Date(`${argValue('date')}T12:00:00Z`) : new Date();
const only = argValue('only');
const POST = hasFlag('post');
const POSTED_FILE = path.join(DATA_DIR, 'social-posted.json');
const outDir = path.join(AUTOMATION_DIR, 'social', 'out', date.toISOString().slice(0, 10));

const plans = planReels(loadContent(hasFlag('fixtures')), date, loadFacts()).filter((p) => !only || p.kind === only);
if (!plans.length) { console.log(`Heute nichts zu tun${only ? ` (${only})` : ''}.`); process.exit(0); }

const posted = readJson(POSTED_FILE, {});
const ig = POST ? igConfig() : null;
if (POST && !ig) console.log('Kein IG_USER_ID/IG_ACCESS_TOKEN: Reels werden nur gebaut, nicht gepostet.');

let made = 0;
let failed = 0;
for (const plan of plans) {
  try {
    const r = await renderReel(plan, outDir);
    made++;
    console.log(`Reel gebaut: ${plan.kind} -> ${path.relative(AUTOMATION_DIR, r.video)}`);
    if (ig && !posted[plan.id]?.instagram) {
      const res = await publishReel(ig, { video: r.video, caption: plan.caption });
      posted[plan.id] = { ...(posted[plan.id] ?? {}), instagram: { id: res.id, url: res.permalink ?? null, at: new Date().toISOString() } };
      writeJson(POSTED_FILE, posted);
    } else if (ig) {
      console.log(`Schon gepostet: ${plan.id}`);
    }
  } catch (e) {
    failed++;
    console.error(`FEHLER bei ${plan.id}: ${e.message}`);
  }
}
console.log(`Fertig: ${made} Reel(s) gebaut${failed ? `, ${failed} Fehler` : ''}.`);
if (failed) process.exitCode = 1;
