# DESIGN.md — Merritt Digital, the studio's own site

_The durable visual system for this repo. The studio's `kit/DESIGN-STANDARD.md` is still the law;
this file records what THIS surface committed to, so the next head extends it instead of
re-inventing it. Established 2026-07-28 with the one-page build._

**Scope.** Capability only: this site never names clients, shows client logos or screenshots,
or links client work. The page demonstrates; it does not cite. Schyler ruling 2026-07-29 via the
console lead — see BRIEF.md job 1 and the founding entry in [DRIFT.md](DRIFT.md). Client work
returns only on a new ruling, never on a head's judgement.

**Authorship.** Everything below is the site head's proposal and the site head's to answer for:
the 3D oak and the canopy-to-roots descent, the travelling acorn, the render register, the
palette application, the type pairing, the editorial split, and the six rules. Challenge any of
it as mine.

## The world

**The site IS an oak at dusk, etched in the studio's own brass.** _(Fourth rendering of the same
tree. Succession, every step in [DRIFT.md](DRIFT.md): the monochrome engraving — tag
`oak-engraved-v1` — became grown realism on 2026-07-29, became luminous line work on 2026-07-31
— branch `oak-luminous-pr` — became this tonal line work on 2026-08-08 under Schyler's "classy,
high end and refined" ruling, and went botanical the same day under his "nature has very few
straight lines" ruling. The growth morphology has never changed — since the botanical pass,
provably: `tools/skeleton-proof.mjs` hashes the skeleton itself.)_

**Nature curves; human works are straight.** Since the botanical pass the tree carries almost
no straight lines: centrelines are drawn as curves through the grown points, bark grain
spirals and wanders as a coherent field (never per-rail noise — that unbinds the column),
fissures fork and merge, twigs bend, and a leaf is a bowed midrib inside two arced blade
edges. The engineered world — towers, bridge, necklace, survey lines — stays rectilinear on
purpose: the contrast is the design, and it is also literally true of the place. One primitive, the line
segment, from root plate to last twig, with Lake Merritt behind it drawn the same way: the tree
in the ratified brass ramp on an ink sky that warms to one gold band at the horizon.

**Light is scarce, and that is the design.** The tree is drawn — in weight, tone and density —
and is built so it can never cross the bloom threshold. Exactly three things on the page emit:
the sun's core, the Necklace of Lights, and a scatter of windows across the water. When almost
nothing glows, the few things that do read as meaning; the luminous pass proved the converse.

**Autumn is what makes it work.** A real oak turning is already brass, so the drawing and the
ratified palette are the same thing: the turned half of the crown runs the gold ramp, the half
still green (Schyler, 2026-07-29) is a muted sage a step away in tone, and the season reads as
tone moving through one mass rather than two colours fighting.

**The tree is a mighty ancient spreading oak** (reference set 2026-07-29): a short massive bole
that forks low into a candelabra, under a broad mushroom dome markedly wider than the tree is
tall, with low limbs sweeping almost level and a root plate flaring at the foot. Measured
extents: roughly 55 wide over 31 tall above ground. That silhouette is not decoration — an
upright conical tree would read as a poplar and carry none of the age the page is trading on.

The one-line test: *you are inside the tree, and the tree is an engraving.*

One rule keeps it honest and makes it affordable: **it is grown, not bought.** No model file, no
textures, no purchased assets — every polygon comes from code and one fixed seed, so detail costs
CPU at load rather than bytes over the wire, and the page's claim to have nothing bought in stays
true. No shadow maps and nothing transparent either: alpha-blended foliage is the one thing 2018
iPad silicon cannot afford, so a leaf's shape is its geometry. All bark is one merged mesh; all
45,000 leaves are one instanced draw call; the six jays are three more.

**Three forces shape every step of growth**, and the dome is their consequence rather than a mask
applied over a cone: thin wood reaches for light, heavy wood settles under its own weight, and the
crown envelope turns the outermost growth back and rolls it over. Structural wood below the fork
is exempt — the bole answers to nothing, which is what keeps it a column.

**The canopy is a shell, not a solid.** Twig sprays are emitted only where wood has reached the
crown's skin; the interior stays open so the limb architecture reads through it. This is both
truer to an oak and far cheaper than packing the volume with haze.

## Tokens

Inherited from the studio's ratified set (unchanged, shared with `pricing.html`):

| Token | Value | Role |
|---|---|---|
| `--field` | `#1A1C20` | the ground |
| `--field-deep` | `#131519` | footer, menu, acorn body |
| `--brass` | `#B08D4A` | accent, rules, labels |
| `--brass-lt` | `#E3C57E` | lit brass — figures, current state, primary hover |
| `--brass-dp` | `#8A6C34` | unlit brass — sequence numerals |
| `--paper` | `#FAF7F0` | display ink ON the dark field (never a ground here) |
| `--on-field` | `#C9CCD3` | body copy |
| `--on-field-dim` | `#9AA0A9` | secondary copy (verified ≥4.5:1 on both grounds) |
| `--rule` | `rgba(176,141,74,.26)` | hairlines |

Oak wood ramp (2026-08-08, `assets/palette.js`): `#2A211A` underground → `#45361F` bole shadow →
`#8A6C34` (--brass-dp) → `#B08D4A` (--brass) → `#E3C57E` (--brass-lt) at the outermost twigs —
the tree is drawn in the same metal the site is set in. Girth decides how much light a stroke
carries; nothing on the tree may cross the composer's bloom threshold.

## Type

- **Display — Libre Caslon Display** (OFL 1.1, self-hosted, subset). The engraver's voice: high
  contrast, sharp serifs. Used for anything of value — the nameplate, headings, every figure.
- **Apparatus — Archivo** 400/600 (OFL 1.1, self-hosted, subset). Labels, body, controls.
- **Two utility steps only: 13px** (letterspaced apparatus) **and 15px** (prose). Everything above
  is fluid `clamp()`. Rendered scale is 13→104px (8.0:1) at desktop, 13→38px (2.9:1) at 390.
  Static analysers cannot resolve `clamp()` and will report this as flat; that is a documented,
  measured false positive, not a licence to flatten the scale.
- Fonts are subset to the glyphs the page actually sets (~24 kB for three cuts) and preloaded.
  System stacks render first; text never blocks on a font.

## Composition

- **The editorial split (≥900px):** copy holds the left ~660px, the oak holds the right. The
  camera is shifted along its own right-vector — never the world axis, which shears once the
  camera has rotated. Below 900px the tree centres and the vignette does the separating.
- **One breakpoint family:** 900 (the split), 840 (grids collapse), 560 (phone furniture).
- **Sections are `100svh`** so the descent has room to read as a journey.
- **The acorn** is the only persistent navigation: fixed lower-right, its ring filling with scroll
  depth, opening a menu that names each station. It is a real `<button>` with `aria-expanded`,
  Escape closes it and returns focus, and every target is ≥44px.

## The jays (added 2026-07-29)

Blue jays cross the view as it descends. Two decisions carry them:

- **Everything about them is a function of scroll position, never of time** — position,
  wingbeat phase, bank. Scroll back up and they fly backwards with their wings un-beating, for
  free; a stationary page still renders nothing, so the ledger's idle claim stays literally true;
  and the motion is distance-mapped, which is what §5.2 asks of scrub work. Any future creature
  or motion on this page inherits that rule.
- **Jay blue is the only non-brass colour on the site, and it is earned** — they are blue jays.
  Muted (`#8CAFD2` mantle, `#5E7591` primaries, `#DCE3EA` throat) so it sits with the metal
  rather than shouting over it. This is not licence for a second accent.

Two honest notes. They are drawn at **heroic scale** (2.6–3.6×) and placed 26–54 units
down-range (Schyler correction 2026-07-31 — "way too close" — ended the close-to-lens era): a
real jay against a 20m oak is a speck, and a speck cannot flap in slow motion where anyone can
see it. Scale does that work now, stated here rather than pretended. Since the luminous rebuild
the whole flock is one instanced batch — one draw call — outlines only, held under the bloom
threshold like everything else that is drawn rather than lit.

## Rules this surface commits to

1. **The static page is the design.** WebGL layers over a complete, readable page after LCP, and
   only if reduced-motion is off, save-data is off, and a context is granted. Any failure and the
   static engraving simply stays. No spinner, no blank, ever.
2. **Render only on change.** No idle rAF. Verified: 0 frames over 2.5s idle, wakes on scroll.
   Any future motion work must preserve this — the page says so out loud in the ledger.
7. **The tree is cut across frames, never in one block.** Building 115k segments in a single
   task measured 957ms on a 4×-throttled CPU — a full second of freeze on the reference iPad.
   The generator is a queue the renderer drains in 6ms slices. Any future geometry work inherits
   this rule: if it can't be sliced, it's too big.
3. **The ledger measures this load, on this device.** Seeded values are real (149,674 lines,
   24 kB of type, re-synced at the botanical pass 2026-08-08) and labelled as a reference run
   until the live read replaces them. Never print
   a measured-looking number that wasn't measured. **When the tree's morphology changes, the
   seeded figure must be re-synced** — it is the number a visitor with JavaScript off is shown.
4. **Numbers come from `merritt-studio/pricing.json`.** Nothing on this page is a price we made up.
5. **Cursor flourishes are ornament, never affordance.** Pointer-fine only, reduced-motion off,
   bounded parallax (≤ a few world units). Nothing is reachable only by hovering.
6. **Vendored, never CDN.** three.js (MIT) and both faces (OFL) are committed with their licences.

## Evidence practice (from 2026-07-30)

Every WebGL capture for this tenant goes through `tools/gpu-evidence.cjs`, which runs on
merritt-studio's `lib/gpu-stage.cjs` and **asserts the renderer** — a run either produces
`D3D12 (NVIDIA T1000)` frames or throws with the actual renderer string. Captures made before
this date were software-rendered or static-fallback and have been replaced.

- `node tools/gpu-evidence.cjs` — three viewports × six beats into `library/evidence/`, plus
  `RENDERER.txt` recording the asserted renderer, the ledger and the width-law numbers.
- `node tools/gpu-evidence.cjs --fps` — **relative only.** A WSL→d3d12→ANGLE figure is valid
  as before/after on this box and is never an acceptance number. A human on the real device is
  the acceptance path.
- Headful-under-Xvfb is the only route to the GPU here; headless can never reach it. Do not
  hand-roll flags — see `merritt-studio/docs/GPU-WEBGL.md`.

Two things measurement caught that the eye had signed off on: the shoreline was rendering at
0.12 albedo (near-black under any light) and the "half green" foliage measured **0% green** on
screen because instance tint multiplies the colour map, so a green tint over a gold map is
olive-brown. Both were invisible to me until sampled.

## Payload budget

207 kB over the wire (§5.5 allows 300): three.js 164 · fonts 23 · page 11 · oak 8. If a future
change pushes past 300 kB, the answer is a smaller engine, not a bigger budget. Note the tree
itself costs nothing to ship — it is generated from a 7.6 kB module and a fixed seed, so detail
is bought in CPU at load, not in bytes over the wire.

## What this surface deliberately refuses

Client thumbnails, logos, screenshots and named case studies of any kind — out of scope under the
2026-07-29 ruling, not a matter of taste. Also: capability card-decks, tracked uppercase eyebrows
over every section, gradient text, and any claim the visitor cannot check from the page itself.
