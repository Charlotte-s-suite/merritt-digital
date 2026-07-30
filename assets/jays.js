/* ─────────────────────────────────────────────────────────────────────────────
   BLUE JAYS — Merritt Digital

   Birds the view passes on its way down the oak, beating their wings in slow
   motion. Everything about them is a function of SCROLL POSITION, never of time:
   where they are, how far through the wingbeat they are, how they bank. That one
   decision buys three things at once —

     · scroll back up and they fly backwards, wings un-beating, for free;
     · a stationary page costs nothing to render, so the "renders only on change"
       claim in the ledger stays literally true;
     · the motion is distance-mapped, which is what §5.2 asks of scrub work.

   Modelled and lit like the tree: solid body, solid wings, no textures. All six
   birds cost THREE draw calls, not eighteen — body, left wing and right wing are
   each one instanced mesh, and the flap is a per-instance matrix rather than a
   geometry rewrite.

   Blue is the only colour on this site that isn't autumn or bark, and it is
   earned: they are blue jays.
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';

const BLUE  = new THREE.Color(0x5C86BE);   // mantle, wing, crest
const PALE  = new THREE.Color(0xD7DEE6);   // throat and belly
const SLATE = new THREE.Color(0x33507A);   // primaries, tail bars
const BILL  = new THREE.Color(0x24282E);

/* ── the body ──
   A swept tube along +Z with a head bulge, a bill, a crest and a fanned tail.
   Local axes: +Z is the way it's going, +Y is up. */
function bodyGeometry() {
  const pos = [], nor = [], col = [];
  const tri = (a, b, c, ca, cb, cc) => {
    const ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2];
    const bx = c[0] - a[0], by = c[1] - a[1], bz = c[2] - a[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const [p, cc2] of [[a, ca], [b, cb], [c, cc]]) {
      pos.push(p[0], p[1], p[2]); nor.push(nx, ny, nz); col.push(cc2.r, cc2.g, cc2.b);
    }
  };

  const RAD = 7, N = 14;
  // fusiform with a head: a body bulge, a slight neck, then a rounded skull
  const profile = (t) => {
    const body = 0.115 * Math.sin(Math.pow(Math.min(1, t / 0.78), 0.62) * Math.PI);
    const head = 0.072 * Math.exp(-Math.pow((t - 0.90) / 0.085, 2));
    return Math.max(0.012, body * 0.92 + head);
  };
  const zAt = (t) => -0.44 + t * 0.90;

  const rings = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, r = profile(t), ring = [];
    for (let k = 0; k < RAD; k++) {
      const ph = (k / RAD) * Math.PI * 2;
      ring.push([Math.cos(ph) * r, Math.sin(ph) * r * 0.92, zAt(t)]);
    }
    rings.push(ring);
  }
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < RAD; k++) {
      const k2 = (k + 1) % RAD;
      const A = rings[i][k], B = rings[i][k2], C = rings[i + 1][k2], D = rings[i + 1][k];
      // a jay is blue above and pale beneath; the seam is the flank
      const tone = (p) => (p[1] > 0.012 ? BLUE : p[1] < -0.02 ? PALE : BLUE);
      tri(A, B, C, tone(A), tone(B), tone(C));
      tri(A, C, D, tone(A), tone(C), tone(D));
    }
  }

  // bill
  const bt = [0, 0.005, 0.53];
  for (let k = 0; k < 5; k++) {
    const ph = (k / 5) * Math.PI * 2, ph2 = ((k + 1) / 5) * Math.PI * 2, r = 0.028;
    tri([Math.cos(ph) * r, Math.sin(ph) * r + 0.01, 0.45],
        [Math.cos(ph2) * r, Math.sin(ph2) * r + 0.01, 0.45], bt, BILL, BILL, BILL);
  }
  // crest: three small blades off the crown of the head
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.028;
    tri([x - 0.016, 0.055, 0.40], [x + 0.016, 0.055, 0.40], [x, 0.175 - Math.abs(i - 1) * 0.03, 0.33],
        BLUE, BLUE, SLATE);
  }
  // tail: five flat feathers, fanned and barred
  for (let i = 0; i < 5; i++) {
    const s0 = (i - 2.5) * 0.030, s1 = (i - 1.5) * 0.030;
    const o0 = (i - 2.5) * 0.075, o1 = (i - 1.5) * 0.075;
    tri([s0, 0.005, -0.40], [s1, 0.005, -0.40], [o1, 0.02, -1.02], BLUE, BLUE, SLATE);
    tri([s0, 0.005, -0.40], [o1, 0.02, -1.02], [o0, 0.02, -1.02], BLUE, SLATE, SLATE);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/* ── a wing ──
   Origin AT THE SHOULDER so the beat is a rotation about the local Z axis, and
   built with a real leading edge, wrist and trailing edge — a fan of chords from
   one point draws a spike, not a wing. `side` is +1 for the bird's left. */
function wingGeometry(side) {
  const pos = [], nor = [], col = [];
  const tri = (a, b, c, ca, cb, cc) => {
    const ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2];
    const bx = c[0] - a[0], by = c[1] - a[1], bz = c[2] - a[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1;
    for (const [p, cc2] of [[a, ca], [b, cb], [c, cc]]) {
      pos.push(p[0], p[1], p[2]); nor.push(nx / l, ny / l, nz / l); col.push(cc2.r, cc2.g, cc2.b);
    }
  };
  const S  = [0, 0, 0];
  const W  = [side * 0.26, 0.035, 0.085];
  const T  = [side * 0.64, 0.010, -0.055];
  const TO = [side * 0.48, -0.010, -0.26];
  const TI = [side * 0.07, -0.005, -0.23];
  if (side > 0) {
    tri(S, W, T, BLUE, BLUE, SLATE);
    tri(S, T, TO, BLUE, SLATE, SLATE);
    tri(S, TO, TI, BLUE, SLATE, PALE);
  } else {                                   // wind the other way so faces agree
    tri(S, T, W, BLUE, SLATE, BLUE);
    tri(S, TO, T, BLUE, SLATE, SLATE);
    tri(S, TI, TO, BLUE, PALE, SLATE);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export function makeJays(anchors) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const n = anchors.length;

  const body = new THREE.InstancedMesh(bodyGeometry(), mat, n);
  const wingL = new THREE.InstancedMesh(wingGeometry(1), mat, n);
  const wingR = new THREE.InstancedMesh(wingGeometry(-1), mat, n);
  for (const m of [body, wingL, wingR]) { m.frustumCulled = false; group.add(m); }

  const SHOULDER = new THREE.Vector3(0, 0.045, 0.07);

  const M = new THREE.Matrix4(), Mw = new THREE.Matrix4(), Rot = new THREE.Matrix4();
  const T = new THREE.Matrix4(), Tb = new THREE.Matrix4();
  const q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const right = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3();
  const p = new THREE.Vector3(), sh = new THREE.Vector3();

  function update(progress) {
    for (let i = 0; i < n; i++) {
      const b = anchors[i];
      // where it is: distance along its own heading from the encounter point
      const d = (progress - b.at) * b.travel;
      p.copy(b.anchor).addScaledVector(b.heading, d);

      // the beat: phase is distance-mapped, so reversing scroll reverses the wings
      const phase = progress * b.beats * Math.PI * 2;
      const flap = Math.sin(phase) * 0.95;
      const bank = Math.cos(phase) * 0.14;

      fwd.copy(b.heading).normalize();
      right.crossVectors(b.up, fwd).normalize();
      up.crossVectors(fwd, right).normalize();
      M.makeBasis(right, up, fwd);
      q.setFromRotationMatrix(M);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bank));
      sc.setScalar(b.scale);
      M.compose(p, q, sc);
      body.setMatrixAt(i, M);

      // each wing pivots at its own shoulder, in the bird's local frame
      sh.copy(SHOULDER);
      Rot.makeRotationZ(flap);
      Tb.makeTranslation(sh.x, sh.y, sh.z);
      T.makeTranslation(-0, 0, 0);
      Mw.copy(M).multiply(Tb).multiply(Rot);
      wingL.setMatrixAt(i, Mw);
      Rot.makeRotationZ(-flap);
      Mw.copy(M).multiply(Tb).multiply(Rot);
      wingR.setMatrixAt(i, Mw);
    }
    body.instanceMatrix.needsUpdate = true;
    wingL.instanceMatrix.needsUpdate = true;
    wingR.instanceMatrix.needsUpdate = true;
  }

  function dispose() {
    for (const m of [body, wingL, wingR]) { m.geometry.dispose(); m.dispose(); }
    mat.dispose();
  }

  return { group, update, dispose, count: n, draws: 3 };
}
