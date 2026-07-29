# TODO — Merritt Digital public site

_The site head's running list. Newest direction at the top; blocked items keep their reason._

## Blocked — waiting on plugins (direct instruction, 2026-07-28; see DRIFT.md)

These are deliberately deferred, not forgotten. Nothing here gets built until the plugins land.

- [ ] **Payment portal.** Article-3 hard gate: merritt-warden reviews every payment merge, no
      self-merge, propose processor + architecture to the console lead before any payment code.
      Standing proposal (unruled): Stripe, hosted-only — Payment Links + Billing + Customer
      Portal + Invoicing, zero payment code and zero secrets in this repo, PCI SAQ-A.
- [ ] **Email / contact capture.** No form on the site until there's something real behind it.
      Today the only contact route is the `mailto:` inherited from `pricing.html`.
- [ ] **Specific info** — anything factual we can't source yet (studio contact address, real
      client attribution, testimonials). Honesty law: nothing goes on the page until it's true.

## Open

- [ ] **Parked by the gate (PR #1):** replace `schylermcnally@gmail.com` with a studio address.
      Personal Gmail is the wrong signal on a site quoting $6–12k, but the contact address
      resolves with the domain decision, not in a page PR.
- [ ] Carry the self-hosted display faces onto `pricing.html` so both pages share one voice.
      `pricing.html` is currently on the system Iowan stack; it is gate-clean, so this is a
      deliberate, separate, low-risk PR — not a drive-by edit.
- [ ] Decide whether `library/` stays inside the published Pages path.

## Banked — built, not merged

- **`showcase-specimen-drawer` branch** (commit 70b302e). The client showcase: three specimen
  plates (Fort Knox, Oud-Kempen, Toy Safari), gate-clean at three viewports, slop-detector
  zero. Superseded 2026-07-28 by the redirect to a capability demonstration (instruction quoted in DRIFT.md) —
  **held, not deleted**. It becomes mergeable the day clients sign off on being shown, and the
  plate grammar is reusable as-is.

## Done

- [x] `pricing.html` — seeded, gate-clean, numbers from `merritt-studio/pricing.json`.
- [x] One-page capability build (`oak-scroll`): the engraved oak, canopy → roots.
