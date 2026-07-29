# TODO — Merritt Digital public site

_The site head's running list. Newest direction at the top; blocked items keep their reason._

## Blocked — waiting on plugins (Schyler, 2026-07-28)

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

- [ ] Replace `schylermcnally@gmail.com` with a studio address on every public surface.
      Personal Gmail is the wrong signal on a site quoting $6–12k.
- [ ] Carry the self-hosted display faces onto `pricing.html` so both pages share one voice.
      `pricing.html` is currently on the system Iowan stack; it is gate-clean, so this is a
      deliberate, separate, low-risk PR — not a drive-by edit.
- [ ] Decide whether `library/` stays inside the published Pages path.

## Banked — built, not merged

- **`showcase-specimen-drawer` branch** (commit 70b302e). The client showcase: three specimen
  plates (Fort Knox, Oud-Kempen, Toy Safari), gate-clean at three viewports, slop-detector
  zero. Superseded 2026-07-28 when Schyler redirected the site to a capability demonstration —
  **held, not deleted**. It becomes mergeable the day clients sign off on being shown, and the
  plate grammar is reusable as-is.

## Done

- [x] `pricing.html` — seeded, gate-clean, numbers from `merritt-studio/pricing.json`.
- [x] One-page capability build (`oak-scroll`): the engraved oak, canopy → roots.
