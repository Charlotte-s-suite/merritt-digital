# DRIFT.md — scope rulings and law departures on this tenant

_Merritt Digital is the studio's own site, so it keeps its own ledger. Scope rulings and every
departure from `kit/DESIGN-STANDARD.md` get a dated entry here with honest reasoning and the
condition that would reverse them. Silence is the failure mode this file exists to prevent: a
departure nobody wrote down becomes a house style by accident._

---

## 2026-08-08 · The neon is ruled out: the line work goes tonal — brass on ink, light scarce

**The ruling.** Schyler, 2026-08-08, direct: *"I actually don't like the neon lights that much,
it's too busy and drowns everything out, spin up a fable design agent to redesign the whole
sequence and make it more classy, high end and refined."*

**What it changes.** The drawing engine, the growth, the choreography and the module layout are
all untouched; what changed is what gets drawn and how much of it is allowed to shine.

1. **The five-hue field becomes one tonal ramp.** The tree is now drawn in the studio's own
   ratified brass (`#45361F → #8A6C34 → #B08D4A → #E3C57E`); the sky is ink warming to a single
   gold band at the horizon, with the violet of the ruled dusk palette surviving only as a
   heavily greyed memory in the mid band. The electric emerald and the cold cyan are gone —
   the green half of the crown (Schyler 2026-07-29, still standing) is a muted sage, the water
   is pewter, and the waterline is a drawn gilt edge instead of a cyan glow. The jays keep the
   muted steel blue DESIGN.md already ruled earned.
2. **Light is scarce.** The bloom threshold now sits ABOVE everything drawn: the tree, the
   jays, the water and the ground can never bloom, by construction (their peak intensity is
   set under the threshold). Exactly three things emit — the sun's core (halved in size and
   gain), the Necklace of Lights, and a scatter of windows. Bloom strength halved, the
   chromatic dispersion nearly removed.
3. **Density is cut where it was noise.** Roughly four leaf strokes in ten are left un-inked
   (47,993 leaf strokes against 90,843) — thinned by a SECOND rng stream so the shared growth
   stream is untouched and the Schyler-approved silhouette regrows identically. The water
   glitter drops from 13,000 dashes to ~4,300, dim off the sun's road; the ground grid drops
   from a two-axis net to a handful of contour hints; downtown from 46 towers to 30.
4. **Silhouettes are drawn dark and heavy, not glow-lit.** The Bay Bridge and the skyline read
   as etched silhouettes against the gold band. This exposed a real geometry bug the glow had
   hidden: the suspension cable was height-clamped outside the towers and closed the bridge
   into a box; the cable now falls to the deck ends the way a cable hangs.

**Standing §5.5 departures, recalibrated.** The post chain (DRIFT 2026-07-31 entry, item 1)
remains, but its justification narrowed: with the tree below threshold it exists for the three
permitted lights and the final grade only. Blended geometry and the desktop-only MSAA are
unchanged. Total figures: 126,448 lines · 16 draw calls · zero image bytes · renders only on
change.

**What would reverse it.** A new Schyler ruling on the treatment. The luminous pass is intact
on `oak-luminous-pr`; the growth was never touched, so any future rendering starts from the
same tree.

---

## 2026-07-31 · The form changes: luminous LINE work, and the post-processing that requires

**The ruling.** Schyler, 2026-07-31, direct: *"this looks too much like a 90s video game, before we
go full photorealistic, let's try going back to just lines, but with full color, tones and
environment hues. Like a vivid tron dreamstate. We want it to look cutting edge but not overly
generated."* Two corrections in the same exchange: *"The birds are way too close to the camera"*
and, of the ground-contact beat, *"when it hits the floor it passes through for a brief moment,
that looks glitchy and cheap."*

**What it changes.** The scene is now drawn with ONE primitive — a line segment with a colour at
each end — from the root plate to the last twig, with the world drawn the same way. Every surface,
the PBR material set, the shadow map, the image-based lighting and all five procedural textures are
gone; `assets/textures.js` is deleted. Two new modules: `assets/lines.js` (the drawing engine) and
`assets/palette.js` (the hue field).

**Departures from `kit/DESIGN-STANDARD.md` §5.5, which this is the honest record of:**

1. **Post-processing.** §5.5 says no post chains. There is one now: scene → half-float target →
   bright pass → three blur levels → composite with ACES, a lens dispersion on the bloom only, a
   vignette and a static grain. It is not decoration. Luminous line work without HDR bloom is a
   wireframe diagram; the glow is the difference between the brief's "cutting edge" and a 1998
   screensaver. Cost is seven fullscreen passes at half resolution and below.
2. **Blended geometry.** §5.5 says nothing transparent, because alpha-blended foliage is what old
   mobile GPUs choke on. Every line here is blended — but with **depth write ON**, so they are
   sorted opaque strokes with antialiased edges rather than a transparency pile, and they are
   *thin*: the overdraw §5.5 is protecting against is per-pixel fill from full-screen leaf quads,
   which no longer exist.
3. **MSAA**, on desktop only; explicitly off below 700px, where the pixels are half the size and it
   is the single most expensive thing in the frame.

**What has NOT changed.** Still zero image bytes and no model file — the payload waiver above is
still deliberately unspent. Still grown from one fixed seed, still cut across frames, still renders
only on change: measured at **0 page-scheduled animation frames across six consecutive idle
seconds**, with the rig proven alive by a scroll nudge in the same run.

**Also fixed under this ruling.** The jays moved from 2–4 units off the lens to 26–54 units
down-range and became outlines rather than solids. The ground-contact beat no longer passes through
the floor: the camera sat at y=−1.4 while the land beneath it is at about +1.0, so for a moment you
were looking up at the world from underneath it. The station moved above the surface AND the camera
is now clamped every frame against `landHeight()` — the same function the ground is built from, so
the two cannot disagree.

**What would reverse it.** A measured failure on Schyler's iPad Pro (A12X). The bloom chain and the
MSAA switch are the first two things to drop, in that order; the line work itself is cheaper than
the geometry it replaced.

---

## 2026-07-29 · The §5.5 payload ceiling is waived, and image assets are permitted

**The ruling.** Schyler, 2026-07-29: *"I never specified the image cost, I'm fine with using open
source graphics protocols and free images to generate our own textures and I'm not worried at all
about staying under 300kb."*

**What it changes.** §5.5's 300 kB WebGL budget no longer binds this tenant, and freely-licensed
source imagery may be used as material for textures we generate. The two earlier law-3 entries
below (vendored three.js, self-hosted fonts) are covered by this as well.

**What has NOT changed yet, deliberately.** The page still ships **zero image bytes**: every
texture is still drawn procedurally into a canvas at load — bark fissures, the lobed leaf, water
ripple normals, soil strata, jay plumage. The waiver removes a constraint; it does not oblige us to
spend it, and procedural still costs nothing and carries no licence risk. Current wire total is
about 230 kB.

**What to watch if we do spend it.** Any downloaded asset needs its licence recorded here beside
it, and the page's own copy claiming "nothing bought in" has to change the moment that stops being
true. That copy is a claim, not decoration.

---

## 2026-07-29 · The descent no longer ends in the roots

**The ruling.** Schyler, 2026-07-29: the last phase stops zooming into the roots. Instead the
camera keeps rotating, **bounces off the ground**, and pulls right out to reveal the lake, downtown
Oakland and the Bay Bridge silhouetted against a golden-hour sun; the sky and lighting carry that
gold/orange/purple palette through the whole sequence; and roughly half the leaves stay green, a
tree half into the browning.

**What it changes.** Six camera stations instead of four, with explicit scroll placement so the
last two beats can be fast (ground contact at 0.78, rebound at 0.86, the wide reveal at 1.00).
Rotation runs past a full turn and never stops. The soil section stays in the scene but the camera
no longer enters it.

**What reverses it.** A new ruling. The four-station descent is recoverable from `oak-grown` history.

---

## 2026-07-29 · FOUNDING ENTRY — the site is capability-only (scope)

**The ruling.** Schyler, 2026-07-29, direct, relayed through the console lead with the handle
held there: **capability only. The site never names clients; the work speaks through what the
page itself does.**

**What it supersedes.** BRIEF.md job 1 as originally written — "Showcase the work. The portfolio
IS the pitch" — which named toy-safari-demo, fortknox-pitch and oudkempeneet-cafe-pitch as the
things to link. BRIEF.md is amended in place, dated to this ruling, with the commissioning quote
left verbatim beside it because a quote is a quote.

**What it means in practice.** No client logos, no client screenshots, no client links, no named
case studies, on any surface of this site. A page that wants to prove something about the studio
proves it by doing it, in front of the visitor, checkably. Client work returns only on a new
ruling — never on a head's judgement, including mine.

**Consequence already banked.** `showcase-specimen-drawer` (70b302e) — three client specimen
plates, gate-clean — is **out of scope permanently, not pending consent.** It will not merge.
See TODO.md.

**What reverses it.** A new Schyler ruling, carried with a handle. Nothing else.

---

## 2026-07-29 · The engraving is replaced by grown realism (law 6 / DESIGN.md world)

**The change.** The site's visual world was "the engraved assay plate in three dimensions" — an
oak drawn entirely in line, no surfaces, no shading. It is now a grown oak in autumn with real
surfaces and real light. Schyler, 2026-07-29, choosing "grown realism, no textures" from options
put to him with their costs.

**What was preserved, deliberately.** The morphology is untouched — same growth forces, same seed,
same tree he approved. It was re-clothed, not re-grown. The palette is untouched too, because the
oak is in **autumn**: a real oak turning is gold and russet, so realism and the ratified
brass-on-ink palette are the same thing rather than a compromise. That was the site head's call
and it is the reason nothing else on the site had to change.

**What it costs.** No textures, no model files, no purchased assets: every polygon is generated
from code and one fixed number, so the detail costs CPU at load rather than bytes over the wire.
No shadow maps and nothing transparent, because alpha-blended foliage is the one thing 2018 iPad
silicon cannot afford. Leaves are one instanced draw call; all bark is one merged mesh.

**Honest limit on the evidence.** Time-to-tree and main-thread cost are measured (below). GPU cost
is **not**: this machine has no GPU and falls back to a software rasteriser, so any frame-rate
figure it produces is meaningless. That measurement has to come from real hardware.

**What reverses it.** `git checkout oak-engraved-v1` — the line-engraved version is tagged,
gate-clean and complete, and the branch that carries it (`oak-scroll`, PR #1) is untouched by this
work.

---

## 2026-07-28 · Vendored three.js (law 3)

**The law.** Law 3: single dependency-free file per page. The BUSINESS-PLAN M2 amendment
(2026-07-05) permits Signature-tier **production** builds to vendor GSAP and, where warranted,
three.js as local files.

**The departure.** This page vendors `three.module.min.js` (r166, MIT) at `vendor/`. Merritt
Digital's own site is not a graduated Signature production build — it is an own-brand build — so
the amendment does not cleanly cover it. I took the amendment's *intent* (self-contained, fast,
no third-party runtime dependency) rather than its letter.

**Reasoning.** §5.5 sanctions a WebGL hero "only where the object of law 6 is inherently
spatial." A tree the visitor travels down, canopy to roots, is inherently spatial — the whole
surface is that one move. Hand-rolling the WebGL would have saved ~160 kB but put matrix maths
and context handling in scope with no reviewer for it; three.js is named in the kit for exactly
this reason. Licence file rides along at `vendor/three-LICENSE.txt`. No CDN, no build step, no
framework.

**Cost accounted.** 164 kB of the page's 207 kB over the wire. §5.5 ceiling is 300 kB. A second
cost that bytes don't show: parsing 666 kB of minified module measures ~500 ms on a 4×-throttled
CPU. It happens after LCP, on idle, so it never delays first paint — but it is a real one-off
main-thread cost on old silicon and is recorded here rather than left for someone to discover.

**What reverses it.** Either the studio graduates this site to Signature production (making the
amendment cover it outright), or the scene gets simple enough for hand-written WebGL, at which
point the dependency should go. If a future change pushes past 300 kB the answer is a smaller
engine, not a bigger budget.

---

## 2026-07-28 · Self-hosted webfonts (law 3)

**The law.** Law 3: "no webfont requests (system serif/sans stacks)."

**The departure.** Three subset `.woff2` faces served from this origin: Libre Caslon Display
(display) and Archivo 400/600 (apparatus), both OFL 1.1, licences committed beside them.

**Reasoning.** The law's target is the third-party font *network* — the request to a CDN, the
tracking, the render-blocking round trip. Self-hosted, subset and preloaded, none of that
applies: 24 kB total for three cuts, same-origin, and the system stack still paints first so
text never blocks. This is a departure from the letter and, I'd argue, a service to the intent —
but it is a departure, so it is written down rather than assumed.

**Cost accounted.** 23 kB of 207 kB.

**What reverses it.** A ruling that system stacks are the floor for non-graduated tenants, in
which case `--display`/`--sans` fall back to the Iowan/system stacks already declared in the
token block and nothing else changes.

---

## Attribution note (closed 2026-07-29)

The WebGL form of this build — the 3D oak, the one-page descent, the travelling acorn, the
cursor flourishes, the self-hosted display faces — is recorded as **the site head's own
proposal**, and the site head is accountable for it.

An unverified instruction preceded that proposal and is quoted verbatim in the PR #1 review
thread. The console lead searched the relay log and found no matching entry, and has ruled that
it carries no attribution weight. It is referenced here only so the audit trail is complete; it
is **not** authority for anything in this repo, and nothing in this build should be defended on
the grounds that someone asked for it. If the form is wrong, that is mine.

The standing rule this came out of, which binds regardless of how the reconciliation landed:
**no decision is attributed to Schyler without a quotable handle.**
