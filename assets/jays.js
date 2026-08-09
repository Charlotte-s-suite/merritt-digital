/* ─────────────────────────────────────────────────────────────────────────────
   THE JAYS — five scrub jays, drawn as outlines

   The previous two attempts at these birds both failed the same way. Solid
   low-poly bodies read as bowling pins, and the fix I kept reaching for was to
   move them closer to the lens so the detail would carry — which only made a
   prop fill a third of the frame. The real problem was the medium: procedural
   geometry cannot sculpt a bird, but a LINE can describe one, because a bird at
   any distance is already almost entirely silhouette. So they are outlines now,
   and they sit thirty to fifty units down-range, where a bird belongs.

   Everything is a function of SCROLL, never of time. Position, wingbeat and
   bank all derive from the scroll position, which is why scrolling back up
   flies them backwards with the wings beating in reverse — for free, with no
   animation state to run backwards and no cost at all when the page is still.

   The outline is rebuilt on the CPU each update rather than skinned in a
   shader: five birds at forty segments each is two hundred segments, which is
   nothing, and it keeps the wing's fold honest — the wrist leads and the tip
   trails, the way a real wingbeat works.

   Blue is the only cold hue on the page that isn't water, and it is earned:
   they are jays.

   Placement is Schyler's correction of 2026-07-31: "the birds are way too close
   to the camera".
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';
import { lineMaterial, lineBatch } from './lines.js';
import { JAY, FOG } from './palette.js';

/* ── the silhouette, in local units ─────────────────────────────────────────
   x is across the wings, y is up, z is forward. The body is a closed profile
   seen from the side: bill, forehead, the crest a jay actually has, a plump
   breast and a long tail. The profile carries the whole read — at this range a
   bird IS its outline — and it is drawn down both flanks (see BOW) so that the
   form still holds when one flies straight at the lens. */
const BODY = [
  [0,  0.02,  0.62],   // bill tip
  [0,  0.13,  0.44],   // forehead
  [0,  0.29,  0.35],   // crest
  [0,  0.12,  0.23],   // nape
  [0,  0.11,  0.00],   // back
  [0,  0.05, -0.30],   // tail base
  [0,  0.03, -0.92],   // tail tip
  [0, -0.05, -0.86],   // tail, lower edge
  [0, -0.10, -0.22],   // vent
  [0, -0.13,  0.16],   // breast
  [0, -0.05,  0.44],   // throat
];

/* One wing, right-hand side. The wrist is the hinge that makes a wingbeat read
   as a wingbeat rather than as a rotating plank. */
const SHOULDER = [0.05, 0.05, 0.09];
const WRIST    = [0.40, 0.11, 0.15];
const TIP      = [0.96, 0.05, 0.00];
const TRAIL    = [[0.58, 0.00, -0.28], [0.22, -0.01, -0.20]];

/* How far each body point bows out to the side. The outline is drawn TWICE,
   once each side, which turns a flat profile into a rounded body: bowed widest
   at the breast and back, pinched to almost nothing at the bill and the tail
   tip. A single planar outline was cheaper, but a bird whose heading happened
   to point at the lens collapsed into a crumpled line — which is exactly the
   sort of thing that reads as a glitch rather than as a bird. */
const BOW = [0.010, 0.030, 0.020, 0.045, 0.050, 0.040, 0.014, 0.020, 0.045, 0.050, 0.030];

const USED = 2 * BODY.length + 2 * 8;  // 22 body (both sides) + two wings of 8 = 38
const SEGS_PER_JAY = 40;

export function makeJays(anchors, opts = {}) {
  const near = opts.near || 0.5;
  const N = anchors.length;
  const CAP = N * SEGS_PER_JAY;

  const start = new Float32Array(CAP * 3), end = new Float32Array(CAP * 3);
  const colA = new Float32Array(CAP * 3), colB = new Float32Array(CAP * 3);
  const width = new Float32Array(CAP), baseWidth = new Float32Array(CAP);

  /* Colour and weight are fixed per segment and written once. Only the endpoint
     buffers are touched on update, which is why the flap costs nothing. */
  let w = 0;
  const paint = (c1, c2, wid) => {
    const i3 = w * 3;
    colA[i3] = c1.r; colA[i3 + 1] = c1.g; colA[i3 + 2] = c1.b;
    colB[i3] = c2.r; colB[i3 + 1] = c2.g; colB[i3 + 2] = c2.b;
    baseWidth[w] = wid;
    w++;
  };
  /* Held under the bloom threshold like everything else that is drawn rather
     than lit — a glowing bird is a fairy, not a jay. The leading edge is still
     the brightest stroke on the bird, just no longer an emitter. */
  const body = JAY.body.clone().multiplyScalar(1.05);
  const edge = JAY.edge.clone().multiplyScalar(1.2);      // the lit leading edge
  const crest = JAY.crest.clone().multiplyScalar(1.3);
  for (let i = 0; i < N; i++) {
    for (let side = 0; side < 2; side++) {
      for (let k = 0; k < BODY.length; k++) {
        const onCrest = k === 1 || k === 2;
        paint(onCrest ? crest : body, onCrest ? crest : body, onCrest ? 1.15 : 1.0);
      }
    }
    for (let s = 0; s < 2; s++) {
      paint(edge, edge, 1.25);        // shoulder → wrist: the lit leading edge
      paint(edge, body, 1.15);        // wrist → tip
      paint(body, body, 0.95);        // tip → trailing 1
      paint(body, body, 0.95);        // trailing 1 → trailing 2
      paint(body, body, 0.95);        // trailing 2 → shoulder
      paint(body, body, 0.8);         // three primaries fanning off the wrist
      paint(body, body, 0.8);
      paint(body, body, 0.8);
    }
    for (let k = USED; k < SEGS_PER_JAY; k++) paint(body, body, 0);   // slack
  }

  const mat = lineMaterial({
    near, minWidth: 1.0, atten: 0.8, refDist: 30, intensity: 1.1, maxScale: 2.4,
    fogColor: FOG, fogNear: 120, fogFar: 700,
  });
  const mesh = lineBatch({ start, end, colA, colB, width, count: CAP, order: 3 }, mat);
  const group = new THREE.Group();
  group.add(mesh);

  const aStart = mesh.geometry.getAttribute('aStart');
  const aEnd = mesh.geometry.getAttribute('aEnd');
  const aWidth = mesh.geometry.getAttribute('aWidth');

  const _p = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(),
        _u = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const _sh = new THREE.Vector3(), _wr = new THREE.Vector3(), _tp = new THREE.Vector3(),
        _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  function update(progress) {
    let seg = 0;
    for (let i = 0; i < N; i++) {
      const jay = anchors[i];
      const rel = progress - jay.at;

      /* Outside its window the bird is collapsed to zero width, which the
         fragment shader discards. Cheaper than rebuilding the batch, and it
         means a bird can never be caught hanging in frame at the wrong beat. */
      const vis = 1 - Math.min(1, Math.abs(rel) / 0.20);
      if (vis <= 0) {
        for (let k = 0; k < SEGS_PER_JAY; k++) width[seg + k] = 0;
        seg += SEGS_PER_JAY;
        continue;
      }

      _p.copy(jay.anchor).addScaledVector(jay.heading, rel * jay.travel);

      // basis: it flies where it is heading, and banks into the downstroke
      _f.copy(jay.heading).normalize();
      _r.crossVectors(_f, UP).normalize();
      _u.crossVectors(_r, _f).normalize();

      const beat = rel * jay.beats * Math.PI * 2;
      const flap = Math.sin(beat);
      const bank = flap * 0.28;
      const cb = Math.cos(bank), sb = Math.sin(bank);
      const rx = _r.x * cb + _u.x * sb, ry = _r.y * cb + _u.y * sb, rz = _r.z * cb + _u.z * sb;
      const ux = _u.x * cb - _r.x * sb, uy = _u.y * cb - _r.y * sb, uz = _u.z * cb - _r.z * sb;
      _r.set(rx, ry, rz); _u.set(ux, uy, uz);

      const S = jay.scale;
      const put = (a, b) => {
        const i3 = seg * 3;
        start[i3] = a.x; start[i3 + 1] = a.y; start[i3 + 2] = a.z;
        end[i3] = b.x; end[i3 + 1] = b.y; end[i3 + 2] = b.z;
        width[seg] = baseWidth[seg] * vis;
        seg++;
      };
      const to = (out, lx, ly, lz) => out.copy(_p)
        .addScaledVector(_r, lx * S).addScaledVector(_u, ly * S).addScaledVector(_f, lz * S);

      // the body outline, closed, drawn down both flanks
      for (let side = 0; side < 2; side++) {
        const bw = side ? -1 : 1;
        for (let k = 0; k < BODY.length; k++) {
          const j = (k + 1) % BODY.length;
          const A = BODY[k], B = BODY[j];
          to(_a, BOW[k] * bw, A[1], A[2]);
          to(_b, BOW[j] * bw, B[1], B[2]);
          put(_a, _b);
        }
      }

      /* The wingbeat. The wrist leads the tip by a fraction of a beat, so the
         wing folds and unfolds through the stroke instead of staying rigid.
         That lag is most of what makes it look like flight rather than like
         a hinge. */
      const inner = flap * 0.62;
      const outer = Math.sin(beat - 0.8) * 1.02;
      for (let s = 0; s < 2; s++) {
        const sx = s ? -1 : 1;
        // rotate a local point about the fore-aft axis, hinged at the shoulder
        const hinge = (out, pt, ang) => {
          const dx = pt[0] - SHOULDER[0], dy = pt[1] - SHOULDER[1];
          const c = Math.cos(ang), sn = Math.sin(ang);
          return to(out, (SHOULDER[0] + dx * c - dy * sn) * sx,
                         SHOULDER[1] + dx * sn + dy * c, pt[2]);
        };
        to(_sh, SHOULDER[0] * sx, SHOULDER[1], SHOULDER[2]);
        hinge(_wr, WRIST, inner);
        hinge(_tp, TIP, outer);
        hinge(_t1, TRAIL[0], outer * 0.82);
        hinge(_t2, TRAIL[1], inner * 0.9);

        put(_sh, _wr); put(_wr, _tp); put(_tp, _t1); put(_t1, _t2); put(_t2, _sh);
        for (let f = 0; f < 3; f++) {                  // primaries
          _a.copy(_tp).lerp(_t1, (f + 1) / 4);
          put(_wr, _a);
        }
      }
      for (let k = USED; k < SEGS_PER_JAY; k++) { width[seg] = 0; seg++; }
    }
    aStart.needsUpdate = true;
    aEnd.needsUpdate = true;
    aWidth.needsUpdate = true;
  }

  return {
    group,
    count: N,
    update,
    setResolution(res) { mat.uniforms.uRes.value.copy(res); },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
