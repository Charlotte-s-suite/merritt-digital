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

/* Two tiers, and they differ ONLY in resolution — not in framing. Every tier is
   the complete 16:9 frame with nothing cropped away, which is why there is no
   art direction left to get wrong. The earlier build cropped per viewport to
   fill the screen edge to edge and threw away 20% of the width on desktop and
   about 74% on a phone; Schyler asked whether he was seeing the full frame, and
   he was not. Now he is. Breakpoints must still match the <picture> media
   queries in index.html. */
const TIERS = [
  { min: 900, dir: 'full', count: 241 },
  { min: 0,   dir: 'half', count: 241 },
];

const src = (t, i) => `assets/seq/${t.dir}/${String(i + 1).padStart(3, '0')}.webp`;

export function mountSequence(canvas, poster, opts = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let tier = null, frames = [], loaded = 0, shown = -1;
  let W = 0, H = 0, dpr = 1, running = true, raf = 0, disposed = false;

  const pick = () => TIERS.find((t) => innerWidth >= t.min) || TIERS[TIERS.length - 1];

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

  function draw(i) {
    const f = nearest(i);
    if (!f) return false;
    /* CONTAIN, not cover. Cover fills the screen but eats the composition, and
       this is a single continuous shot whose whole point is what is in the
       frame — the leaf, then the tree, then the lake, then the bridge. The page
       field fills whatever is left over. */
    const cw = canvas.width, ch = canvas.height;
    const s = Math.min(cw / f.el.naturalWidth, ch / f.el.naturalHeight);
    const w = f.el.naturalWidth * s, h = f.el.naturalHeight * s;
    ctx.fillStyle = '#14171b';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(f.el, (cw - w) / 2, (ch - h) / 2, w, h);
    return true;
  }

  function progress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  }

  function frameAt(p) {
    return Math.min(tier.count - 1, Math.max(0, Math.round(p * (tier.count - 1))));
  }

  /* Render on CHANGE only. There is no easing between frames because frames are
     discrete — easing would just render the same picture repeatedly. Stop
     scrolling and this does nothing at all, which is the claim the ledger makes. */
  function tick() {
    raf = 0;
    if (!running || disposed) return;
    resize();
    const i = still ? 0 : frameAt(progress());
    if (i !== shown) { if (draw(i)) shown = i; }
  }
  const schedule = () => { if (!raf && running && !disposed) raf = requestAnimationFrame(tick); };

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const d = Math.min(devicePixelRatio || 1, w < 700 ? 1.5 : 2);
    if (w === W && h === H && d === dpr) return false;
    W = w; H = h; dpr = d;
    canvas.width = Math.max(1, Math.floor(w * d));
    canvas.height = Math.max(1, Math.floor(h * d));
    shown = -1;                       // the backing store was cleared
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
        if (shown < 0 || Math.abs(i - shown) < 3) { shown = -1; schedule(); }
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
    if (t !== tier) { tier = t; frames = []; loaded = 0; shown = -1; if (!still) stream(); }
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
