/* ─────────────────────────────────────────────────────────────────────────────
   skeleton-proof.mjs — prove the growth skeleton is untouched across a
   rendering change.

   The growth morphology (seed 20260728, the three forces, the silhouette) is
   Schyler-approved and must survive every re-rendering of the tree. Segment
   parity stopped being a valid check the moment emission started subdividing
   the skeleton for drawing, so this tool checks the skeleton ITSELF: growOak
   is run with a probe that receives every limb's raw spine — the polyline the
   growth loop produced, before any smoothing, railing or ornamentation — and
   the full coordinate stream is hashed.

   Same hash before and after a rendering change ⇒ same skeleton, bit for bit:
   same limb count, same spine points (so same endpoints, same child attachment
   points, same tip-spray origins), same bounding box.

     node tools/skeleton-proof.mjs

   Prints: limb count · spine point count · bounding box · SHA-256 of the
   coordinate stream · segment tallies by category (drawing-side, expected to
   CHANGE across rendering passes — printed for the budget, not the proof).
   ───────────────────────────────────────────────────────────────────────────── */

import { createHash } from 'node:crypto';
import { growOak } from '../assets/oak.js';

const SEED = 20260728;

let limbs = 0, points = 0;
const bbox = {
  min: [Infinity, Infinity, Infinity],
  max: [-Infinity, -Infinity, -Infinity],
};
const hash = createHash('sha256');

function feed(v) {
  points++;
  // full double precision, exact — any drift at all changes the hash
  const b = new Float64Array([v.x, v.y, v.z]);
  hash.update(Buffer.from(b.buffer));
  for (let i = 0; i < 3; i++) {
    const c = b[i];
    if (c < bbox.min[i]) bbox.min[i] = c;
    if (c > bbox.max[i]) bbox.max[i] = c;
  }
}

const cutter = growOak(SEED, {
  spine(spine) {
    limbs++;
    feed(spine[0][0]);
    for (const [, b] of spine) feed(b);
  },
});

while (!cutter.step(1e9)) { /* drain the whole queue */ }
const built = cutter.finish();

const f = (n) => n.toLocaleString('en-US');
const r = (x) => x.toFixed(3);

console.log('skeleton (the proof):');
console.log(`  limbs        ${f(limbs)}`);
console.log(`  spine points ${f(points)}`);
console.log(`  bbox min     ${bbox.min.map(r).join(', ')}`);
console.log(`  bbox max     ${bbox.max.map(r).join(', ')}`);
console.log(`  sha256       ${hash.digest('hex')}`);
console.log('drawing (the budget — expected to change across rendering passes):');
console.log(`  wood ${f(built.wood.count)} · foliage ${f(built.foliage.count)} · total ${f(built.wood.count + built.foliage.count)}`);
for (const [k, v] of Object.entries(cutter.tally)) console.log(`  ${k.padEnd(8)} ${f(v)}`);
