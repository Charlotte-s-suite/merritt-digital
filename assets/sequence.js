/* ─────────────────────────────────────────────────────────────────────────────
   THE LAKEVIEW SEQUENCE — a scroll-indexed frame sequence on canvas

   One continuous pull-back: an oak leaf, up through the limbs, the whole tree on
   the shore, Lake Merritt, downtown, and finally the bay with the Bay Bridge.
   Scrolling down zooms out from one leaf to the whole city — which is the same
   move the copy makes, from one small business to the city it belongs to.

   ── Why frames on a canvas, and NOT a scrubbed <video> ─────────────────────
   Console lead ruling, 2026-08-18, and it holds for a platform reason rather
   than a device-speed one: iOS Safari snaps `currentTime` seeks to keyframes.
   That is a property of every iPhone and iPad in the audience, not of slow
   hardware, so no amount of budget buys past it. Scroll-scrubbing video is also
   unreliable across browsers generally, and reversing on scroll-up — which is
   required here — is the worst case for seeking while being free with indexed
   frames: you simply count down instead of up.

   ── The critical path is the design, not an afterthought ───────────────────
   The audience is a shop or a garage on a mid-tier phone on cellular, first
   visit, no patience. So:
     · the poster is a plain <img> IN THE MARKUP. It is the LCP element, it
       needs no JavaScript, and the page is readable and scrollable before a
       single sequence frame exists.
     · nothing here starts loading until the page has loaded and gone idle.
     · frames arrive in COARSE-TO-FINE passes (stride 8, then 4, 2, 1). After
       the first pass the whole arc is scrubbable at low granularity; later
       passes only refine it. Loading 1→N in order would instead leave the end
       of the arc broken for the entire download.
     · if the network dies mid-way the page stays correct — whatever arrived is
       used, and the poster covers the rest.
   Frames are held as <img>, deliberately not ImageBitmap: bitmaps pin decoded
   RGBA (81 × 800×563 × 4B ≈ 146 MB) which is exactly how you kill a mid-tier
   Android. The browser can evict an <img> decode; it cannot evict a bitmap.
   ───────────────────────────────────────────────────────────────────────────── */

/* ONE sequence, every viewport: the complete 1280x720 frame, all 241 of them,
   nothing cropped and nothing down-ressed. There are no tiers left, because
   tiers only ever existed to serve a byte ceiling that has since been withdrawn
   as never having been asked for. Two earlier mistakes are buried here and
   worth not repeating: cropping per viewport threw away 20% of the width on
   desktop and ~74% on a phone, and a second tier at 854x480 was down-ressing by
   another name. Both are gone. */
/* ── the only knobs ────────────────────────────────────────────────────────
   Swapping in a different frame set is a two-line edit here and nothing else.
   COUNT is read from this constant everywhere; nothing downstream hardcodes it,
   so a 601-frame 60fps set drops in by changing the number and the folder. */
const SEQ = { dir: 'v2', count: 598, ext: 'webp' };

const pad = (n) => String(n).padStart(SEQ.count > 999 ? 4 : 3, '0');
/* `t` is passed in deliberately: this lives at module scope, and reading the
   mountSequence-local `tier` from here is exactly the bug that shipped a black
   canvas — it parses fine and throws only at runtime. */
const src = (t, i) => `assets/seq/${t.dir}/${pad(i + 1)}.${t.ext}`;

export function mountSequence(canvas, poster, opts = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let tier = null, frames = [], loaded = 0;
  let W = 0, H = 0, dpr = 1, running = true, raf = 0, disposed = false;

  /* ONE set, every viewport, at the source's native 1620x1080 — no downscaled
     tier, because a downscaled tier IS downscaling. It is sized to fill the
     screen at draw time instead (cover), which costs no resolution anywhere. */
  const pick = () => SEQ;


  /* Nearest ALREADY-LOADED frame. This is what lets a half-downloaded sequence
     be useful instead of broken: we never wait, we draw the closest thing we
     have and let later passes sharpen it. */
  function nearest(i) {
    if (frames[i] && frames[i].ok) return frames[i];
    for (let d = 1; d < frames.length; d++) {
      const a = frames[i - d], b = frames[i + d];
      if (a && a.ok) return a;
      if (b && b.ok) return b;
    }
    return null;
  }

  function paint(f, alpha) {
    /* COVER: fill the screen edge to edge, crop the overflow, no letterbox.
       Schyler has now seen both and chose full-bleed (2026-08-19). */
    const cw = canvas.width, ch = canvas.height;
    const sc = Math.max(cw / f.el.naturalWidth, ch / f.el.naturalHeight);
    const w = f.el.naturalWidth * sc, h = f.el.naturalHeight * sc;
    ctx.globalAlpha = alpha;
    ctx.drawImage(f.el, (cw - w) / 2, (ch - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }

  function progress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  }

  /* ── the seamless scrub ─────────────────────────────────────────────────
     Two things make this read as continuous motion rather than steps:

     1. EASING. A wheel click jumps ~100px of scroll at once; mapped directly
        that snaps several frames in a single paint. Instead a continuous frame
        position `cur` glides toward the scroll target across rAF frames, so a
        wheel click becomes a short dolly move through the intermediate frames.
        (The drawn oak always did this; dropping it in the rewrite was my
        mistake and most of the perceived chop.)

     2. BLENDING. `cur` is fractional, and the two adjacent frames are drawn
        weighted by the fraction. At a 60fps source the neighbours are nearly
        identical, so the blend is indistinguishable from true in-between
        motion — the scrub is continuous, not quantised to 598 steps.

     Still renders only while something is changing: at rest `cur === target`
     and nothing is scheduled, so the idle cost stays zero. */
  let cur = -1, paints = 0;
  function tick() {
    raf = 0;
    if (!running || disposed) return;
    resize();
    const target = still ? 0 : progress() * (tier.count - 1);
    if (cur < 0) cur = target;             // first paint: land, don't glide from 0
    /* VELOCITY-CAPPED CHASE (Schyler, 2026-08-19): never skip a frame. The old
       proportional ease closed 22% of the gap per tick, so a hard flick painted
       positions 10-30 frames apart — visible skipping. Now the film may advance
       AT MOST ONE frame per painted tick: every frame is played, in order, at
       the display's own rate, and the scroll target simply waits for the film
       to catch up. The proportional term takes over inside the last ~4 frames
       so arrival is an easing, not a wall. A full-page jump therefore plays
       through honestly (~10s for the whole film at 60Hz, half that on a 120Hz
       display) — that is the ruling, chosen over teleporting. */
    const d = target - cur;
    if (Math.abs(d) < 0.04) cur = target;
    else cur += Math.sign(d) * Math.min(Math.abs(d) * 0.22, 1);
    const i0 = Math.max(0, Math.floor(cur));
    const i1 = Math.min(tier.count - 1, i0 + 1);
    const frac = cur - i0;
    const f0 = nearest(i0), f1 = i1 !== i0 ? nearest(i1) : null;
    if (f0) {
      paint(f0, 1);
      if (f1 && f1 !== f0 && frac > 0.01) paint(f1, frac);
      paints++;
    }
    if (cur !== target) schedule();        // keep gliding; settle and stop

    /* Pre-decode ahead of the glide. 598 frames of 1620x1080 is ~4 GB decoded,
       so the browser evicts; a scrub back onto an evicted frame forces a
       synchronous re-decode inside drawImage — a 20-50 ms hitch that reads as
       stutter and never shows in a screenshot. decode() is async and warms the
       cache without blocking the paint. */
    const dir = d >= 0 ? 1 : -1;
    for (let k = 1; k <= 4; k++) {
      const f = frames[i0 + dir * k];
      if (f && f.ok && !f.warm) { f.warm = true; f.el.decode().catch(() => {}).finally(() => { f.warm = false; }); }
    }
  }
  const schedule = () => { if (!raf && running && !disposed) raf = requestAnimationFrame(tick); };

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const d = Math.min(devicePixelRatio || 1, w < 700 ? 1.5 : 2);
    if (w === W && h === H && d === dpr) return false;
    W = w; H = h; dpr = d;
    canvas.width = Math.max(1, Math.floor(w * d));
    canvas.height = Math.max(1, Math.floor(h * d));
    cur = -1;                          // the backing store was cleared; repaint in place
    return true;
  }

  function load(i) {
    if (frames[i] || disposed) return Promise.resolve();
    const el = new Image();
    const rec = { el, ok: false };
    frames[i] = rec;
    el.decoding = 'async';
    return new Promise((res) => {
      el.onload = () => {
        rec.ok = true; loaded++;
        if (cur < 0 || Math.abs(i - cur) < 3) schedule();   // sharper neighbour arrived
        res();
      };
      // a dropped frame is not an error worth surfacing: nearest() covers it
      el.onerror = () => { frames[i] = null; res(); };
      el.src = src(tier, i);
    });
  }

  /* Coarse to fine, four at a time. Concurrency is capped because a phone on
     cellular does worse with 80 parallel requests than with a steady four. */
  async function stream() {
    for (const stride of [8, 4, 2, 1]) {
      const want = [];
      for (let i = 0; i < tier.count; i += stride) if (!frames[i]) want.push(i);
      if (tier.count - 1 >= 0 && !frames[tier.count - 1]) want.push(tier.count - 1);
      for (let k = 0; k < want.length; k += 4) {
        if (disposed) return;
        await Promise.all(want.slice(k, k + 4).map(load));
      }
    }
  }

  function start() {
    tier = pick();
    resize();
    // the poster is already on screen and already decoded; frame 0 matches it
    load(0).then(() => {
      if (disposed) return;
      canvas.classList.add('live');
      if (poster) poster.classList.add('done');
      schedule();
      if (!still) stream();          // reduced motion never downloads the rest
    });
  }

  const onScroll = () => schedule();
  const onResize = () => {
    const t = pick();
    if (t !== tier) { tier = t; frames = []; loaded = 0; cur = -1; if (!still) stream(); }
    schedule();
  };
  const onVis = () => {
    running = !document.hidden;
    if (running) schedule(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVis);

  /* Never before the page is usable. The sequence is decoration over a page
     that must already read, scroll and quote its prices without it. */
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2500 });
  else setTimeout(start, 600);

  return {
    get frames() { return tier ? tier.count : 0; },
    get loaded() { return loaded; },
    get tier() { return tier ? tier.dir : null; },
    get still() { return still; },
    get renders() { return paints; },   // for idle-cost proof: constant at rest
    dispose() {
      disposed = true; running = false;
      if (raf) cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      frames = [];
    },
  };
}
