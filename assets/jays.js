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
import { jayTexture } from './textures.js';

const BLUE  = new THREE.Color(0x5C86BE);   // mantle, wing, crest
const PALE  = new THREE.Color(0xD7DEE6);   // throat and belly
const SLATE = new THREE.Color(0x33507A);   // primaries, tail bars
const BILL  = new THREE.Color(0x24282E);

/* ── the body ──
   NOT a solid of revolution — that is precisely what makes a bowling pin. A bird
   is laterally compressed (narrow across, deep top to bottom), its head is a
   separate mass set forward on a neck, and the tail leaves the body as a flat
   fan rather than tapering out of it. Cross-sections here are ellipses that change
   aspect along the body, and the head is built separately.
   Local axes: +Z is the way it's going, +Y is up. */
function bodyGeometry() {
  const pos = [], nor = [], uv = [];
  const RAD = 9;

  // torso: t = 0 at the tail root, 1 at the shoulders
  const torso = [
    // [z, halfWidth, halfHeight, yCentre]
    [-0.42, 0.030, 0.034,  0.005],
    [-0.28, 0.062, 0.078,  0.000],
    [-0.12, 0.088, 0.113, -0.006],
    [ 0.02, 0.094, 0.126, -0.010],
    [ 0.16, 0.086, 0.118, -0.004],
    [ 0.28, 0.068, 0.094,  0.012],
    [ 0.36, 0.050, 0.070,  0.028],
  ];
  // head: set forward and up on a short neck, its own mass
  const head = [
    [ 0.40, 0.042, 0.056, 0.050],
    [ 0.46, 0.056, 0.068, 0.060],
    [ 0.53, 0.058, 0.066, 0.062],
    [ 0.59, 0.046, 0.052, 0.058],
    [ 0.63, 0.028, 0.030, 0.052],
  ];
  const rings = [];
  const build = (sections) => sections.map(([z, rx, ry, yc]) => {
    const ring = [];
    for (let k = 0; k < RAD; k++) {
      const ph = (k / RAD) * Math.PI * 2;
      ring.push([Math.cos(ph) * rx, yc + Math.sin(ph) * ry, z]);
    }
    return ring;
  });
  rings.push(...build(torso), ...build(head));

  const tri = (a, b, c, ua, ub, uc) => {
    const ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2];
    const bx = c[0] - a[0], by = c[1] - a[1], bz = c[2] - a[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1;
    for (const [p, u] of [[a, ua], [b, ub], [c, uc]]) {
      pos.push(p[0], p[1], p[2]); nor.push(nx / l, ny / l, nz / l); uv.push(u[0], u[1]);
    }
  };

  for (let i = 0; i < rings.length - 1; i++) {
    const u0 = i / (rings.length - 1), u1 = (i + 1) / (rings.length - 1);
    for (let k = 0; k < RAD; k++) {
      const k2 = (k + 1) % RAD;
      // v maps top-of-back (0) to belly (1), so the painted plumage lands right
      const vk = Math.abs(((k / RAD) * 2) - 1), vk2 = Math.abs((((k + 1) / RAD) * 2) - 1);
      tri(rings[i][k], rings[i][k2], rings[i + 1][k2], [u0, vk], [u0, vk2], [u1, vk2]);
      tri(rings[i][k], rings[i + 1][k2], rings[i + 1][k], [u0, vk], [u1, vk2], [u1, vk]);
    }
  }

  // bill: a flattened wedge, not a cone
  const bt = [0, 0.050, 0.75];
  const b1 = [0.020, 0.056, 0.635], b2 = [-0.020, 0.056, 0.635];
  const b3 = [0.016, 0.040, 0.640], b4 = [-0.016, 0.040, 0.640];
  tri(b1, b2, bt, [0.98, 0.2], [0.98, 0.2], [1.0, 0.2]);
  tri(b4, b3, bt, [0.98, 0.3], [0.98, 0.3], [1.0, 0.3]);
  tri(b1, bt, b3, [0.98, 0.2], [1.0, 0.25], [0.98, 0.3]);
  tri(b2, b4, bt, [0.98, 0.2], [0.98, 0.3], [1.0, 0.25]);

  // crest: a swept-back blade off the crown, one piece, not three spikes
  tri([0.012, 0.108, 0.545], [-0.012, 0.108, 0.545], [0, 0.205, 0.435], [0.2,0.02],[0.2,0.02],[0.1,0.02]);
  tri([0.010, 0.100, 0.470], [-0.010, 0.100, 0.470], [0, 0.180, 0.385], [0.2,0.02],[0.2,0.02],[0.1,0.02]);

  // tail: a flat fan, barred, leaving the body cleanly
  for (let i = 0; i < 6; i++) {
    const s0 = (i - 3) * 0.030, s1 = (i - 2) * 0.030;
    const o0 = (i - 3) * 0.085, o1 = (i - 2) * 0.085;
    const uu = 0.02 + (i / 6) * 0.10;
    tri([s0, 0.004, -0.38], [s1, 0.004, -0.38], [o1, 0.016, -1.05], [uu,0.16],[uu,0.16],[0.01,0.16]);
    tri([s0, 0.004, -0.38], [o1, 0.016, -1.05], [o0, 0.016, -1.05], [uu,0.16],[0.01,0.16],[0.01,0.16]);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/* ── a wing ──
   Origin AT THE SHOULDER so the beat is a rotation about the local Z axis, and
   built with a real leading edge, wrist and trailing edge — a fan of chords from
   one point draws a spike, not a wing. `side` is +1 for the bird's left. */
function wingGeometry(side) {
  const pos = [], nor = [], uv = [];
  const tri = (a, b, c, ua, ub, uc) => {
    const ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2];
    const bx = c[0] - a[0], by = c[1] - a[1], bz = c[2] - a[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1;
    for (const [p, u] of [[a, ua], [b, ub], [c, uc]]) {
      pos.push(p[0], p[1], p[2]); nor.push(nx / l, ny / l, nz / l); uv.push(u[0], u[1]);
    }
  };
  const S  = [0, 0, 0];
  const W  = [side * 0.26, 0.035, 0.085];
  const T  = [side * 0.64, 0.010, -0.055];
  const TO = [side * 0.48, -0.010, -0.26];
  const TI = [side * 0.07, -0.005, -0.23];
  // uv samples the barred upper-wing band of the plumage sheet
  const uS = [0.34, 0.10], uW = [0.20, 0.06], uT = [0.05, 0.10],
        uTO = [0.08, 0.34], uTI = [0.33, 0.34];
  if (side > 0) {
    tri(S, W, T, uS, uW, uT);
    tri(S, T, TO, uS, uT, uTO);
    tri(S, TO, TI, uS, uTO, uTI);
  } else {                                   // wind the other way so faces agree
    tri(S, T, W, uS, uT, uW);
    tri(S, TO, T, uS, uTO, uT);
    tri(S, TI, TO, uS, uTI, uTO);
  }
  /* Mirroring a wing by reversing its winding also reverses its normals, which is
     why one wing lit and the other rendered black. Flip them back. */
  if (side < 0) for (let i = 0; i < nor.length; i++) nor[i] = -nor[i];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

export function makeJays(anchors) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    map: jayTexture(), roughness: 0.66, metalness: 0.0, side: THREE.DoubleSide,
  });
  const n = anchors.length;

  const body = new THREE.InstancedMesh(bodyGeometry(), mat, n);
  const wingL = new THREE.InstancedMesh(wingGeometry(1), mat, n);
  const wingR = new THREE.InstancedMesh(wingGeometry(-1), mat, n);
  for (const m of [body, wingL, wingR]) { m.frustumCulled = false; m.castShadow = true; group.add(m); }

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
