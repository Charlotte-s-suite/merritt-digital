/* ─────────────────────────────────────────────────────────────────────────────
   THE LAKEVIEW SEQUENCE — a scroll-indexed frame film on canvas

   One continuous pull-back over Lake Merritt, served as still frames and
   indexed by scroll. Scroll down and the camera pulls out from the oak to the
   whole city; scroll up and it flies back in, frame-perfect, because reversing
   an indexed sequence is free.

   ── Why frames on a canvas, and NOT a scrubbed <video> ─────────────────────
   iOS Safari snaps currentTime seeks to keyframes — a platform property, not a
   device-speed one — and scroll-scrubbing video is unreliable across browsers
   generally. Frames sidestep all of it, and there is no audio by construction.

   ── The player model (arrived at by measurement, 2026-08-19) ───────────────
   This is architected like a tiny video player, because every simpler design
   measured too slow:

     · frames arrive as BLOBS (fetch), coarse-to-fine (stride 8→4→2→1), so the
       whole arc is scrubbable early and only sharpens. The page never waits:
       the poster is a plain image element in the markup and is the LCP.
     · a bounded RING of ImageBitmaps around the playhead is the only decoded
       state. createImageBitmap(blob) decodes OFF the main thread; bitmaps
       paint as pure GPU blits; the ring is trimmed as the playhead moves.
       Why not <img> paints: the browser evicts <img> decodes (~7 MB/frame),
       so painting a fresh frame re-decoded synchronously inside drawImage —
       measured as a chase capped at 9–14 renders/s even on GPU raster.
       decode() cannot fix that (it warms a cache we do not own), and
       createImageBitmap(<img>) decodes on-main. Blob is the off-main path.
       Why not ALL frames as bitmaps: ~4 GB decoded. The ring is the budget.
     · the scrub NEVER SKIPS A FRAME (Schyler ruling, 2026-08-19): the playhead
       advances at most one frame per painted tick — a hard flick plays the
       film through at the display's own rate and the scroll waits for it. The
       proportional term only shapes the last few frames so arrival eases in.
       Adjacent frames blend by the fractional position, so the scrub axis is
       continuous, not quantised to the frame count.

   At rest nothing is scheduled and nothing renders: the idle cost is zero,
   which is the claim the page's ledger makes out loud.

   ONE sequence serves every viewport — the complete frame, nothing cropped at
   encode, nothing down-ressed (tiers only ever served a byte ceiling that was
   withdrawn as never asked for). Sized to fill the screen at draw time.
   ───────────────────────────────────────────────────────────────────────────── */

/* ── the only knobs ──────────────────────────────────────────────────────────
   Swapping in a different frame set is this constant and nothing else.
   Filename padding widens automatically past 999 frames.

   `step` is the chase ceiling in frames per painted tick. The v3 set is the
   60fps source motion-interpolated to 120fps (1,193 frames), and Schyler chose
   step 2 for it (2026-08-19, "3rd option"): the same catch-up time as the
   598-frame set with visibly finer motion. At step 2 every frame still lands
   in a blend — odd frames show at partial weight rather than never — which he
   accepted as honouring the intent of never-skip, by explicit choice. */
const SEQ = { dir: 'v3', count: 1193, ext: 'webp', step: 2 };

const pad = (n) => String(n).padStart(SEQ.count > 999 ? 4 : 3, '0');
const src = (i) => `assets/seq/${SEQ.dir}/${pad(i + 1)}.${SEQ.ext}`;

export function mountSequence(canvas, poster, opts = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let frames = [];                     // index -> { blob } once fetched
  let loaded = 0, paints = 0;
  let cur = -1, running = true, raf = 0, disposed = false;
  let W = 0, H = 0, dpr = 1;

  /* ── the bitmap ring ──
     Bitmaps are created in a WORKER and transferred back. Creating them on the
     main thread cost ~17ms a tick and halved the chase to 30 renders/s even on
     GPU raster with fill-rate ruled out (measured at DPR 1: identical rate).
     The worker owns decode AND bitmap creation; the main thread only receives
     transferred handles and blits. */
  const ring = new Map();              // index -> ImageBitmap
  const making = new Set();
  const RING_CAP = () => (innerWidth < 700 ? 12 : 22);
  const worker = new Worker(URL.createObjectURL(new Blob([
    'onmessage=async(e)=>{const{i,blob}=e.data;' +
    'try{const bm=await createImageBitmap(blob);postMessage({i,bm},[bm]);}' +
    'catch(err){postMessage({i});}}'
  ], { type: 'text/javascript' })));
  worker.onmessage = (e) => {
    const { i, bm } = e.data;
    making.delete(i);
    if (!bm) return;
    if (disposed) { bm.close(); return; }
    ring.set(i, bm);
    if (Math.abs(i - cur) <= 1) schedule();          // the playhead was waiting
  };

  function ensureBitmap(i) {
    if (i < 0 || i >= SEQ.count || ring.has(i) || making.has(i) || making.size >= 6) return;
    const f = frames[i];
    if (!f || !f.blob) return;
    making.add(i);
    worker.postMessage({ i, blob: f.blob });
  }

  function trimRing() {
    while (ring.size > RING_CAP()) {
      let worst = -1, dist = -1;
      for (const k of ring.keys()) {
        const dd = Math.abs(k - cur);
        if (dd > dist) { dist = dd; worst = k; }
      }
      ring.get(worst).close();
      ring.delete(worst);
    }
  }

  /* Nearest decoded frame: a half-filled ring shows the closest thing it has
     rather than nothing, and sharpens as the exact bitmap lands. */
  function nearestBitmap(i) {
    if (ring.has(i)) return ring.get(i);
    let best = null, dist = Infinity;
    for (const k of ring.keys()) {
      const dd = Math.abs(k - i);
      if (dd < dist) { dist = dd; best = k; }
    }
    return best === null ? null : ring.get(best);
  }

  function paintSrc(img, alpha) {
    // COVER: fill the screen edge to edge, crop the overflow (Schyler, 2026-08-19)
    const iw = img.width, ih = img.height;
    const cw = canvas.width, ch = canvas.height;
    const sc = Math.max(cw / iw, ch / ih);
    const w = iw * sc, h = ih * sc;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }

  function progress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  }

  function tick() {
    raf = 0;
    if (!running || disposed) return;
    resize();
    const target = still ? 0 : progress() * (SEQ.count - 1);
    if (cur < 0) cur = target;               // first paint lands, never glides from 0

    /* VELOCITY-CAPPED CHASE: never skip a frame. At most one frame advances per
       painted tick; the proportional term shapes only the last few frames so
       arrival is an easing, not a wall. */
    const d = target - cur;
    if (Math.abs(d) < 0.04) cur = target;
    else cur += Math.sign(d) * Math.min(Math.abs(d) * 0.22, SEQ.step);

    const i0 = Math.max(0, Math.floor(cur));
    const i1 = Math.min(SEQ.count - 1, i0 + 1);
    const frac = cur - i0;

    const b0 = nearestBitmap(i0);
    if (b0) {
      paintSrc(b0, 1);
      const b1 = i1 !== i0 && frac > 0.01 ? ring.get(i1) : null;
      if (b1 && b1 !== b0) paintSrc(b1, frac);
      paints++;
    }

    // feed the ring ahead of travel, keep both neighbours for a reversal
    const dir = d >= 0 ? 1 : -1;
    ensureBitmap(i0); ensureBitmap(i1);
    for (let k = 1; k <= 14; k++) ensureBitmap(i0 + dir * k);
    ensureBitmap(i0 - dir); ensureBitmap(i0 - dir * 2);
    trimRing();

    if (cur !== target || !b0) schedule();   // glide on, or wait for the first bitmap
  }
  const schedule = () => { if (!raf && running && !disposed) raf = requestAnimationFrame(tick); };

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const d2 = Math.min(devicePixelRatio || 1, w < 700 ? 1.5 : 2);
    if (w === W && h === H && d2 === dpr) return false;
    W = w; H = h; dpr = d2;
    canvas.width = Math.max(1, Math.floor(w * d2));
    canvas.height = Math.max(1, Math.floor(h * d2));
    cur = -1;                            // backing store cleared: land in place
    return true;
  }

  function load(i) {
    if (frames[i] || disposed) return Promise.resolve();
    frames[i] = { blob: null };          // claimed
    return fetch(src(i)).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.blob();
    }).then((blob) => {
      if (disposed) return;
      frames[i] = { blob };
      loaded++;
      if (Math.abs(i - cur) < 12) { ensureBitmap(i); schedule(); }
    }).catch(() => { frames[i] = undefined; });   // nearest ring entry covers it
  }

  /* Coarse to fine, four at a time: a phone on cellular does worse with 600
     parallel requests than a steady four, and after the first pass the whole
     arc is already scrubbable at low granularity. */
  async function stream() {
    for (const stride of [8, 4, 2, 1]) {
      const want = [];
      for (let i = 0; i < SEQ.count; i += stride) if (!frames[i]) want.push(i);
      if (!frames[SEQ.count - 1]) want.push(SEQ.count - 1);
      for (let k = 0; k < want.length; k += 4) {
        if (disposed) return;
        await Promise.all(want.slice(k, k + 4).map(load));
      }
    }
  }

  function start() {
    resize();
    load(0).then(() => {
      if (disposed) return;
      ensureBitmap(0);
      canvas.classList.add('live');
      if (poster) poster.classList.add('done');
      schedule();
      if (!still) stream();              // reduced motion never downloads the rest
    });
  }

  const onScroll = () => schedule();
  const onResize = () => schedule();
  const onVis = () => {
    running = !document.hidden;
    if (running) schedule(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVis);

  /* Never before the page is usable: the film is decoration over a page that
     already reads, scrolls and quotes its prices without it. */
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2500 });
  else setTimeout(start, 600);

  return {
    get frames() { return SEQ.count; },
    get loaded() { return loaded; },
    get still() { return still; },
    get renders() { return paints; },    // idle-cost proof: constant at rest
    get cur() { return cur; },
    dispose() {
      disposed = true; running = false;
      if (raf) cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      worker.terminate();
      for (const bm of ring.values()) bm.close();
      ring.clear(); frames = [];
    },
  };
}
