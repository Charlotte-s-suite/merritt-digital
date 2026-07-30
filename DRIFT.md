# DRIFT.md — scope rulings and law departures on this tenant

_Merritt Digital is the studio's own site, so it keeps its own ledger. Scope rulings and every
departure from `kit/DESIGN-STANDARD.md` get a dated entry here with honest reasoning and the
condition that would reverse them. Silence is the failure mode this file exists to prevent: a
departure nobody wrote down becomes a house style by accident._

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
