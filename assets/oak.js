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
   Recursive branching in both directions from the collar: limbs reach up into
   the canopy, roots reach down and out. Both use the same generator, because a
   real oak is roughly as large below ground as above — which is the whole
   reason this tree can carry a scroll narrative. */
function growOak(seed) {
  const rand = mulberry32(seed);
  const pos = [];   // xyz pairs, one line segment each
  const col = [];   // per-vertex rgb, brass ramp by height
  const rng = (a, b) => a + rand() * (b - a);

  // brass ramp: canopy is lit foil, roots are deep unpolished metal
  const CANOPY = new THREE.Color(0xE3C57E);
  const MID    = new THREE.Color(0xB08D4A);
  const DEEP   = new THREE.Color(0x94743A);
  const tone = new THREE.Color();
  function toneAt(y) {
    // measured extents of this oak: y ∈ [-17, 31], root tips to crown
    const t = THREE.MathUtils.clamp((y + 17) / 48, 0, 1);
    return t > 0.55
      ? tone.copy(MID).lerp(CANOPY, (t - 0.55) / 0.45)
      : tone.copy(DEEP).lerp(MID, t / 0.55);
  }
  function segment(a, b) {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const ca = toneAt(a.y); col.push(ca.r, ca.g, ca.b);
    const cb = toneAt(b.y); col.push(cb.r, cb.g, cb.b);
  }

  /* A limb is drawn as a tapering cage of parallel rails — the engraver's way of
     showing a round form without shading. Thick limbs get many rails and read as
     turned columns; twigs get one and read as pen strokes. That single rule is
     what makes the trunk solid and the canopy a haze of line. */
  function limb(from, dir, len, girth, depth, up) {
    const steps = Math.max(3, Math.round(len / 1.5));
    const rails = girth > 2.6 ? 13 : girth > 1.8 ? 10 : girth > 1.1 ? 8 : girth > 0.6 ? 5 : girth > 0.25 ? 3 : 1;
    const spine = [];
    let p = from.clone();
    let d = dir.clone().normalize();
    for (let i = 0; i < steps; i++) {
      // oaks do not grow straight: every step wanders, and the thinner the limb
      // the more it is pushed around
      const wander = new THREE.Vector3(rng(-0.3, 0.3), rng(-0.18, 0.18), rng(-0.3, 0.3));
      d.add(wander.multiplyScalar(0.16 / Math.max(0.28, girth))).normalize();
      const pull = up ? -0.045 : 0.06;                    // limbs droop, roots dive
      d.y += pull * (1 - girth / 3.2);
      d.normalize();
      const next = p.clone().addScaledVector(d, len / steps);
      spine.push([p.clone(), next.clone()]);
      p = next;
    }
    // lay the rails around the spine, tapering to nothing at the tip
    const side = new THREE.Vector3(), lift = new THREE.Vector3(), tmp = new THREE.Vector3();
    for (let r = 0; r < rails; r++) {
      const phase = (r / rails) * Math.PI * 2;
      for (let i = 0; i < spine.length; i++) {
        const [a, b] = spine[i];
        const t0 = i / spine.length, t1 = (i + 1) / spine.length;
        tmp.subVectors(b, a).normalize();
        side.set(-tmp.z, 0, tmp.x).normalize();
        lift.crossVectors(tmp, side).normalize();
        const r0 = girth * (1 - t0 * 0.82) * 0.5, r1 = girth * (1 - t1 * 0.82) * 0.5;
        const off0 = side.clone().multiplyScalar(Math.cos(phase) * r0)
          .addScaledVector(lift, Math.sin(phase) * r0);
        const off1 = side.clone().multiplyScalar(Math.cos(phase) * r1)
          .addScaledVector(lift, Math.sin(phase) * r1);
        segment(a.clone().add(off0), b.clone().add(off1));
      }
    }

    /* The tip spray. An oak's visual mass is thousands of fine twigs, not a few
       thick limbs — without this the crown reads as dead scaffolding. */
    if (depth <= 0 || len < 1.3) {
      if (up && len > 0.6) {
        const tip = spine[spine.length - 1][1];
        const n = Math.round(rng(5, 11));
        for (let t = 0; t < n; t++) {
          const axis = new THREE.Vector3(rng(-1, 1), rng(-1, 1), rng(-1, 1)).normalize();
          const twig = d.clone().applyAxisAngle(axis, rng(0.25, 1.15))
            .multiplyScalar(len * rng(0.4, 0.95));
          const end = tip.clone().add(twig);
          segment(tip, end);
          // a second joint on half of them, so the spray has depth
          if (rand() > 0.5) {
            const axis2 = new THREE.Vector3(rng(-1, 1), rng(-1, 1), rng(-1, 1)).normalize();
            segment(end, end.clone().add(
              twig.clone().applyAxisAngle(axis2, rng(0.3, 1.0)).multiplyScalar(rng(0.4, 0.8))
            ));
          }
        }
      }
      return;
    }

    // fork: children spread along the whole limb, not clustered at the tip —
    // that is what closes the bare gaps between forks
    const children = depth > 4 ? 3 : (rand() > 0.35 ? 3 : 2);
    for (let c = 0; c < children; c++) {
      const axis = new THREE.Vector3(rng(-1, 1), rng(-0.25, 0.25), rng(-1, 1)).normalize();
      const angle = rng(0.34, 0.88);
      const cd = d.clone().applyAxisAngle(axis, angle).normalize();
      const at = Math.min(spine.length - 1, Math.floor(spine.length * rng(0.3, 0.98)));
      const start = spine[at][1];
      const remaining = 1 - at / spine.length;
      limb(start, cd, len * rng(0.5, 0.72) * (0.6 + remaining * 0.5),
           girth * rng(0.46, 0.64), depth - 1, up);
    }
  }

  // the trunk, from the collar upward
  limb(new THREE.Vector3(0, -2, 0), new THREE.Vector3(0, 1, 0), 22, 3.6, 7, true);
  // buttress roots, flaring out and down
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng(-0.22, 0.22);
    limb(
      new THREE.Vector3(0, -2, 0),
      new THREE.Vector3(Math.cos(a), -0.62, Math.sin(a)),
      14, 1.8, 5, false
    );
  }

  // the ground line: an engraver's rule, cropped, where trunk meets roots
  for (let i = 0; i < 42; i++) {
    const a = (i / 42) * Math.PI * 2;
    const a2 = ((i + 1) / 42) * Math.PI * 2;
    const rr = 15.5;
    segment(
      new THREE.Vector3(Math.cos(a) * rr, -2.6, Math.sin(a) * rr),
      new THREE.Vector3(Math.cos(a2) * rr, -2.6, Math.sin(a2) * rr)
    );
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/* ── the ride ────────────────────────────────────────────────────────────────
   Scroll drives a camera on a rail from the crown of the canopy down past the
   root tips. Scroll is READ in the frame, never handled in a scroll listener —
   that is the difference between smooth and janky on an A12X. */
/* Station heights are taken from the geometry's measured bounding box
   (y ∈ [-17, 31]), not guessed — the canopy camera sits INSIDE the crown volume
   rather than above it, which is the difference between "inside the canopy" being
   true and being a caption. */
const STATIONS = [
  { y:  25, dist: 15, rot: 0.00, look:  28, off:  0 },  // canopy — in among the twigs
  { y:  17, dist: 34, rot: 1.10, look:  15, off: 13 },  // branches — stepping back
  { y:   3, dist: 25, rot: 2.25, look:   4, off: 11 },  // trunk — the column
  { y:  -7, dist: 23, rot: 3.30, look:  -7, off:  9 },  // roots — in among the root plate
];

export function mountOak(canvas, opts = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'low-power',
  });
  renderer.setClearAlpha(0);

  const geometry = growOak(20260728);
  const material = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.76,
  });
  const oak = new THREE.LineSegments(geometry, material);
  scene.add(oak);

  const segments = geometry.getAttribute('position').count / 2;
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;

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

    const s = station(shown);
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

  return {
    segments,
    bounds,
    drawCalls: () => renderer.info.render.calls,
    renders: () => renderer.info.render.frame,   // cumulative frames, for idle-cost proof
    dispose() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', invalidate);
      removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      geometry.dispose(); material.dispose(); renderer.dispose();
    },
  };
}
