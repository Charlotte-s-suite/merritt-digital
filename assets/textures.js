/* ─────────────────────────────────────────────────────────────────────────────
   PROCEDURAL TEXTURES — Merritt Digital

   Every texture on this page is drawn into a canvas at load time. Nothing is
   downloaded, so the page still ships zero image bytes and still has nothing
   bought in — but the surfaces get real grain, which is the difference between
   a lit tube and bark.

   Kept deliberately small (256–512px, tiled) because tiling grain is invisible
   at these viewing distances and the memory matters on old hardware.
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';

function surface(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, x: c.getContext('2d') };
}

function finish(canvas, repeatX, repeatY, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* A deterministic value-noise field, so textures are identical every load. */
function noiseField(seed) {
  let s = seed >>> 0;
  const rnd = () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  return rnd;
}

/* ── bark ──
   Vertical fissures with cross-checking, which is what makes oak bark oak bark:
   deep grooves running up the trunk, broken into plates by shallow cross breaks. */
export function barkTextures() {
  const W = 512, H = 512;
  const { c, x } = surface(W, H);
  const rnd = noiseField(0x9E3779B9);

  x.fillStyle = '#5A4A3A';
  x.fillRect(0, 0, W, H);

  // long vertical fissures
  for (let i = 0; i < 150; i++) {
    const px = rnd() * W;
    const wdt = 2 + rnd() * 9;
    const dark = 0.30 + rnd() * 0.45;
    x.strokeStyle = `rgba(28,20,13,${dark})`;
    x.lineWidth = wdt;
    x.beginPath();
    let cx = px;
    x.moveTo(cx, -10);
    for (let y = -10; y < H + 10; y += 22) {
      cx += (rnd() - 0.5) * 9;
      x.lineTo(cx, y);
    }
    x.stroke();
  }
  // raised plate highlights beside the fissures
  for (let i = 0; i < 110; i++) {
    const px = rnd() * W;
    x.strokeStyle = `rgba(150,128,102,${0.10 + rnd() * 0.26})`;
    x.lineWidth = 1 + rnd() * 5;
    x.beginPath();
    let cx = px;
    x.moveTo(cx, -10);
    for (let y = -10; y < H + 10; y += 26) {
      cx += (rnd() - 0.5) * 8;
      x.lineTo(cx, y);
    }
    x.stroke();
  }
  // shallow cross breaks that split the ridges into plates
  for (let i = 0; i < 220; i++) {
    const py = rnd() * H, px = rnd() * W, len = 6 + rnd() * 30;
    x.strokeStyle = `rgba(30,22,15,${0.12 + rnd() * 0.3})`;
    x.lineWidth = 1 + rnd() * 2.5;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + len, py + (rnd() - 0.5) * 6); x.stroke();
  }
  // fine speckle: lichen and weathering
  for (let i = 0; i < 5000; i++) {
    const g = rnd();
    x.fillStyle = g > 0.72
      ? `rgba(126,134,104,${0.05 + rnd() * 0.18})`     // lichen green-grey
      : `rgba(20,15,10,${0.04 + rnd() * 0.14})`;
    x.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 3);
  }

  // roughness derived from the same drawing: fissures read wetter/darker
  const rough = surface(W, H);
  rough.x.drawImage(c, 0, 0);
  const img = rough.x.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
    const r = Math.round(255 * (0.62 + 0.34 * (1 - l)));   // dark grooves = rougher
    d[i] = d[i + 1] = d[i + 2] = r; d[i + 3] = 255;
  }
  rough.x.putImageData(img, 0, 0);

  return { map: finish(c, 3, 2, true), roughnessMap: finish(rough.c, 3, 2, false) };
}

/* ── a leaf blade ──
   One lobed outline, used three ways: filled for the colour map, filled white for
   the silhouette mask, and as a clip so the veining and blotching cannot spill
   outside the leaf. That last part matters — detail painted past the edge lands in
   the mask as faint alpha and turns every leaf back into a rectangle. */
function bladePath(x, W, H) {
  const lobes = 4;
  const halfW = (t) => (W * 0.46) * Math.sin(Math.PI * Math.pow(t, 0.85))
                       * (0.58 + 0.42 * (0.5 + 0.5 * Math.cos(t * Math.PI * 2 * lobes)));
  const yAt = (t) => 5 + t * (H - 26);
  x.beginPath();
  x.moveTo(W / 2, yAt(0));
  for (let i = 1; i <= 60; i++) { const t = i / 60; x.lineTo(W / 2 + Math.max(1.5, halfW(t)), yAt(t)); }
  x.lineTo(W / 2 + 2.5, H - 6);                       // the stalk
  x.lineTo(W / 2 - 2.5, H - 6);
  for (let i = 60; i >= 1; i--) { const t = i / 60; x.lineTo(W / 2 - Math.max(1.5, halfW(t)), yAt(t)); }
  x.closePath();
}

export function leafTextures() {
  const W = 128, H = 160;
  const { c, x } = surface(W, H);
  const rnd = noiseField(0x1234567);

  bladePath(x, W, H);
  x.fillStyle = '#C89A3E';
  x.fill();

  x.save();
  bladePath(x, W, H);
  x.clip();                                            // nothing escapes the blade

  x.strokeStyle = 'rgba(118,80,28,0.50)';
  x.lineWidth = 2.6;
  x.beginPath(); x.moveTo(W / 2, 8); x.lineTo(W / 2, H - 8); x.stroke();
  x.lineWidth = 1.1;
  for (let i = 1; i < 10; i++) {
    const y = 12 + (i / 10) * (H - 34);
    for (const side of [1, -1]) {
      x.beginPath(); x.moveTo(W / 2, y);
      x.quadraticCurveTo(W / 2 + side * 18, y + 5, W / 2 + side * (20 + rnd() * 24), y + 18);
      x.stroke();
    }
  }
  for (let i = 0; i < 260; i++) {                      // turning blotches
    x.fillStyle = rnd() > 0.5 ? 'rgba(148,74,24,0.22)' : 'rgba(216,182,102,0.20)';
    x.beginPath(); x.arc(rnd() * W, rnd() * H, 2 + rnd() * 8, 0, 6.3); x.fill();
  }
  x.restore();

  // the mask: the same path, hard white on black, in LINEAR space. An sRGB texture
  // used as an alphaMap gets linearised — 0.6 becomes 0.32 — which silently
  // deletes every leaf on the tree.
  const mask = surface(W, H);
  mask.x.fillStyle = '#000';
  mask.x.fillRect(0, 0, W, H);
  bladePath(mask.x, W, H);
  mask.x.fillStyle = '#fff';
  mask.x.fill();

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const alphaMap = new THREE.CanvasTexture(mask.c);    // linear, deliberately
  alphaMap.anisotropy = 4;
  return { map, alphaMap };
}

/* ── water ──
   A normal map of overlapping ripples. Lake Merritt is a shallow tidal lagoon:
   short chop, no swell. */
export function waterNormals() {
  const W = 512, H = 512;
  const { c, x } = surface(W, H);
  x.fillStyle = '#8080ff';                      // flat normal
  x.fillRect(0, 0, W, H);
  const rnd = noiseField(0xBEEF11);
  for (let i = 0; i < 900; i++) {
    const px = rnd() * W, py = rnd() * H, r = 6 + rnd() * 30;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    const tilt = 0.5 + (rnd() - 0.5) * 0.5;
    g.addColorStop(0, `rgba(${Math.round(tilt * 255)},${Math.round((1 - tilt) * 255)},255,0.5)`);
    g.addColorStop(1, 'rgba(128,128,255,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill();
  }
  return finish(c, 26, 26, false);
}

/* ── ground ──
   Path grit and grass, close enough that a visitor reads "shoreline". */
export function groundTexture() {
  const W = 512, H = 512;
  const { c, x } = surface(W, H);
  const rnd = noiseField(0xA11CE);
  x.fillStyle = '#3B3A2C';
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    const g = rnd();
    x.fillStyle = g > 0.62 ? `rgba(92,96,58,${0.10 + rnd() * 0.35})`
      : g > 0.3 ? `rgba(58,52,38,${0.10 + rnd() * 0.3})`
      : `rgba(120,112,92,${0.05 + rnd() * 0.2})`;
    x.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 4, 1 + rnd() * 4);
  }
  return finish(c, 40, 40, true);
}

/* ── soil ──
   The section the descent passes into below the waterline: wet strata, gravel. */
export function soilTexture() {
  const W = 512, H = 512;
  const { c, x } = surface(W, H);
  const rnd = noiseField(0x50117);
  x.fillStyle = '#2A2018';
  x.fillRect(0, 0, W, H);
  for (let band = 0; band < 26; band++) {                 // strata
    const y = (band / 26) * H, h = H / 26 + 2;
    const l = 0.5 + 0.5 * Math.sin(band * 1.7);
    x.fillStyle = `rgba(${Math.round(46 + l * 44)},${Math.round(34 + l * 32)},${Math.round(24 + l * 20)},0.55)`;
    x.fillRect(0, y, W, h);
  }
  for (let i = 0; i < 2600; i++) {                        // gravel
    x.fillStyle = rnd() > 0.5 ? `rgba(120,108,92,${0.10 + rnd() * 0.3})` : `rgba(18,13,9,${0.1 + rnd() * 0.35})`;
    x.beginPath(); x.arc(rnd() * W, rnd() * H, 1 + rnd() * 4, 0, 6.3); x.fill();
  }
  return finish(c, 16, 16, true);
}

/* ── a jay's plumage ──
   Mantle blue above, pale below, the black necklace across the breast, barred
   primaries and the white wing flash. Painted flat and mapped onto the bird, which
   is what stops it reading as a smooth solid of revolution. */
export function jayTexture() {
  const W = 256, H = 128;
  const { c, x } = surface(W, H);
  const rnd = noiseField(0x5A1B12);

  // v: 0 = spine, 1 = belly. u runs tail -> bill.
  const grad = x.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0.00, '#3E6FA8');
  grad.addColorStop(0.34, '#5C8CC6');
  grad.addColorStop(0.52, '#9FB6CE');
  grad.addColorStop(0.66, '#E4E9EE');
  grad.addColorStop(1.00, '#CBD4DC');
  x.fillStyle = grad;
  x.fillRect(0, 0, W, H);

  // barring across the mantle and the closed wing
  x.strokeStyle = 'rgba(20,36,60,0.20)';
  for (let i = 0; i < 54; i++) {
    x.lineWidth = 0.7 + rnd() * 1.1;
    const px = rnd() * W, top = rnd() * H * 0.30;
    x.beginPath(); x.moveTo(px, top); x.lineTo(px + 3 + rnd() * 5, top + 6 + rnd() * 14); x.stroke();
  }
  // scalloped feather edges on the mantle, which is what actually reads as plumage
  for (let i = 0; i < 200; i++) {
    const px = rnd() * W, py = rnd() * H * 0.46;
    x.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(12,24,44,0.13)';
    x.lineWidth = 0.9;
    x.beginPath(); x.arc(px, py, 2.5 + rnd() * 5, 0.2, Math.PI - 0.2); x.stroke();
  }
  // the necklace: a dark collar across the breast and up behind the eye
  x.strokeStyle = 'rgba(14,16,22,0.85)';
  x.lineWidth = 7;
  x.beginPath(); x.moveTo(W * 0.70, H * 0.62); x.quadraticCurveTo(W * 0.80, H * 0.44, W * 0.92, H * 0.50); x.stroke();
  x.lineWidth = 4;
  x.beginPath(); x.moveTo(W * 0.86, H * 0.30); x.lineTo(W * 0.97, H * 0.34); x.stroke();
  // white flash on the secondaries
  x.fillStyle = 'rgba(244,248,251,0.92)';
  x.fillRect(W * 0.16, H * 0.16, W * 0.10, H * 0.10);
  x.fillRect(W * 0.28, H * 0.10, W * 0.07, H * 0.07);
  // an eye
  x.fillStyle = '#0B0D11';
  x.beginPath(); x.arc(W * 0.93, H * 0.30, 4.2, 0, 6.3); x.fill();
  // feather speckle so the flat fill is not flat
  for (let i = 0; i < 1800; i++) {
    x.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(10,20,40,0.06)';
    x.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
