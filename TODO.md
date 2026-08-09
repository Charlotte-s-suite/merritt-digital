# TODO — Merritt Digital public site

> **State, branch topology and the paid-for gotchas live in [HANDOFF.md](HANDOFF.md).** Read that
> first if you are picking this up cold; this file is only the task list.

_The site head's running list. Newest direction at the top; blocked items keep their reason._

## Blocked — waiting on plugins (direct instruction, 2026-07-28; see DRIFT.md)

These are deliberately deferred, not forgotten. Nothing here gets built until the plugins land.

- [ ] **Payment portal.** Article-3 hard gate: merritt-warden reviews every payment merge, no
      self-merge, propose processor + architecture to the console lead before any payment code.
      Standing proposal (unruled): Stripe, hosted-only — Payment Links + Billing + Customer
      Portal + Invoicing, zero payment code and zero secrets in this repo, PCI SAQ-A.
- [x] **Email / contact capture.** ~~No form on the site until there's something real behind
      it.~~ **Done 2026-08-05:** `apply.html` is live, taking real applications against
      `merritt-studio/docs/INTAKE-PUBLIC.md` (PRs #2 and #3). A person reviews every one; the
      page never creates a tenant. It is still UNLINKED from `index.html` and `pricing.html` —
      see Open.
- [ ] **Specific info** — anything factual we can't source yet (studio contact address, real
      client attribution, testimonials). Honesty law: nothing goes on the page until it's true.

## Open

- [ ] **Link `apply.html` from the site.** It has accepted real applications since 2026-08-05 and
      nothing points at it: `pricing.html` still converts to a `mailto:`, and `index.html` has no
      route to it at all. One line each. Held only because it changes a gate-clean page's
      conversion path, which is the console lead's call, not the head's. Suggested order: the
      pricing CTA first, then the acorn menu.
- [ ] **Parked by the gate (PR #1):** replace `schylermcnally@gmail.com` with a studio address.
      Personal Gmail is the wrong signal on a site quoting $6–12k, but the contact address
      resolves with the domain decision, not in a page PR.
- [ ] Carry the self-hosted display faces onto `pricing.html` so both pages share one voice.
      `pricing.html` is currently on the system Iowan stack; it is gate-clean, so this is a
      deliberate, separate, low-risk PR — not a drive-by edit.
- [ ] Decide whether `library/` stays inside the published Pages path.

## Out of scope — will not merge

- **`showcase-specimen-drawer` branch** (commit 70b302e). Three client specimen plates
  (Fort Knox, Oud-Kempen, Toy Safari), gate-clean at three viewports, slop-detector zero.
  **Out of scope permanently under the 2026-07-29 capability-only ruling — not pending consent.**
  It will not merge, and no head should re-open the question; that takes a new Schyler ruling.

  Kept rather than deleted for one reason: the *mounted-plate component grammar* (paper mount,
  hairline mat, hallmark chip row, verifiable-claim footer) is reusable on any surface that
  needs to present an artefact — it just may never present a client's. If the gate would rather
  not have a permanently-unmergeable branch in the repo, say so and I'll delete it; the grammar
  is also described in DESIGN.md terms and could be re-derived from the commit if needed.

## Done

- [x] `pricing.html` — seeded, gate-clean, numbers from `merritt-studio/pricing.json`.
- [x] One-page capability build (`oak-scroll`): the engraved oak, canopy → roots.
