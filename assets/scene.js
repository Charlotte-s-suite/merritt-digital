/* ─────────────────────────────────────────────────────────────────────────────
   LAKE MERRITT — Merritt Digital

   The place the oak stands in: the tidal lagoon in downtown Oakland at GOLDEN
   HOUR — gold and orange low on the water, purple climbing overhead, the downtown
   skyline and the Bay Bridge silhouetted far off to the west.
   Water, shoreline, the Necklace of Lights, the downtown skyline behind it, and
   below the waterline the soil section the roots actually sit in — which is what
   turns "roots floating in a void" into a continuous descent through ground.

   Chosen at dusk on purpose. The lamps come on, which is when the Necklace reads;
   a low warm sun models an autumn crown better than noon ever will; and haze does
   most of the work of hiding distance, cheaply.

   Everything here is generated. No model files, no downloaded imagery.
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';
import { waterNormals, groundTexture, soilTexture } from './textures.js';

const GROUND_Y = -2.6;          // the waterline, and the top of the soil section

/* A deterministic PRNG so the skyline and the lamps are the same every load. */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/* ── the sky ──
   A dusk gradient on the inside of a big sphere. Doubles as the environment the
   water and the wet bark reflect, so it is doing two jobs. */
function skyDome() {
  const g = new THREE.SphereGeometry(900, 32, 20);
  const pos = g.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color(0x4A3A78);   // purple overhead
  const mid    = new THREE.Color(0x9E5F86);   // magenta through the middle
  const band   = new THREE.Color(0xE9925A);   // orange at the horizon
  const glow   = new THREE.Color(0xFFD08A);   // gold, where the sun is going down
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 900, x = pos.getX(i) / 900;
    const up = Math.max(0, Math.min(1, (y + 0.12) / 0.95));
    // two-stage ramp: orange -> magenta -> purple, which is what golden hour does
    if (up < 0.42) c.copy(band).lerp(mid, up / 0.42);
    else c.copy(mid).lerp(zenith, (up - 0.42) / 0.58);
    // the sun's own quarter, low in the west, blown out to gold
    const west = Math.max(0, -x) * Math.max(0, 1 - Math.abs(y + 0.04) * 2.6);
    c.lerp(glow, Math.pow(west, 0.8) * 0.95);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}

/* ── the lagoon ──
   One large plane. Low roughness plus the ripple normals plus an environment map
   is what makes water read as water rather than as a blue floor. */
function water() {
  const g = new THREE.PlaneGeometry(4200, 4200, 1, 1);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({
    color: 0x2E2436, roughness: 0.065, metalness: 0.62,
    normalMap: waterNormals(), normalScale: new THREE.Vector2(0.35, 0.35),
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = GROUND_Y - 0.05;
  mesh.receiveShadow = true;
  return mesh;
}

/* ── the shore ──
   A SHORELINE, not an island. The first pass made the land a disc with the water
   ringing it, which turned Lake Merritt into a puddle around a traffic island and
   the Necklace into a fence. The lagoon is large: the land is one big mass whose
   edge runs past the oak, and the water opens away from it toward downtown.
   Centre is pushed back so the waterline sits just in front of the tree. */
const SHORE_R = 420, SHORE_CZ = 380;      // waterline ≈ 25 units in front of the oak

function shore() {
  /* A SEGMENTED surface, not a CircleGeometry. CircleGeometry is a triangle fan:
     one centre vertex and a rim, no interior rings — so a per-vertex height profile
     is only ever sampled at the centre and the edge, and everything between is
     linearly interpolated into the lake. That is why the oak spent three renders
     standing in open water. */
  const SIZE = 1500, SEG = 150;
  const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  g.rotateX(-Math.PI / 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x, z - SHORE_CZ);
    const edge = d / SHORE_R;
    // plateau inland, a short beach, then well below the waterline
    let y = edge < 0.93 ? 2.8 : Math.max(-7, 2.8 - ((edge - 0.93) / 0.07) * 5.8);
    y += Math.sin(x * 0.05) * 0.30 + Math.cos(z * 0.043) * 0.26
       + Math.sin((x + z) * 0.011) * 0.5;                       // gentle undulation
    pos.setY(i, y);
  }
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const m = new THREE.MeshStandardMaterial({
    map: groundTexture(), roughness: 0.94, metalness: 0.0, color: 0x93876A,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = GROUND_Y;
  mesh.receiveShadow = true;
  return mesh;
}

/* ── below the waterline ──
   The soil the descent passes into. A cylinder wall plus a floor, so once the
   camera drops under the bank it is inside ground rather than under a floating
   disc. */
function soil() {
  const group = new THREE.Group();
  const tex = soilTexture();
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(56, 44, 46, 40, 1, true),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.98, side: THREE.BackSide, color: 0x6B5B48 })
  );
  wall.position.set(0, GROUND_Y - 23, 30);
  group.add(wall);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(44, 32),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.98, color: 0x4A3E30 })
  );
  floor.rotateX(-Math.PI / 2);
  floor.position.set(0, GROUND_Y - 46, 30);
  group.add(floor);
  return group;
}

/* ── the Necklace of Lights ──
   The strung lamps that ring the lake — the one detail that says Lake Merritt and
   nowhere else. Emissive spheres on posts, with the swag of cable between them. */
function necklace(seed) {
  const group = new THREE.Group();
  const rand = rng(seed);
  // strung along the shoreline arc, a little inland of the waterline
  const R = SHORE_R - 9, POSTS = 150;
  const bulbGeo = new THREE.SphereGeometry(0.42, 8, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xFFE7BE, fog: true });
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, POSTS * 5 + 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x14181C, roughness: 0.8 });
  const postGeo = new THREE.CylinderGeometry(0.22, 0.3, 9, 5);
  const posts = new THREE.InstancedMesh(postGeo, postMat, POSTS);
  const M = new THREE.Matrix4();
  let bi = 0;
  for (let i = 0; i < POSTS; i++) {
    // only the arc that faces the water, which is all a visitor can see
    const a = Math.PI * (1.5 - 0.38 + (i / POSTS) * 0.76);
    const px = Math.cos(a) * R, pz = Math.sin(a) * R + SHORE_CZ;
    M.makeTranslation(px, GROUND_Y + 4.5, pz);
    posts.setMatrixAt(i, M);
    const a2 = Math.PI * (1.5 - 0.38 + ((i + 1) / POSTS) * 0.76);
    for (let k = 0; k < 5; k++) {
      const t = (k + 0.5) / 5;
      const aa = a + (a2 - a) * t;
      const dip = Math.sin(t * Math.PI) * 1.4;
      M.makeTranslation(Math.cos(aa) * R, GROUND_Y + 8.2 - dip, Math.sin(aa) * R + SHORE_CZ);
      bulbs.setMatrixAt(bi++, M);
    }
  }
  bulbs.count = bi;
  group.add(posts, bulbs);
  return group;
}

/* ── downtown Oakland ──
   A silhouette across the water: a bank of towers with a few lit floors, sunk in
   haze so it reads as distance rather than as detail. Kaiser Center's long slab
   and the cathedral's pale wedge are in there by proportion, not by name. */
function skyline(seed) {
  const rand = rng(seed);
  const group = new THREE.Group();
  const boxes = [];
  const mat = new THREE.MeshStandardMaterial({ color: 0x4A3A52, roughness: 0.85, metalness: 0.1 });
  const lit = new THREE.MeshBasicMaterial({ color: 0xE8C489, fog: true });
  const litGeo = new THREE.PlaneGeometry(1, 1);
  const windows = new THREE.InstancedMesh(litGeo, lit, 1400);
  const M = new THREE.Matrix4();
  let wi = 0;

  for (let i = 0; i < 26; i++) {
    const spread = -420 + (i / 25) * 840 + (rand() - 0.5) * 26;
    const depth = -620 - rand() * 220;
    const h = 34 + Math.pow(rand(), 1.7) * 150;
    const w = 14 + rand() * 26, d = 14 + rand() * 22;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(spread, GROUND_Y + h / 2, depth);
    boxes.push(g.toNonIndexed());  // indexed geometry cannot be merged by raw copy
    g.dispose();
    // a scatter of lit windows on the face turned toward us
    const rows = Math.floor(h / 7), cols = Math.max(2, Math.floor(w / 6));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() > 0.30) continue;
        if (wi >= 1400) break;
        M.makeTranslation(spread - w / 2 + 3 + c * (w - 6) / Math.max(1, cols - 1),
                          GROUND_Y + 5 + r * (h - 8) / Math.max(1, rows - 1),
                          depth + d / 2 + 0.4);
        windows.setMatrixAt(wi++, M);
      }
    }
  }
  windows.count = wi;

  // one merged mesh for all the massing
  const merged = new THREE.BufferGeometry();
  let total = 0;
  for (const g of boxes) total += g.getAttribute('position').count;
  const mp = new Float32Array(total * 3), mn = new Float32Array(total * 3);
  let o = 0;
  for (const g of boxes) {
    mp.set(g.getAttribute('position').array, o * 3);
    mn.set(g.getAttribute('normal').array, o * 3);
    o += g.getAttribute('position').count;
    g.dispose();
  }
  merged.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mn, 3));
  group.add(new THREE.Mesh(merged, mat), windows);
  return group;
}

/* Image-based lighting from our own sky. Without this, MeshStandardMaterial has
   almost no indirect light and the whole scene reads as flat and nearly black —
   which is exactly what happened the first time. One-time cost. */
export function installEnvironment(renderer, scene, skyMesh) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const probe = new THREE.Scene();
  const clone = skyMesh.clone();
  probe.add(clone);
  const rt = pmrem.fromScene(probe, 0, 1, 2000);
  scene.environment = rt.texture;
  scene.environmentIntensity = 1.0;
  pmrem.dispose();
  clone.geometry = skyMesh.geometry;          // shared; don't double-dispose
  return rt;
}

/* ── the Bay Bridge ──
   Silhouetted far off to the west, across the water and past downtown. Read as
   proportion rather than as a survey: two suspension towers, the catenary between
   them, the deck running out to the anchorages. At this distance and in this haze
   it is a shape on the horizon, which is exactly what it is from Lake Merritt. */
function bayBridge() {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x3A2C3E, roughness: 0.9, metalness: 0.05 });
  const DIST = -1180, SPAN = 700, DECK_Y = GROUND_Y + 24, TOWER_H = 132;
  const CX = -980;                       // west of downtown, on the horizon

  const pieces = [];
  // the deck, running west to east
  const deck = new THREE.BoxGeometry(SPAN * 2.4, 5, 16);
  deck.translate(CX, DECK_Y, DIST);
  pieces.push(deck);

  // two towers, and the vertical hangers under the catenary
  for (const tx of [CX - SPAN / 2, CX + SPAN / 2]) {
    for (const off of [-6.5, 6.5]) {
      const leg = new THREE.BoxGeometry(9, TOWER_H, 9);
      leg.translate(tx, DECK_Y + TOWER_H / 2 - 8, DIST + off);
      pieces.push(leg);
    }
    for (let k = 0; k < 4; k++) {                       // cross bracing
      const brace = new THREE.BoxGeometry(26, 4.5, 7);
      brace.translate(tx, DECK_Y + 16 + k * 30, DIST);
      pieces.push(brace);
    }
  }
  // the main catenary and its hangers
  for (let i = 0; i <= 46; i++) {
    const t = i / 46;
    const x = CX - SPAN / 2 + t * SPAN;
    const sag = Math.cos((t - 0.5) * Math.PI) ;
    const y = DECK_Y + TOWER_H - 14 - sag * 74;
    const seg = new THREE.BoxGeometry(SPAN / 46 + 2, 2.4, 2.4);
    seg.translate(x, y, DIST);
    pieces.push(seg);
    if (i % 3 === 0 && y > DECK_Y + 6) {
      const hang = new THREE.BoxGeometry(1.6, y - DECK_Y, 1.6);
      hang.translate(x, DECK_Y + (y - DECK_Y) / 2, DIST);
      pieces.push(hang);
    }
  }
  // the side spans, stepping down to the anchorages
  for (const side of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const pier = new THREE.BoxGeometry(7, 30 - k * 4, 7);
      pier.translate(CX + side * (SPAN / 2 + 60 + k * 90), DECK_Y - 15, DIST);
      pieces.push(pier);
    }
  }

  const flat = pieces.map((g) => { const f = g.toNonIndexed(); g.dispose(); return f; });
  let total = 0;
  for (const g of flat) total += g.getAttribute('position').count;
  const mp = new Float32Array(total * 3), mn = new Float32Array(total * 3);
  let o = 0;
  for (const g of flat) {
    mp.set(g.getAttribute('position').array, o * 3);
    mn.set(g.getAttribute('normal').array, o * 3);
    o += g.getAttribute('position').count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mn, 3));
  group.add(new THREE.Mesh(merged, dark));
  return group;
}

export function makeScene(scene) {
  const group = new THREE.Group();
  const sky = skyDome();
  group.add(sky);
  group.add(water());
  group.add(shore());
  group.add(soil());
  group.add(necklace(0x5150));
  group.add(skyline(0xC17));
  group.add(bayBridge());
  scene.add(group);

  // haze: thick enough to sink the skyline, thin enough to leave the oak crisp
  scene.fog = new THREE.FogExp2(0xD59A72, 0.00075);  // warm haze, thin enough to see the bridge

  return {
    group,
    groundY: GROUND_Y,
    sky,
    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    },
  };
}
