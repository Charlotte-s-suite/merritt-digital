/* ─────────────────────────────────────────────────────────────────────────────
   PALETTE — the tonal field

   Colour here is not paint applied to objects. It is a FIELD: where a thing
   sits in the world decides its tone, and its structural role decides how much
   light it carries. But this is a TONAL field now, not a chromatic one: the
   whole drawing lives on one ramp — the studio's own ratified brass, dark
   bronze in the mass rising to pale brass at the extremities — set against an
   ink sky that warms to a single band of gold at the horizon. One scale, from
   ink to gold. The half of the crown still green is a muted sage, close in
   value to the gold around it; the jays keep their earned steel blue; nothing
   else leaves the ramp.

   Light is scarce on purpose. Almost nothing here self-illuminates: the tree is
   DRAWN, in line weight and tone, and stays below the bloom threshold from root
   to twig. Exactly three things are allowed to actually emit — the sun's core,
   the Necklace of Lights, and a scatter of windows across the water — because
   at dusk on Lake Merritt those are the things that do. When light is that
   rare, it reads as meaning; when everything glows, nothing does.

   This replaces the five-hue luminous field (Schyler, 2026-08-08, direct: "I
   actually don't like the neon lights that much, it's too busy and drowns
   everything out ... make it more classy, high end and refined"). Golden hour,
   the half-turned crown and the reveal are Schyler's (2026-07-29) and stand.
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';

const C = (h) => new THREE.Color(h);

/* ── the sky, bottom to top ──────────────────────────────────────────────────
   A dusk, not an opera: ink overhead, a slate band with the faintest violet
   memory of the ruled palette, and all of the warmth held in one gold band
   just above the water. The interesting stop is the horizon; everything above
   it exists to be quiet so that band can carry the hour. */
export const SKY = {
  horizon: C(0xE2AE62),      // the gold band: the one warm statement in the sky
  low:     C(0x8A6248),      // sepia, where the gold gives out
  mid:     C(0x4E3E48),      // slate with a violet memory, heavily greyed
  high:    C(0x272430),      // ink-slate
  zenith:  C(0x121318),      // the page's own ink, overhead
  sun:     C(0xFFE9BE),      // the core: small, and the brightest thing here
};

/* Fog is warm ink: everything far away is seen through dusk air, so distance
   reads as tone sinking toward the field, never as a colour shift. */
export const FOG = C(0x261E19);

/* ── wood ───────────────────────────────────────────────────────────────────
   The studio's ratified brass ramp, literally: dark bronze underground, the
   unlit brass of the bole, the catalogue brass of the limbs, lit brass at the
   outermost twigs. The tree is drawn in the same metal the site is set in.
   Girth decides carry, not hue: heavy wood is dim and solid, fine wood takes
   the west light — the mass stays dark, only the extremities brighten, and
   none of it is allowed over the bloom threshold. A drawn tree, not a lit one. */
const ROOT_DEEP = C(0x2A211A);   // dark umber, underground
const ROOT_TIP  = C(0x62492A);   // bronze where roots break the surface
const BOLE_LO   = C(0x45361F);   // bronze shadow, in the crevices
const BOLE_HI   = C(0x8A6C34);   // --brass-dp, where the ridges catch the west
const LIMB_MID  = C(0xB08D4A);   // --brass
const TWIG_HOT  = C(0xE3C57E);   // --brass-lt

const _c = new THREE.Color();
/* y: world height. girth: how heavy this wood is. up: false for roots. */
export function woodColor(y, girth, up, out) {
  const o = out || _c;
  if (!up) {
    // roots: deeper is dimmer. Faint on purpose — an underdrawing, not a lightshow
    const k = THREE.MathUtils.clamp((y + 12) / 12, 0, 1);
    o.copy(ROOT_DEEP).lerp(ROOT_TIP, k);
    return o.multiplyScalar(0.40 + k * 0.35);
  }
  const k = THREE.MathUtils.clamp((y - 2) / 26, 0, 1);          // bole → crown
  if (k < 0.42) o.copy(BOLE_LO).lerp(BOLE_HI, k / 0.42);
  else if (k < 0.75) o.copy(BOLE_HI).lerp(LIMB_MID, (k - 0.42) / 0.33);
  else o.copy(LIMB_MID).lerp(TWIG_HOT, (k - 0.75) / 0.25);
  /* Fine wood carries more light than heavy wood — this is the whole lighting
     model, and the reason the tree reads as ancient: dark mass, bright edge. */
  const heat = THREE.MathUtils.clamp(1.18 - girth * 0.24, 0.55, 1.18);
  return o.multiplyScalar(heat);
}

/* ── leaves ─────────────────────────────────────────────────────────────────
   Half the crown has turned (Schyler, 2026-07-29). The turned half IS the
   brass ramp — pale gold through amber to a deep russet-bronze. The green
   half is sage: grey-green, close in value to the gold beside it, the way
   late-season leaves actually sit. Tone against tone, never hue against hue —
   the crown should read as one drawn mass with a season moving through it. */
export const LEAF = [
  C(0x7E8F5C), C(0x66774B), C(0x93A26E), C(0x55643E),          // holding sage
  C(0xE3C57E), C(0xD3A455), C(0xB0772F), C(0x8A5524), C(0xEFDCA4),
];
export const LEAF_W = [0.15, 0.13, 0.12, 0.10,                 // 0.50 still green
                       0.16, 0.14, 0.10, 0.05, 0.05];          // 0.50 turned

/* ── the place ──────────────────────────────────────────────────────────────
   The setting recedes: everything across the water is silhouette against the
   gold band, drawn in inks a step warmer or cooler than the sky behind it.
   The water is pewter — the sky's tone taken down, not a colour of its own —
   and the sun's road across it is the horizon gold. */
export const PLACE = {
  water:     C(0x77828A),     // pewter: dusk sky, reflected and darkened
  waterGlow: C(0xE2AE62),     // the sun's road is the horizon's own gold
  shore:     C(0x62492A),     // bronze: paths and land marks, dim
  city:      C(0x4A3C42),     // towers as silhouette lines on the gold band
  cityLit:   C(0xF0CE92),     // windows: one of the three permitted lights
  bridge:    C(0x352930),     // the Bay Bridge: a true silhouette
  necklace:  C(0xFFE3AE),     // the Necklace of Lights: permitted light two
  hill:      C(0x2A2126),     // the ridge: barely more than the sky it cuts
};

export const JAY = {
  body: C(0x8CAFD2),          // the one blue on the page, muted to steel
  edge: C(0xD5DFE8),
  crest: C(0x5E7591),
};
