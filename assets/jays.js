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

   Drawn in line like the oak, because they live in the same engraving. The one
   colour that isn't brass on this whole site is the jay's blue, and it is earned:
   they are blue jays. Muted to sit with the metal rather than shout over it.
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';

const BLUE  = new THREE.Color(0x8CAFD2);   // mantle, wing, crest
const PALE  = new THREE.Color(0xDCE3EA);   // throat and belly
const SLATE = new THREE.Color(0x5E7591);   // tail bars, primaries

/* A jay in line. Local axes: +Z is the way it's going, +Y is up, +X is its left.
   Wing vertices are kept in one contiguous block so the beat can be applied by
   rewriting just that slice — one object per bird, so one draw call per bird. */
function jayGeometry() {
  const pos = [], col = [];
  const seg = (a, b, ca, cb) => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    col.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
  };

  // ── body: five longitudinal rails over a fusiform profile ──
  const RINGS = 9;
  const profile = (t) => 0.115 * Math.sin(Math.pow(t, 0.62) * Math.PI) + 0.016;
  const zAt = (t) => -0.42 + t * 0.78;
  for (let r = 0; r < 5; r++) {
    const phase = (r / 5) * Math.PI * 2;
    for (let i = 0; i < RINGS - 1; i++) {
      const t0 = i / (RINGS - 1), t1 = (i + 1) / (RINGS - 1);
      const r0 = profile(t0), r1 = profile(t1);
      // underside pale, back blue — the bird's own two-tone, no shading needed
      const tone = Math.sin(phase) < -0.25 ? PALE : BLUE;
      seg([Math.cos(phase) * r0, Math.sin(phase) * r0, zAt(t0)],
          [Math.cos(phase) * r1, Math.sin(phase) * r1, zAt(t1)], tone, tone);
    }
  }

  // ── head, beak, and the crest that makes it a jay and not a bluebird ──
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, a2 = ((i + 1) / 10) * Math.PI * 2, rr = 0.075;
    seg([Math.cos(a) * rr, Math.sin(a) * rr + 0.03, 0.34],
        [Math.cos(a2) * rr, Math.sin(a2) * rr + 0.03, 0.34], BLUE, BLUE);
  }
  seg([0, 0.01, 0.40], [0, -0.005, 0.50], SLATE, SLATE);          // beak
  seg([0.02, 0.10, 0.30], [0.03, 0.19, 0.22], BLUE, BLUE);        // crest
  seg([0, 0.105, 0.31], [0, 0.205, 0.24], BLUE, BLUE);
  seg([-0.02, 0.10, 0.30], [-0.03, 0.19, 0.22], BLUE, BLUE);
  seg([0.055, 0.02, 0.30], [0.075, 0.0, 0.24], SLATE, SLATE);     // the necklace
  seg([-0.055, 0.02, 0.30], [-0.075, 0.0, 0.24], SLATE, SLATE);

  // ── tail: long, fanned, barred. A jay's tail is half the bird. ──
  for (let i = 0; i < 5; i++) {
    const spread = (i - 2) * 0.035;
    seg([spread * 0.4, 0.01, -0.40], [spread, 0.02, -0.98], BLUE, SLATE);
  }
  for (let i = 0; i < 3; i++) {                                    // cross bars
    const z = -0.55 - i * 0.14, w = 0.055 + i * 0.02;
    seg([-w, 0.015, z], [w, 0.015, z], SLATE, SLATE);
  }

  const wingStart = pos.length / 3;   // where the beating part begins

  /* ── wings ──
     Drawn as an OUTLINE first — shoulder, wrist, tip, then back along the
     trailing edge — with feathers laid inside it. Chords radiating from a single
     shoulder point (the obvious way) draw a spike, not a wing: the membrane needs
     a leading edge that runs forward of the arm and a trailing edge behind it. */
  for (const side of [1, -1]) {
    const S  = [side * 0.075, 0.05,  0.07];    // shoulder
    const W  = [side * 0.30,  0.085, 0.13];    // wrist, carried forward and up
    const T  = [side * 0.66,  0.055, 0.00];    // tip
    const TO = [side * 0.52,  0.02, -0.20];    // trailing, outboard
    const TI = [side * 0.13,  0.015,-0.19];    // trailing, inboard

    seg(S, W, BLUE, BLUE);                     // leading edge, inner
    seg(W, T, BLUE, BLUE);                     // leading edge, outer
    seg(T, TO, SLATE, SLATE);                  // the tip's own edge
    seg(TO, TI, SLATE, SLATE);                 // trailing edge
    seg(TI, S, BLUE, BLUE);                    // closed at the body
    seg(S, T, BLUE, BLUE);                     // the arm, read through the membrane

    // primaries: from the outer leading edge back past the tip
    for (let f = 0; f < 5; f++) {
      const k = f / 4;
      const from = [W[0] + (T[0] - W[0]) * k, W[1] + (T[1] - W[1]) * k, W[2] + (T[2] - W[2]) * k];
      const to   = [TO[0] + (T[0] - TO[0]) * (1 - k * 0.55),
                    TO[1] + (T[1] - TO[1]) * (1 - k * 0.55),
                    TO[2] + (T[2] - TO[2]) * (1 - k * 0.55) - 0.05 * (1 - k)];
      seg(from, to, BLUE, SLATE);
    }
    // secondaries: the inner half, shorter and squarer
    for (let f = 0; f < 4; f++) {
      const k = f / 3;
      const from = [S[0] + (W[0] - S[0]) * k, S[1] + (W[1] - S[1]) * k, S[2] + (W[2] - S[2]) * k];
      const to   = [TI[0] + (TO[0] - TI[0]) * k, TI[1] + (TO[1] - TI[1]) * k, TI[2] + (TO[2] - TI[2]) * k];
      seg(from, to, BLUE, SLATE);
    }
    // the white wing-bar a jay is known by, read as two ticks across the coverts
    seg([side * 0.22, 0.05, -0.02], [side * 0.36, 0.035, -0.06], PALE, PALE);
    seg([side * 0.30, 0.045, -0.09], [side * 0.44, 0.03, -0.13], PALE, PALE);
  }

  const g = new THREE.BufferGeometry();
  const position = new THREE.Float32BufferAttribute(pos, 3);
  g.setAttribute('position', position);
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return { geometry: g, wingStart, rest: Float32Array.from(pos) };
}

/* One shared cut, reused by every bird: the geometry is cloned per jay only
   because each one's wings are at a different point in the beat. */
export function makeJays(anchors) {
  const template = jayGeometry();
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.85,
  });

  const birds = anchors.map((a) => {
    const geometry = template.geometry.clone();
    const mesh = new THREE.LineSegments(geometry, material);
    const holder = new THREE.Object3D();
    holder.add(mesh);
    group.add(holder);
    return {
      holder, mesh,
      position: geometry.getAttribute('position'),
      anchor: a.anchor, heading: a.heading, up: a.up,
      at: a.at, travel: a.travel, beats: a.beats, scale: a.scale,
    };
  });

  const M = new THREE.Matrix4();
  const right = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3();
  const p = new THREE.Vector3();

  function update(progress) {
    for (const b of birds) {
      // where it is: distance along its own heading from the encounter point
      const d = (progress - b.at) * b.travel;
      p.copy(b.anchor).addScaledVector(b.heading, d);
      b.holder.position.copy(p);
      b.holder.scale.setScalar(b.scale);

      // the beat: phase is distance-mapped, so reversing scroll reverses the wings
      const phase = progress * b.beats * Math.PI * 2;
      const flap = Math.sin(phase) * 0.85;            // radians, up-and-down
      const bank = Math.cos(phase) * 0.13;            // a little roll into the beat

      // orientation from an explicit basis — no ambiguity about which way lookAt
      // points a non-camera object
      fwd.copy(b.heading).normalize();
      right.crossVectors(b.up, fwd).normalize();
      up.crossVectors(fwd, right).normalize();
      M.makeBasis(right, up, fwd);
      b.holder.quaternion.setFromRotationMatrix(M);
      b.holder.rotateZ(bank);

      // rewrite only the wing slice, rotating each side about the fore-aft axis
      const arr = b.position.array, rest = template.rest;
      const c = Math.cos(flap), s = Math.sin(flap);
      for (let i = template.wingStart * 3; i < rest.length; i += 3) {
        const x = rest[i], y = rest[i + 1];
        const sign = x >= 0 ? 1 : -1;                 // wings mirror each other
        const cc = c, ss = s * sign;
        arr[i]     = x * cc - y * ss;
        arr[i + 1] = x * ss + y * cc;
        arr[i + 2] = rest[i + 2];
      }
      b.position.needsUpdate = true;
    }
  }

  function dispose() {
    for (const b of birds) b.mesh.geometry.dispose();
    template.geometry.dispose();
    material.dispose();
  }

  return { group, update, dispose, count: birds.length };
}
