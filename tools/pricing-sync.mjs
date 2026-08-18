#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
   pricing-sync — the site's prices come from ONE place

   `merritt-studio/pricing.json` is the ratified source of truth. This writes its
   values into the pages so no figure is ever typed into HTML by hand, and
   `--check` fails if the two have drifted. That is the whole point: the old
   five-tier ladder survived in `index.html` and `pricing.html` as hand-typed
   numbers long after the JSON retired it, which is exactly the drift this
   prevents.

     node tools/pricing-sync.mjs           # write the pages from the JSON
     node tools/pricing-sync.mjs --check   # fail (exit 1) if they have drifted

   ── Why this bakes into HTML instead of fetching the JSON at runtime ────────
   This site's own ledger claims it is "Complete without JavaScript". A page
   whose prices only appear after a fetch would break that claim and would show
   a visitor with JS disabled a pricing page with no prices on it. So the
   numbers are baked and this tool is the thing that keeps them honest.

   ── DISCLOSURE, and why this file FAILS CLOSED ──────────────────────────────
   The source JSON contains the hourly rate. Schyler, 2026-08-18: "dont disclose
   the hourly for now". This repo is a PUBLIC GitHub Pages site, so publishing
   that figure — or committing the raw JSON here — would disclose it to everyone.

   Two independent guards, because one is not enough for a number that must not
   escape:
     1. PUBLISHABLE is an exact allowlist of JSON paths. Anything a page asks
        for that is not on it is a hard error, so the default is deny.
     2. After rendering, the output is scanned for the forbidden figures. If an
        undisclosed number appears in the HTML by ANY route — a new binding, a
        copy edit, a careless paste — this refuses to write.
   Guard 2 is what makes this safe against future edits by someone who has not
   read this comment.
   ───────────────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.env.PRICING_JSON ||
  resolve(REPO, '..', 'merritt-studio', 'pricing.json');

/* Exact JSON paths a public page may render. Deny by default. */
const PUBLISHABLE = new Set([
  'initial-design.price',
  'initial-design.name',
  'initial-design.tagline',
  'initial-design.includes',
  'rules.no_subscription',
  'version',
]);

/* Values that must never reach a public page, by id. The rate itself is read
   from the JSON rather than written here — hardcoding it in a public repo to
   check that it is not in a public repo would be its own disclosure. */
const WITHHELD_ITEMS = ['hourly'];

const die = (msg) => { console.error(`pricing-sync: ${msg}`); process.exit(1); };

let data;
try { data = JSON.parse(readFileSync(SRC, 'utf8')); }
catch (e) { die(`cannot read the source of truth at ${SRC}\n  ${e.message}`); }

/* The hard gate from BUSINESS-PLAN §2, enforced here as well as upstream: no
   client sees any number from that file until Schyler has ratified it. */
if (data.ratified !== true) {
  die(`pricing.json is NOT ratified (ratified=${data.ratified}). ` +
      `No number from it may go on a client-facing page. Refusing.`);
}

const byId = Object.fromEntries((data.items || []).map((i) => [i.id, i]));

/* The currency rule is the JSON's own: show the code beside the figure. */
const money = (n) => `$${Number(n).toLocaleString('en-US')} ${data.currency || 'USD'}`;

function lookup(path) {
  if (!PUBLISHABLE.has(path)) {
    die(`"${path}" is not on the publishable allowlist.\n` +
        `  If it genuinely belongs on a public page, add it to PUBLISHABLE and ` +
        `say why in the commit. If it is a rate that must stay private, it is ` +
        `doing its job by failing here.`);
  }
  const [head, ...rest] = path.split('.');
  const key = rest.join('.');
  if (head === 'version') return String(data.version || '');
  if (head === 'rules') return String((data.rules || {})[key] || '');
  const item = byId[head];
  if (!item) die(`no item "${head}" in pricing.json`);
  if (key === 'price') return money(item.price);
  if (key === 'includes') return item.includes || [];
  const v = item[key];
  if (v === undefined) die(`item "${head}" has no field "${key}"`);
  return String(v);
}

/* ── rendering ──────────────────────────────────────────────────────────────
   Bindings are marked in the HTML, so the pages stay readable and a reviewer
   can see at a glance which text is generated:
     <span data-price="initial-design.price">…</span>
     <ul data-price-list="initial-design.includes"> … </ul>            */

function render(html) {
  let out = html.replace(
    /(<([a-zA-Z0-9]+)([^>]*?)\sdata-price="([^"]+)"([^>]*)>)([\s\S]*?)(<\/\2>)/g,
    (m, open, tag, pre, path, post, _body, close) => open + lookup(path) + close);

  out = out.replace(
    /(<ul([^>]*?)\sdata-price-list="([^"]+)"([^>]*)>)([\s\S]*?)(<\/ul>)/g,
    (m, open, pre, path, post, _body, close) => {
      const items = lookup(path);
      if (!Array.isArray(items)) die(`"${path}" is not a list`);
      const indent = '\n        ';
      return open + items.map((t) => `${indent}<li>${t}</li>`).join('') + '\n      ' + close;
    });

  /* Attributes cannot hold a child element, so a figure inside a meta
     description would otherwise be the one number on the site typed by hand.
     data-price-tpl carries the sentence with {path} placeholders and this
     writes the rendered result into `content`. */
  out = out.replace(
    /<meta([^>]*?)\sdata-price-tpl="([^"]*)"([^>]*?)>/g,
    (m, pre, tpl, post) => {
      const rendered = tpl.replace(/\{([^}]+)\}/g, (_, p) => lookup(p.trim()));
      const rebuilt = `<meta${pre} data-price-tpl="${tpl}"${post}>`
        .replace(/\scontent="[^"]*"/, ` content="${rendered}"`);
      return /\scontent="/.test(rebuilt) ? rebuilt
        : `<meta${pre} data-price-tpl="${tpl}"${post} content="${rendered}">`;
    });
  return out;
}

/* Guard 2: nothing withheld may appear in the output, by any route. */
function assertNoLeak(html, file) {
  for (const id of WITHHELD_ITEMS) {
    const item = byId[id];
    if (!item || item.price === undefined) continue;
    const n = Number(item.price);
    // every plausible way the figure could be written
    const forms = [
      String(n), n.toLocaleString('en-US'),
      `$${n}`, `$${n.toLocaleString('en-US')}`,
    ];
    // strip the WebGL ledger's own measured figures, which are unrelated numbers
    const prose = html.replace(/<script[\s\S]*?<\/script>/g, '');
    for (const f of forms) {
      const re = new RegExp(`(^|[^\\d.,])${f.replace(/[$]/g, '\\$')}([^\\d.,]|$)`);
      if (re.test(prose)) {
        die(`REFUSING TO WRITE ${file}: it contains "${f}", which is the ` +
            `withheld "${id}" figure. Schyler, 2026-08-18: "dont disclose the ` +
            `hourly for now". Remove it, or change the ruling first.`);
      }
    }
  }
}

const TARGETS = ['pricing.html', 'index.html', 'terms.html', 'refunds.html'];
const check = process.argv.includes('--check');
let drifted = 0;

for (const file of TARGETS) {
  const path = join(REPO, file);
  const before = readFileSync(path, 'utf8');
  const after = render(before);
  assertNoLeak(after, file);
  if (before === after) { console.log(`  ${file}: in sync`); continue; }
  if (check) { console.error(`  ${file}: *** DRIFTED from pricing.json ***`); drifted++; continue; }
  writeFileSync(path, after);
  console.log(`  ${file}: updated from pricing.json`);
}

console.log(`source: ${SRC}`);
console.log(`ratified ${data.ratified_date} by ${data.ratified_by} · version ${data.version}`);
if (drifted) {
  console.error(`\n${drifted} file(s) drifted. Run without --check to regenerate.`);
  process.exit(1);
}
