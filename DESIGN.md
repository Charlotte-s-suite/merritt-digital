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

**The site IS the engraved assay plate, taken into three dimensions.** The studio's object is the
proposal/assay grammar it sells with; here that grammar stops being printed and starts being
turned. One oak, drawn entirely in line, standing in real space, travelled from canopy to roots by
the scroll.

The one-line test: *you are inside the tree, and the tree is an engraving.*

Two rules keep it honest and make it fast, and they are the same rule: **an engraving has no
shading.** No surfaces, no lights, no shadow maps, no textures, no post-processing. Depth comes
from line density and parallax, which is why it also holds 60fps on 2018 silicon.

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

Oak vertex ramp, keyed to the geometry's measured extents (y ∈ [−17, 31]):
`#94743A` roots → `#B08D4A` trunk → `#E3C57E` canopy. Material opacity `0.76` so linework never
out-shouts reading copy.

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

## Rules this surface commits to

1. **The static page is the design.** WebGL layers over a complete, readable page after LCP, and
   only if reduced-motion is off, save-data is off, and a context is granted. Any failure and the
   static engraving simply stays. No spinner, no blank, ever.
2. **Render only on change.** No idle rAF. Verified: 0 frames over 2.5s idle, 22 on one scroll.
   Any future motion work must preserve this — the page says so out loud in the ledger.
3. **The ledger measures this load, on this device.** Seeded values are real (7,735 segments,
   24 kB of type) and labelled as a reference run until the live read replaces them. Never print
   a measured-looking number that wasn't measured.
4. **Numbers come from `merritt-studio/pricing.json`.** Nothing on this page is a price we made up.
5. **Cursor flourishes are ornament, never affordance.** Pointer-fine only, reduced-motion off,
   bounded parallax (≤ a few world units). Nothing is reachable only by hovering.
6. **Vendored, never CDN.** three.js (MIT) and both faces (OFL) are committed with their licences.

## Payload budget

204 kB over the wire (§5.5 allows 300): three.js 164 · fonts 24 · page 11 · oak 5. If a future
change pushes past 300 kB, the answer is a smaller engine, not a bigger budget.

## What this surface deliberately refuses

Client thumbnails, logos, screenshots and named case studies of any kind — out of scope under the
2026-07-29 ruling, not a matter of taste. Also: capability card-decks, tracked uppercase eyebrows
over every section, gradient text, and any claim the visitor cannot check from the page itself.
