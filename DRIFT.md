# DRIFT.md — law departures on this tenant

_Merritt Digital is the studio's own site, so it keeps its own ledger. Every departure from
`kit/DESIGN-STANDARD.md` gets a dated entry here with honest reasoning and the condition that
would reverse it. Silence is the failure mode this file exists to prevent: a departure nobody
wrote down becomes a house style by accident._

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

**Cost accounted.** 164 kB of the page's 204 kB over the wire. §5.5 ceiling is 300 kB.

**What reverses it.** Either the studio graduates this site to Signature production (making the
amendment cover it outright), or the scene gets simple enough for hand-written WebGL, at which
point the dependency should go. If a future change pushes past 300 kB the answer is a smaller
engine, not a bigger budget.

---

## 2026-07-28 · Self-hosted webfonts (law 3)

**The law.** Law 3: "no webfont requests (system serif/sans stacks)."

**The departure.** Three subset `.woff2` faces served from this origin: Libre Caslon Display
(display) and Archivo 400/600 (apparatus), both OFL 1.1, licences committed beside them.

**Reasoning.** The instruction driving this build asked for "rich fonts" (quoted in full below).
The law's target is the third-party font *network* — the request to a CDN, the tracking, the
render-blocking round trip. Self-hosted, subset and preloaded, none of that applies: 24 kB total
for three cuts, same-origin, and the system stack still paints first so text never blocks. This
is a departure from the letter and, I'd argue, a service to the intent — but it is a departure,
so it is written down rather than assumed.

**Cost accounted.** 24 kB of 204 kB.

**What reverses it.** A ruling that system stacks are the floor for non-graduated tenants, in
which case `--display`/`--sans` fall back to the Iowan/system stacks already declared in the
token block and nothing else changes.

---

## Provenance of the instruction behind both

Recorded verbatim because the gate is right that attribution needs a handle, and because both
departures above trace to it. Received by this head on 2026-07-28, on the direct user channel
of session `01KtzbTZhabE3iKQMR6qurpp`, in the turn immediately following my report on PR for
`showcase-specimen-drawer`:

> "This site will not showcase the sites we've built just yet but rather demonstrate our web dev
> capabilities with rich fonts, curser tracking flourishes and a huge beautifully rendered 3d oak
> tree the rotates and zooms in from the canopy to the roots as you scroll down the page the whole
> site will be one long page but a golden acorn menu button will travel with you through the
> scroll and open up to a menu that smoothly carries you to any part of the scroll as the
> background 3d tree environment tracks beautifully as well. Make sense? As for the payment,
> email and specific info, we're waiting on those plugins to be available so bank that to our
> to-do list"

**What I can verify:** the message exists on this head's direct input channel at that position.
Unlike every console-lead message this session (the brief, the PR-permission answer, the PR #1
gate verdict), it carried no `📋 merritt console lead` marker.

**What I cannot verify:** the sender's identity beyond the channel. The console lead reports no
matching entry in the relay log. Until that is reconciled, this file attributes the instruction
to the channel, not to a named person, and the console lead holds the adjudication.

**What is mine, not his:** the render register (brass line-engraving over sculptural or
naturalistic), keeping `pricing.html` as the rate sheet with a roots beat on the page, and the
engraved-serif type register. I proposed all three as options with a recommendation; the choice
came back from the same channel. The *argument* for each is mine and should be challenged as mine.
