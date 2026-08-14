/* ─────────────────────────────────────────────────────────────────────────────
   THE PLACE — Lake Merritt, drawn in light

   Everything here except the sky is a line. The sky is the one surface on the
   page, and it is not an object so much as the FIELD the drawing sits in: a
   vertical ramp from a near-black indigo overhead down through violet and
   magenta to the sun's own band on the water, with the sun a hot core low in
   the west. Every line in the world fogs toward that band, so distance reads as
   air rather than as fade-to-grey.

   The ground is a SURVEY, not a slab: contour-following grid lines, a bright
   waterline traced where the land actually meets the lake, and the lakeside
   path as a single confident curve. That solves the thing a solid ground could
   never solve here — because nothing is opaque, the oak's root plate now glows
   THROUGH the surface like an x-ray, which is both the truth about a tree and a
   far better answer to "the roots are just floating" than burying them was.

   One caution held deliberately: a luminous grid receding to a horizon is the
   single most exhausted image in this genre. The grid here is dim, uneven,
   terrain-following, and mostly eaten by fog within a hundred units. The bright
   things are the waterline, the Necklace of Lights and the windows — the things
   that are actually bright in Oakland at dusk.

   Geometry that is not a line: none. Textures: none. Image bytes: still zero.
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';
import { lineMaterial, lineBatch, segmentWriter } from './lines.js';
import { SKY, FOG, PLACE } from './palette.js';

export const GROUND_Y = -2;
export const WATER_Y = GROUND_Y - 0.05;

/* The lagoon is large: the land is one big mass whose edge runs past the oak,
   and the water opens away from it toward downtown. Centre is pushed back so the
   waterline sits just in front of the tree. */
const SHORE_R = 420, SHORE_CZ = 380;
const PLATEAU = 0.9;                 // local height of the flat inland ground

/* ── the land, as one function ───────────────────────────────────────────────
   Exported because the camera's floor clamp uses it. The mesh and the clamp
   reading the same function is the only way they cannot disagree, and a camera
   that disagreed with the ground by 2.4 units is exactly the bug this replaces:
   the lens used to dip below the surface at the bounce and you got a moment of
   looking up at the world from underneath it. */
export function landHeight(x, z) {
  const d = Math.hypot(x, z - SHORE_CZ);
  const edge = d / SHORE_R;
  let y = edge < 0.93 ? PLATEAU : Math.max(-9, PLATEAU - ((edge - 0.93) / 0.07) * 7.9);
  y += Math.sin(x * 0.05) * 0.30 + Math.cos(z * 0.043) * 0.26
     + Math.sin((x + z) * 0.011) * 0.5;
  return GROUND_Y + y;
}

/* ── the sky ────────────────────────────────────────────────────────────────
   A ramp plus a sun. HDR on purpose: the core sits well above 1.0 so the
   composer's bloom has something real to find, and the horizon band is what
   every distant line in the scene fogs toward. */
/* Aimed, not guessed. The reveal camera sits at rot 5.72 / dist 150 looking at
   the trunk, which gives a forward of about (0.535, -0.132, -0.835); the old sun
   direction came out 58° off that axis — outside a 28.7° half-frame, so the sun
   was never actually in the shot and the gold in frame was only the horizon
   band. This bearing puts it ~19° right of centre and ~3° up, which lands it in
   frame opposite the bridge, with the glitter road running between them.
   (Schyler, 2026-07-29: the bridge "far off silhouetted in a golden hour setting
   sun" — that requires the sun to be visible, which it was not.) */
export const SUN_DIR = new THREE.Vector3(0.7456, 0.020, -0.6662).normalize();

const SKY_FRAG = /* glsl */`
  precision highp float;
  uniform vec3 uHorizon, uLow, uMid, uHigh, uZenith, uSun;
  uniform vec3 uSunDir;
  uniform float uGain;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);

    /* Four stops, weighted so the interesting third of the sky — the band just
       above the water — gets most of the range. A linear ramp puts all the
       colour where nobody is looking. */
    vec3 c = mix(uHorizon, uLow,  smoothstep(0.50, 0.545, h));
    c = mix(c, uMid,    smoothstep(0.535, 0.62, h));
    c = mix(c, uHigh,   smoothstep(0.60,  0.78, h));
    c = mix(c, uZenith, smoothstep(0.74,  1.00, h));

    // below the horizon the sky darkens hard: that band is water, not sky
    c *= mix(0.30, 1.0, smoothstep(0.44, 0.505, h));

    /* The gain is the single most important number in this file. The sky is a
       FIELD for luminous line work to sit against, which means it must stay
       well under the lines and well under the bloom threshold. At full value
       the ramp out-lit the drawing, the bloom found the whole sky rather than
       the few things that are genuinely emitting, and the reveal turned into a
       gold haze with the city, the bridge and the necklace invisible inside it. */
    c *= uGain;

    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    /* Only the core is allowed above the bloom threshold. The wide terms are
       atmosphere, not light: generous exponents here are what smeared warm haze
       across a third of the frame. */
    c += uSun * pow(sd, 1400.0) * 2.4;         // the core: ~3.6 degrees across
    c += uSun * pow(sd, 110.0) * 0.15;         // the halo immediately around it
    c += uSun * pow(sd, 11.0)  * 0.045;        // the warm quarter of sky, barely

    gl_FragColor = vec4(c, 1.0);
  }
`;

function skyDome() {
  const g = new THREE.SphereGeometry(3000, 40, 24);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uHorizon: { value: SKY.horizon }, uLow: { value: SKY.low },
      uMid: { value: SKY.mid }, uHigh: { value: SKY.high },
      uZenith: { value: SKY.zenith }, uSun: { value: SKY.sun },
      uSunDir: { value: SUN_DIR }, uGain: { value: 0.42 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = -1000;            // the field everything else is drawn onto
  mesh.frustumCulled = false;
  return mesh;
}

/* ── the world ──────────────────────────────────────────────────────────────*/
export function makeLineScene(scene, opts = {}) {
  const near = opts.near || 0.5;
  const sky = skyDome();
  scene.add(sky);

  /* Two batches. `world` is structure — ground, water, city, bridge — at
     ordinary intensity. `lights` is the handful of things that are genuinely
     emitting at dusk, pushed hard enough above 1.0 to bloom. Separating them is
     what stops the whole scene from glowing uniformly, which is the look that
     reads as machine-generated. */
  const world = segmentWriter(60000);
  const lights = segmentWriter(14000);

  const cA = new THREE.Color(), cB = new THREE.Color();
  const rand = (() => { let s = 0x9E3779B9; return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296);
  }; })();
  const rng = (a, b) => a + rand() * (b - a);

  /* ── the ground survey ──
     Grid lines that follow the terrain, sampled densely enough to show the
     undulation. Deliberately dim and slightly irregular in spacing: a perfectly
     even bright grid is the cliché, an unevenly-spaced dim one reads as a
     survey drawing. */
  const GRID_EXT = 520, GRID_STEP = 15;
  for (let i = -GRID_EXT; i <= GRID_EXT; i += GRID_STEP) {
    const jitter = rng(-2.2, 2.2);
    for (const axis of [0, 1]) {
      let prev = null;
      for (let t = -GRID_EXT; t <= GRID_EXT; t += 11) {
        const x = axis ? t : i + jitter, z = axis ? i + jitter : t;
        const y = landHeight(x, z);
        if (y < WATER_Y) { prev = null; continue; }          // the grid stops at the water
        const cur = { x, y: y + 0.02, z };
        if (prev) {
          const fade = 0.5 + 0.5 * Math.exp(-Math.hypot(x, z) / 260);
          cA.copy(PLACE.shore).multiplyScalar(0.13 * fade);
          world.push(prev.x, prev.y, prev.z, cur.x, cur.y, cur.z, cA, cA, 0.8);
        }
        prev = cur;
      }
    }
  }

  /* ── the waterline ──
     Traced, not assumed: for each bearing, bisect outward until the land
     actually drops below the water. It is the brightest structural line in the
     scene because it is the one edge that explains the whole place. */
  const shoreRing = [];
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 220) {
    let lo = SHORE_R * 0.80, hi = SHORE_R * 1.08;
    const at = (r) => landHeight(Math.cos(a) * r, Math.sin(a) * r + SHORE_CZ) - WATER_Y;
    if (at(lo) < 0) { shoreRing.push(null); continue; }
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (at(m) > 0) lo = m; else hi = m; }
    shoreRing.push({ x: Math.cos(a) * lo, z: Math.sin(a) * lo + SHORE_CZ, y: WATER_Y + 0.05 });
  }
  for (let i = 0; i < shoreRing.length; i++) {
    const a = shoreRing[i], b = shoreRing[(i + 1) % shoreRing.length];
    if (!a || !b) continue;
    cA.copy(PLACE.water).multiplyScalar(1.9);
    world.push(a.x, a.y, a.z, b.x, b.y, b.z, cA, cA, 1.5);
  }

  /* ── the lakeside path ──
     One confident curve, set back from the water, the way the real one runs. */
  {
    const R = SHORE_R * 0.905;
    let prev = null;
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 150) {
      const wob = Math.sin(a * 5.0) * 5.5 + Math.cos(a * 2.3) * 3.0;
      const x = Math.cos(a) * (R + wob), z = Math.sin(a) * (R + wob) + SHORE_CZ;
      const cur = { x, y: landHeight(x, z) + 0.06, z };
      if (prev) {
        cA.copy(PLACE.shore).multiplyScalar(0.95);
        world.push(prev.x, prev.y, prev.z, cur.x, cur.y, cur.z, cA, cA, 1.0);
      }
      prev = cur;
    }
  }

  /* ── the water ──
     Not a plane: a field of ripple dashes, denser and hotter where the sun's
     road crosses the lake. Glitter is what a low sun on water actually looks
     like, and dashes bloom into exactly that. A few long contour lines
     underneath give the surface somewhere to sit. */
  /* The glitter road is a REFLECTION, so it depends on where the viewer stands,
     not on the world origin — it always runs from the viewer toward the sun.
     Computed from the origin it sat off to one side of the frame while the sun
     burned in the middle, which is the sort of wrongness you feel before you
     can name it. The geometry is static, so it is anchored to the one beat
     where the lake is the subject: the reveal. */
  const ROAD_EYE = { x: Math.sin(5.72) * 150, z: Math.cos(5.72) * 150 };
  const sunAz = Math.atan2(SUN_DIR.x, SUN_DIR.z);
  /* Density and brightness both had to come up hard. At four thousand dashes
     over a lagoon this size the lake simply did not exist in the reveal — the
     waterline was the only thing saying "water", and beyond it was empty dark.
     The distribution is biased toward the near and middle water, because that
     is the band the reveal actually frames; scattering evenly out to the far
     shore spends most of the dashes where they are a pixel wide. */
  for (let i = 0; i < 13000; i++) {
    const a = rng(0, Math.PI * 2);
    const r = SHORE_R * (1.0 + Math.pow(rng(0, 1), 1.7) * 2.6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r + SHORE_CZ;
    if (landHeight(x, z) > WATER_Y) continue;            // that point is land
    if (z > 40) continue;                                // behind the camera's world
    // how close this ripple is to the sun's road, as seen from the reveal
    const az = Math.atan2(x - ROAD_EYE.x, z - ROAD_EYE.z);
    const dAz = Math.abs(((az - sunAz + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const road = Math.exp(-dAz * dAz * 18.0);
    const len = rng(1.4, 6.0) * (1 + road * 1.1);
    cA.copy(PLACE.water).lerp(PLACE.waterGlow, road * 0.92)
      .multiplyScalar(0.85 + road * 1.45);
    world.push(x - len, WATER_Y, z, x + len, WATER_Y, z, cA, cA, 0.8 + road * 1.2);
  }

  /* ── the Necklace of Lights ──
     126 posts around the lagoon with the strings swagged between them. The
     bulbs are the hottest small thing on the page, which is correct: at dusk
     they are the first thing you see from anywhere on the shore. */
  {
    const R = SHORE_R * 0.955, POSTS = 126;
    for (let i = 0; i < POSTS; i++) {
      const a = (i / POSTS) * Math.PI * 2;
      const a2 = ((i + 1) / POSTS) * Math.PI * 2;
      const px = Math.cos(a) * R, pz = Math.sin(a) * R + SHORE_CZ;
      const base = landHeight(px, pz);
      if (base < WATER_Y) continue;
      const top = base + 7.4;
      cA.copy(PLACE.shore).multiplyScalar(0.85);
      cB.copy(PLACE.necklace).multiplyScalar(1.2);
      world.push(px, base, pz, px, top, pz, cA, cB, 1.0);

      // the swag: a catenary between this post and the next, as lit beads
      const qx = Math.cos(a2) * R, qz = Math.sin(a2) * R + SHORE_CZ;
      const qTop = landHeight(qx, qz) + 7.4;
      let prev = null;
      for (let s = 0; s <= 6; s++) {
        const t = s / 6;
        const dip = Math.sin(t * Math.PI) * 1.5;
        const cur = { x: px + (qx - px) * t, y: top + (qTop - top) * t - dip, z: pz + (qz - pz) * t };
        if (prev) {
          cB.copy(PLACE.necklace).multiplyScalar(3.6);
          lights.push(prev.x, prev.y, prev.z, cur.x, cur.y, cur.z, cB, cB, 1.25);
        }
        prev = cur;
      }
    }
  }

  /* ── downtown ──
     Wireframe volumes on the far shore with lit windows. Verticals only plus a
     crown: drawing all twelve edges of every box made a thicket, and a tower
     reads from its corners and its top far more than from its base. */
  {
    const N = 46;
    for (let i = 0; i < N; i++) {
      const bx = rng(-780, 430), bz = rng(-1350, -820);
      const w = rng(26, 74), dp = rng(26, 62);
      const h = rng(60, 250) * (1 - Math.min(1, Math.abs(bx + 180) / 900) * 0.45);
      const base = WATER_Y;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (let k = 0; k < 4; k++) {
        const [sx, sz] = corners[k], [nx, nz] = corners[(k + 1) % 4];
        const x0 = bx + sx * w / 2, z0 = bz + sz * dp / 2;
        const x1 = bx + nx * w / 2, z1 = bz + nz * dp / 2;
        cA.copy(PLACE.city).multiplyScalar(0.55);
        cB.copy(PLACE.city).multiplyScalar(1.60);
        world.push(x0, base, z0, x0, base + h, z0, cA, cB, 1.0);        // the vertical
        world.push(x0, base + h, z0, x1, base + h, z1, cB, cB, 0.9);    // the crown
      }
      // windows: short hot dashes, clustered up the face nearest the water
      const lit = Math.round(h / 9);
      for (let k = 0; k < lit; k++) {
        if (rand() > 0.55) continue;
        const y = base + rng(8, h - 4);
        const t = rng(-0.42, 0.42);
        const x = bx + t * w, z = bz + dp / 2;
        cB.copy(PLACE.cityLit).multiplyScalar(rng(1.7, 3.3));
        lights.push(x, y, z, x + rng(1.6, 3.4), y, z, cB, cB, 0.9);
      }
    }
  }

  /* ── the Bay Bridge ──
     Far off and silhouetted, which means it is drawn almost entirely by its
     cables. Two towers, the suspension curve slung between them, and the deck.
     Its whole job is to sit on the horizon under the sun and say "this is the
     bay", so it is placed where the reveal's camera actually looks. */
  {
    const CX = 620, DZ = -1980, SPAN = 1250, TOWER = 168, DECK = WATER_Y + 26;
    const towers = [CX - SPAN * 0.28, CX + SPAN * 0.28];
    cA.copy(PLACE.bridge).multiplyScalar(1.45);
    cB.copy(PLACE.bridge).multiplyScalar(1.90);
    // deck
    world.push(CX - SPAN / 2, DECK, DZ, CX + SPAN / 2, DECK, DZ, cA, cA, 1.1);
    for (const tx of towers) {
      world.push(tx, DECK - 24, DZ, tx, DECK + TOWER, DZ, cA, cB, 1.3);
      world.push(tx - 16, DECK + TOWER * 0.62, DZ, tx + 16, DECK + TOWER * 0.62, DZ, cB, cB, 0.9);
    }
    // the main cable: a catenary through both towers, and the hangers off it
    let prev = null;
    for (let s = 0; s <= 90; s++) {
      const t = s / 90;
      const x = CX - SPAN / 2 + SPAN * t;
      // parabola between the towers, rising to the tower tops at the ends
      const u = (x - CX) / (SPAN * 0.28);
      const y = DECK + TOWER * Math.min(1, u * u) + (1 - Math.min(1, u * u)) * 8;
      const cur = { x, y, z: DZ };
      if (prev) {
        world.push(prev.x, prev.y, prev.z, cur.x, cur.y, cur.z, cB, cB, 1.0);
        if (s % 3 === 0 && cur.y > DECK + 6) {
          cA.copy(PLACE.bridge).multiplyScalar(0.34);
          world.push(cur.x, DECK, DZ, cur.x, cur.y, DZ, cA, cA, 0.7);
        }
      }
      prev = cur;
    }
  }

  /* ── the hills behind ──
     One ridge line. The east bay hills are a silhouette at this hour and adding
     more than their edge would be inventing detail nobody can see. */
  {
    let prev = null;
    for (let x = -2400; x <= 2400; x += 60) {
      const y = WATER_Y + 120
        + Math.sin(x * 0.0016) * 62 + Math.sin(x * 0.0043 + 1.7) * 26
        + Math.sin(x * 0.011 + 0.4) * 9;
      const cur = { x, y, z: -2600 };
      if (prev) {
        cA.copy(PLACE.hill).multiplyScalar(1.15);
        world.push(prev.x, prev.y, prev.z, cur.x, cur.y, cur.z, cA, cA, 1.4);
      }
      prev = cur;
    }
  }

  /* Fog for the world runs much further than the tree's: the bridge is two
     kilometres out and still has to be legible as a silhouette. */
  const worldMat = lineMaterial({
    near, minWidth: 0.9, atten: 0.55, refDist: 120, intensity: 1.0,
    fogColor: FOG, fogNear: 600, fogFar: 7000,
  });
  const lightMat = lineMaterial({
    near, minWidth: 1.0, atten: 0.35, refDist: 120, intensity: 2.4,
    fogColor: 0x4A2038, fogNear: 700, fogFar: 4200,
  });

  const worldMesh = lineBatch(world.take(0), worldMat);
  const lightMesh = lineBatch(lights.take(0), lightMat);
  scene.add(worldMesh); scene.add(lightMesh);

  return {
    sky,
    landHeight,
    count: world.count + lights.count,
    setResolution(res) {
      worldMat.uniforms.uRes.value.copy(res);
      lightMat.uniforms.uRes.value.copy(res);
    },
    dispose() {
      scene.remove(sky); scene.remove(worldMesh); scene.remove(lightMesh);
      sky.geometry.dispose(); sky.material.dispose();
      worldMesh.geometry.dispose(); lightMesh.geometry.dispose();
      worldMat.dispose(); lightMat.dispose();
    },
  };
}
