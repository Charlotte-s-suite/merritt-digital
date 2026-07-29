/* ─────────────────────────────────────────────────────────────────────────────
   THE ENGRAVED OAK — Merritt Digital
   A single merged LineSegments oak, drawn as an engraving that exists in space.
   The camera travels canopy → roots on scroll; the page is the plate it turns on.

   Why lines, not surfaces: the studio's object is the engraved assay card. An
   engraving has no shading — depth comes from line density and parallax. That is
   also why this holds 60fps on 2018 silicon: one geometry, one material, ONE draw
   call, no lights, no shadow maps, no textures, no post-processing.

   Contract with §5.5 of the studio DESIGN-STANDARD:
   - the static page IS the layout; this module only ever layers over it
   - it never initialises until after LCP, and never at all if any probe fails
   - it pauses when the tab is hidden and renders only on change (no idle rAF)
   - pointer parallax is bounded and ornamental; it is never an affordance
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';

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
  const pos = [];                       // xyz pairs, one line segment each
  const rng = (a, b) => a + rand() * (b - a);

  const GROUND = -2;
  const BOLE   = 7.0;                   // where the trunk gives out and forks
  const CROWN  = { cy: 16, rx: 34, ry: 10.5 };   // the oblate dome, wider than tall

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function segment(a, b) { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); }

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

    const side = V(), lift = V(), tmp = V();
    for (let r = 0; r < rails; r++) {
      const phase = (r / rails) * Math.PI * 2;
      for (let i = 0; i < spine.length; i++) {
        const [a, b] = spine[i];
        const t0 = i / spine.length, t1 = (i + 1) / spine.length;
        tmp.subVectors(b, a).normalize();
        side.set(-tmp.z, 0, tmp.x);
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
        side.normalize();
        lift.crossVectors(tmp, side).normalize();
        // basal swell: an old bole is a flared column, not a cylinder
        const f0 = flare ? 1 + flare * Math.pow(1 - t0, 2.6) : 1;
        const f1 = flare ? 1 + flare * Math.pow(1 - t1, 2.6) : 1;
        const r0 = girth * (1 - t0 * TAP) * 0.5 * f0;
        const r1 = girth * (1 - t1 * TAP) * 0.5 * f1;
        segment(
          a.clone().addScaledVector(side, Math.cos(phase) * r0).addScaledVector(lift, Math.sin(phase) * r0),
          b.clone().addScaledVector(side, Math.cos(phase) * r1).addScaledVector(lift, Math.sin(phase) * r1)
        );
      }
    }

    /* The tip spray. An oak's visible mass is tens of thousands of fine twigs;
       without this the crown is dead scaffolding no matter how many limbs it has. */
    if (depth <= 0 || len < 1.1) {
      const tip = spine[spine.length - 1][1];
      if (up && len > 0.5 && envelopeAt(tip) > 0.4) {
        const shell = Math.min(1, (envelopeAt(tip) - 0.4) / 0.5);
        const n = Math.round(rng(6, 13) * (0.45 + shell * 0.75));
        for (let t = 0; t < n; t++) {
          const axis = V(rng(-1, 1), rng(-1, 1), rng(-1, 1)).normalize();
          const twig = d.clone().applyAxisAngle(axis, rng(0.22, 1.25))
            .multiplyScalar(len * rng(0.26, 0.58));
          const end = tip.clone().add(twig);
          segment(tip, end);
          if (rand() > 0.35) {                       // a second joint on most
            const a2 = V(rng(-1, 1), rng(-1, 1), rng(-1, 1)).normalize();
            const t2 = twig.clone().applyAxisAngle(a2, rng(0.3, 1.1)).multiplyScalar(rng(0.45, 0.85));
            const end2 = end.clone().add(t2);
            segment(end, end2);
            if (rand() > 0.6) {                      // and a third on some
              const a3 = V(rng(-1, 1), rng(-1, 1), rng(-1, 1)).normalize();
              segment(end2, end2.clone().add(
                t2.clone().applyAxisAngle(a3, rng(0.3, 1.0)).multiplyScalar(rng(0.45, 0.8))));
            }
          }
        }
      }
      return;
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

  /* the ground line: an engraver's rule where the bole meets its own roots */
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2, a2 = ((i + 1) / 64) * Math.PI * 2, rr = 21;
    segment(V(Math.cos(a) * rr, GROUND - 0.6, Math.sin(a) * rr),
            V(Math.cos(a2) * rr, GROUND - 0.6, Math.sin(a2) * rr));
  }

  /* ── the stepper ───────────────────────────────────────────────────────────
     Cutting 121k segments in one go is a ~1s main-thread block on 2018 silicon —
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
      /* the ground line: an engraver's rule where the bole meets its own roots */
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2, a2 = ((i + 1) / 64) * Math.PI * 2, rr = 21;
        segment(V(Math.cos(a) * rr, GROUND - 0.6, Math.sin(a) * rr),
                V(Math.cos(a2) * rr, GROUND - 0.6, Math.sin(a2) * rr));
      }
      /* colour against the geometry's ACTUAL extents — derived, never assumed:
         a hand-written range silently mis-tints the moment the shape changes. */
      let minY = Infinity, maxY = -Infinity;
      for (let i = 1; i < pos.length; i += 3) { if (pos[i] < minY) minY = pos[i]; if (pos[i] > maxY) maxY = pos[i]; }
      const span = Math.max(1e-3, maxY - minY);
      /* Plain arithmetic, not Color.lerp: this runs once per vertex over ~700k
         values, and the object churn was the single most expensive frame of the
         whole cut. Linear-space brass ramp, roots -> trunk -> canopy. */
      /* Stops built once through THREE.Color so colour management still applies —
         hand-written sRGB triples skip the linear conversion and wash the ramp out. */
      const stop = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
      const C = stop(0xE3C57E),          // canopy, lit foil
            M = stop(0xB08D4A),          // trunk, mid brass
            D = stop(0x94743A);          // roots, unpolished
      const col = new Float32Array(pos.length);
      for (let i = 1, c = 0; i < pos.length; i += 3, c += 3) {
        const t = (pos[i] - minY) / span;
        if (t > 0.55) {
          const k = (t - 0.55) / 0.45;
          col[c] = M[0] + (C[0] - M[0]) * k;
          col[c + 1] = M[1] + (C[1] - M[1]) * k;
          col[c + 2] = M[2] + (C[2] - M[2]) * k;
        } else {
          const k = t / 0.55;
          col[c] = D[0] + (M[0] - D[0]) * k;
          col[c + 1] = D[1] + (M[1] - D[1]) * k;
          col[c + 2] = D[2] + (M[2] - D[2]) * k;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
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

export function mountOak(canvas, opts = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'low-power',
  });
  renderer.setClearAlpha(0);

  const material = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.55,
  });
  const oak = new THREE.LineSegments(new THREE.BufferGeometry(), material);
  scene.add(oak);

  /* The oak is cut across frames, never in one block (see growOak's stepper).
     Until it is finished the scene simply has nothing in it — and the static
     engraving underneath is still the design, so nothing is missing. */
  const cutter = growOak(20260728);
  let geometry = null, segments = 0, bounds = null, cutting = true;
  let resolveReady;
  const ready = new Promise((res) => { resolveReady = res; });

  function cut() {
    if (!running) { setTimeout(cut, 200); return; }        // never cut a hidden tab
    if (cutter.step(6)) {                                   // 6ms slices
      geometry = cutter.finish();
      geometry.computeBoundingBox();
      bounds = geometry.boundingBox;
      segments = geometry.getAttribute('position').count / 2;
      oak.geometry.dispose();
      oak.geometry = geometry;
      cutting = false;
      invalidate();
      resolveReady({ segments, bounds });
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

  function frame() {
    raf = 0;
    if (!running) return;
    const moved = resize();

    // ease toward the scroll target and the pointer target; keep rendering
    // while anything is still settling, then stop completely
    const d = progress - shown;
    shown += d * 0.12;
    if (Math.abs(d) < 0.0002) shown = progress;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

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
    oak.rotation.y = s.rot * 0.12;

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
    get segments() { return segments; },
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
      if (geometry) geometry.dispose();
      oak.geometry.dispose();
      material.dispose(); renderer.dispose();
    },
  };
}
