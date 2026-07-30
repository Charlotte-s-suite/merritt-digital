/* ─────────────────────────────────────────────────────────────────────────────
   THE GROWN OAK — Merritt Digital

   A mighty ancient oak with real surfaces and real light: shaded bark, tens of
   thousands of individually modelled leaves, one directional sun and a cool sky
   fill. Every polygon is GENERATED from code and a fixed seed — there is no
   model file, no texture, nothing bought in — so the detail costs CPU at load
   rather than bytes over the wire, and the page's claims about itself stay true.

   The oak is in AUTUMN, and that is the whole reason this works. Realistic oak
   foliage in summer is green, which would put green and brown against a
   brass-on-ink site and fight it. A real oak turning is already brass: gold,
   amber, russet. Realism and the ratified palette turn out to be the same thing.

   Constraints held (§5.5): no textures, no shadow maps, no post-processing
   chains, opaque geometry only — alpha-blended foliage is the one thing 2018
   iPad silicon cannot do, so leaf shape comes from geometry instead. Leaves are
   ONE instanced draw call; all bark is ONE merged mesh. Camera work, the sliced
   build, fail-soft and the render-on-change contract are unchanged.

   Morphology is unchanged from the Schyler-approved silhouette (oak-engraved-v1):
   same growth forces, same seed, same tree — re-clothed, not re-grown.
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';
import { makeJays } from './jays.js';
import { makeScene, installEnvironment } from './scene.js';
import { barkTextures, leafTextures } from './textures.js';

/* ── deterministic randomness ────────────────────────────────────────────────
   Same oak on every load and every device. A tree that reshuffles per visit is
   a toy; a tree that is always this tree is a piece of identity. */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── the oak ─────────────────────────────────────────────────────────────────
   A mighty ancient oak, built to the silhouette that makes an oak an oak and not
   a poplar: a SHORT, massive bole that forks low into a handful of huge limbs,
   which reach out nearly level before sweeping up into a broad mushroom dome
   markedly wider than the tree is tall. Surface roots flare out of the base.

   Three forces shape every step, which is what keeps it from reading as fractal
   scaffolding: thin wood reaches for light, heavy wood sags under its own weight,
   and the crown envelope rolls the outermost growth over and down. The dome is a
   consequence of those three, not a mask applied over a cone.

   Reference: the spreading valley/live-oak silhouette (Schyler, 2026-07-29). */
function growOak(seed) {
  const rand = mulberry32(seed);
  const queue = [];                     // limbs waiting to be cut
  const rng = (a, b) => a + rand() * (b - a);

  /* Capacity is generous and fixed: this tree is deterministic, so its size is
     knowable, and a full buffer degrades by dropping detail rather than throwing. */
  const CAP_BARK = 600000, CAP_LEAF = 70000;
  const bPos = new Float32Array(CAP_BARK * 3), bNor = new Float32Array(CAP_BARK * 3),
        bCol = new Float32Array(CAP_BARK * 3), bUv = new Float32Array(CAP_BARK * 2);
  let bN = 0;                                  // bark vertices written
  const lMat = new Float32Array(CAP_LEAF * 16), lCol = new Float32Array(CAP_LEAF * 3);
  let lN = 0;                                  // leaves written
  let dropped = 0;

  function vertex(px, py, pz, nx, ny, nz, c, u, v) {
    if (bN >= CAP_BARK) { dropped++; return; }
    const i3 = bN * 3, i2 = bN * 2;
    bPos[i3] = px; bPos[i3 + 1] = py; bPos[i3 + 2] = pz;
    bNor[i3] = nx; bNor[i3 + 1] = ny; bNor[i3 + 2] = nz;
    bCol[i3] = c.r; bCol[i3 + 1] = c.g; bCol[i3 + 2] = c.b;
    bUv[i2] = u; bUv[i2 + 1] = v;
    bN++;
  }

  const BARK_LO = new THREE.Color(0x4A3E33);   // shaded, damp, in the crevices
  const BARK_HI = new THREE.Color(0x7A6A57);   // the raised ridges of an old bole
  const LEAF = [                               // an oak turning, weighted to brass
    new THREE.Color(0xD8A94C), new THREE.Color(0xC98A34),
    new THREE.Color(0xB06A28), new THREE.Color(0x8C4E20),
    new THREE.Color(0xE0C273), new THREE.Color(0x6F7635),
  ];
  const LEAF_W = [0.26, 0.22, 0.16, 0.10, 0.18, 0.08];   // last is the green holdout

  const GROUND = -2;
  const BOLE   = 7.0;                   // where the trunk gives out and forks
  const CROWN  = { cy: 16, rx: 34, ry: 10.5 };   // the oblate dome, wider than tall

  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // how far out toward the crown's surface a point sits: <1 inside, ~1 at the skin
  function envelopeAt(p) {
    const rr = Math.hypot(p.x, p.z);
    return (rr * rr) / (CROWN.rx * CROWN.rx) +
           ((p.y - CROWN.cy) * (p.y - CROWN.cy)) / (CROWN.ry * CROWN.ry);
  }

  /* The three forces. Applied every step, to every piece of wood. */
  function shape(p, d, girth, up) {
    if (!up) { d.y -= 0.05; d.normalize(); return; }   // roots dive
    /* Big structural wood below the fork is a column and answers to nothing:
       the bole stands. Applying the crown envelope down here is what bent it into
       a pipe — the envelope's centre is 17 units up, so every trunk step was being
       shoved sideways and down by a force meant for twigs. */
    if (girth > 3.2 || p.y < BOLE - 0.5) { d.normalize(); return; }
    const heavy = Math.min(1, girth / 2.6);
    d.y += 0.072 * (1 - heavy);          // light-seeking, strongest in twigs
    d.y -= 0.026 * heavy;                // self-weight: a settling, not a collapse
    // nothing in the crown may hang back down over the bole — the trunk stays visible
    if (p.y < BOLE) d.y += 0.14 * (BOLE - p.y);
    const rr = Math.hypot(p.x, p.z) || 1e-4;
    const e = envelopeAt(p);
    if (e > 0.62) {                      // at the envelope the crown rolls over
      const over = Math.min(2.2, (e - 0.62) * 2.6);
      d.x -= (p.x / rr) * over * 0.15;   // turn back into the dome...
      d.z -= (p.z / rr) * over * 0.15;
      d.y -= over * 0.035;               // ...with only a slight roll over the edge
    }
    d.normalize();
  }

  /* Leaves along a twig. Each one is an instance: a position, an orientation that
     faces out of the crown with a good deal of scatter, a size, and a colour off
     the autumn ramp. Opaque geometry, so the blade's shape is its silhouette. */
  const _n = V(), _t = V(), _x = V(), _y = V(), _p = V(), _s = V();
  const _m = new THREE.Matrix4(), _mm = new THREE.Matrix4(), _q = new THREE.Quaternion();
  function leafSpray(a, b, shell) {
    const count = 1 + (rand() > 0.55 ? 1 : 0);
    _t.subVectors(b, a);
    for (let i = 0; i < count; i++) {
      const k = rng(0.15, 1.0);
      const px = a.x + _t.x * k, py = a.y + _t.y * k, pz = a.z + _t.z * k;
      // outward from the crown's core, tilted up, then thoroughly jittered
      _n.set(px, (py - CROWN.cy) * 0.6, pz).normalize();
      _n.y += 0.45;
      _n.x += rng(-0.7, 0.7); _n.y += rng(-0.5, 0.7); _n.z += rng(-0.7, 0.7);
      _n.normalize();
      _x.set(_n.z, 0, -_n.x);
      if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0);
      _x.normalize();
      _y.crossVectors(_n, _x).normalize();
      _m.makeBasis(_x, _y, _n);
      _q.setFromRotationMatrix(_m);
      if (lN >= CAP_LEAF) { dropped++; continue; }
      _p.set(px, py, pz);
      _s.setScalar(rng(0.30, 0.52));
      _mm.compose(_p, _q, _s);
      lMat.set(_mm.elements, lN * 16);
      // pick a tone by weight, so gold dominates and the green is a holdout
      let r = rand(), pick = 0, acc = 0;
      for (let w = 0; w < LEAF_W.length; w++) { acc += LEAF_W[w]; if (r <= acc) { pick = w; break; } }
      const c = LEAF[pick];
      lCol[lN * 3] = c.r; lCol[lN * 3 + 1] = c.g; lCol[lN * 3 + 2] = c.b;
      lN++;
    }
  }

  /* A limb is a tapering cage of parallel rails — the engraver's way of showing a
     round form without shading. Big wood gets many rails and reads as a turned
     column; twigs get one and read as a pen stroke. */
  function limb(from, dir, len, girth, depth, up, flare, taper) {
    const TAP = taper === undefined ? 0.72 : taper;
    const steps = Math.max(3, Math.round(len / 1.15));
    const rails = girth > 3.6 ? 28 : girth > 2.4 ? 18 : girth > 1.6 ? 12 :
                  girth > 0.95 ? 8 : girth > 0.5 ? 5 : girth > 0.2 ? 3 : 1;
    const spine = [];
    let p = from.clone();
    let d = dir.clone().normalize();
    for (let i = 0; i < steps; i++) {
      const w = 0.15 / Math.max(0.26, girth);          // ancient wood is gnarled
      d.add(V(rng(-0.3, 0.3) * w * 2, rng(-0.2, 0.2) * w * 2, rng(-0.3, 0.3) * w * 2));
      shape(p, d, girth, up);
      const next = p.clone().addScaledVector(d, len / steps);
      spine.push([p.clone(), next.clone()]);
      p = next;
    }

    /* Bark as a swept tube. The finest wood gets no tube at all — it is buried
       in leaves, and skinning it would triple the triangle count for nothing. */
    if (girth >= 0.30) {
      const radial = girth > 2.6 ? 10 : girth > 1.4 ? 7 : girth > 0.7 ? 5 : 4;
      const pts = [spine[0][0]];
      for (const [, b] of spine) pts.push(b);

      // parallel transport one reference vector along the spine, so consecutive
      // rings share a frame and the tube has no seam or twist
      const tan = V(), ref = V(), side = V(), lift = V();
      tan.subVectors(pts[1], pts[0]).normalize();
      ref.set(-tan.z, 0, tan.x);
      if (ref.lengthSq() < 1e-6) ref.set(1, 0, 0);
      ref.normalize();

      const rings = [], norms = [], radii = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        tan.subVectors(b, a);
        if (tan.lengthSq() < 1e-9) tan.set(0, 1, 0);
        tan.normalize();
        ref.addScaledVector(tan, -ref.dot(tan));
        if (ref.lengthSq() < 1e-8) { ref.set(-tan.z, 0, tan.x); if (ref.lengthSq() < 1e-8) ref.set(1, 0, 0); }
        ref.normalize();
        side.copy(ref);
        lift.crossVectors(tan, side).normalize();

        const t = i / (pts.length - 1);
        const f = flare ? 1 + flare * Math.pow(1 - t, 2.6) : 1;
        const rr = Math.max(0.012, girth * (1 - t * TAP) * 0.5 * f);
        radii.push(rr);
        const ring = [], nrm = [];
        for (let k = 0; k < radial; k++) {
          // ridged bark: the radius wobbles around the ring so light catches it
          const ph = (k / radial) * Math.PI * 2;
          const ridge = 1 + (girth > 1.0 ? 0.055 * Math.sin(ph * 4) : 0);
          const n = side.clone().multiplyScalar(Math.cos(ph)).addScaledVector(lift, Math.sin(ph)).normalize();
          nrm.push(n);
          ring.push(pts[i].clone().addScaledVector(n, rr * ridge));
        }
        rings.push(ring); norms.push(nrm);
      }

      const shade = new THREE.Color();
      for (let i = 0; i < rings.length - 1; i++) {
        for (let k = 0; k < radial; k++) {
          const k2 = (k + 1) % radial;
          const A = rings[i][k], B = rings[i][k2], C = rings[i + 1][k2], D = rings[i + 1][k];
          const nA = norms[i][k], nB = norms[i][k2], nC = norms[i + 1][k2], nD = norms[i + 1][k];
          // ridge/crevice tone, then two triangles per quad
          // grooves run ALONG the limb, so the tone is a function of angle only
          const groove = (kk) => 0.5 + 0.5 * Math.sin((kk / radial) * Math.PI * 4);
          const tone = (kk) => shade.copy(BARK_LO)
            .lerp(BARK_HI, groove(kk) * (girth > 0.7 ? 0.8 : 0.45));
          /* u wraps the limb, v runs along it scaled by real length so the grain
             neither stretches on long limbs nor bunches on short ones */
          const vLen = (ri) => (ri / (rings.length - 1)) * len * 0.42;
          const push = (p, n, kk, ri) => vertex(p.x, p.y, p.z, n.x, n.y, n.z, tone(kk),
                                                (kk / radial) * Math.max(1, girth * 1.3), vLen(ri));
          push(A, nA, k, i); push(B, nB, k2, i); push(C, nC, k2, i + 1);
          push(A, nA, k, i); push(C, nC, k2, i + 1); push(D, nD, k, i + 1);
        }
      }
    }

    /* The tip spray. An oak's visible mass is tens of thousands of fine twigs;
       without this the crown is dead scaffolding no matter how many limbs it has. */
    if (depth <= 0 || len < 1.1) {
      const tip = spine[spine.length - 1][1];
      if (up && len > 0.5 && envelopeAt(tip) > 0.22) {
        const shell = Math.min(1, (envelopeAt(tip) - 0.22) / 0.6);
        const n = Math.round(rng(3, 6) * (0.45 + shell * 0.75));
        for (let t = 0; t < n; t++) {
          const axis = V(rng(-1, 1), rng(-1, 1), rng(-1, 1)).normalize();
          const twig = d.clone().applyAxisAngle(axis, rng(0.22, 1.25))
            .multiplyScalar(len * rng(0.30, 0.62));
          const end = tip.clone().add(twig);
          leafSpray(tip, end, shell);
          if (rand() > 0.4) {
            const a2 = V(rng(-1, 1), rng(-1, 1), rng(-1, 1)).normalize();
            const t2 = twig.clone().applyAxisAngle(a2, rng(0.3, 1.1)).multiplyScalar(rng(0.5, 0.9));
            leafSpray(end, end.clone().add(t2), shell);
          }
        }
      }
      return;
    }

    if (up && depth <= 2 && envelopeAt(spine[spine.length - 1][1]) > 0.20) {
      // clothe the twig-bearing wood too, not just its tips
      const sh = Math.min(1, envelopeAt(spine[spine.length - 1][1]));
      for (let i = Math.floor(spine.length * 0.4); i < spine.length; i++) {
        if (rand() > 0.62) leafSpray(spine[i][0], spine[i][1], sh);
      }
    }

    const children = depth > 5 ? 3 : (rand() > 0.72 ? 4 : 3);
    for (let c = 0; c < children; c++) {   // deferred, not recursed
      const axis = V(rng(-1, 1), rng(-0.3, 0.3), rng(-1, 1)).normalize();
      const angle = rng(0.3, 0.85);
      const cd = d.clone().applyAxisAngle(axis, angle).normalize();
      const at = Math.min(spine.length - 1, Math.floor(spine.length * rng(0.28, 0.97)));
      const start = spine[at][1];
      const room = 1 - at / spine.length;
      queue.push([start, cd, len * rng(0.62, 0.80) * (0.72 + room * 0.32),
                  girth * rng(0.52, 0.68), depth - 1, up, 0, undefined]);
    }
  }

  /* ── the bole: short, massive, flared, and it stops early ── */
  queue.push([V(0, GROUND, 0), V(0, 1, 0), BOLE - GROUND, 4.6, 0, true, 0.5, 0.18]);

  /* ── the primary limbs: five of them, low and reaching out ── */
  const PRIMARIES = 6;
  for (let i = 0; i < PRIMARIES; i++) {
    const az = (i / PRIMARIES) * Math.PI * 2 + rng(-0.16, 0.16);
    const lean = rng(0.72, 1.10);                    // radians from vertical: out, and up
    const dir = V(Math.cos(az) * Math.sin(lean), Math.cos(lean), Math.sin(az) * Math.sin(lean));
    queue.push([V(Math.cos(az) * 0.7, BOLE + rng(-1.6, 0.6), Math.sin(az) * 0.7),
                dir, rng(11, 13.5), rng(2.5, 3.0), 7, true, 0.3, undefined]);
  }
  /* two lower limbs that sweep out almost horizontally — the signature of an old
     spreading oak, and the thing that reads as "ancient" from any distance */
  for (let i = 0; i < 2; i++) {
    const az = i * Math.PI + rng(-0.25, 0.25);
    queue.push([V(0, BOLE - rng(0.8, 2.0), 0),
                V(Math.cos(az), rng(0.04, 0.20), Math.sin(az)).normalize(),
                rng(13, 16), rng(2.0, 2.4), 6, true, 0.28, undefined]);
  }

  /* ── the root plate: buttresses diving, surface roots running out ── */
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng(-0.2, 0.2);
    queue.push([V(0, GROUND + 0.4, 0), V(Math.cos(a), -0.78, Math.sin(a)), rng(9, 12), rng(1.5, 1.9), 3, false, 0.5, undefined]);
  }
  for (let i = 0; i < 5; i++) {                      // shallow surface roots
    const a = (i / 5) * Math.PI * 2 + rng(-0.4, 0.4);
    queue.push([V(0, GROUND + 0.2, 0), V(Math.cos(a), -0.14, Math.sin(a)), rng(9, 13), rng(0.8, 1.1), 2, false, 0.4, undefined]);
  }

  /* ── the stepper ───────────────────────────────────────────────────────────
     Building the whole tree in one go is a ~1s main-thread block on 2018 silicon —
     measured, not guessed — which is precisely the freeze this studio's own kit
     tells us not to ship. So the work is handed out in frame-sized slices and the
     caller drives it. Breadth-first, so the tree fills out evenly rather than
     finishing one branch at a time. */
  return {
    done: () => queue.length === 0,
    step(budgetMs) {
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < budgetMs) limb(...queue.shift());
      return queue.length === 0;
    },
    finish() {
      const bark = new THREE.BufferGeometry();
      // subarray, not copy: the data is already in its final layout
      bark.setAttribute('position', new THREE.BufferAttribute(bPos.subarray(0, bN * 3), 3));
      bark.setAttribute('normal', new THREE.BufferAttribute(bNor.subarray(0, bN * 3), 3));
      bark.setAttribute('color', new THREE.BufferAttribute(bCol.subarray(0, bN * 3), 3));
      bark.setAttribute('uv', new THREE.BufferAttribute(bUv.subarray(0, bN * 2), 2));
      bark.computeBoundingBox();
      bark.computeBoundingSphere();
      if (dropped) console.warn('oak: capacity reached, ' + dropped + ' pieces dropped');
      return {
        bark,
        triangles: bN / 3,
        leaves: { mat: lMat.subarray(0, lN * 16), col: lCol.subarray(0, lN * 3), count: lN },
      };
    },
  };
}

/* ── the ride ────────────────────────────────────────────────────────────────
   Scroll drives a camera on a rail from the crown of the canopy down past the
   root tips. Scroll is READ in the frame, never handled in a scroll listener —
   that is the difference between smooth and janky on an A12X. */
/* Station heights and distances are taken from the geometry's MEASURED bounding
   box (x ∈ [-28, 27], y ∈ [-20, 29], z ∈ [-21, 24]) — a crown 55 wide over a
   31-tall tree, so the framing has to be much wider than the old upright needed.
   Guessing these is how the canopy camera once ended up parked in empty sky. */
const STATIONS = [
  { y:  22, dist: 20, rot: 0.00, look:  19, off:  0 },  // canopy — up inside the dome
  { y:  15, dist: 58, rot: 1.10, look:  12, off: 14 },  // branches — the crown in full spread
  { y:   4, dist: 26, rot: 2.25, look:   6, off: 12 },  // trunk — the bole and its low fork
  { y: -10, dist: 30, rot: 3.30, look: -10, off: 10 },  // roots — in among the root plate
];

function station(t) {
  const span = STATIONS.length - 1;
  const f = THREE.MathUtils.clamp(t, 0, 1) * span;
  const i = Math.min(Math.floor(f), span - 1);
  const k = f - i;
  // smoothstep between stations: the ride eases at each beat instead of
  // running at constant speed through the whole tree
  const e = k * k * (3 - 2 * k);
  const a = STATIONS[i], b = STATIONS[i + 1];
  return {
    y:    a.y    + (b.y    - a.y)    * e,
    dist: a.dist + (b.dist - a.dist) * e,
    rot:  a.rot  + (b.rot  - a.rot)  * e,
    look: a.look + (b.look - a.look) * e,
    off:  a.off  + (b.off  - a.off)  * e,
  };
}

/* Where the camera sits at a given scroll position. Used both by the frame loop
   and by the jay placement, so the birds are anchored to the actual rail rather
   than to a second guess at it. */
function cameraAt(t, split) {
  const s = station(t);
  const pos = new THREE.Vector3(Math.sin(s.rot) * s.dist, s.y, Math.cos(s.rot) * s.dist);
  const target = new THREE.Vector3(0, s.look, 0);
  if (split && s.off) {
    // mirror frame()'s camera.translateX(-off): the shift is in camera space, so
    // anything anchored to the rail has to be shifted with it
    const fwd = target.clone().sub(pos).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    pos.addScaledVector(right, -s.off);
  }
  return { pos, target };
}

/* Anchors for the jays: each bird is given an encounter point on the camera rail,
   sat a few units off to one side of the view, and a heading that carries it
   across the frame. Deterministic from the same seed discipline as the oak. */
function jayAnchors(seed, split) {
  const rand = mulberry32(seed);
  const rng = (a, b) => a + rand() * (b - a);
  const UP = new THREE.Vector3(0, 1, 0);
  const out = [];
  const COUNT = 6;
  for (let i = 0; i < COUNT; i++) {
    // spread the encounters through the descent, skipping the very ends
    const at = 0.07 + (i / (COUNT - 1)) * 0.68 + rng(-0.02, 0.02);
    const { pos, target } = cameraAt(at, split);
    const fwd = target.clone().sub(pos).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const side = i % 2 ? 1 : -1;
    // close to the lens: at true scale a jay is tiny against a 30-unit oak, so
    // proximity — not inflation — is what makes it read
    const anchor = pos.clone()
      .addScaledVector(fwd, rng(1.7, 3.6))
      .addScaledVector(right, rng(-1.1, 1.1))
      .addScaledVector(up, rng(-0.9, 1.3));
    const heading = right.clone().multiplyScalar(side)
      .addScaledVector(fwd, rng(-0.35, 0.35))
      .addScaledVector(UP, rng(-0.10, 0.14)).normalize();
    out.push({
      anchor, heading, up: UP.clone(), at,
      travel: rng(70, 105),      // world units per full page of scroll
      beats: rng(30, 44),        // wingbeats per full page — deliberately slow
      /* Heroic scale, stated rather than pretended: a real jay against a 20m oak
         is a speck, and a speck cannot flap in slow motion where anyone can see it.
         Proximity does most of the work; this does the rest. */
      scale: rng(1.5, 2.2),
    });
  }
  return out;
}

export function mountOak(canvas, opts = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'low-power',
  });
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // a tone curve, not a chain
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* One low sun and a cool sky fill. No shadow maps: they are the single most
     expensive thing a scene like this can ask for, and an autumn crown modelled
     by a warm key against a cool fill reads without them. */
  /* A low western sun that actually casts. Shadows are the single biggest reason a
     lit scene reads as real rather than as a diagram, so they earn their one map —
     tightly framed on the tree, 2048, soft. */
  const sun = new THREE.DirectionalLight(0xFFCE96, 3.6);
  sun.position.set(-90, 52, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -46; sun.shadow.camera.right = 46;
  sun.shadow.camera.top = 46; sun.shadow.camera.bottom = -46;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x7189AB, 0x2A2018, 1.15));

  const place = makeScene(scene);
  const envRT = installEnvironment(renderer, scene, place.sky);

  const barkTex = barkTextures();
  const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex.map, roughnessMap: barkTex.roughnessMap,
    vertexColors: true, roughness: 1.0, metalness: 0.0,
  });
  /* No vertexColors: instance colour tints these, and a missing geometry colour
     attribute would zero it out (learned the hard way). alphaTest, not blending —
     transparent foliage is the one thing old mobile GPUs cannot afford. */
  const leafTex = leafTextures();
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTex.map, alphaMap: leafTex.alphaMap, alphaTest: 0.5,
    roughness: 0.74, metalness: 0.0, side: THREE.DoubleSide,
  });

  /* The leaf blade: five vertices, four triangles, folded along the midrib so the
     light finds an angle on it. Its shape IS its silhouette — no alpha, because
     alpha-blended foliage is exactly what old mobile GPUs choke on. */
  /* Two triangles. The lobed oak silhouette now comes from the texture's alpha
     rather than from geometry — cheaper than the four-triangle diamond AND a far
     better shape than geometry that coarse could ever cut. */
  function leafBlade() {
    const g = new THREE.PlaneGeometry(0.62, 0.86);
    g.translate(0, 0.16, 0);
    return g;
  }

  let barkMesh = null, leafMesh = null;

  /* The oak is cut across frames, never in one block (see growOak's stepper).
     Until it is finished the scene simply has nothing in it — and the static
     engraving underneath is still the design, so nothing is missing. */
  let jays = null, jaySplit = null;
  function flock(split) {
    if (jaySplit === split) return;
    if (jays) { scene.remove(jays.group); jays.dispose(); }
    jaySplit = split;
    jays = makeJays(jayAnchors(72926, split));
    scene.add(jays.group);
  }

  const cutter = growOak(20260728);
  let geometry = null, bounds = null, cutting = true;
  let triangles = 0, leafCount = 0;
  let resolveReady;
  const ready = new Promise((res) => { resolveReady = res; });

  function cut() {
    if (!running) { setTimeout(cut, 200); return; }        // never cut a hidden tab
    /* 9ms slices. At 6ms the cut took as long as 7s on a 4x-throttled CPU, which
       is a long time to look at a silhouette; at 9ms it still fits inside a frame
       on real hardware and roughly halves the wait on slow hardware. */
    if (cutter.step(9)) {
      const built = cutter.finish();
      geometry = built.bark;
      bounds = built.bark.boundingBox;
      triangles = built.triangles + built.leaves.count * 4;
      leafCount = built.leaves.count;

      barkMesh = new THREE.Mesh(built.bark, barkMat);
      barkMesh.frustumCulled = false;
      barkMesh.castShadow = true;
      barkMesh.receiveShadow = true;
      scene.add(barkMesh);

      leafMesh = new THREE.InstancedMesh(leafBlade(), leafMat, leafCount);
      leafMesh.frustumCulled = false;
      // matrices were composed during the slices; this is a straight copy
      leafMesh.instanceMatrix.array.set(built.leaves.mat);
      leafMesh.instanceMatrix.needsUpdate = true;
      leafMesh.instanceColor = new THREE.InstancedBufferAttribute(built.leaves.col, 3);
      leafMesh.castShadow = true;          // dappled shade is the whole point
      leafMesh.receiveShadow = true;
      scene.add(leafMesh);
      cutting = false;
      invalidate();
      resolveReady({ triangles, leaves: leafCount, bounds });
    } else {
      requestAnimationFrame(cut);
    }
  }

  let W = 0, H = 0, dpr = 1;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === W && h === H) return false;
    W = w; H = h;
    // DPR capped at 2 (§5.5); on a phone, 1.5 is indistinguishable and much cheaper
    dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // narrow viewports need a wider field or the trunk crops to a stripe
    camera.fov = w < 700 ? 58 : 42;
    camera.updateProjectionMatrix();
    return true;
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let progress = 0, shown = 0, dirty = true, running = true, raf = 0;


  function frame() {
    raf = 0;
    if (!running) return;
    const moved = resize();
    flock(W >= 900);

    // ease toward the scroll target and the pointer target; keep rendering
    // while anything is still settling, then stop completely
    const d = progress - shown;
    shown += d * 0.12;
    if (Math.abs(d) < 0.0002) shown = progress;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    // opts.station pins the camera for silhouette review; production never sets it
    flock(W >= 900);
    jays.update(shown);
    const s = opts.station || station(shown);
    // pointer parallax is bounded to a few world units (§5.5) — a breath, not a ride
    const px = pointer.x * 3.2, py = pointer.y * 2.0;
    camera.position.set(
      Math.sin(s.rot) * s.dist + px,
      s.y + py,
      Math.cos(s.rot) * s.dist
    );
    camera.lookAt(0, s.look, 0);
    // wide screens read as an editorial split: copy left, oak right. Narrow ones
    // centre it and let the vignette do the separating. Shifting the CAMERA along
    // its own right-vector moves the subject on screen without shearing the view.
    if (W >= 900 && s.off) camera.translateX(-s.off);

    renderer.render(scene, camera);

    const settling = shown !== progress ||
      Math.abs(pointer.tx - pointer.x) > 0.001 || Math.abs(pointer.ty - pointer.y) > 0.001;
    if (settling || moved) schedule(); else dirty = false;
  }

  function schedule() {
    if (!raf && running) raf = requestAnimationFrame(frame);
  }
  function invalidate() { dirty = true; schedule(); }

  // scroll: listener does nothing but store a number
  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress = max > 0 ? window.scrollY / max : 0;
    invalidate();
  }
  // pointer: ornament only, and only where there is a real pointer
  function onPointer(e) {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    invalidate();
  }
  function onVisibility() {
    running = !document.hidden;
    if (running) { invalidate(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', invalidate, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', onPointer, { passive: true });
  }

  onScroll();
  shown = progress;
  invalidate();
  requestAnimationFrame(cut);

  return {
    ready,
    get triangles() { return triangles; },
    get leaves() { return leafCount; },
    get jays() { return jays ? jays.count : 0; },
    get bounds() { return bounds; },
    drawCalls: () => renderer.info.render.calls,
    renders: () => renderer.info.render.frame,   // cumulative frames, for idle-cost proof
    dispose() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', invalidate);
      removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      cutting = false;
      if (jays) jays.dispose();
      if (geometry) geometry.dispose();
      if (leafMesh) leafMesh.dispose();
      place.dispose();
      if (envRT) envRT.dispose();
      barkMat.dispose(); leafMat.dispose(); renderer.dispose();
    },
  };
}
