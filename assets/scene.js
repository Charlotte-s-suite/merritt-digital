/* ─────────────────────────────────────────────────────────────────────────────
   LAKE MERRITT — Merritt Digital

   The place the oak stands in: the tidal lagoon in downtown Oakland at dusk.
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
  const top = new THREE.Color(0x3E5B8C);      // deep blue overhead
  const band = new THREE.Color(0xA9A2AE);     // the haze band at the horizon
  const glow = new THREE.Color(0xFFA659);     // the sun's side, low and warm
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 900, x = pos.getX(i) / 900;
    const up = Math.max(0, Math.min(1, (y + 0.15) / 0.9));
    c.copy(band).lerp(top, Math.pow(up, 0.7));
    // warm the western quarter, where the sun is going down
    const west = Math.max(0, -x) * Math.max(0, 1 - Math.abs(y) * 2.2);
    c.lerp(glow, west * 0.75);
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
  const g = new THREE.PlaneGeometry(1600, 1600, 1, 1);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({
    color: 0x223A42, roughness: 0.075, metalness: 0.55,
    normalMap: waterNormals(), normalScale: new THREE.Vector2(0.35, 0.35),
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = GROUND_Y - 0.05;
  mesh.receiveShadow = true;
  return mesh;
}

/* ── the shore the oak stands on ──
   A low mound so the tree isn't growing out of open water, with the lakeside path
   ringing it. */
function shore() {
  const g = new THREE.CircleGeometry(74, 48);
  g.rotateX(-Math.PI / 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x, z);
    // crown the bank slightly, then drop it into the water at the rim
    pos.setY(i, Math.max(-1.2, 1.1 * Math.cos((d / 74) * Math.PI * 0.5) - 0.1)
                 + Math.sin(x * 0.07) * 0.25 + Math.cos(z * 0.06) * 0.22);
  }
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({
    map: groundTexture(), roughness: 0.92, metalness: 0.0, color: 0x8C8A78,
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
    new THREE.CylinderGeometry(74, 60, 46, 48, 1, true),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.98, side: THREE.BackSide, color: 0x6B5B48 })
  );
  wall.position.y = GROUND_Y - 23;
  group.add(wall);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(60, 40),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.98, color: 0x4A3E30 })
  );
  floor.rotateX(-Math.PI / 2);
  floor.position.y = GROUND_Y - 46;
  group.add(floor);
  return group;
}

/* ── the Necklace of Lights ──
   The strung lamps that ring the lake — the one detail that says Lake Merritt and
   nowhere else. Emissive spheres on posts, with the swag of cable between them. */
function necklace(seed) {
  const group = new THREE.Group();
  const rand = rng(seed);
  const R = 118, POSTS = 64;
  const bulbGeo = new THREE.SphereGeometry(0.42, 8, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xFFD9A0, fog: true });
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, POSTS * 5);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x14181C, roughness: 0.8 });
  const postGeo = new THREE.CylinderGeometry(0.22, 0.3, 9, 5);
  const posts = new THREE.InstancedMesh(postGeo, postMat, POSTS);
  const M = new THREE.Matrix4();
  let bi = 0;
  for (let i = 0; i < POSTS; i++) {
    const a = (i / POSTS) * Math.PI * 2;
    const px = Math.cos(a) * R, pz = Math.sin(a) * R;
    M.makeTranslation(px, GROUND_Y + 4.5, pz);
    posts.setMatrixAt(i, M);
    // the swag: bulbs dipping between this post and the next
    const a2 = ((i + 1) / POSTS) * Math.PI * 2;
    for (let k = 0; k < 5; k++) {
      const t = (k + 0.5) / 5;
      const ax = Math.cos(a + (a2 - a) * t) * R, az = Math.sin(a + (a2 - a) * t) * R;
      const dip = Math.sin(t * Math.PI) * 1.5;
      M.makeTranslation(ax, GROUND_Y + 8.4 - dip, az);
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
  const mat = new THREE.MeshStandardMaterial({ color: 0x232B38, roughness: 0.85, metalness: 0.1 });
  const lit = new THREE.MeshBasicMaterial({ color: 0xE8C489, fog: true });
  const litGeo = new THREE.PlaneGeometry(1, 1);
  const windows = new THREE.InstancedMesh(litGeo, lit, 1400);
  const M = new THREE.Matrix4();
  let wi = 0;

  for (let i = 0; i < 26; i++) {
    const spread = -230 + (i / 25) * 460 + (rand() - 0.5) * 14;
    const depth = -300 - rand() * 90;
    const h = 22 + Math.pow(rand(), 1.7) * 96;
    const w = 14 + rand() * 26, d = 14 + rand() * 22;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(spread, GROUND_Y + h / 2, depth);
    boxes.push(g);
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

export function makeScene(scene) {
  const group = new THREE.Group();
  const sky = skyDome();
  group.add(sky);
  group.add(water());
  group.add(shore());
  group.add(soil());
  group.add(necklace(0x5150));
  group.add(skyline(0xC17));
  scene.add(group);

  // haze: thick enough to sink the skyline, thin enough to leave the oak crisp
  scene.fog = new THREE.FogExp2(0x6E6C82, 0.0030);

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
