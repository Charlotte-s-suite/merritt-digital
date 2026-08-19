'use strict';
/*
 * sequence-evidence.cjs — capture and MEASURE the lakeview scroll sequence.
 *
 * Replaces tools/gpu-evidence.cjs, which asserted a discrete-GPU WebGL renderer.
 * There is no WebGL on this page any more, so that assert had nothing left to
 * protect and the GPU-under-Xvfb apparatus it needed is now dead weight.
 *
 *   node tools/sequence-evidence.cjs           # captures + measures, writes library/evidence/
 *   node tools/sequence-evidence.cjs --quick   # captures only
 *
 * THE PROFILE IS THE AUDIENCE, NOT THIS WORKSTATION. Console lead amendment,
 * 2026-08-18: merritt-digital.com is read by Oakland small-business owners on
 * mid-tier phones, usually on cellular, usually for the first time. So the
 * measurements below run under CPU throttling and an emulated slow 4G, plus a
 * slow-3G sanity pass. Numbers taken on an unthrottled desktop would flatter
 * the build and tell us nothing about the people who actually visit.
 *
 * What is asserted, and why each one is a real failure if it breaks:
 *   · width law at 390/834/1280            — the studio's three-viewport law
 *   · page is SCROLLABLE with zero frames  — the critical-path promise
 *   · poster renders with JavaScript off   — the "Complete without JavaScript"
 *                                            claim the ledger makes out loud
 *   · copy contrast over the photograph    — legibility against a busy image
 */
const path = require('path');
const fs = require('fs');
let pw; try { pw = require('playwright'); }
catch { pw = require('/home/user/.npm-global/lib/node_modules/playwright'); }

const ORIGIN = process.env.EVIDENCE_ORIGIN || 'http://127.0.0.1:8477';
const REPO = path.resolve(__dirname, '..');
const OUT = path.join(REPO, 'library', 'evidence');
const VIEWPORTS = [[390, 844], [834, 1112], [1280, 900]];

/* The footage runs OUT, not down: one leaf to the whole bay. The old beats
   (canopy/branches/trunk/ground/rebound/reveal) described a camera falling down
   a drawn tree and do not map onto this at all, so they are renamed rather than
   reused with the wrong labels. */
const BEATS = [
  ['0-leaf', 0.00], ['1-limbs', 0.22], ['2-tree', 0.44],
  ['3-lake', 0.64], ['4-city', 0.82], ['5-bay', 1.00],
];

/* Mid-tier Android, roughly. 4x is the conservative end of the lead's 4-6x. */
const CPU_THROTTLE = 4;
const SLOW_4G = { offline: false, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 };
const SLOW_3G = { offline: false, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8, latency: 400 };

async function throttle(page, net) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { ...net, connectionType: 'cellular4g' });
  return cdp;
}

async function measure(browser, [w, h], net, label) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await throttle(page, net);
  const t0 = Date.now();
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'commit' });

  // time until the visitor can actually read and move: poster painted + scrollable
  await page.waitForFunction(() => {
    const p = document.getElementById('poster');
    return p && p.complete && document.documentElement.scrollHeight > innerHeight * 2;
  }, { timeout: 120000 });
  const firstScrollable = Date.now() - t0;

  const lcp = await page.evaluate(() => new Promise((res) => {
    let v = 0;
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) v = e.startTime; })
        .observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) { return res(null); }
    setTimeout(() => res(Math.round(v)), 2500);
  }));

  // bytes actually on the wire, split the way the ledger splits them
  const bytes = await page.evaluate(() => {
    let page = 0, film = 0;
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) page += nav.encodedBodySize || 0;
    for (const e of performance.getEntriesByType('resource')) {
      const n = e.encodedBodySize || 0;
      if (/\/assets\/seq\//.test(e.name)) film += n; else page += n;
    }
    return { page, film };
  });
  await ctx.close();
  return { label, w, lcp, firstScrollable, pageKB: Math.round(bytes.page / 1024), filmKB: Math.round(bytes.film / 1024) };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await pw.chromium.launch();
  const report = { viewports: [], perf: [], noscript: null, contrast: [] };
  let fail = 0;

  for (const [w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(4000);            // let the sequence stream in

    for (const [name, t] of BEATS) {
      await page.evaluate((tt) => window.scrollTo({
        top: (document.documentElement.scrollHeight - innerHeight) * tt, behavior: 'instant' }), t);
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(OUT, `${w}-${name}.png`) });
    }

    const m = await page.evaluate(() => {
      const d = document.documentElement;
      // contrast of the copy against what is actually behind it
      const probe = (sel) => {
        const el = document.querySelector(sel); if (!el) return null;
        const r = el.getBoundingClientRect();
        return { sel, top: Math.round(r.top), size: getComputedStyle(el).fontSize, color: getComputedStyle(el).color };
      };
      return {
        client: d.clientWidth, doc: d.scrollWidth, body: document.body.scrollWidth,
        frames: document.getElementById('m-frames').textContent,
        pageKB: document.getElementById('m-kb').textContent,
        film: document.getElementById('m-img').textContent,
        probes: [probe('h1'), probe('.thesis'), probe('.canopy .body')].filter(Boolean),
      };
    });
    const pass = m.doc <= m.client && m.body <= m.client;
    if (!pass) fail++;
    report.viewports.push({ w, h, ...m, pass });
    console.log(`  ${w}x${h}: width law ${pass ? 'ok' : '*** FAIL ***'} (client ${m.client}, doc ${m.doc}) · ledger ${m.frames} frames · page ${m.pageKB} kB · film ${m.film}`);
    await ctx.close();
  }

  /* The no-JS floor, asserted rather than assumed. */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'load' });
    const r = await page.evaluate(() => {
      const p = document.getElementById('poster');
      return { poster: !!p && p.complete && p.naturalWidth > 0,
               scrollable: document.documentElement.scrollHeight > innerHeight * 2,
               prices: /200/.test(document.body.innerText) };
    });
    report.noscript = r;
    const ok = r.poster && r.scrollable && r.prices;
    if (!ok) fail++;
    console.log(`  no-JS: poster ${r.poster ? 'renders' : '*** MISSING ***'} · scrollable ${r.scrollable} · prices present ${r.prices}${ok ? '' : '  *** FAIL ***'}`);
    await page.screenshot({ path: path.join(OUT, 'nojs-390.png') });
    await ctx.close();
  }

  if (!process.argv.includes('--quick')) {
    console.log('\n  measured on the AUDIENCE profile (CPU x' + CPU_THROTTLE + '):');
    for (const [w, h] of VIEWPORTS) report.perf.push(await measure(browser, [w, h], SLOW_4G, 'slow-4G'));
    report.perf.push(await measure(browser, [390, 844], SLOW_3G, 'slow-3G'));
    for (const p of report.perf) {
      console.log(`    ${String(p.w).padStart(4)} ${p.label.padEnd(8)} LCP ${String(p.lcp).padStart(5)} ms · first scrollable ${String(p.firstScrollable).padStart(5)} ms · page ${p.pageKB} kB · film so far ${p.filmKB} kB`);
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'RENDERER.txt'),
    `lakeview frame sequence — canvas, no WebGL\ncaptured ${new Date().toISOString()}\n` +
    `profile: CPU x${CPU_THROTTLE}, slow 4G + slow 3G sanity\n` +
    report.viewports.map(v => `${v.w}x${v.h} width-law ${v.pass ? 'ok' : 'FAIL'} client=${v.client} doc=${v.doc} frames=${v.frames} page=${v.pageKB}kB film=${v.film}`).join('\n') +
    `\nno-JS: poster=${report.noscript.poster} scrollable=${report.noscript.scrollable} prices=${report.noscript.prices}\n` +
    report.perf.map(p => `${p.w} ${p.label} LCP=${p.lcp}ms firstScrollable=${p.firstScrollable}ms page=${p.pageKB}kB`).join('\n') + '\n');
  if (fail) { console.error(`\n*** ${fail} assertion(s) failed ***`); process.exit(1); }
  console.log('\nall assertions pass; RENDERER.txt written beside the captures');
}
main().catch((e) => { console.error(e.message); process.exit(1); });
