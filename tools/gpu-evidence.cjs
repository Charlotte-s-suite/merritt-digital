'use strict';
/*
 * gpu-evidence.cjs — capture this tenant's WebGL evidence through the renderer assert.
 *
 * Every capture here goes through merritt-studio's lib/gpu-stage.cjs, so a run either
 * produces D3D12/NVIDIA frames or throws with the actual renderer string. Software-rendered
 * or static-fallback captures passed off as evidence are the failure mode this exists to
 * prevent — the oak captures committed before 2026-07-30 were exactly that, which is why
 * they are being replaced.
 *
 *   node tools/gpu-evidence.cjs            # captures + measures, writes library/evidence/
 *   node tools/gpu-evidence.cjs --fps      # relative fps only, no writes
 *
 * FPS CAVEAT, enforced by usage: figures are valid only as BEFORE/AFTER on this box. They
 * are never an acceptance number — a human on the real device is the acceptance path
 * (kit/DESIGN-STANDARD.md three-viewport law). See merritt-studio/docs/GPU-WEBGL.md.
 *
 * If the capture/measure plumbing below stops being tenant-specific, it belongs upstream in
 * gpu-stage.cjs as a PR rather than copied into the next repo.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { withGpuPage } = require('/home/user/shmorganism/workshop/merritt-studio/lib/gpu-stage.cjs');

const ORIGIN = process.env.EVIDENCE_ORIGIN || 'http://127.0.0.1:8477';
const REPO = path.resolve(__dirname, '..');
const OUT = path.join(REPO, 'library', 'evidence');

/* The width law (kit PART I) plus the beats of the ride, so a reviewer sees both the
   responsive composition and the choreography in one evidence set. */
const VIEWPORTS = [[390, 844], [834, 1112], [1280, 900]];
const BEATS = [
  ['0-canopy', 0.00], ['1-branches', 0.30], ['2-trunk', 0.55],
  ['3-ground', 0.68], ['4-rebound', 0.76], ['5-reveal', 0.90],
];

async function ready(page) {
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.getElementById('stage').classList.contains('live'), { timeout: 120000 });
  // the tree is cut across frames; give the last slices and the first camera ease room
  await page.waitForTimeout(1200);
}

async function widthLaw(page, w) {
  return page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
}

async function capture() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = { renderer: null, viewports: [], ledger: null };

  /* ONE gpu session, resizing the viewport inside it. Calling withGpuPage once per
     viewport leaves a stale X lock behind, the next Xvfb fails to bind, and because the
     wrapper's socket wait does not assert, Chrome launches against a dead display and
     dies with "Missing X server". Filed for the upstream wrapper; avoided here by not
     cycling sessions. Xvfb's screen is the largest viewport; smaller ones fit inside. */
  await withGpuPage(async (page, _b, info) => {
    report.renderer = info.renderer;
    for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });
      await ready(page);
      if (w === 1280) {
        report.ledger = await page.evaluate(() => ({
          triangles: document.getElementById('m-seg').textContent,
          leaves: document.getElementById('m-leaf').textContent,
          draws: document.getElementById('m-draw').textContent,
          status: document.getElementById('measured-text').textContent,
        }));
      }
      for (const [name, t] of BEATS) {
        await page.evaluate((tt) => window.scrollTo({
          top: (document.documentElement.scrollHeight - innerHeight) * tt, behavior: 'instant' }), t);
        await page.waitForTimeout(1400);
        await page.screenshot({ path: path.join(OUT, `${w}-${name}.png`) });
      }
      const m = await widthLaw(page, w);
      const pass = m.doc <= m.client && m.body <= m.client;
      report.viewports.push({ w, h, ...m, pass });
      console.log(`  ${w}x${h}: width law ${pass ? 'ok' : '*** FAIL ***'} ` +
        `(client ${m.client}, doc ${m.doc}, body ${m.body})`);
    }
  }, { width: 1280, height: 912 });
  return report;
}

/* Relative fps. measure:true is load-bearing: without --disable-gpu-vsync every figure
   pins near 60 under Xvfb and means nothing. */
async function fps() {
  return withGpuPage(async (page, _b, info) => {
    await ready(page);
    const out = { renderer: info.renderer, samples: {} };
    for (const [name, t] of [['canopy', 0.02], ['branches', 0.30], ['reveal', 0.90]]) {
      await page.evaluate((tt) => window.scrollTo({
        top: (document.documentElement.scrollHeight - innerHeight) * tt, behavior: 'instant' }), t);
      await page.waitForTimeout(1200);
      // drive continuous change so the render-on-change rig actually renders every frame
      out.samples[name] = await page.evaluate(() => new Promise((res) => {
        let frames = 0; const t0 = performance.now();
        (function spin() {
          frames++;
          window.scrollBy(0, (frames % 2) ? 1 : -1);      // keep the scene dirty
          if (performance.now() - t0 < 2500) requestAnimationFrame(spin);
          else res(Math.round(frames * 1000 / (performance.now() - t0)));
        })();
      }));
    }
    return out;
  }, { width: 1280, height: 900, measure: true });
}

(async () => {
  if (process.argv.includes('--fps')) {
    const r = await fps();
    console.log('renderer:', r.renderer);
    for (const [k, v] of Object.entries(r.samples)) console.log(`  ${k}: ${v} fps (RELATIVE ONLY)`);
    console.log('Not an acceptance number. Real device is the acceptance path.');
    return;
  }
  console.log('capturing evidence through the renderer assert…');
  const report = await capture();
  console.log('renderer:', report.renderer);
  console.log('ledger  :', JSON.stringify(report.ledger));
  const failed = report.viewports.filter(v => !v.pass);
  fs.writeFileSync(path.join(OUT, 'RENDERER.txt'),
    `${report.renderer}\ncaptured ${new Date().toISOString()}\n` +
    `ledger ${JSON.stringify(report.ledger)}\n` +
    report.viewports.map(v => `${v.w}x${v.h} width-law ${v.pass ? 'ok' : 'FAIL'} ` +
      `client=${v.client} doc=${v.doc} body=${v.body}`).join('\n') + '\n');
  if (failed.length) { console.error(`WIDTH LAW FAILED at ${failed.map(v=>v.w).join(', ')}`); process.exit(1); }
  console.log('all viewports pass the width law; RENDERER.txt written beside the captures');
})().catch((e) => { console.error(e.message); process.exit(1); });
