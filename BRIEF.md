# BRIEF — Merritt Digital (the studio's own public site)

_Commissioned by Schyler 2026-07-28: "This is the beginning of the public facing side of Merritt —
another project site build, its own head and engineering studio. This will showcase our work, sell
the product and house the payment portal." This file is the site head's starting point._

- **Business:** Merritt Digital — the studio itself. You are building OUR site; the client is us.
- **Live URL (publishes on push to main):** https://charlotte-s-suite.github.io/merritt-digital/
- **Tenant:** registered in the studio registry; the pr-watch reflex gates your PRs like any tenant.

## The three jobs, in priority order
1. **Showcase the work.** The portfolio IS the pitch: toy-safari-demo, fortknox-pitch,
   oudkempeneet-cafe-pitch (all public Pages sites — link the live things, never screenshots
   alone). Frame each with its one-line design story ("the site IS the assay card").
2. **Sell the product.** `pricing.html` is seeded in this repo — baked from the studio's ratified
   `pricing.json` (merritt-studio repo root; THE single source for numbers — never invent or
   restate prices that drift from it). Build the landing that walks: work → method → pricing → ask.
3. **House the payment portal.** ⚠ ARTICLE-3, HARD GATE: every payment surface (checkout, Stripe
   or any processor integration, invoicing, anything that touches money or stores payment state)
   goes through **merritt-warden** before merge — no exceptions, no self-merge, regardless of how
   small the diff looks. Build it LAST, behind the showcase and pricing being real. Propose the
   processor + architecture to the console lead BEFORE writing payment code.

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
  testimonials or logos — we showcase only what is real and ours to show.
- Normal PR flow: branch → PR → console-lead gate (merritt-warden for Article-3). NEVER merge
  your own PR (standing studio finding — self-merges shipped defects three times in one week).

## Resources
- `pricing.html` — seeded, gate-clean (slop detector + width-law green 2026-07-28).
- `~/shmorganism/workshop/merritt-studio/pricing.json` — ratified numbers, single source.
- `~/shmorganism/workshop/merritt-studio/kit/DESIGN-STANDARD.md` — THE LAWS.
- `library/` — studio artifacts as they accumulate (evidence shots, logos, copy).
