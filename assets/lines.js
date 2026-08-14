/* ─────────────────────────────────────────────────────────────────────────────
   LINES — the drawing engine

   The whole page is drawn with one primitive: a line segment with a colour at
   each end. No surfaces, no shading model, no textures. What makes that read as
   depth rather than as a wireframe diagram is entirely in this file:

     · real WEIGHT. WebGL's native line width is one pixel and nothing else on
       every platform that matters, so a segment here is an instanced quad
       expanded in SCREEN space by the vertex shader. Weight becomes a design
       variable — heavy in the bole, a hairline in the twigs.
     · PERSPECTIVE weight. Screen-space expansion holds a constant on-screen
       width, which is exactly wrong for depth. Width is attenuated toward the
       distance so far wood thins out, and fades below a pixel instead of
       aliasing into a dashed mess.
     · ATMOSPHERE. Colour lerps toward the field colour with distance, so the
       far shore dissolves into the sky the way it actually does at dusk.
     · LIGHT. Colours are HDR — the hot ones sit well above 1.0 — rendered into
       a half-float target and bloomed. Glow is a consequence of brightness
       here, not an additive-blend trick pasted on top; that difference is the
       whole distance between 2026 and a 1998 screensaver.

   Near-plane clipping is done in view space before projection. That is not a
   corner case for this page: the opening beat has the camera INSIDE the crown,
   so segments straddle the near plane constantly, and an unclipped one projects
   to garbage that streaks across the whole screen.

   Vendored three has no fat-line or post-processing support (core module only,
   no examples/jsm), so both live here. ~260 lines against ~40 kB of vendored
   passes we would only partly use. See DRIFT.md.
   ───────────────────────────────────────────────────────────────────────────── */

import * as THREE from '../vendor/three.module.min.js';

/* ── the line material ───────────────────────────────────────────────────────
   One material per BATCH, not per line: a batch shares weight scale, fog and
   intensity, and every segment in it is one instance. */

const LINE_VERT = /* glsl */`
  uniform vec2  uRes;        // drawing buffer, device pixels
  uniform float uNear;
  uniform float uMinW;       // hairline floor, device pixels
  uniform float uAtten;      // 0 = constant screen width, 1 = full perspective
  uniform float uRefDist;    // distance at which aWidth is taken literally
  uniform float uWMax;       // ceiling on perspective thickening
  uniform float uIntensity;
  uniform vec3  uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  attribute vec3  aStart;
  attribute vec3  aEnd;
  attribute vec3  aColA;
  attribute vec3  aColB;
  attribute float aWidth;

  varying vec3  vCol;
  varying float vAcross;
  varying float vAlpha;

  void main() {
    vec4 vs = modelViewMatrix * vec4(aStart, 1.0);
    vec4 ve = modelViewMatrix * vec4(aEnd,   1.0);

    /* View-space near-plane clip. The camera looks down -z, so a point is
       BEHIND the near plane when z > -near. Both behind: collapse the quad to a
       point outside the frustum rather than let it project to garbage. */
    float zn = -uNear;
    if (vs.z > zn && ve.z > zn) {
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
      vCol = vec3(0.0); vAcross = 0.0; vAlpha = 0.0;
      return;
    }
    float ta = 0.0, tb = 1.0;
    float dz = ve.z - vs.z;
    if (abs(dz) > 1e-6) {
      if (vs.z > zn) ta = (zn - vs.z) / dz;
      if (ve.z > zn) tb = (zn - vs.z) / dz;
    }
    vec4 a = mix(vs, ve, ta);
    vec4 b = mix(vs, ve, tb);

    vec4 ca = projectionMatrix * a;
    vec4 cb = projectionMatrix * b;

    // screen-space direction, and the normal we expand along
    vec2 sa = (ca.xy / max(ca.w, 1e-6)) * uRes * 0.5;
    vec2 sb = (cb.xy / max(cb.w, 1e-6)) * uRes * 0.5;
    vec2 dir = sb - sa;
    float len = length(dir);
    dir = len > 1e-5 ? dir / len : vec2(1.0, 0.0);
    vec2 nrm = vec2(-dir.y, dir.x);

    float px = position.x;                 // 0..1 along the segment
    vec4 clip = mix(ca, cb, px);
    float depth = -mix(a.z, b.z, px);      // positive view depth

    /* Perspective weight, with a per-batch CEILING. The floor keeps a twig at
       the horizon from disappearing; the ceiling keeps one near the lens from
       becoming a slab. That ceiling is not cosmetic: the opening beat puts the
       camera inside the crown, and at a blanket 4x every twig within a few
       units drew nearly three pixels wide — the canopy stopped reading as
       foliage and started reading as a pile of straws. */
    float w = aWidth * mix(1.0, clamp(uRefDist / max(depth, 0.001), 0.25, uWMax), uAtten);
    /* Below a pixel, keep the LIGHT and give up the width. Letting a line
       narrow past one device pixel is what turns a distant crown into a
       flickering dashed mess under any camera movement. */
    vAlpha = clamp(w / uMinW, 0.0, 1.0);
    w = max(w, uMinW);

    clip.xy += (nrm * position.y * w) / (uRes * 0.5) * clip.w;
    gl_Position = clip;

    float t = mix(ta, tb, px);             // colour uses the UNCLIPPED parameter
    vec3 c = mix(aColA, aColB, t) * uIntensity;

    // atmospheric perspective: distance eats colour before it eats the line
    float fog = 1.0 - clamp((depth - uFogNear) / max(uFogFar - uFogNear, 1e-3), 0.0, 1.0);
    fog = pow(fog, 1.35);
    vCol = mix(uFogColor, c, fog);

    vAcross = position.y;
  }
`;

const LINE_FRAG = /* glsl */`
  precision highp float;
  varying vec3  vCol;
  varying float vAcross;
  varying float vAlpha;

  void main() {
    // analytic edge: the quad is wider than the stroke, the falloff is the AA
    float a = smoothstep(0.5, 0.16, abs(vAcross)) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vCol, a);
  }
`;

/* Base quad: x runs 0→1 along the segment, y runs -0.5→0.5 across it. Shared by
   every batch — the instancing is what makes a hundred thousand of these one
   draw call. */
let QUAD = null;
function quadGeometry() {
  if (QUAD) return QUAD;
  QUAD = new THREE.BufferGeometry();
  QUAD.setAttribute('position', new THREE.Float32BufferAttribute(
    [0, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, 0, 0.5, 0], 3));
  QUAD.setIndex([0, 1, 2, 0, 2, 3]);
  return QUAD;
}

export function lineMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uRes:       { value: new THREE.Vector2(1, 1) },
      uNear:      { value: opts.near || 0.5 },
      uMinW:      { value: opts.minWidth === undefined ? 1.15 : opts.minWidth },
      uAtten:     { value: opts.atten === undefined ? 0.85 : opts.atten },
      uRefDist:   { value: opts.refDist || 40 },
      uWMax:      { value: opts.maxScale === undefined ? 4.0 : opts.maxScale },
      uIntensity: { value: opts.intensity === undefined ? 1 : opts.intensity },
      uFogColor:  { value: new THREE.Color(opts.fogColor === undefined ? 0x2A1436 : opts.fogColor) },
      uFogNear:   { value: opts.fogNear === undefined ? 60 : opts.fogNear },
      uFogFar:    { value: opts.fogFar === undefined ? 900 : opts.fogFar },
    },
    vertexShader: LINE_VERT,
    fragmentShader: LINE_FRAG,
    transparent: true,
    /* Depth WRITE stays on. These are thin, near-opaque strokes, so writing
       depth is what gives the drawing real occlusion — the trunk in front of
       the lake reads as in front of it. Order artefacts between two overlapping
       translucent strokes are a pixel wide and invisible; losing occlusion is
       what makes line art read as spatial mush. */
    depthWrite: true,
    depthTest: true,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
}

/* ── a batch of segments ─────────────────────────────────────────────────────
   Written into pre-allocated typed arrays by whoever is generating geometry,
   then handed here once. Converting JS arrays at the end is a main-thread spike
   we have already paid for once and will not pay again. */
export function lineBatch(data, material) {
  const g = new THREE.InstancedBufferGeometry();
  const base = quadGeometry();
  g.setAttribute('position', base.getAttribute('position'));
  g.setIndex(base.getIndex());
  g.instanceCount = data.count;
  g.setAttribute('aStart', new THREE.InstancedBufferAttribute(data.start, 3));
  g.setAttribute('aEnd',   new THREE.InstancedBufferAttribute(data.end, 3));
  g.setAttribute('aColA',  new THREE.InstancedBufferAttribute(data.colA, 3));
  g.setAttribute('aColB',  new THREE.InstancedBufferAttribute(data.colB, 3));
  g.setAttribute('aWidth', new THREE.InstancedBufferAttribute(data.width, 1));
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;          // bounds are meaningless for instanced segments
  mesh.renderOrder = data.order || 0;
  return mesh;
}

/* A writer that fills those arrays. Fixed capacity, degrades by dropping rather
   than throwing — the same contract the oak's vertex writer has always had. */
export function segmentWriter(cap) {
  const start = new Float32Array(cap * 3), end = new Float32Array(cap * 3);
  const colA = new Float32Array(cap * 3), colB = new Float32Array(cap * 3);
  const width = new Float32Array(cap);
  let n = 0, dropped = 0;
  return {
    get count() { return n; },
    get dropped() { return dropped; },
    push(ax, ay, az, bx, by, bz, ca, cb, w) {
      if (n >= cap) { dropped++; return; }
      const i3 = n * 3;
      start[i3] = ax; start[i3 + 1] = ay; start[i3 + 2] = az;
      end[i3] = bx; end[i3 + 1] = by; end[i3 + 2] = bz;
      colA[i3] = ca.r; colA[i3 + 1] = ca.g; colA[i3 + 2] = ca.b;
      colB[i3] = cb.r; colB[i3 + 1] = cb.g; colB[i3 + 2] = cb.b;
      width[n] = w;
      n++;
    },
    take(order) {
      return {
        start: start.subarray(0, n * 3), end: end.subarray(0, n * 3),
        colA: colA.subarray(0, n * 3), colB: colB.subarray(0, n * 3),
        width: width.subarray(0, n), count: n, order: order || 0,
      };
    },
  };
}

/* ── the composer ────────────────────────────────────────────────────────────
   Scene → half-float target → bright pass → three blur levels → composite with
   ACES, a lens dispersion on the bloom only, a vignette and a STATIC grain.

   The grain is static on purpose. Animated grain looks better for about four
   seconds and then costs a render every frame forever, which would break this
   page's central claim: that it renders on change and costs nothing at rest. A
   fixed hash over screen position breaks the sky's gradient banding, which is
   the actual job. */

const FS_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BRIGHT_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform float uThreshold, uKnee;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float l = max(c.r, max(c.g, c.b));
    // soft knee, so the bloom comes on gradually instead of switching on
    float k = clamp((l - uThreshold + uKnee) / (2.0 * uKnee), 0.0, 1.0);
    float contrib = max(l - uThreshold, uKnee * k * k) / max(l, 1e-4);
    gl_FragColor = vec4(c * contrib, 1.0);
  }
`;

const BLUR_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform vec2 uStep;                 // texel * direction
  varying vec2 vUv;
  void main() {
    // 9-tap gaussian, weights folded onto linear-filtered pair samples
    vec3 s = texture2D(tDiffuse, vUv).rgb * 0.2270270;
    s += texture2D(tDiffuse, vUv + uStep * 1.3846153).rgb * 0.3162162;
    s += texture2D(tDiffuse, vUv - uStep * 1.3846153).rgb * 0.3162162;
    s += texture2D(tDiffuse, vUv + uStep * 3.2307692).rgb * 0.0702702;
    s += texture2D(tDiffuse, vUv - uStep * 3.2307692).rgb * 0.0702702;
    gl_FragColor = vec4(s, 1.0);
  }
`;

const COMP_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tScene, tB0, tB1, tB2;
  uniform float uStrength, uExposure, uGrain, uVignette, uDisperse;
  varying vec2 vUv;

  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  vec3 toSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(max(c, 1e-5), vec3(1.0 / 2.4)) - 0.055,
               step(0.0031308, c));
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

  vec3 bloomAt(vec2 uv) {
    return texture2D(tB0, uv).rgb * 1.00
         + texture2D(tB1, uv).rgb * 0.72
         + texture2D(tB2, uv).rgb * 0.48;
  }

  void main() {
    vec3 scene = texture2D(tScene, vUv).rgb;

    /* Lens dispersion on the BLOOM only. Real glass splits the halo, not the
       subject; doing it to the whole frame is the cheap-filter look. */
    vec2 d = (vUv - 0.5) * uDisperse;
    vec3 b = vec3(bloomAt(vUv + d).r, bloomAt(vUv).g, bloomAt(vUv - d).b);

    vec3 c = scene + b * uStrength;
    c = aces(c * uExposure);

    float v = 1.0 - uVignette * dot(vUv - 0.5, vUv - 0.5) * 2.0;
    c *= clamp(v, 0.0, 1.0);

    c = toSRGB(c);
    c += (hash(vUv * 1024.0) - 0.5) * uGrain;   // static: kills gradient banding
    gl_FragColor = vec4(c, 1.0);
  }
`;

function fsMaterial(frag, uniforms) {
  return new THREE.ShaderMaterial({
    uniforms, vertexShader: FS_VERT, fragmentShader: frag,
    depthTest: false, depthWrite: false,
  });
}

export function makeComposer(renderer, opts = {}) {
  const LEVELS = 3;
  const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat };

  // one fullscreen triangle, material swapped per pass
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.Camera();
  const quadMesh = new THREE.Mesh(tri, null);
  quadMesh.frustumCulled = false;
  quadScene.add(quadMesh);

  let scene = null, levels = [], W = 0, H = 0;

  const bright = fsMaterial(BRIGHT_FRAG, {
    tDiffuse: { value: null },
    uThreshold: { value: opts.threshold === undefined ? 0.85 : opts.threshold },
    uKnee: { value: 0.35 },
  });
  const blur = fsMaterial(BLUR_FRAG, {
    tDiffuse: { value: null }, uStep: { value: new THREE.Vector2() },
  });
  const comp = fsMaterial(COMP_FRAG, {
    tScene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null },
    uStrength: { value: opts.strength === undefined ? 0.85 : opts.strength },
    uExposure: { value: opts.exposure === undefined ? 1.0 : opts.exposure },
    uGrain: { value: opts.grain === undefined ? 0.016 : opts.grain },
    uVignette: { value: opts.vignette === undefined ? 0.55 : opts.vignette },
    uDisperse: { value: opts.disperse === undefined ? 0.004 : opts.disperse },
  });

  function draw(material, target) {
    quadMesh.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }

  function setSize(w, h, samples) {
    if (w === W && h === H && scene) return;
    W = w; H = h;
    if (scene) { scene.dispose(); levels.forEach(l => { l.a.dispose(); l.b.dispose(); }); }
    /* MSAA on the scene target only. The line shader antialiases its own edges,
       but multisampling is what keeps the DEPTH edges — one stroke crossing in
       front of another — from stair-stepping. Off on phones; it is the single
       most expensive thing here and the pixels are half the size anyway. */
    scene = new THREE.WebGLRenderTarget(w, h, { ...rtOpts, samples, depthBuffer: true });
    levels = [];
    let lw = w, lh = h;
    for (let i = 0; i < LEVELS; i++) {
      lw = Math.max(1, lw >> 1); lh = Math.max(1, lh >> 1);
      const mk = () => {
        const t = new THREE.WebGLRenderTarget(lw, lh, { ...rtOpts, depthBuffer: false });
        t.texture.minFilter = THREE.LinearFilter;
        t.texture.magFilter = THREE.LinearFilter;
        return t;
      };
      levels.push({ a: mk(), b: mk(), w: lw, h: lh });
    }
  }

  return {
    setSize,
    get target() { return scene; },
    render(sceneObj, camera) {
      renderer.setRenderTarget(scene);
      renderer.clear();
      renderer.render(sceneObj, camera);

      bright.uniforms.tDiffuse.value = scene.texture;
      draw(bright, levels[0].a);

      for (let i = 0; i < LEVELS; i++) {
        const L = levels[i];
        if (i > 0) {                       // downsample from the level above
          blur.uniforms.tDiffuse.value = levels[i - 1].a.texture;
          blur.uniforms.uStep.value.set(1 / levels[i - 1].w, 0);
          draw(blur, L.a);
        }
        blur.uniforms.tDiffuse.value = L.a.texture;
        blur.uniforms.uStep.value.set(1 / L.w, 0);
        draw(blur, L.b);
        blur.uniforms.tDiffuse.value = L.b.texture;
        blur.uniforms.uStep.value.set(0, 1 / L.h);
        draw(blur, L.a);
      }

      comp.uniforms.tScene.value = scene.texture;
      comp.uniforms.tB0.value = levels[0].a.texture;
      comp.uniforms.tB1.value = levels[1].a.texture;
      comp.uniforms.tB2.value = levels[2].a.texture;
      draw(comp, null);
      renderer.setRenderTarget(null);
    },
    uniforms: { bright: bright.uniforms, comp: comp.uniforms },
    dispose() {
      if (scene) scene.dispose();
      levels.forEach(l => { l.a.dispose(); l.b.dispose(); });
      tri.dispose(); bright.dispose(); blur.dispose(); comp.dispose();
    },
  };
}
