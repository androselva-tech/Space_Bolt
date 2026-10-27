/**
 * Plays SpaceBolt in Chrome, as a player would, and reports how each stage went.
 *
 *   npm run test:e2e                         stages 1–3
 *   npm run test:e2e -- --from 21 --to 23    any range (the save starts at --from)
 *   npm run test:e2e -- --right 0.7          answer 70% of questions right (default 1)
 *   npm run demo                             watch it play stages 1–3 in a window
 *   npm run test:e2e:all                     all 27 stages, headless (movies skipped after the first)
 *   npm run demo:all                         watch all 27 stages in a window
 *   npm run demo:home                        watch the way home (stages 21–27) in a window
 *   npm run test:e2e:home                    the way home, headless
 *   --skip-movies                            press SKIP in the launch and landing movies (after the first landing)
 *   --keep-going                             carry on after a stage that can't be finished
 *
 * Every stage, like a player: GO, then answer every question that comes up (rocket parts, fuel,
 * the systems check, meteor storms, faults, parts found on the Moon, repairs at the station); drag
 * each made part from the tray onto the rocket with the mouse and tap its bolts tight, paint and
 * name the rocket, GO FOR LAUNCH, IGNITION. The dev-build autopilot (globalThis.__autopilot) steers
 * the flights, walks the Moon to each part and docks at the space station; the movies (launch,
 * Moon landing, splashdown) play to the end or are skipped with --skip-movies. It writes e2e/report/report.md with
 * a row and a screenshot per stage (mid-flight and at the end), plus e2e/report/report.html to look at them
 * in a browser, and fails if a stage can't be finished in 3 tries.
 * Needs the web dev server (it starts `npx expo start --web` if nothing answers on :8081) and
 * Google Chrome (set CHROME_PATH to use another browser).
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = join(ROOT, 'e2e', 'report');
const URL = 'http://localhost:8081';
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] ?? true : dflt;
};
const FROM = Number(arg('from', 1));
const TO = Number(arg('to', 3));
const RIGHT = Number(arg('right', 1));
const HEADFUL = !!arg('headful', false) || !!process.env.HEADFUL;
const SKIP_MOVIES = !!arg('skip-movies', false);
const KEEP_GOING = !!arg('keep-going', false);
const WORLDS = [[20, 'Earth to Moon'], [27, 'Moon to Earth']];
const world = (n) => WORLDS.find(([last]) => n <= last)?.[1] ?? '';
const pad = (n) => String(n).padStart(2, '0');
const CHROME = process.env.CHROME_PATH ?? [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function serverUp() {
  try {
    return (await fetch(URL)).ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await serverUp()) return null;
  console.log('Starting the web dev server…');
  const child = spawn('npx', ['expo', 'start', '--web', '--port', '8081'], { cwd: ROOT, env: { ...process.env, CI: '1' }, stdio: 'ignore' });
  for (let i = 0; i < 90 && !(await serverUp()); i++) await sleep(1000);
  return child;
}

const state = (page) => page.evaluate(() => {
  const s = window.__game.getState();
  const a = s.assembly;
  return {
    status: s.status, phase: s.phase, intro: !!s.intro, padReady: s.padReady, ignitedAt: s.ignitedAt, leg: s.stage?.leg,
    dockFailed: !!s.dockResult && !s.dockResult.ok, paused: s.paused,
    quiz: s.quiz ? { correct: s.quiz.quiz.correct, n: s.quiz.quiz.options.length, done: s.quiz.done } : null,
    tray: a.tray,
    loose: Object.keys(a.fitted).filter((k) => !a.fitted[k].locked).map((k) => ({ part: k, bolts: a.fitted[k].bolts })),
    stats: s.stageStats, lives: s.lives,
  };
});
const tap = async (page, id) => {
  const el = await page.$(`[data-testid="${id}"]`);
  if (el) await el.click().catch(() => {});
  return !!el;
};
const box = async (page, id) => {
  const el = await page.$(`[data-testid="${id}"]`);
  return el ? el.boundingBox() : null;
};

/** Drag the made part from the tray to its place with the mouse (dev builds say where: __partTarget). */
async function fitByHand(page, part) {
  const from = await box(page, 'tray-part');
  const to = await page.evaluate((p) => window.__partTarget?.(p) ?? null, part);
  if (!from || !to) return page.evaluate(() => window.__game.getState().autoFit());
  const [sx, sy] = [from.x + from.width / 2, from.y + from.height / 2];
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(sx + ((to.x - sx) * i) / 12, sy + ((to.y - sy) * i) / 12);
  await page.mouse.up();
  await sleep(350);
}

/** Tap every loose bolt tight. */
async function tighten(page, loose) {
  for (const { part, bolts } of loose) {
    for (let k = 0; k < bolts.length; k++) {
      for (let t = bolts[k]; t < 3; t++) {
        const b = await box(page, `bolt-${part}-${k}`);
        if (!b) return page.evaluate(() => window.__game.getState().autoFit());
        await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
        await sleep(50);
      }
    }
  }
}

/** One try at a mission, from the workshop to the landing: returns the final state. */
async function playStage(page, n) {
  let flightShot = null, flyingSince = 0;
  await page.evaluate((n) => {
    globalThis.__autopilot = true;
    window.__game.getState().startStage(n);
  }, n);
  let painted = false;
  const started = Date.now();
  while (Date.now() - started < 10 * 60_000) {
    await sleep(350);
    const s = await state(page);
    if (s.status !== 'playing') return { ...s, flightShot };
    if (s.intro) { await tap(page, 'btn-go'); continue; }
    if (s.paused) { await tap(page, 'btn-resume'); continue; }
    if (s.dockFailed) { await sleep(1200); await tap(page, 'btn-dock-retry'); continue; }
    if (s.quiz && !s.quiz.done) {
      const i = Math.random() < RIGHT ? s.quiz.correct : (s.quiz.correct + 1) % s.quiz.n;
      await tap(page, `answer-${i}`);
      await sleep(400);
      await tap(page, 'btn-continue');
      continue;
    }
    if (s.phase === 'build') {
      if (s.loose.length) { await tighten(page, s.loose); continue; }
      if (s.tray) { await fitByHand(page, s.tray); continue; }
    }
    if (s.phase === 'paint' && !painted) {
      painted = true;
      await tap(page, 'paint-body-blue');
      await tap(page, 'paint-trim-gold');
      await page.evaluate(() => window.__game.getState().setDesign({ name: 'TEST PILOT' }));
      await sleep(500);
      await tap(page, 'btn-paint-done');
      continue;
    }
    if (s.phase === 'fuel' && s.padReady) { await tap(page, 'btn-go-launch'); continue; }
    if (s.phase === 'launch' && !s.ignitedAt) { await tap(page, 'btn-ignition'); continue; }
    // the splashdown is never skipped: the parachutes are part of the game (the autopilot fires them)
    if (SKIP_MOVIES && (s.phase === 'launch' || s.phase === 'landing') && (await tap(page, 'btn-skip'))) continue;
    // a picture of the stage in action: the flight, the Moon walk or the docking
    if ((s.phase === 'fly' || s.phase === 'moonwalk' || s.phase === 'dock' || s.phase === 'repair' || s.phase === 'splashdown') && !flightShot && !s.quiz) {
      flyingSince ||= Date.now();
      if (Date.now() - flyingSince > 4000) {
        flightShot = `stage-${pad(n)}-flight.png`;
        await page.screenshot({ path: join(REPORT, flightShot) });
      }
    }
  }
  return { ...(await state(page)), status: 'stuck', flightShot };
}

/** report.md for reading, report.html for looking at every stage's screenshots in a browser. */
function writeReports(results, errors) {
  const rows = ['| Stage | World | Leg | Result | Tries | Right | Wrong | Hits | Stars | In action | End |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const r of results) rows.push(`| ${r.n} | ${world(r.n)} | ${r.leg} | ${r.status} | ${r.tries} | ${r.right} | ${r.wrong} | ${r.hits} | ${r.stars} | ${r.flightShot ? `![](${r.flightShot})` : ''} | ![](${r.shot}) |`);
  const errs = errors.length ? `\n## Page errors\n\n${errors.map((e) => `- ${e}`).join('\n')}\n` : '';
  writeFileSync(join(REPORT, 'report.md'), `# SpaceBolt playthrough\n\n${rows.join('\n')}\n${errs}`);

  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const done = results.filter((r) => r.status === 'complete').length;
  const cards = results.map((r) => `
  <article class="${r.status === 'complete' ? 'ok' : 'bad'}">
    <h2>Stage ${r.n} <small>${world(r.n)} · ${r.leg}</small> <b>${r.status === 'complete' ? '★'.repeat(r.stars) || 'complete' : esc(r.status)}</b></h2>
    <p>${r.right} right · ${r.wrong} wrong · ${r.hits} hits · ${r.tries} ${r.tries === 1 ? 'try' : 'tries'} · ${r.secs}s</p>
    <div class="shots">${r.flightShot ? `<a href="${r.flightShot}"><img src="${r.flightShot}" alt="Stage ${r.n} in flight"></a>` : ''}<a href="${r.shot}"><img src="${r.shot}" alt="Stage ${r.n} end"></a></div>
  </article>`).join('');
  writeFileSync(join(REPORT, 'report.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SpaceBolt playthrough</title>
<style>
  body { margin: 0; padding: 16px; font: 15px system-ui, sans-serif; background: #12131a; color: #eee; }
  h1 { margin: 0 0 4px; } .sum { color: #aaa; margin: 0 0 16px; }
  main { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 520px), 1fr)); }
  article { background: #1d1f2a; border-radius: 10px; padding: 12px; border-left: 4px solid #4caf50; }
  article.bad { border-left-color: #e53935; }
  h2 { margin: 0; font-size: 17px; display: flex; gap: 8px; align-items: baseline; }
  h2 small { color: #9aa; font-weight: 400; } h2 b { margin-left: auto; color: #ffd45c; }
  .bad h2 b { color: #ff6b6b; } p { margin: 4px 0 8px; color: #bbb; }
  .shots { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } img { width: 100%; border-radius: 6px; display: block; }
  pre { white-space: pre-wrap; color: #ff9b9b; }
</style>
<h1>SpaceBolt playthrough</h1>
<p class="sum">${done} of ${results.length} stages complete (stages ${FROM}–${TO}${results.length < TO - FROM + 1 ? ', still running or stopped early' : ''})</p>
<main>${cards}</main>
${errors.length ? `<h2>Page errors</h2><pre>${esc(errors.join('\n'))}</pre>` : ''}
`);
}

async function main() {
  if (!CHROME) throw new Error('No Chrome found: set CHROME_PATH');
  mkdirSync(REPORT, { recursive: true });
  const server = await ensureServer();
  const launch = () => puppeteer.launch({
    executablePath: CHROME, headless: !HEADFUL,
    defaultViewport: HEADFUL ? null : { width: 960, height: 450, deviceScaleFactor: 2 },
    // root in a container (CI) needs --no-sandbox; a normal Mac user doesn't
    args: [...(HEADFUL ? ['--window-size=1280,640'] : []), ...(process.getuid?.() === 0 ? ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])],
  });
  let browser = await launch();
  const errors = [];
  /** The player's save after the last stage, to carry on with if the browser has to be restarted. */
  let saved = null;
  /** A tab with the game loaded (with the saved progress, if there is any). */
  const openPage = async () => {
    if (!browser.connected) {
      console.log('  the browser closed (often the computer running low on memory): starting it again');
      browser.process()?.kill('SIGKILL'); // what's left of it still holds memory
      browser = await launch();
    }
    const p = await browser.newPage();
    p.on('pageerror', (e) => errors.push(String(e)));
    p.on('error', (e) => { errors.push(`Tab crashed: ${e}`); console.log(`  the tab crashed: ${e}`); });
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 120_000 });
    await p.waitForFunction(() => window.__game?.getState().loaded, { timeout: 60_000 });
    if (saved) await p.evaluate((profile) => window.__game.getState().adoptProfile(profile), saved);
    return p;
  };
  let page = await openPage();
  // a fresh player at --from
  await page.evaluate((from) => {
    const g = window.__game.getState();
    g.resetProgress();
    g.adoptProfile({ ...window.__game.getState().profile, unlocked: from });
  }, FROM);

  const results = [];
  let failed = false;
  for (let n = FROM; n <= TO; n++) {
    let s, tries = 0;
    const t0 = Date.now();
    do {
      tries++;
      try {
        s = await playStage(page, n);
      } catch (e) {
        // the tab crashed or reloaded under us: note it, open a fresh tab and try the stage again
        console.log(`  stage ${n}: the browser tab was lost (${String(e).split('\n')[0]}); retrying in a new tab`);
        errors.push(`Stage ${n}: tab lost: ${String(e).split('\n')[0]}`);
        await page.close().catch(() => {});
        page = await openPage();
        await sleep(500);
        s = { status: 'lost', stats: { right: 0, wrong: 0, hits: 0, stars: 0 } };
      }
    } while (s.status !== 'complete' && tries < 3);
    await sleep(1200);
    const shot = `stage-${pad(n)}.png`;
    await page.screenshot({ path: join(REPORT, shot) }).catch(() => {});
    const st = s.stats;
    results.push({ n, leg: s.leg, status: s.status, tries, ...st, shot, flightShot: s.flightShot, secs: Math.round((Date.now() - t0) / 1000) });
    console.log(`stage ${n} (${world(n)}, ${s.leg}): ${s.status} after ${tries} ${tries === 1 ? 'try' : 'tries'} (${st.right} right, ${st.wrong} wrong, ${st.hits} hits, ${st.stars} stars)`);
    writeReports(results, errors);
    saved = await page.evaluate(() => window.__game.getState().profile).catch(() => saved);
    const heap = await page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6)).catch(() => 0);
    if (heap) console.log(`  page memory: ${heap} MB`);
    if (s.status !== 'complete') {
      failed = true;
      if (!KEEP_GOING) break;
      // let the next stage start even though this one wasn't won
      await page.evaluate((next) => window.__game.getState().adoptProfile({ ...window.__game.getState().profile, unlocked: Math.max(next, window.__game.getState().profile.unlocked) }), n + 1);
    }
  }
  await browser.close();
  server?.kill();
  console.log(`Report: ${join(REPORT, 'report.md')}\nIn a browser: open ${join(REPORT, 'report.html')}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
