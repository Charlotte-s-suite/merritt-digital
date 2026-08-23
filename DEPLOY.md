# DEPLOY.md — how this site actually goes live

_Written 2026-08-23 (task `bf1198`). Read before assuming anything about publishing._

## ⚠ Merging a PR does NOT update merritt-digital.com

The Cloudflare **Pages** project `merritt-digital` is **direct-upload**: it has **no git
connection** (`source repo = None`, `production_branch = None`). Merging to `main` updates GitHub
and **nothing else**. There is no build hook, no CI, no webhook.

Proof of the trap: PR #5 (pricing) and PR #6 (copy) both merged on 2026-08-18, and the production
deployment stayed at `2026-08-18T02:36Z` — earlier than both. The live homepage kept serving the
**retired price ladder** ($149 / $249 / Care / Signature / Nothing down) for days after the repo
had been corrected, while `charlotte-s-suite.github.io/merritt-digital` — a *different* surface —
showed the new content and made everything look fine.

**Diagnostic that settles it in one line:** a stale page with `cf-cache-status: DYNAMIC` and
`cache-control: max-age=0` is **not** a caching problem — it is the origin serving old files.
Don't purge; deploy.

```
project:  merritt-digital        (Cloudflare Pages, DIRECT UPLOAD)
domains:  merritt-digital.com, www.merritt-digital.com, merritt-digital.pages.dev
account:  MD_CF_ACCOUNT   token: MD_CF_TOKEN    (~/.config/shmorganism/secrets.env)
```

## To publish

```sh
set -a; . ~/.config/shmorganism/secrets.env; set +a
export CLOUDFLARE_API_TOKEN="$MD_CF_TOKEN" CLOUDFLARE_ACCOUNT_ID="$MD_CF_ACCOUNT"

rm -rf /tmp/md/site && mkdir -p /tmp/md/site
git archive HEAD | tar -x -C /tmp/md/site        # never ship .git
npx --yes wrangler@latest pages deploy /tmp/md/site --project-name merritt-digital
```

Add `--branch preview` to publish to a preview URL **without touching the live domain** — use that
whenever the change has not been signed off.

⚠ **Schyler calls this deploy, always.** As of 2026-08-23 he is deliberately holding it while the
site is revamped: *"we'll deploy live once we feel good about it."* Do not publish to production
on your own initiative.

## The durable fix (needs Schyler's hand, once)

Connect the Pages project to `Charlotte-s-suite/merritt-digital` in the Cloudflare dashboard
(Workers & Pages → merritt-digital → Settings → Builds & deployments → Connect to Git). That
requires a GitHub OAuth grant, which cannot be done from an API token — so it is his click, not
something a head can automate. After that, merging really would publish and this whole file
becomes one sentence.

## Verify after publishing — on the real domain

An HTTP `200` proves bytes exist, not that they are current. Compare content:

```sh
curl -s https://merritt-digital.com/ | grep -c 'Signature\|\$249'   # retired ladder → must be 0
curl -sL https://merritt-digital.com/pricing | grep -o 'starting from'
```

Related: the cafe tenant has the *same class* of trap with a different mechanism — it publishes via
a Cloudflare **Worker**, not Pages. See `oudkempeneet-cafe-pitch/DEPLOY.md`. **No two Merritt sites
publish the same way; never carry an assumption between them.**
