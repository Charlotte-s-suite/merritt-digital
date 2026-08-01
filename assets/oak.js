/* ─────────────────────────────────────────────────────────────────────────────
   THE LUMINOUS OAK — Merritt Digital

   A mighty ancient oak drawn entirely in LIGHT LINES. No surfaces, no shading
   model, no textures, no shadow maps — one primitive, the line segment, from
   the root plate to the last twig, with the whole world behind it drawn the
   same way.

   Why lines. The photoreal pass before this one lost, and it lost for a
   structural reason worth writing down: procedural geometry is superb at
   recursive branching and poor at sculpted organic surface, so every hour spent
   skinning the tree was spent fighting the medium. But the tree was ALWAYS a
   graph of segments — the surfaces were built from it and then thrown it away.
   Drawing the graph directly is not a retreat to the earlier engraving; it is
   the honest form for what this thing actually is, and it is why the detail
   here costs a fraction of what the skinned version cost.

   How it holds depth without surfaces:
     · weight follows structure — the bole is heavy, the twigs are hairlines
     · weight also follows DISTANCE, so far wood thins and near wood is solid
     · colour is a FIELD (palette.js), not paint: height and role decide hue
     · everything far dissolves into the sky's own colour
     · brightness is meaning — the hot things bloom, the mass stays dark

   Constraints held: no model file, no texture file, nothing bought in. The
   whole tree is still grown from a few hundred lines of code and one fixed
   number. Still cut across frames, never in one block. Still renders only on
   change and costs nothing at rest.

   Morphology is UNCHANGED from the Schyler-approved silhouette
   (oak-engraved-v1): same growth forces, same seed, same tree. Re-drawn, not
   re-grown — three times now, which is the point of keeping growth and
   rendering separable.

   Luminous-line direction: Schyler, 2026-07-31, direct.
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';
import { makeJays } from './jays.js';
import { makeLineScene } from './scene.js';
import { lineMaterial, lineBatch, segmentWriter, makeComposer } from './lines.js';
import { woodColor, LEAF, LEAF_W, FOG } from './palette.js';

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

function growOak(seed) {
  const rand = mulberry32(seed);
  const queue = [];                     // limbs waiting to be cut
  const rng = (a, b) => a + rand() * (b - a);

  /* Capacity is generous and fixed: this tree is deterministic, so its size is
     knowable, and a full buffer degrades by dropping detail rather than throwing. */
  const wood = segmentWriter(220000);
  const foliage = segmentWriter(130000);

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

  /* ── leaves ────────────────────────────────────────────────────────────────
     A leaf is a STROKE: the midrib, drawn in the leaf's own colour, running
     slightly hotter toward the tip. Leaves out on the shell of the crown also
     get two barbs, which is enough to read as a blade rather than a dash where
     the camera is close enough to tell.

     45,000 filled and lit blades became a brown mass at any distance. 45,000
     luminous strokes at low weight build the same mass out of light, and the
     bloom turns density into glow — which is exactly what a backlit canopy
     does at golden hour. */
  const _n = V(), _t = V(), _x = V(), _y = V(), _p = V(), _e = V(), _b = V();
  const _cA = new THREE.Color(), _cB = new THREE.Color();
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

      // pick a tone by weight, so gold dominates and the green is a holdout
      let r = rand(), pick = 0, acc = 0;
      for (let w = 0; w < LEAF_W.length; w++) { acc += LEAF_W[w]; if (r <= acc) { pick = w; break; } }
      const c = LEAF[pick];
      /* Kept UNDER the composer's bloom threshold. A leaf is not a light. When
         the tips ran hot every one of them bloomed, and forty thousand blooming
         tips turned the whole crown into a cream-coloured cloud — the exact
         wash this palette exists to avoid. Only the sun, the windows and the
         necklace are allowed over the line. */
      _cA.copy(c).multiplyScalar(0.50);           // base, in shade
      _cB.copy(c).multiplyScalar(0.86);           // tip, catching the west light

      /* Short, and barbed. At the first beat the camera is INSIDE the crown, so
         a leaf is read at arm's length: a long bare stroke there is a pine
         needle, not an oak leaf. Short midrib plus a pair of swept barbs reads
         as a blade close up and still packs into a mass at distance. */
      const len = rng(0.26, 0.46);
      _p.set(px, py, pz);
      _e.copy(_p).addScaledVector(_n, len);
      foliage.push(_p.x, _p.y, _p.z, _e.x, _e.y, _e.z, _cA, _cB, 1.05);

      if (shell > 0.30 && rand() > 0.32) {
        _x.set(_n.z, 0, -_n.x);
        if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0);
        _x.normalize();
        const mid = _p.clone().addScaledVector(_n, len * 0.38);
        const spread = len * 0.62;
        for (const sgn of [1, -1]) {
          // swept BACK from the midrib, which is what makes it a leaf and not a cross
          _b.copy(mid).addScaledVector(_x, spread * sgn).addScaledVector(_n, -len * 0.10);
          foliage.push(mid.x, mid.y, mid.z, _b.x, _b.y, _b.z, _cA, _cB, 0.9);
        }
      }
    }
  }

  /* ── a limb ────────────────────────────────────────────────────────────────
     A tapering cage of parallel RAILS with occasional hoops around it — the
     engraver's way of showing a round form without shading, and the reason big
     wood reads as a turned column rather than as a bundle of wires. Rail count
     falls with girth until the finest wood is a single pen stroke.

     The rails come off exactly the same parallel-transported rings the skinned
     version used for its tube, so the form is identical — only the emission
     changed. */
  function limb(from, dir, len, girth, depth, up, flare, taper) {
    const TAP = taper === undefined ? 0.72 : taper;
    const steps = Math.max(3, Math.round(len / 1.15));
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

    const rails = girth > 3.6 ? 10 : girth > 2.4 ? 8 : girth > 1.6 ? 6 :
                  girth > 0.95 ? 5 : girth > 0.5 ? 4 : girth > 0.2 ? 3 : 1;
    // heavy wood is drawn heavily; a twig is a hairline. Weight IS the hierarchy.
    const weight = THREE.MathUtils.clamp(0.85 + girth * 0.52, 0.85, 3.5);

    if (rails === 1) {
      // finest wood: the spine itself, one stroke, gradient along its length
      for (const [a, b] of spine) {
        woodColor(a.y, girth, up, _cA);
        woodColor(b.y, girth, up, _cB);
        wood.push(a.x, a.y, a.z, b.x, b.y, b.z, _cA, _cB, weight);
      }
    } else {
      const pts = [spine[0][0]];
      for (const [, b] of spine) pts.push(b);

      // parallel transport one reference vector along the spine, so consecutive
      // rings share a frame and the cage has no seam or twist
      const tan = V(), ref = V(), side = V(), lift = V();
      tan.subVectors(pts[1], pts[0]).normalize();
      ref.set(-tan.z, 0, tan.x);
      if (ref.lengthSq() < 1e-6) ref.set(1, 0, 0);
      ref.normalize();

      const rings = [];
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
        const ring = [];
        for (let k = 0; k < rails; k++) {
          const ph = (k / rails) * Math.PI * 2;
          /* Each rail WANDERS in and out along the limb rather than running
             parallel to its neighbours. Straight evenly-spaced rails plus full
             hoops made the bole read as a transmission pylon — an engineered
             lattice, not bark. The second term is the wander; it is what turns
             the cage back into a fluted old trunk. */
          const flute = girth > 1.0
            ? 1 + 0.09 * Math.sin(ph * 4) + 0.075 * Math.sin(i * 0.55 + k * 1.7)
            : 1;
          ring.push(pts[i].clone()
            .addScaledVector(side, Math.cos(ph) * rr * flute)
            .addScaledVector(lift, Math.sin(ph) * rr * flute));
        }
        rings.push(ring);
      }

      for (let i = 0; i < rings.length - 1; i++) {
        for (let k = 0; k < rails; k++) {
          const A = rings[i][k], B = rings[i + 1][k];
          woodColor(A.y, girth, up, _cA);
          woodColor(B.y, girth, up, _cB);
          /* Rails on the far side of the limb are dimmer. There is no lighting
             model here, so this stands in for one: without it a cage reads as
             flat and transparent instead of as a solid round column. */
          const facing = 0.55 + 0.45 * Math.max(0, Math.cos((k / rails) * Math.PI * 2 - 2.4));
          _cA.multiplyScalar(facing); _cB.multiplyScalar(facing);
          wood.push(A.x, A.y, A.z, B.x, B.y, B.z, _cA, _cB, weight * (0.7 + facing * 0.4));
        }
        /* BROKEN hoops on structural wood: short cross-checks, never a closed
           ring. A closed ring every few steps is precisely what read as a pylon
           — the eye finds the repeating horizontal band before it finds the
           tree. Staggering which arc is drawn turns the same cue into bark. */
        if (girth > 1.0 && i % 4 === 0) {
          for (let k = 0; k < rails; k++) {
            if ((k + i) % 3 !== 0) continue;
            const A = rings[i][k], B = rings[i][(k + 1) % rails];
            woodColor(A.y, girth, up, _cA); _cA.multiplyScalar(0.45);
            wood.push(A.x, A.y, A.z, B.x, B.y, B.z, _cA, _cA, weight * 0.5);
          }
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
          // the twig itself is drawn, faintly — the crown needs its scaffolding
          woodColor(tip.y, 0.12, true, _cA); woodColor(end.y, 0.10, true, _cB);
          wood.push(tip.x, tip.y, tip.z, end.x, end.y, end.z, _cA, _cB, 0.85);
          leafSpray(tip, end, shell);
          if (rand() > 0.4) {
            const a2 = V(rng(-1, 1), rng(-1, 1), rng(-1, 1)).normalize();
            const t2 = twig.clone().applyAxisAngle(a2, rng(0.3, 1.1)).multiplyScalar(rng(0.5, 0.9));
            const end2 = end.clone().add(t2);
            woodColor(end.y, 0.10, true, _cA); woodColor(end2.y, 0.09, true, _cB);
            wood.push(end.x, end.y, end.z, end2.x, end2.y, end2.z, _cA, _cB, 0.8);
            leafSpray(end, end2, shell);
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

  /* ── the primary limbs: six of them, low and reaching out ── */
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
      const dropped = wood.dropped + foliage.dropped;
      if (dropped) console.warn('oak: capacity reached, ' + dropped + ' segments dropped');
      return { wood: wood.take(1), foliage: foliage.take(2) };
    },
  };
}

/* ── the ride ────────────────────────────────────────────────────────────────
   Scroll drives a camera on a rail from the crown of the canopy down past the
   bole to the ground, off it, and out over the lake. Scroll is READ in the
   frame, never handled in a scroll listener — that is the difference between
   smooth and janky on an A12X.

   `t` places each station along the scroll explicitly, because the last beats
   need to be fast: the camera falls down the trunk, MEETS the ground and
   rebounds off it, then pulls all the way out to reveal the lake, downtown
   Oakland and the Bay Bridge against the setting sun. Rotation never stops
   through any of it — `rot` keeps climbing past a full turn.

   `ease` shapes the approach to each station. The ground beat is the reason it
   exists: eased symmetrically, the camera drifts into the floor and back out
   like a lift. It has to DECELERATE hard into the ground and leave fast, or the
   bounce reads as a sink. (Schyler, 2026-07-29: the descent no longer ends in
   the roots. Schyler, 2026-07-31: it must not pass THROUGH the ground either —
   the camera used to sit at y=-1.4 while the land under it is at about +1.0,
   so for a moment you were looking up from underneath the world.) */
const STATIONS = [
  { t: 0.00, y:  22,  dist:  20, rot: 0.00, look:  19, off:  0 },  // in the crown
  { t: 0.30, y:  15,  dist:  58, rot: 1.30, look:  12, off: 14 },  // the spread
  { t: 0.55, y:   6,  dist:  26, rot: 2.60, look:   6, off: 12 },  // the bole
  { t: 0.68, y: 2.1,  dist:  15, rot: 3.55, look: 4.2, off:  7, ease: 'settle' },  // contact
  { t: 0.76, y:   9,  dist:  34, rot: 4.15, look:   8, off:  5, ease: 'kick' },    // rebound
  { t: 0.90, y:  34,  dist: 150, rot: 5.72, look:  14, off:  0 },  // the whole place
  { t: 1.00, y:  34,  dist: 150, rot: 5.86, look:  14, off:  0 },  // held through the footer
];

/* Clearance kept between the lens and whatever ground is under it. Below this
   the near plane starts eating the shoreline and you see under the world. */
const FLOOR_CLEARANCE = 1.6;

function station(t) {
  const p = THREE.MathUtils.clamp(t, 0, 1);
  let i = 0;
  while (i < STATIONS.length - 2 && p > STATIONS[i + 1].t) i++;
  const a = STATIONS[i], b = STATIONS[i + 1];
  const k = (p - a.t) / Math.max(1e-6, b.t - a.t);
  let e;
  // the ease belongs to the station being approached
  if (b.ease === 'settle') e = 1 - Math.pow(1 - k, 3);        // arrive slowly: a landing
  else if (b.ease === 'kick') e = Math.pow(k, 0.55);          // leave fast: a rebound
  else e = k * k * (3 - 2 * k);                               // otherwise ease both ends
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
   set well out into the scene, and a heading that carries it across the frame.
   Deterministic from the same seed discipline as the oak.

   They used to be placed 2–4 units off the lens, on the theory that proximity
   was the only way to make a jay read against a 20-metre oak. It was, and it
   looked it: a bird filling a third of the frame is a prop, not a bird. At this
   range they are small, legible, and part of the place — which is what the
   scroll-reversal gag needed all along. (Schyler, 2026-07-31: "way too close".) */
function jayAnchors(seed, split) {
  const rand = mulberry32(seed);
  const rng = (a, b) => a + rand() * (b - a);
  const UP = new THREE.Vector3(0, 1, 0);
  const out = [];
  const COUNT = 5;
  for (let i = 0; i < COUNT; i++) {
    // spread the encounters through the descent, skipping the very ends
    const at = 0.09 + (i / (COUNT - 1)) * 0.62 + rng(-0.02, 0.02);
    const { pos, target } = cameraAt(at, split);
    const fwd = target.clone().sub(pos).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const side = i % 2 ? 1 : -1;
    const anchor = pos.clone()
      .addScaledVector(fwd, rng(26, 54))          // well down-range, not at the lens
      .addScaledVector(right, rng(-16, 16))
      .addScaledVector(up, rng(-4, 11));
    const heading = right.clone().multiplyScalar(side)
      .addScaledVector(fwd, rng(-0.35, 0.35))
      .addScaledVector(UP, rng(-0.10, 0.14)).normalize();
    out.push({
      anchor, heading, up: UP.clone(), at,
      travel: rng(150, 230),     // world units per full page of scroll
      beats: rng(26, 38),        // wingbeats per full page — deliberately slow
      scale: rng(2.6, 3.6),      // stated, not pretended: see DESIGN.md
    });
  }
  return out;
}

export function mountOak(canvas, opts = {}) {
  const scene = new THREE.Scene();
  const NEAR = 0.6;
  const camera = new THREE.PerspectiveCamera(42, 1, NEAR, 4200);   // the reveal sees the bridge

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
  });
  /* Tone mapping and the sRGB transfer both happen in the composer's final pass,
     on the ONE image that reaches the canvas. Leaving them on here would tone-map
     every batch on its way into a target that is supposed to still be linear HDR,
     and the bloom would have nothing above 1.0 left to find. */
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 1);
  renderer.info.autoReset = false;      // we render several passes per frame

  const place = makeLineScene(scene, { near: NEAR });

  /* Two batches, two materials, two draw calls for the entire tree. Wood keeps
     more of its weight at distance than foliage does — structure should still be
     legible from the reveal, where the leaves have long since become a haze. */
  const woodMat = lineMaterial({
    near: NEAR, minWidth: 0.95, atten: 0.72, refDist: 34, intensity: 1.5, maxScale: 1.9,
    fogColor: FOG, fogNear: 90, fogFar: 620,
  });
  const leafMat = lineMaterial({
    near: NEAR, minWidth: 0.75, atten: 0.9, refDist: 26, intensity: 1.25,
    fogColor: FOG, fogNear: 70, fogFar: 460,
  });

  let woodMesh = null, leafMesh = null;

  /* The live drawing-buffer size, kept here rather than read back from the
     renderer, because every line material needs it: the shader expands segments
     in SCREEN space and divides by this. A material that never receives it
     divides by one and every segment in it explodes to the size of the
     viewport — which is exactly what the flock did, because it is built inside
     flock() AFTER resize() has already run and resize() returns early on every
     later frame. Anything created late has to be handed the resolution at
     creation, not at the next resize that may never come. */
  const RES = new THREE.Vector2(1, 1);

  let jays = null, jaySplit = null;
  function flock(split) {
    if (jaySplit === split) return;
    if (jays) { scene.remove(jays.group); jays.dispose(); }
    jaySplit = split;
    jays = makeJays(jayAnchors(72926, split), { near: NEAR });
    jays.setResolution(RES);
    scene.add(jays.group);
  }

  const cutter = growOak(20260728);
  let cutting = true, segments = 0, leafCount = 0;
  let resolveReady;
  const ready = new Promise((res) => { resolveReady = res; });

  function cut() {
    if (!running) { setTimeout(cut, 200); return; }        // never cut a hidden tab
    /* 9ms slices. At 6ms the cut took as long as 7s on a 4x-throttled CPU, which
       is a long time to look at a silhouette; at 9ms it still fits inside a frame
       on real hardware and roughly halves the wait on slow hardware. */
    if (cutter.step(9)) {
      const built = cutter.finish();
      woodMesh = lineBatch(built.wood, woodMat);
      leafMesh = lineBatch(built.foliage, leafMat);
      scene.add(woodMesh); scene.add(leafMesh);
      segments = built.wood.count + built.foliage.count;
      leafCount = built.foliage.count;
      cutting = false;
      invalidate();
      resolveReady({ segments, wood: built.wood.count, leaves: leafCount });
    } else {
      requestAnimationFrame(cut);
    }
  }

  const composer = makeComposer(renderer, {
    threshold: 1.15, strength: 0.60, exposure: 1.0,
    grain: 0.018, vignette: 0.62, disperse: 0.0045,
  });

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
    const bw = Math.floor(w * dpr), bh = Math.floor(h * dpr);
    // MSAA is the most expensive thing here and phone pixels are half the size
    composer.setSize(bw, bh, w < 700 ? 0 : 4);
    RES.set(bw, bh);
    woodMat.uniforms.uRes.value.copy(RES);
    leafMat.uniforms.uRes.value.copy(RES);
    place.setResolution(RES);
    if (jays) jays.setResolution(RES);
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

    jays.update(shown);
    // opts.station pins the camera for silhouette review; production never sets it
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

    /* The floor, enforced against the REAL land surface rather than against the
       station table. Parallax, the editorial shift and any future station edit
       all move the lens after the fact, so the only safe place to guarantee the
       camera stays above ground is here, once everything else has had its say. */
    const floor = place.landHeight(camera.position.x, camera.position.z) + FLOOR_CLEARANCE;
    if (camera.position.y < floor) camera.position.y = floor;

    renderer.info.reset();
    composer.render(scene, camera);

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
    get segments() { return segments; },
    get leaves() { return leafCount; },
    get jays() { return jays ? jays.count : 0; },
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
      if (woodMesh) woodMesh.geometry.dispose();
      if (leafMesh) leafMesh.geometry.dispose();
      place.dispose();
      composer.dispose();
      woodMat.dispose(); leafMat.dispose(); renderer.dispose();
    },
  };
}
