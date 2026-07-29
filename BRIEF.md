# BRIEF — Merritt Digital (the studio's own public site)

_Commissioned by Schyler 2026-07-28: "This is the beginning of the public facing side of Merritt —
another project site build, its own head and engineering studio. This will showcase our work, sell
the product and house the payment portal." This file is the site head's starting point._

> **Amendment 2026-07-29 (Schyler ruling via console lead):** "showcase our work" in the
> commissioning quote above is superseded by **job 1 below — capability only, the site never
> names clients.** The quote is left verbatim because it is a quote; the job is what governs.

- **Business:** Merritt Digital — the studio itself. You are building OUR site; the client is us.
- **Live URL (publishes on push to main):** https://charlotte-s-suite.github.io/merritt-digital/
- **Tenant:** registered in the studio registry; the pr-watch reflex gates your PRs like any tenant.

## The three jobs, in priority order
1. **Demonstrate the capability.** _(Amended 2026-07-29 — Schyler ruling via console lead,
   superseding the original "showcase the work" job.)_ **CAPABILITY ONLY: the site never names
   clients.** No client logos, no client screenshots, no client links, no named case studies.
   The work speaks through what the page itself does — the build IS the evidence, and any claim
   it makes about the studio must be checkable from the page in front of the visitor.
   Client work returns to this site only on a new ruling, never by a head's judgement.
2. **Sell the product.** `pricing.html` is seeded in this repo — baked from the studio's ratified
   `pricing.json` (merritt-studio repo root; THE single source for numbers — never invent or
   restate prices that drift from it). Build the landing that walks: capability → method →
   pricing → ask.
3. **House the payment portal.** ⚠ ARTICLE-3, HARD GATE: every payment surface (checkout, Stripe
   or any processor integration, invoicing, anything that touches money or stores payment state)
   goes through **merritt-warden** before merge — no exceptions, no self-merge, regardless of how
   small the diff looks. Build it LAST, behind the capability build and pricing being real.
   Propose the processor + architecture to the console lead BEFORE writing payment code.

## Design cue (law 6 — this is an own-brand build)
The studio's object is the **proposal/assay grammar we sell with**: brass-on-ink (#B08D4A/#E3C57E
on #1A1C20), paper #FAF7F0, certificate-serif display (Iowan Old Style stack) + system sans.
`pricing.html` in this repo is the seeded reference implementation. Quiet premium, bank-grade
confidence — we must LOOK like what we charge for. No AI tells: run the slop gate
(`npx impeccable@3.3.1 detect <page>`) before every "done"; the studio's PART-IV checklist applies
to us hardest of all.

## Laws (kit/DESIGN-STANDARD.md in merritt-studio — read PART I + IV in full)
- Three-viewport law on every done (390/844 · 834/1112 · 1280/900), recompose don't shrink.
- Single dependency-free file per page for the launch arc; vendored-local only if graduated.
- Honesty laws: every number from pricing.json; provenance line; no fake liveness, no fabricated
  testimonials or logos. Under the 2026-07-29 ruling this is narrower than "only what is real":
  client work is out of scope even when it is real and ours — the page demonstrates, it does not
  cite.
- Normal PR flow: branch → PR → console-lead gate (merritt-warden for Article-3). NEVER merge
  your own PR (standing studio finding — self-merges shipped defects three times in one week).

## Resources
- `pricing.html` — seeded, gate-clean (slop detector + width-law green 2026-07-28).
- `~/shmorganism/workshop/merritt-studio/pricing.json` — ratified numbers, single source.
- `~/shmorganism/workshop/merritt-studio/kit/DESIGN-STANDARD.md` — THE LAWS.
- `library/` — studio artifacts as they accumulate (evidence shots, logos, copy).
