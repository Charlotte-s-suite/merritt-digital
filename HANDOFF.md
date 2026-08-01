# HANDOFF — merritt-digital site head

_Written 2026-07-30 ahead of a context refresh. If you are picking this up cold, read this file
and `DRIFT.md` first; everything else is derivable from the code. Nothing here duplicates the
laws (`merritt-studio/kit/DESIGN-STANDARD.md`) or the brief (`BRIEF.md`)._

## 1. Where the work is

| Ref | Contents | Status |
|---|---|---|
| `origin/main` @ `284c8f0` | PR #1 squashed: the **narrow, leafless line-engraved** oak, 7,735 segments | **live** on Pages, three revisions behind |
| `oak-scroll` @ `1b050d1` | mighty spreading engraved oak (115k segments) + line-drawn jays | pushed, unmerged, superseded |
| tag `oak-engraved-v1` @ `d458fe9` | the engraved oak Schyler approved ("loads very smoothly") | preserved on his instruction |
| `oak-grown` @ `bcf614e` | the photoreal attempt: skinned oak, PBR, shadows, IBL, procedural textures | superseded 2026-07-31, never merged, no PR |
| **`oak-luminous`** | **current work.** The whole scene redrawn in luminous LINES — see §8 | unmerged, no PR open yet |
| `showcase-specimen-drawer` @ `70b302e` | client specimen plates | **out of scope permanently** (capability-only ruling); kept only for the mounted-plate grammar |

Local `main` is stale at `b2bc543` — fetch before comparing. PR #1 is **MERGED**; there is no open
PR. `oak-grown` is ~30 files / +1,748 lines ahead of main and needs a PR when the gate is ready.

## 2. The ruling stack (all dated; attribution rules apply — see §7)

1. **Capability only** (Schyler 2026-07-29 via console lead). The site NEVER names clients: no
   logos, screenshots, links or named case studies. `BRIEF.md` job 1 amended in place.
2. **Payload ceiling waived** (Schyler 2026-07-29). §5.5's 300 kB no longer binds; freely-licensed
   source imagery is permitted. **Deliberately unspent** — every texture is still generated in a
   canvas at load, so the page still ships zero image bytes at ~225 kB.
3. **The ending changed** (Schyler 2026-07-29). The descent no longer zooms into the roots: the
   camera falls the trunk, **bounces off the ground**, and pulls out to reveal the lake, downtown
   Oakland and the Bay Bridge at golden hour. Palette gold/orange/purple throughout.
4. **Half the leaves green** (same) — a tree half into the browning.
5. **GPU/graph lane is this head's** (Schyler 2026-07-30 via console lead). The studio wrapper and
   doc are shared infra; extensions are mine to build as PRs, not to request.

## 3. Build shape

- `index.html` — the whole page. Direction contract in the opening comment. Sections:
  `#canopy → #branches (the self-audit ledger) → #trunk (method) → #roots (prices) → #vista
  (the reveal's own screen) → footer`. Acorn nav is fixed, its ring fills with scroll depth.
- `assets/oak.js` — growth + the ride. `growOak()` is a **time-sliced queue** (9 ms slices) that
  emits bark tubes and leaf instance matrices into pre-allocated typed arrays. `mountOak()` owns
  the renderer, lights, shadows, IBL, the scroll rig and `opts.station` (a preview seam that pins
  the camera — use it instead of waiting on scroll easing).
- `assets/scene.js` — Lake Merritt: sky dome (also the IBL source), water, the **shoreline**
  (segmented plane, land plateau + beach), soil section, Necklace of Lights, downtown, Bay Bridge.
- `assets/jays.js` — six jays; body/left wing/right wing are three InstancedMeshes, so the whole
  flock is 3 draw calls. Everything is a function of **scroll position, never time** — that is why
  scrolling up flies them backwards for free and why idle costs nothing.
- `assets/textures.js` — every texture, drawn procedurally: bark (+ derived roughness), leaf
  (colour + a separate linear alpha mask), water normals, ground, soil, jay plumage.
- `tools/gpu-evidence.cjs` — renderer-asserted capture + relative fps. See §4.

Current figures: 221,358 triangles · 45,365 leaves · 14 draw calls · ~225 kB wire · zero image bytes.

## 4. The GPU lane (this is the expensive part to rediscover)

**Read `merritt-studio/docs/GPU-WEBGL.md`. Use `merritt-studio/lib/gpu-stage.cjs` (`withGpuPage`).
Never hand-roll flags.** Asserted renderer: `ANGLE (Microsoft Corporation, D3D12 (NVIDIA T1000),
OpenGL 4.6)`.

- Headless can **never** reach the GPU on this box (`/dev/dxg` only, no `/dev/dri`). Headful under
  Xvfb is the only route.
- The load-bearing bits: `GALLIUM_DRIVER=d3d12` (NOT `MESA_LOADER_DRIVER_OVERRIDE`),
  `MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA` (else the Intel iGPU wins), and **no `--use-gl` /
  `--use-angle` overrides** — any override breaks the ANGLE→GLX→d3d12 chain. I burned a lot of
  context concluding "graphics doesn't work" because I passed those overrides.
- Capture/measure: `node tools/gpu-evidence.cjs` (three viewports × six beats + `RENDERER.txt`),
  `node tools/gpu-evidence.cjs --fps` (**relative only**, never an acceptance number).
- **Known wrapper gap, mine to fix upstream:** calling `withGpuPage` once per viewport leaves a
  stale X lock; the next Xvfb fails to bind and, because the socket wait does not assert, Chrome
  launches against a dead display ("Missing X server"). Worked around by using ONE session and
  resizing the viewport. Fix belongs in `gpu-stage.cjs` as a PR to merritt-studio.
- Serve the page for captures with `python3 -m http.server 8477` from the repo root.

## 5. Gotchas already paid for — do not rediscover these

Rendering:
- **`CircleGeometry` is a triangle fan** — one centre vertex and a rim, no interior rings. A
  per-vertex height profile on it is only sampled at centre and edge. Cost me three renders of an
  oak standing in open water. Use a segmented `PlaneGeometry`.
- **`BoxGeometry` is indexed.** Merging raw position arrays without the index reads them as
  triangle soup → spikes. `toNonIndexed()` first.
- **An sRGB texture used as an `alphaMap` gets linearised** (0.60 → 0.32) and silently deletes
  everything under your `alphaTest`. Alpha masks need their own texture with no colour space.
- **`instanceColor` MULTIPLIES the colour map.** A green tint over a gold map is olive-brown —
  "half the leaves green" measured 0% green on screen until the map was neutralised.
- **`vertexColors: true` with no `color` attribute** yields zero and renders black.
- **A texture is albedo.** Ground base `#3B3A2C` × a mid material colour ≈ 0.12 reflectance:
  near-black under any light. Let the map drive the colour.
- **PBR needs an environment map** or the whole scene reads flat and nearly black. IBL is
  generated from our own sky dome via PMREM.
- **The shadow camera must cover every surface that RECEIVES**, not just the caster; outside the
  frustum samples the clamped edge and can read as shadowed.
- **Mirroring a wing by reversing winding also reverses its normals** — one wing lit, one black.
- ACES tone mapping plus a strongly warm key light pushes saturated hues to amber. Deepen the
  hue and ease exposure rather than fighting it.

Harness:
- The camera eases **per frame**, so under software rendering convergence takes minutes. Use
  `opts.station` to pin the camera instead of waiting on scroll.
- Removing page content before scrolling collapses `scrollHeight`, so progress never leaves 0.
- Never compare two screenshots without confirming they came from different code states.

## 6. Open, in the order I would take them

1. **The bird is still stylised, not realistic.** Procedural geometry is good at recursive
   branching and bad at sculpted organic form. With image assets now permitted, a licensed jay
   with proper maps is the honest route — and the page's "nothing bought in" copy becomes false the
   moment that lands, so it changes in the same commit.
2. **Hero text legibility** over the dense canopy at the first beat is marginal.
3. **`main` is three revisions behind** — decide whether the old narrow oak is acceptable live
   while this iterates, or land something sooner.
4. **The `gpu-stage.cjs` robustness PR** (§4).
5. Shore dressing: path planting, distant trees. The lakeside path exists in the ground texture only.
6. Payment / email / contact remain deliberately unbuilt and blocked — see `TODO.md`.

## 8. The luminous-line build (current, 2026-07-31)

Schyler ruled the photoreal route out — *"this looks too much like a 90s video game ... back to
just lines, but with full color, tones and environment hues. Like a vivid tron dreamstate ...
cutting edge but not overly generated."* Full entry and the law departures are in `DRIFT.md`.

**Everything is one primitive: a line segment with a colour at each end.** No surfaces, no shading
model, no shadow map, no textures. §3 above describes the module layout that still holds; what
changed inside it:

- `assets/lines.js` — NEW, the whole drawing engine. Screen-space fat lines (WebGL's native line
  width is 1px everywhere that matters), per-batch perspective weight with a floor AND a ceiling,
  atmospheric fog, and a hand-rolled bloom composer. Vendored three is the core module only —
  there is no `examples/jsm`, so `Line2` and `UnrealBloomPass` do not exist here.
- `assets/palette.js` — NEW. Colour is a FIELD: position and structural role decide hue and heat.
  Five hues, one ramp, two accents. This file is the main defence against the neon-rainbow look.
- `assets/textures.js` — DELETED, orphaned by the rewrite.
- Growth (`growOak`) is morphologically UNCHANGED — same seed, same forces, same tree, third
  different rendering. Keeping growth and rendering separable is what made this a two-day change
  instead of a rebuild.

Figures: 169,298 lines (90,843 of them leaves) · 16 draw calls · zero image bytes. Renderer
asserted `ANGLE (Microsoft Corporation, D3D12 (NVIDIA T1000), OpenGL 4.6)`. Width law ok at
390/834/1280. Slop detector `[]`. Idle cost measured at **0 page-scheduled frames over six
consecutive still seconds**.

### Gotchas paid for in THIS pass

- **A material created after `resize()` never gets the viewport resolution.** `resize()` returns
  early on every later frame, so the flock — built inside `flock()` — kept `uRes = (1,1)` forever,
  and the shader divides by it: every wing segment expanded to the size of the screen. Anything
  built late must be handed the resolution at construction. This one cost the most time and looked
  like a near-plane bug.
- **The sky is a field, not a picture.** Drawn at full value it out-lit the drawing and sat above
  the bloom threshold, so the bloom found the whole sky and the reveal became a gold haze. It runs
  at `uGain` 0.42, below everything that is meant to glow.
- **Perspective line weight needs a CEILING, not just a floor.** At a blanket 4× every twig near
  the lens drew ~3px and the canopy read as a pile of straws.
- **Check where the sun actually IS.** `dot(forward, SUN_DIR)` put it 58° off-axis — outside a
  28.7° half-frame — while the gold in shot was only the horizon band. Compute the bearing; do not
  infer it from a glow.
- **A glitter road is a reflection**, so it depends on the viewer's position, not the world origin.
- **Full hoops around a cage of parallel rails read as a transmission pylon.** Broken arcs plus
  rails that wander read as bark.
- **A decorative layer must never widen the document.** A hero scrim inset past its container's
  edges added 241px of invisible box and failed the width law at all three viewports.

## 7. Process, non-negotiable

- **Never self-merge.** Branch → PR → console-lead gate; merritt-warden for Article-3 (payment).
- **GitHub ops go through `gh-fleet`**, not `gh` (the default token is `hydra-bot-fleet[bot]`,
  which is not installed on the org). Standing limit: **create / comment / view only — never
  `gh-fleet pr merge`.** Merges belong to the gate.
- **No decision is attributed to Schyler without a quotable handle.** This came out of a real
  bounce: I attributed a redirect to him that could not be verified, and "brief-pinned" was wrong
  on its own terms because `BRIEF.md` pinned no form. If there is no handle, it is the head's own
  proposal and the head is accountable for it.
- Every WebGL claim ships with a renderer-asserted capture. fps figures are relative-only; a human
  on the real device is the acceptance path.
