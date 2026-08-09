/* ─────────────────────────────────────────────────────────────────────────────
   PALETTE — the hue field

   Colour here is not paint applied to objects. It is a FIELD: where a thing
   sits in the world decides its hue, and its structural role decides how hot it
   burns. Roots sit in deep indigo, the bole climbs through plum into amber, the
   crown burns gold, and the two accents — an electric emerald in the leaves
   that have not turned, a cold cyan on the water — are the only hues allowed to
   break the warm-to-violet ramp.

   That restraint is deliberate and it is the difference between "cutting edge"
   and the neon-wireframe cliché. The temptation with luminous line work is to
   let every element pick its own colour, which produces a rainbow that reads as
   machine output. Five hues, one ramp, two accents, and large areas left dark.

   Values above 1.0 are intentional: the target is half-float and the composer
   blooms what exceeds the threshold, so brightness is how a thing declares
   importance. The hottest things on the page are the sun's core, the necklace
   bulbs and the leading edge of the crown — nothing else is allowed to compete.

   Golden hour, half-turned crown and the gold/orange/purple sky are Schyler's
   (2026-07-29). The luminous-line treatment is Schyler's (2026-07-31, direct:
   "back to just lines, but with full color, tones and environment hues. Like a
   vivid tron dreamstate ... cutting edge but not overly generated").
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';

const C = (h) => new THREE.Color(h);

/* ── the sky, bottom to top ──────────────────────────────────────────────────
   Sampled as a vertical ramp by the dome shader and reused as the fog colour so
   that geometry dissolves into the sky it is standing against, not into a
   generic grey. */
export const SKY = {
  horizon: C(0xFFB25E),      // the sun's own band, just above the water
  low:     C(0xE0517A),      // rose, where the glow gives out
  mid:     C(0x8A2A72),      // magenta
  high:    C(0x3E1560),      // violet
  zenith:  C(0x140A28),      // near-black indigo overhead
  sun:     C(0xFFD79A),      // the core, deliberately the brightest thing here
};

/* Fog is the low sky: everything far away is seen THROUGH that band. It is
   deliberately DARKER than the sky stops above, because the sky is drawn at a
   fraction of its nominal value (scene.js, uGain) and fog that ignored that
   would make distant lines brighter than the sky they are seen against. */
export const FOG = C(0x35182F);

/* ── wood ───────────────────────────────────────────────────────────────────
   A vertical ramp from the root plate to the outermost twig. Girth decides
   intensity, not hue: heavy structural wood is dim and solid, fine wood catches
   the light and burns. An old oak reads as ancient precisely because the mass
   is dark and only the extremities glow. */
const ROOT_DEEP = C(0x2B1B6E);   // indigo, underground
const ROOT_TIP  = C(0x5B3BC4);   // electric violet where roots surface
const BOLE_LO   = C(0x4A1F52);   // plum, in the crevices
const BOLE_HI   = C(0x9C4A48);   // where the ridges catch the west light
const LIMB_MID  = C(0xC9713A);   // amber
const TWIG_HOT  = C(0xFFAE55);   // gold, the outer crown

const _c = new THREE.Color();
/* y: world height. girth: how heavy this wood is. up: false for roots. */
export function woodColor(y, girth, up, out) {
  const o = out || _c;
  if (!up) {
    // roots: deeper is dimmer and bluer
    const k = THREE.MathUtils.clamp((y + 12) / 12, 0, 1);
    o.copy(ROOT_DEEP).lerp(ROOT_TIP, k);
    return o.multiplyScalar(0.55 + k * 0.35);
  }
  const k = THREE.MathUtils.clamp((y - 2) / 26, 0, 1);          // bole → crown
  if (k < 0.42) o.copy(BOLE_LO).lerp(BOLE_HI, k / 0.42);
  else if (k < 0.75) o.copy(BOLE_HI).lerp(LIMB_MID, (k - 0.42) / 0.33);
  else o.copy(LIMB_MID).lerp(TWIG_HOT, (k - 0.75) / 0.25);
  /* Fine wood burns, heavy wood does not. This single line is what keeps the
     tree from reading as a uniform glowing net. */
  const heat = THREE.MathUtils.clamp(1.35 - girth * 0.30, 0.55, 1.35);
  return o.multiplyScalar(heat);
}

/* ── leaves ─────────────────────────────────────────────────────────────────
   Half the crown has turned. The turned half runs gold→russet and sits ON the
   warm ramp; the half still green is pushed to an electric emerald that exists
   nowhere else in the tree. That contrast is the vivid part — a naturalistic
   green would simply go muddy against the magenta field. */
export const LEAF = [
  C(0x1FD98C), C(0x35F2A6), C(0x18B478), C(0x4CFFC0),          // holding green
  C(0xFFC24A), C(0xFF9A34), C(0xE8632A), C(0xC24420), C(0xFFDD8E),
];
export const LEAF_W = [0.15, 0.13, 0.12, 0.10,                 // 0.50 still green
                       0.16, 0.14, 0.10, 0.05, 0.05];          // 0.50 turned

/* ── the place ──────────────────────────────────────────────────────────────
   Cyan is the only cold hue in the world and it belongs to the water alone, so
   the lake reads as a distinct SUBSTANCE rather than as more sky. */
export const PLACE = {
  water:     C(0x2FC2D8),
  waterGlow: C(0xFF9A55),     // the sun's road across the lake
  shore:     C(0x7A3A72),
  /* Across the water, brightness is decided by what each thing sits AGAINST.
     The bridge is low, inside the gold band, so it is drawn dark and reads as a
     true silhouette — which is what Schyler asked for. The city and the hills
     stand higher, against the dark violet, where a dark edge is simply
     invisible; they keep a low self-luminance so they read at all, and their
     windows do the emitting. Painting all three the same way is what lost them:
     bright, they fogged out to nothing; uniformly dark, they vanished. */
  city:      C(0x6B2E9E),
  cityLit:   C(0xFFD9A0),     // windows, hot enough to bloom
  bridge:    C(0x32164A),
  necklace:  C(0xFFE9C4),     // the Necklace of Lights: the hottest small thing
  hill:      C(0x2B1038),
};

export const JAY = {
  body: C(0x4FA8FF),          // the one true blue on the page
  edge: C(0xBFE6FF),
  crest: C(0x2E6BD8),
};
