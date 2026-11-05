/**
 * ============================================================================
 * DECON-WEB // LUSION LABS MASTER EXHIBITION PORTAL (/)
 * 100% Pure labs.lusion.co Gallery (EXP 001 – EXP 004) + 100vw×100vh Stage
 * Staggered Editorial Rhythm · Unified Obsidian Full-Bleed Art Covers
 * ============================================================================
 */

import { TrueJpegUI } from '/shared-ui/truejpeg-ui.js';
import { MfpUI } from '/shared-ui/mfp-ui.js';
import { createCommandPalette } from '/shared-ui/photo-vault-ui.js';
import {
  ensureLabInitialized,
  pauseLabSandboxes,
  resumeLabSandboxes,
  applyCategoryFilter,
  focusSandboxById,
} from '/lab.js';

/* ============================================================================
   1. FOUR FLAGSHIP SPECIMENS METADATA
   ============================================================================ */

const SPECIMENS = {
  '01': {
    id: '01',
    name: 'True JPEG',
    origin: 'truejpeg.com',
    port: 6060,
    url: 'http://127.0.0.1:6060/',
    labUrl: 'http://127.0.0.1:6060/lab.html',
    creator: 'TJ (@RTJLDR) — truejpeg.com ↗',
    creatorUrl: 'https://truejpeg.com/',
    modulePath: '/shared-ui/truejpeg-ui.js',
    tags: 'OPTICAL HALFTONE · 3D GLOBE',
    summary:
      'Industrial optical darkroom and halftone specimen laboratory. Built with zero frameworks using OffscreenCanvas luminance-to-radius halftone dot matrices, spring-repulsion dot typography, and a 40×10 hardware dot-matrix exposure analyzer.',
    bullets: [
      'OffscreenCanvas Halftone Engine: L = 0.299R + 0.587G + 0.114B mapped to r = step · 0.56 · √L.',
      'Interactive Dot Wordmark (TrueJpegUI.dotType): Float32Array particle grid with F = (1 - d/R)² repulsion and 0.16 spring return.',
      '3D Spherical Coordinate Projection (TrueJpegUI.createGlobe): 23.5° axial tilt with cosine depth-sorted alpha.',
      'Radial Honeycomb Dot-Wave Wipe (TrueJpegUI.createWipe): Hexagonal row packing (STEP · 0.866) with sin(k·π) wavefront spark.',
      '40×10 Hardware Dot-Matrix Histogram & 5-Chip Color Gene Extractor (TrueJpegUI.analyzeImage).',
    ],
    exports: [
      { label: 'TrueJpegUI.dotType', sandbox: 'sb-01' },
      { label: 'TrueJpegUI.renderHalftone', sandbox: 'sb-02' },
      { label: 'TrueJpegUI.createGlobe', sandbox: 'sb-03' },
      { label: 'TrueJpegUI.drawDotHistogram', sandbox: 'sb-04' },
      { label: 'TrueJpegUI.analyzeImage', sandbox: 'sb-04' },
      { label: 'TrueJpegUI.winFrame', sandbox: 'sb-05' },
      { label: 'TrueJpegUI.createWipe', sandbox: 'sb-05' },
      { label: 'TrueJpegUI.scramble', sandbox: 'sb-05' },
      { label: 'TrueJpegUI.createSoundEngine', sandbox: 'sb-16' },
    ],
  },
  '02': {
    id: '02',
    name: 'musicForProgramming();',
    origin: 'musicforprogramming.net',
    port: 6061,
    url: 'http://127.0.0.1:6061/',
    labUrl: 'http://127.0.0.1:6061/lab.html',
    creator: 'Datassette & Contributors — musicforprogramming.net ↗',
    creatorUrl: 'https://musicforprogramming.net/',
    modulePath: '/shared-ui/mfp-ui.js',
    tags: 'FFT SPECTRUM · AMBIENT SYNTH',
    summary:
      'Cognitive ergonomics audio workstation and monospace IDE interface. Combines zero-CLS ASCII progress sliders, a 32-band real-time FFT / procedural spectrum visualizer, and a 7-voice detuned Web Audio ambient drone synthesizer.',
    bullets: [
      'Zero-CLS Monospace ASCII Sliders (MfpUI.createAsciiBar): Pointer-capture scrubbing with zero layout shift.',
      '7-Voice Detuned Web Audio Drone Synth (MfpUI.createAmbientPad): 6 ambient chord voicings (Dmaj9, F#m11, Cmaj9#11, Em9, Asus2/F, Bbmaj9) with 0.065Hz LFO filter modulation.',
      '32-Band Dual-Mode Visualizer (MfpUI.createSpectrum): Switches seamlessly between 6-row ASCII block bars and 32×12 color-graded LED dot matrices.',
      'Datassette Cipher Text Decoder (MfpUI.scrambleText): 36fps non-destructive character reveal.',
      '25:00 Deep-Work Pomodoro Flow Timer (MfpUI.createFlowTimer) with 528Hz + 792Hz harmonic overtone bell.',
    ],
    exports: [
      { label: 'MfpUI.createAsciiBar', sandbox: 'sb-06' },
      { label: 'MfpUI.scrambleText', sandbox: 'sb-06' },
      { label: 'MfpUI.createSpectrum', sandbox: 'sb-07' },
      { label: 'MfpUI.createAmbientPad', sandbox: 'sb-07' },
      { label: 'MfpUI.renderWaveLine', sandbox: 'sb-07' },
      { label: 'MfpUI.createFlowTimer', sandbox: 'sb-08' },
      { label: 'MfpUI.createSoundEngine', sandbox: 'sb-16' },
    ],
  },
  '03': {
    id: '03',
    name: 'Sam Becker Photos',
    origin: 'photos.sambecker.com',
    port: 6062,
    url: 'http://127.0.0.1:6062/',
    labUrl: 'http://127.0.0.1:6062/lab',
    creator: 'Sam Becker — photos.sambecker.com ↗',
    creatorUrl: 'https://photos.sambecker.com/',
    modulePath: '/shared-ui/photo-vault-ui.js',
    tags: 'OKLCH OPTICS · FILM ARCHIVE',
    summary:
      'Zero-dependency binary EXIF metadata inspector, perceptual oklch() color gene laboratory, and Fujifilm X-Trans V film recipe vault. Parses raw JPEG APP1 0xFFE1 IFD0/SubIFD byte streams directly in the browser.',
    bullets: [
      'Binary 0xFFE1 TIFF/EXIF Stream Parser (parseExif): Reads Make, Model, Lens, ExposureTime, FNumber, ISO, and FocalLength via DataView.',
      'Perceptual oklch() Color Gene Strip (extractColorPalette): Quantizes dominant image clusters into CSS Color Level 4 oklch(L C H) tokens.',
      'Fujifilm X-Trans V Film Recipe Card (createFilmRecipeCard): Interactive cubic-bezier highlight/shadow tone S-curve.',
      '2.5× Optical Magnifier Loupe (createOpticalLoupe) with wheel zoom (2.0×–4.5×) and live RGB/OKLCH pixel crosshair.',
      '5-Mode SVG Composition Geometry Overlay (createCompositionOverlay): Rule of Thirds, Golden Ratio Phi Spiral, Diagonal, Crosshair, and Aspect Safe Frame.',
    ],
    exports: [
      { label: 'createExifPlate', sandbox: 'sb-09' },
      { label: 'createFilmRecipeCard', sandbox: 'sb-09' },
      { label: 'createOpticalLoupe', sandbox: 'sb-10' },
      { label: 'createCompositionOverlay', sandbox: 'sb-10' },
      { label: 'parseExif', sandbox: 'sb-11' },
      { label: 'extractColorPalette', sandbox: 'sb-11' },
      { label: 'createShutterAudio', sandbox: 'sb-16' },
      { label: 'createCommandPalette', sandbox: 'sb-10' },
    ],
  },
  '04': {
    id: '04',
    name: 'Igloo Inc',
    origin: 'igloo.inc',
    port: 6063,
    url: 'http://127.0.0.1:6063/',
    labUrl: 'http://127.0.0.1:6063/lab',
    creator: 'Igloo Inc × Lusion — igloo.inc ↗',
    creatorUrl: 'https://www.igloo.inc/',
    modulePath: '/shared-ui/igloo-ui.js',
    tags: 'WEBGL2 PRISM · FROST SHADER',
    summary:
      'Arctic research station and WebGL2 cryo-chamber crafted after Igloo Inc × Lusion. Features the class f3 diagonal frost-cut transition shader with 5-tap barrel chromatic dispersion, 64-step SDF raymarched ice monoliths, and procedural Arctic blizzard synthesis.',
    bullets: [
      'Lusion class f3 Diagonal Frost-Cut Shader (createFrostCutShader): slope = -0.2 · aspect · (1 + uProgressVel) with CA_ITERATIONS = 5 barrel dispersion.',
      '64-Step SDF Raymarched Cryo Monolith (createCryoCubeWebGL): Beer-Lambert subsurface scattering, IOR 1.31 Fresnel refraction, and 18 orbiting ice shards.',
      'Cylindrical DoF Defocus Manifesto (createBlurTextCylinder) & 100-frame ASCII wave loader (createAsciiWaveLoader).',
      'Polar Reticle Telemetry HUD (createPolarReticleHud): AZM/ELV bearing tracker and +32.0m to -48.0m cryo depth scale.',
      'Procedural Cryo Spatial Web Audio Synthesizer (createCryoAudioEngine): Dual-bandpass pink-noise blizzard wind and crystalline fracture chimes.',
    ],
    exports: [
      { label: 'createFrostCutShader', sandbox: 'sb-12' },
      { label: 'createCryoCubeWebGL', sandbox: 'sb-13' },
      { label: 'createAsciiWaveLoader', sandbox: 'sb-14' },
      { label: 'createBlurTextCylinder', sandbox: 'sb-14' },
      { label: 'scrambleTextDecode', sandbox: 'sb-14' },
      { label: 'createPolarReticleHud', sandbox: 'sb-15' },
      { label: 'IGLOO_PORTFOLIO_DATA', sandbox: 'sb-15' },
      { label: 'IGLOO_ASSET_INDEX', sandbox: 'sb-15' },
      { label: 'IGLOO_DESIGN_TOKENS', sandbox: 'sb-15' },
      { label: 'createCryoAudioEngine', sandbox: 'sb-16' },
    ],
  },
};

const ALL_30_PRIMITIVES = [
  { id: '01', name: 'TrueJpegUI.dotType', target: 'sb-01' },
  { id: '02', name: 'TrueJpegUI.renderHalftone', target: 'sb-02' },
  { id: '03', name: 'TrueJpegUI.createGlobe', target: 'sb-03' },
  { id: '04', name: 'TrueJpegUI.drawDotHistogram', target: 'sb-04' },
  { id: '05', name: 'TrueJpegUI.analyzeImage', target: 'sb-04' },
  { id: '06', name: 'TrueJpegUI.winFrame', target: 'sb-05' },
  { id: '07', name: 'TrueJpegUI.createWipe', target: 'sb-05' },
  { id: '08', name: 'TrueJpegUI.scramble', target: 'sb-05' },
  { id: '09', name: 'TrueJpegUI.createSoundEngine', target: 'sb-16' },
  { id: '10', name: 'MfpUI.createAsciiBar', target: 'sb-06' },
  { id: '11', name: 'MfpUI.scrambleText', target: 'sb-06' },
  { id: '12', name: 'MfpUI.createSpectrum', target: 'sb-07' },
  { id: '13', name: 'MfpUI.createAmbientPad', target: 'sb-07' },
  { id: '14', name: 'MfpUI.renderWaveLine', target: 'sb-07' },
  { id: '15', name: 'MfpUI.createFlowTimer', target: 'sb-08' },
  { id: '16', name: 'MfpUI.createSoundEngine', target: 'sb-16' },
  { id: '17', name: 'createExifPlate', target: 'sb-09' },
  { id: '18', name: 'createFilmRecipeCard', target: 'sb-09' },
  { id: '19', name: 'createOpticalLoupe', target: 'sb-10' },
  { id: '20', name: 'createCompositionOverlay', target: 'sb-10' },
  { id: '21', name: 'parseExif', target: 'sb-11' },
  { id: '22', name: 'extractColorPalette', target: 'sb-11' },
  { id: '23', name: 'createShutterAudio', target: 'sb-16' },
  { id: '24', name: 'createCommandPalette', target: 'sb-10' },
  { id: '25', name: 'createFrostCutShader', target: 'sb-12' },
  { id: '26', name: 'createCryoCubeWebGL', target: 'sb-13' },
  { id: '27', name: 'createAsciiWaveLoader', target: 'sb-14' },
  { id: '28', name: 'createBlurTextCylinder', target: 'sb-14' },
  { id: '29', name: 'createPolarReticleHud', target: 'sb-15' },
  { id: '30', name: 'createCryoAudioEngine', target: 'sb-16' },
];

/* ============================================================================
   2. GLOBAL PORTAL STATE & TACTILE SOUND ENGINE
   ============================================================================ */

const state = {
  theme: 'light',
  viewMode: 'grid', // 'grid' | 'list'
  soundEnabled: true,
  activeSpecimenId: null,
  stageMode: 'site', // 'site' | 'lab'
  stageOpen: false,
  hudMinimized: false,
  dossierOpen: false,
  serverStatus: {
    '01': { online: true, latencyMs: 2 },
    '02': { online: true, latencyMs: 2 },
    '03': { online: true, latencyMs: 2 },
    '04': { online: true, latencyMs: 2 },
  },
  mouse: {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.35,
  },
};

try {
  const savedTheme = localStorage.getItem('decon-portal-theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    state.theme = savedTheme;
  }
} catch (_) {}
document.documentElement.setAttribute('data-theme', state.theme);

const tjSound = TrueJpegUI.createSoundEngine();

function playTick() {
  if (!state.soundEnabled) return;
  try {
    tjSound.tick();
  } catch {
    /* ignore before user gesture */
  }
}

function playSwitch() {
  if (!state.soundEnabled) return;
  try {
    tjSound.switch();
  } catch {
    /* ignore */
  }
}

function showToast(msg) {
  const toast = document.getElementById('portal-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 2400);
}

/* ============================================================================
   3. 1:1 LUSION TRANSITION COVER (8° Slanted 3-Layer Parallelogram Wipe)
   ============================================================================ */

function createTransitionCover() {
  const canvas = document.getElementById('transition-cover');
  if (!canvas) {
    return {
      play: (cb, done) => {
        if (cb) cb();
        if (done) done();
      },
      playReveal: (done) => {
        if (done) done();
      },
    };
  }
  const ctx = canvas.getContext('2d');
  let animId = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.floor(window.innerWidth * dpr);
    const targetH = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function drawSlantedLayers(rawT, layers) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const slant = Math.tan((8 * Math.PI) / 180) * h;
    const totalSpan = w + slant * 2;

    ctx.clearRect(0, 0, w, h);

    layers.forEach((color, idx) => {
      const delay = idx * 0.08;
      const localT = Math.max(0, Math.min(1, (rawT - delay) / (1 - delay * 1.5)));
      let xStart;
      let xEnd;

      if (localT <= 0.5) {
        const p = easeInOutQuart(localT * 2);
        xStart = -slant;
        xEnd = -slant + totalSpan * p;
      } else {
        const p = easeInOutQuart((localT - 0.5) * 2);
        xStart = -slant + totalSpan * p;
        xEnd = -slant + totalSpan;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(xStart + slant, 0);
      ctx.lineTo(xEnd + slant, 0);
      ctx.lineTo(xEnd - slant, h);
      ctx.lineTo(xStart - slant, h);
      ctx.closePath();
      ctx.fill();
    });
  }

  function play(onMidpoint, onComplete) {
    cancelAnimationFrame(animId);
    resize();
    document.documentElement.classList.add('is-transitioning-view');
    canvas.style.display = 'block';

    const start = performance.now();
    const duration = 680;
    let midpointFired = false;

    const layers =
      state.theme === 'light'
        ? ['#000000', '#555555', '#ffffff']
        : ['#ffffff', '#555555', '#000000'];

    function frame(now) {
      const rawT = Math.min(1, (now - start) / duration);
      if (rawT >= 0.48 && !midpointFired) {
        midpointFired = true;
        if (typeof onMidpoint === 'function') onMidpoint();
      }

      drawSlantedLayers(rawT, layers);

      if (rawT < 1) {
        animId = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        canvas.style.display = 'none';
        document.documentElement.classList.remove('is-transitioning-view');
        if (typeof onComplete === 'function') onComplete();
      }
    }

    animId = requestAnimationFrame(frame);
  }

  function playReveal(onComplete) {
    cancelAnimationFrame(animId);
    resize();
    document.documentElement.classList.add('is-transitioning-view');
    canvas.style.display = 'block';

    const start = performance.now();
    const duration = 420;

    const layers =
      state.theme === 'light'
        ? ['#000000', '#555555', '#ffffff']
        : ['#ffffff', '#555555', '#000000'];

    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const rawT = 0.48 + progress * 0.52;

      drawSlantedLayers(rawT, layers);

      if (progress < 1) {
        animId = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        canvas.style.display = 'none';
        document.documentElement.classList.remove('is-transitioning-view');
        if (typeof onComplete === 'function') onComplete();
      }
    }

    animId = requestAnimationFrame(frame);
  }

  return { play, playReveal };
}

const transitionCover = createTransitionCover();

/* ============================================================================
   4. 1:1 LUSION INVERTED DISC CURSOR (.cursor) & LUCY MASCOT LOGO
   (With Convergence Sleep & Cached Bounding Center — Zero Layout Thrashing)
   ============================================================================ */

let wakeLucyAnimation = () => {};

function initLusionCursor() {
  const cursor = document.getElementById('lusion-cursor');
  if (!cursor) return;

  let curX = state.mouse.x;
  let curY = state.mouse.y;
  let cursorRaf = 0;

  function tick() {
    const dx = state.mouse.x - curX;
    const dy = state.mouse.y - curY;
    curX += dx * 0.24;
    curY += dy * 0.24;
    cursor.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0)`;

    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      cursorRaf = requestAnimationFrame(tick);
    } else {
      cursorRaf = 0;
    }
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      state.mouse.x = e.clientX;
      state.mouse.y = e.clientY;
      const interactive = e.target.closest(
        'a, button, input, select, label, .card, .exp-list__item, .bento-card'
      );
      cursor.classList.toggle('is-hover', Boolean(interactive));
      if (!cursorRaf) cursorRaf = requestAnimationFrame(tick);
      wakeLucyAnimation();
    },
    { passive: true }
  );
}

let triggerLucyJump = () => {};
let setLucyStagePeeking = () => {};

function forceResetFloatingOverlays() {
  const floater = document.getElementById('list-preview-floater');
  if (floater) {
    floater.classList.remove('is-visible');
    floater.style.opacity = '';
  }
  const expRows = document.getElementById('exp-list-rows');
  if (expRows) {
    expRows.classList.remove('is-hovering');
  }
  const lucyBtn = document.getElementById('lucy-logo-btn');
  if (lucyBtn) {
    clearTimeout(lucyBtn._peekTimer);
    lucyBtn.classList.remove('is-stage-peeking', 'is-expanded');
    lucyBtn.blur();
  }
}

function initLucyMascot() {
  const btn = document.getElementById('lucy-logo-btn');
  const svg = document.getElementById('lucy-svg');
  const faceGroup = document.getElementById('lucy-face');

  if (!btn || !svg || !faceGroup) return;

  let isHovered = false;
  let isStagePeeking = false;
  let eyeX = 0;
  let eyeY = 0;
  let lucyRaf = 0;
  let lastFrameTime = performance.now();

  let lucyCenter = { x: 65, y: 52 };
  function updateLucyCenter() {
    const rect = btn.getBoundingClientRect();
    if (rect.width > 0) {
      lucyCenter.x = rect.left + 25;
      lucyCenter.y = rect.top + 25;
    }
  }
  updateLucyCenter();
  window.addEventListener('resize', updateLucyCenter, { passive: true });

  function animateLucy(now = performance.now()) {
    lucyRaf = 0;
    const dt = Math.min(0.064, Math.max(0.001, (now - lastFrameTime) * 0.001));
    lastFrameTime = now;

    const isExpanded = isHovered || (state.stageOpen && isStagePeeking);
    let targetX = 0;
    let targetY = 0;

    if (!isExpanded && !state.stageOpen) {
      const dx = Math.max(-1, Math.min(1, (state.mouse.x - lucyCenter.x) / 280));
      const dy = Math.max(-1, Math.min(1, (state.mouse.y - lucyCenter.y) / 280));
      targetX = dx * 3.4;
      targetY = dy * 2.8;
    }

    const alpha = 1 - Math.exp(-18 * dt);
    eyeX += (targetX - eyeX) * alpha;
    eyeY += (targetY - eyeY) * alpha;

    faceGroup.style.transform = `translate3d(${eyeX.toFixed(2)}px, ${eyeY.toFixed(2)}px, 0)`;

    if (Math.abs(targetX - eyeX) > 0.03 || Math.abs(targetY - eyeY) > 0.03) {
      lucyRaf = requestAnimationFrame(animateLucy);
    }
  }

  wakeLucyAnimation = () => {
    if (!lucyRaf) {
      lastFrameTime = performance.now();
      lucyRaf = requestAnimationFrame(animateLucy);
    }
  };

  setLucyStagePeeking = (peeking) => {
    const next = Boolean(peeking);
    isStagePeeking = next;
    btn.classList.toggle('is-stage-peeking', next);
    btn.classList.toggle('is-expanded', next || isHovered);
    wakeLucyAnimation();
  };

  btn.addEventListener('pointerenter', () => {
    isHovered = true;
    btn.classList.add('is-expanded');
    if (state.stageOpen) {
      clearTimeout(btn._peekTimer);
      btn.classList.add('is-stage-peeking');
    }
    playTick();
    wakeLucyAnimation();
  });

  btn.addEventListener('pointerleave', () => {
    isHovered = false;
    if (state.stageOpen) {
      isStagePeeking = false;
      btn.classList.remove('is-stage-peeking');
    }
    btn.classList.toggle('is-expanded', isStagePeeking);
    wakeLucyAnimation();
  });

  triggerLucyJump = () => {
    btn.classList.remove('is-jumping');
    void btn.offsetWidth;
    btn.classList.add('is-jumping');
  };

  btn.addEventListener('click', () => {
    triggerLucyJump();
    playSwitch();
    if (state.stageOpen) {
      closeFullscreenStage();
    } else if (state.viewMode !== 'grid') {
      setViewMode('grid', true);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  wakeLucyAnimation();
}

/* ============================================================================
   5. NAVBAR 3-WAY VIEW SWITCHER (grid | list | lab) & THEME SWITCHER (W | B)
   (True SPA Zero-Reload + Non-Destructive .view-panel Parking + 220ms Transition)
   ============================================================================ */

let lastHeroVariant = 'exhibition'; // 'exhibition' | 'lab'
let viewTransitionTimer = 0;
let viewEnterRaf1 = 0;
let viewEnterRaf2 = 0;

function updateViewSwitchGlider(modeOverride) {
  const mode = modeOverride || state.viewMode;
  const bg = document.getElementById('view-switch-bg');
  if (!bg) return;
  const idx = mode === 'list' ? 1 : mode === 'lab' ? 2 : 0;
  bg.style.transform = `translateX(${idx * 100}%)`;
}

function updateHeroHeaderForView(mode) {
  const nextVariant = mode === 'lab' ? 'lab' : 'exhibition';
  if (nextVariant === lastHeroVariant) return;
  lastHeroVariant = nextVariant;

  const heroH1 = document.getElementById('hero-h1');
  const descP = document.querySelector('.header__description p');

  if (nextVariant === 'lab') {
    document.title = 'Lusion Labs // Shared-UI Component Lab (30 Primitives)';
    if (heroH1) {
      heroH1.innerHTML = `
        <span class="hero-line-mask"><span class="hero-line">COMPONENT LAB</span></span>
        <span class="hero-line-mask"><span class="hero-line">SHARED-UI KIT</span></span>
        <span class="hero-line-mask"><span class="hero-line">30 PRIMITIVES</span></span>
      `;
    }
    if (descP) {
      descP.textContent =
        'Interactive gallery of 30 zero-dependency ES6 primitives distilled from True JPEG, musicForProgramming, Sam Becker Photos, and Igloo Inc. Hover any card to wake full color & controls.';
    }
  } else {
    document.title = 'Lusion Labs // Decon-Web Exhibition';
    if (heroH1) {
      heroH1.innerHTML = `
        <span class="hero-line-mask"><span class="hero-line">PLAY GROUND</span></span>
        <span class="hero-line-mask"><span class="hero-line">R&D COLLECTION</span></span>
        <span class="hero-line-mask"><span class="hero-line">EXPERIMENTS</span></span>
      `;
    }
    if (descP) {
      descP.textContent =
        'A space dedicated to deconstructing how god-tier websites are engineered and how we interact with them through WebGL2, Canvas & Audio R&D.';
    }
  }
}

function applyViewModeDOM(mode, { animate = false, deferResume = false } = {}) {
  forceResetFloatingOverlays();
  document.getElementById('navbar')?.classList.remove('is-navbar-scrolled-down');
  document.documentElement.classList.remove('is-navbar-scrolled-down');
  clearTimeout(viewTransitionTimer);
  cancelAnimationFrame(viewEnterRaf1);
  cancelAnimationFrame(viewEnterRaf2);

  state.viewMode = mode;
  document.documentElement.setAttribute('data-view', mode);

  document.querySelectorAll('.view-switch__option').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.viewMode === mode);
  });
  updateViewSwitchGlider(mode);
  updateHeroHeaderForView(mode);

  const specSec = document.getElementById('specimens-section');
  const listSec = document.getElementById('exp-list-section');
  const labSec = document.getElementById('lab-view-section');
  const floater = document.getElementById('list-preview-floater');

  if (floater) floater.classList.remove('is-visible');

  // 1. Pause background loops of inactive views (and pause during the 220ms transition for 60fps smoothness)
  pauseGalleryEngines({ unmountWebGL: false });
  stopListPreviewCanvas();
  pauseLabSandboxes();

  // 2. Ensure target view's DOM/sandboxes are initialized (idempotent, 0 rebuilds after first visit)
  if (mode === 'list') {
    renderExpListRows();
  } else if (mode === 'lab') {
    ensureLabInitialized();
  }

  // 3. Non-destructively park inactive panels via .view-panel--inactive (preserving clientWidth/FBOs!)
  const panelMap = {
    grid: specSec,
    list: listSec,
    lab: labSec,
  };

  Object.entries(panelMap).forEach(([key, panel]) => {
    if (!panel) return;
    panel.hidden = false;
    if (key !== mode) {
      panel.classList.remove('view-panel--entering');
      panel.classList.add('view-panel--inactive');
    }
  });

  const activePanel = panelMap[mode];
  if (activePanel) {
    if (animate) {
      activePanel.classList.add('view-panel--entering');
      activePanel.classList.remove('view-panel--inactive');
      viewEnterRaf1 = requestAnimationFrame(() => {
        viewEnterRaf2 = requestAnimationFrame(() => {
          activePanel.classList.remove('view-panel--entering');
        });
      });
    } else {
      activePanel.classList.remove('view-panel--entering', 'view-panel--inactive');
    }
  }

  // 4. Resume active view engines after the 220ms GPU transition completes (or immediately if not animated)
  if (!deferResume) {
    if (animate) {
      viewTransitionTimer = setTimeout(() => {
        if (state.stageOpen) return;
        if (state.viewMode === 'grid') {
          resumeGalleryEngines();
        } else if (state.viewMode === 'lab') {
          resumeLabSandboxes();
        }
      }, 220);
    } else if (mode === 'grid') {
      resumeGalleryEngines();
    } else if (mode === 'lab') {
      resumeLabSandboxes();
    }
  }
}

function syncUrlHistoryForView(mode, targetHash = '', { replace = false } = {}) {
  const cleanHash = targetHash
    ? targetHash.startsWith('#')
      ? targetHash
      : `#${targetHash}`
    : '';
  const targetUrl =
    mode === 'lab'
      ? `/lab${cleanHash}`
      : mode === 'list'
        ? '/?view=list'
        : '/';
  const currentUrl =
    window.location.pathname + window.location.search + window.location.hash;
  if (currentUrl !== targetUrl || replace) {
    try {
      if (replace) {
        window.history.replaceState({ viewMode: mode, stageOpen: false }, '', targetUrl);
      } else {
        window.history.pushState({ viewMode: mode, stageOpen: false }, '', targetUrl);
      }
    } catch (_) {}
  }
}

function setViewMode(mode, options = true) {
  forceResetFloatingOverlays();
  const opts =
    typeof options === 'boolean'
      ? { animate: options, pushHistory: true, targetHash: '' }
      : {
          animate: options?.animate !== false,
          pushHistory: options?.pushHistory !== false,
          targetHash: options?.targetHash || '',
        };

  if (mode === state.viewMode && !state.stageOpen) {
    if (opts.targetHash && mode === 'lab') {
      syncUrlHistoryForView('lab', opts.targetHash);
      focusSandboxById(opts.targetHash);
    }
    return;
  }

  playSwitch();
  triggerLucyJump();

  if (state.stageOpen) {
    teardownFullscreenStageDOM();
  }

  if (opts.pushHistory) {
    syncUrlHistoryForView(mode, opts.targetHash);
  }

  if (window.scrollY > 260) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  applyViewModeDOM(mode, { animate: opts.animate });

  if (opts.targetHash && mode === 'lab') {
    setTimeout(() => {
      focusSandboxById(opts.targetHash);
    }, 120);
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  playSwitch();
  triggerLucyJump();
  document.documentElement.setAttribute('data-theme', state.theme);
  const label = document.querySelector('.header__theme-label');
  if (label) {
    label.textContent = state.theme === 'dark' ? 'DARK' : 'LIGHT';
  }
  try {
    localStorage.setItem('decon-portal-theme', state.theme);
  } catch (_) {}

  updateViewSwitchGlider();

  // 同步刷新 #01 True JPEG 粒子字标颜色（读取最新 CSS color）
  if (galleryEngines.card01 && typeof galleryEngines.card01.refreshTheme === 'function') {
    requestAnimationFrame(() => galleryEngines.card01.refreshTheme());
  }
}

/* ============================================================================
   6. SILENT SUB-SERVER LIVENESS POLLING (/api/status & /api/wake)
   ============================================================================ */

async function pollServerStatus() {
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data?.list)
      ? data.list
      : Array.isArray(data?.specimens)
        ? data.specimens
        : data?.specimens
          ? Object.values(data.specimens)
          : [];
    if (!list.length) return;

    list.forEach((item) => {
      state.serverStatus[item.id] = {
        online: Boolean(item.online),
        latencyMs: item.latencyMs,
      };
    });
  } catch {
    /* ignore transient network errors */
  }
}

async function wakeServers(targetId = 'all') {
  playSwitch();
  showToast(
    targetId === 'all'
      ? 'Waking all 4 specimen engines...'
      : `Waking specimen #${targetId}...`
  );
  try {
    const res = await fetch('/api/wake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: targetId }),
    });
    if (res.ok) {
      await pollServerStatus();
      showToast('Specimen engine ready.');
    }
  } catch {
    showToast('Wake request failed.');
  }
}

/* ============================================================================
   7. FULL-BLEED PURE ART GALLERY ENGINES FOR CARDS #01, #02, #03, #04
   ============================================================================ */

function observeVisibility(el, onChange) {
  if (!el || typeof IntersectionObserver === 'undefined') {
    onChange(true);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => onChange(entry.isIntersecting));
    },
    { rootMargin: '80px' }
  );
  io.observe(el);
}

/**
 * CARD #01 (:6060 TRUE JPEG) 1:1 #view-home REPLICA ENGINE:
 * - Full-width interactive dot-matrix "TRUE JPEG" wordmark (#card-01-wordmark)
 * - 3-Window floating layout:
 *   01 Prompt // Live (2x2 halftone-to-photo reel)
 *   02 Generate // Live (live darkroom console #tj-con-bar + parameter scramble on hover)
 *   03 Other // Soon (interactive dot-matrix "SOON" canvas #tj-win-soon-cv)
 * - Syncs PAPER (#f4f3ee) & INK (#111110) theme label and dot color via refreshTheme()
 */
window.TrueJpegUI = TrueJpegUI;

function initCard01TrueJpegEngine() {
  const wordmarkEl =
    document.getElementById('tj-facade-wordmark') ||
    document.getElementById('card-01-wordmark');
  if (!wordmarkEl || !window.TrueJpegUI || typeof window.TrueJpegUI.dotType !== 'function') {
    return null;
  }

  const cardEl = document.getElementById('specimen-card-01') || wordmarkEl.closest('.card');
  const soonCv = document.getElementById('tj-win-soon-cv');
  const themeLbl = document.getElementById('tj-facade-theme-lbl');

  function syncThemeLabel() {
    if (!themeLbl) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeLbl.textContent = isDark ? 'INK' : 'PAPER';
  }

  function mountWordmark() {
    let cv =
      wordmarkEl.tagName === 'CANVAS'
        ? wordmarkEl
        : wordmarkEl.querySelector('canvas');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'card-01-wordmark';
      cv.className = 'tj-dot';
      wordmarkEl.appendChild(cv);
    }
    cv.style.color = getComputedStyle(wordmarkEl).color;
    return window.TrueJpegUI.dotType(cv, 'TRUE JPEG', {
      host: cardEl || wordmarkEl,
      maxH: 0.125,
      gap: 4,
      radius: 1.45,
      pullRadius: 68,
    });
  }

  function mountSoonDots() {
    if (!soonCv) return null;
    const parent = soonCv.parentElement || cardEl;
    soonCv.style.color = getComputedStyle(parent).color;
    return window.TrueJpegUI.dotType(soonCv, 'SOON', {
      host: cardEl || parent,
      maxH: 0.052,
      gap: 3.5,
      radius: 1.2,
      pullRadius: 48,
    });
  }

  // --- Window 02: 02 // Generate Console (1:1 :6060 panel() behavior) ---
  const conBar = document.getElementById('tj-con-bar');
  const conStep = document.getElementById('tj-con-step');
  const outEls = {
    model: document.getElementById('tj-con-model'),
    ratio: document.getElementById('tj-con-ratio'),
    size: document.getElementById('tj-con-size'),
    seed: document.getElementById('tj-con-seed'),
  };
  const CELLS = 18;
  const STEPS = 40;
  const PRESETS = [
    { model: 'Midjourney v7', ratio: '16:9', size: '2912 × 1632', seed: '84920' },
    { model: 'Midjourney v6.1', ratio: '4:3', size: '2400 × 1800', seed: '31047' },
    { model: 'Flux 1.1 Pro Ultra', ratio: '3:2', size: '2752 × 1840', seed: '69214' },
    { model: 'Midjourney v7', ratio: '2:3', size: '1840 × 2752', seed: '50381' },
  ];
  let barCells = [];
  if (conBar) {
    conBar.innerHTML = '<i></i>'.repeat(CELLS);
    barCells = Array.from(conBar.querySelectorAll('i'));
  }

  function setProgress(n) {
    const lit = Math.round((n / STEPS) * CELLS);
    barCells.forEach((c, i) => c.classList.toggle('is-on', i < lit));
    if (conStep) {
      conStep.textContent = n >= STEPS ? 'DONE' : `${String(n).padStart(2, '0')}/${STEPS}`;
      conStep.classList.toggle('is-done', n >= STEPS);
    }
  }
  setProgress(STEPS);

  let presetIdx = 0;
  let conTimer = 0;
  let conGen = 0;

  function runConsoleCycle(gen) {
    presetIdx = (presetIdx + 1) % PRESETS.length;
    const target = PRESETS[presetIdx];
    const CH = '0123456789ABCDEF:×.-';
    let f = 0;
    setProgress(0);

    const scrambleTick = () => {
      if (gen !== conGen) return;
      Object.entries(target).forEach(([k, s]) => {
        if (!outEls[k]) return;
        outEls[k].textContent =
          f >= 6
            ? s
            : s.replace(/\S/g, (c, i) =>
                i < (f / 6) * s.length ? c : CH[Math.floor(Math.random() * CH.length)]
              );
      });
      if (f++ < 6) {
        conTimer = setTimeout(scrambleTick, 42);
      } else {
        let n = 0;
        const stepTick = () => {
          if (gen !== conGen) return;
          n = Math.min(STEPS, n + 2);
          setProgress(n);
          if (n < STEPS) {
            conTimer = setTimeout(stepTick, 45);
          } else {
            conTimer = setTimeout(() => runConsoleCycle(gen), 1600);
          }
        };
        conTimer = setTimeout(stepTick, 140);
      }
    };
    scrambleTick();
  }

  if (cardEl) {
    cardEl.addEventListener('pointerenter', () => {
      const g = ++conGen;
      clearTimeout(conTimer);
      runConsoleCycle(g);
    });
    cardEl.addEventListener('pointerleave', () => {
      conGen++;
      clearTimeout(conTimer);
      const cur = PRESETS[presetIdx];
      Object.entries(cur).forEach(([k, s]) => {
        if (outEls[k]) outEls[k].textContent = s;
      });
      setProgress(STEPS);
    });
  }

  syncThemeLabel();
  let handle = mountWordmark();
  let soonHandle = mountSoonDots();

  return {
    pause() {
      conGen++;
      clearTimeout(conTimer);
      handle?.pause?.();
      soonHandle?.pause?.();
    },
    resume() {
      handle?.resume?.();
      soonHandle?.resume?.();
    },
    refreshTheme() {
      syncThemeLabel();
      if (handle && typeof handle.destroy === 'function') handle.destroy();
      if (wordmarkEl.tagName !== 'CANVAS') {
        wordmarkEl.innerHTML = '<canvas id="card-01-wordmark" class="tj-dot"></canvas>';
      }
      handle = mountWordmark();

      if (soonHandle && typeof soonHandle.destroy === 'function') soonHandle.destroy();
      soonHandle = mountSoonDots();
    },
  };
}

/**
 * CARD #02 (:6061 MUSICFORPROGRAMMING) THEME-ADAPTIVE IDE & LIVE SPECTRUM FACADE:
 * - Zero dependency on non-existent MfpUI.renderWaveLine (fixes frame-3 crash!)
 * - Live breathing & hover-scrubbing ASCII progress bar (#mfp-facade-asciibar) + clock (#mfp-facade-clock)
 * - 4-row flowing ASCII wave (#mfp-facade-asciiwave)
 * - 4-track sine acoustic interference waves + 32-band LED spectrum + peak-hold dots + mirror reflection
 */
function initCard02MfpEngine() {
  const cardEl = document.querySelector('.card--02');
  const barEl = document.getElementById('mfp-facade-asciibar');
  const clockEl = document.getElementById('mfp-facade-clock');
  const wavePreEl = document.getElementById('mfp-facade-asciiwave');
  const specCanvas = document.getElementById('mfp-facade-spectrum');
  if (!cardEl || !specCanvas) return null;

  const ctx = specCanvas.getContext('2d');
  let rafId = 0;
  let running = true;
  let hoverEnergy = 0;
  let targetHover = 0;
  let pointerX = 0.64;
  let waveTick = 0;

  const COLS = 32;
  const ROWS = 10;
  const peaks = new Float32Array(COLS);
  const peakHold = new Uint8Array(COLS);
  const WAVE_CHARS = " ._-+:*^~'#";

  function buildAsciiWaveLine(cols, phase, energy) {
    let out = '';
    const amp = Math.max(0.18, Math.min(1.0, energy));
    for (let c = 0; c < cols; c++) {
      const u = c / cols;
      const s1 = Math.sin(u * 10.0 + phase);
      const s2 = Math.cos(u * 17.0 - phase * 1.35) * 0.55;
      const s3 = Math.sin(u * 6.0 + phase * 0.7) * 0.35;
      const norm = ((s1 + s2 + s3) / 1.9) * amp * 0.5 + 0.5;
      const idx = Math.max(0, Math.min(WAVE_CHARS.length - 1, Math.floor(norm * (WAVE_CHARS.length - 1))));
      out += WAVE_CHARS[idx];
    }
    return out;
  }

  let logicalW = 320;
  let logicalH = 88;
  let cardWidthCache = 480;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = specCanvas.clientWidth;
    const ch = specCanvas.clientHeight;
    if (cw > 0 && ch > 0) {
      logicalW = cw;
      logicalH = ch;
      const pw = Math.round(cw * dpr);
      const ph = Math.round(ch * dpr);
      if (specCanvas.width !== pw || specCanvas.height !== ph) {
        specCanvas.width = pw;
        specCanvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const cardW = cardEl.clientWidth;
    if (cardW > 0) cardWidthCache = cardW;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  cardEl.addEventListener('pointerenter', () => {
    targetHover = 1;
  });
  cardEl.addEventListener('pointerleave', () => {
    targetHover = 0;
  });
  cardEl.addEventListener(
    'pointermove',
    (e) => {
      if (cardWidthCache > 0) {
        pointerX = Math.max(0.08, Math.min(0.96, e.offsetX / cardWidthCache));
      }
    },
    { passive: true }
  );

  function render(now) {
    if (!running) return;
    const t = now * 0.001;
    hoverEnergy += (targetHover - hoverEnergy) * 0.08;
    waveTick++;

    // 1. 动态音频进度条波动（无须悬停也在呼吸波动，悬停时跟随鼠标横向 Scrub 刮擦 + 高频脉动）
    const autoOsc =
      0.58 +
      0.22 * Math.sin(t * 1.35) +
      0.11 * Math.sin(t * 3.8 + 1.1) +
      0.05 * Math.cos(t * 7.4);
    const liveRatio = Math.max(
      0.08,
      Math.min(0.96, autoOsc * (1 - hoverEnergy * 0.65) + pointerX * (hoverEnergy * 0.65))
    );

    if (barEl) {
      const totalSlots = 18;
      const filled = Math.round(liveRatio * totalSlots);
      const pulseChar = (waveTick >> 2) % 2 === 0 ? '|' : ':';
      const barStr =
        '[' +
        '|'.repeat(Math.max(0, filled - 1)) +
        (filled > 0 ? pulseChar : '') +
        '.'.repeat(Math.max(0, totalSlots - filled)) +
        '] ' +
        String(Math.round(liveRatio * 100)).padStart(2, '0') +
        '%';
      barEl.textContent = barStr;
    }

    if (clockEl) {
      const totalSec = Math.floor(1122 + t * 1.5 + liveRatio * 420);
      const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const ss = String(totalSec % 60).padStart(2, '0');
      clockEl.textContent = `00:${mm}:${ss}`;
    }

    // 2. 4 行实时流动 ASCII 声波
    if (wavePreEl && waveTick % 2 === 0) {
      const energy = 0.55 + hoverEnergy * 0.38 + 0.12 * Math.sin(t * 2.4);
      const lines = [];
      for (let r = 0; r < 4; r++) {
        lines.push(buildAsciiWaveLine(30, t * (3.2 + r * 0.65) + r * 1.3, energy - r * 0.09));
      }
      wavePreEl.textContent = lines.join('\n');
    }

    // 3. 底部 Canvas：4 轨正弦干涉声波 + 32 段 LED 频谱柱 + 峰值保持光点 + 镜像倒影（零 DOM 布局读取！）
    const w = logicalW;
    const h = logicalH;
    if (w > 0 && h > 0) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      ctx.clearRect(0, 0, w, h);

      const padX = 10;
      const padY = 6;
      const usableW = w - padX * 2;
      const baselineY = h - padY - 8;
      const usableH = baselineY - padY;

      // 3a. 4 条正弦声学干涉波浪曲线（贯穿整个频谱背景）
      const waveColors = isDark
        ? [
            'rgba(32, 201, 151, 0.42)',
            'rgba(59, 201, 219, 0.36)',
            'rgba(218, 119, 242, 0.30)',
            'rgba(255, 146, 43, 0.28)',
          ]
        : [
            'rgba(12, 166, 120, 0.34)',
            'rgba(11, 114, 133, 0.30)',
            'rgba(174, 62, 201, 0.24)',
            'rgba(217, 72, 15, 0.22)',
          ];

      for (let wIdx = 0; wIdx < 4; wIdx++) {
        ctx.beginPath();
        ctx.strokeStyle = waveColors[wIdx];
        ctx.lineWidth = 1.4;
        const freq = 2.5 + wIdx * 1.15;
        const speed = (2.4 + wIdx * 0.7) * (1 + hoverEnergy * 0.45);
        const amp = usableH * (0.22 + hoverEnergy * 0.14) * (1 - wIdx * 0.12);
        const centerY = padY + usableH * 0.52;

        for (let x = 0; x <= usableW; x += 4) {
          const nx = x / usableW;
          const env = Math.sin(nx * Math.PI);
          const y =
            centerY +
            (Math.sin(nx * Math.PI * freq + t * speed + wIdx) * 0.65 +
              Math.cos(nx * Math.PI * (freq * 1.7) - t * speed * 0.8) * 0.35) *
              amp *
              env;
          if (x === 0) ctx.moveTo(padX + x, y);
          else ctx.lineTo(padX + x, y);
        }
        ctx.stroke();
      }

      // 3b. 32 段 LED 频谱柱 + 峰值保持光点 + 底部镜像弱倒影
      const cellW = usableW / COLS;
      const cellH = usableH / ROWS;
      const barW = Math.max(2, cellW - 2.5);
      const barH = Math.max(1.5, cellH - 1.6);

      for (let c = 0; c < COLS; c++) {
        const normC = c / COLS;
        const focusBoost = Math.exp(-Math.pow((normC - liveRatio) * 4.2, 2)) * (0.28 + hoverEnergy * 0.25);
        const wave1 = Math.sin(normC * 8.5 + t * (3.4 + hoverEnergy * 2.0)) * 0.5 + 0.5;
        const wave2 = Math.sin(normC * 19.0 - t * 5.1) * 0.3 + 0.3;
        const wave3 = Math.cos(normC * 4.2 + t * 2.1) * 0.25 + 0.25;
        const energy = Math.min(
          1,
          (wave1 * 0.48 + wave2 * 0.32 + wave3 * 0.2) * (0.62 + hoverEnergy * 0.35) + focusBoost
        );
        const activeRows = Math.max(1, Math.min(ROWS, Math.round(energy * ROWS)));

        if (activeRows >= peaks[c]) {
          peaks[c] = activeRows;
          peakHold[c] = 16;
        } else if (peakHold[c] > 0) {
          peakHold[c]--;
        } else if (peaks[c] > 1) {
          peaks[c] = Math.max(1, peaks[c] - 0.18);
        }
        const peakRow = Math.min(ROWS - 1, Math.round(peaks[c]) - 1);

        for (let r = 0; r < ROWS; r++) {
          const x = padX + c * cellW;
          const y = baselineY - (r + 1) * cellH;
          const isPeak = r === peakRow && peakRow > 0;
          const isActive = r < activeRows;

          if (isPeak) {
            ctx.fillStyle = isDark ? '#ffffff' : '#181a20';
          } else if (isActive) {
            const ratio = r / ROWS;
            if (ratio > 0.78) {
              ctx.fillStyle = isDark ? '#ff6b6b' : '#e03131';
            } else if (ratio > 0.52) {
              ctx.fillStyle = isDark ? '#fcc419' : '#f08c00';
            } else if (ratio > 0.26) {
              ctx.fillStyle = isDark ? '#3bc9db' : '#0b7285';
            } else {
              ctx.fillStyle = isDark ? '#20c997' : '#0ca678';
            }
          } else {
            ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(24, 26, 32, 0.05)';
          }

          ctx.fillRect(x, y, barW, barH);
        }

        // 底部镜像弱倒影
        const reflRows = Math.min(2, activeRows);
        for (let rr = 0; rr < reflRows; rr++) {
          const rx = padX + c * cellW;
          const ry = baselineY + 2 + rr * (barH + 1);
          ctx.fillStyle = isDark ? 'rgba(32, 201, 151, 0.16)' : 'rgba(12, 166, 120, 0.16)';
          ctx.fillRect(rx, ry, barW, barH * 0.8);
        }
      }
    }

    rafId = requestAnimationFrame(render);
  }

  rafId = requestAnimationFrame(render);

  return {
    pause() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    },
    resume() {
      if (!running) {
        resize();
        running = true;
        rafId = requestAnimationFrame(render);
      }
    },
  };
}

/**
 * CARD #03 (:6062 SAM BECKER PHOTOS) 1:1 EDITORIAL FULL-VIEW & LIVE EXIF/OKLCH ENGINE:
 * - Syncs topbar theme badge (☀ LIGHT / ☾ DARK) with portal [data-theme]
 * - Moving cursor across Card #03 or hovering contact strip frames switches the hero photo
 *   and live-updates the Instrument Serif title, camera/lens EXIF, Fujifilm recipe, and 5 OKLCH swatches
 */
function initSamBeckerGalleryFacade() {
  const card03 = document.getElementById('specimen-card-03');
  if (!card03) return;

  const heroImg = document.getElementById('sbp-hero-img');
  const heroCounter = document.getElementById('sbp-hero-counter');
  const crosshair = document.getElementById('sbp-hero-crosshair');
  const themePill = document.getElementById('sbp-facade-theme-pill');
  const titleEl = document.getElementById('sbp-exif-title');
  const camEl = document.getElementById('sbp-exif-camera');
  const lensEl = document.getElementById('sbp-exif-lens');
  const focalEl = document.getElementById('sbp-exif-focal');
  const fnumEl = document.getElementById('sbp-exif-fnum');
  const shutterEl = document.getElementById('sbp-exif-shutter');
  const isoEl = document.getElementById('sbp-exif-iso');
  const filmEl = document.getElementById('sbp-exif-film');
  const recipeEl = document.getElementById('sbp-exif-recipe');
  const dotsEl = document.getElementById('sbp-oklch-dots');
  const barEl = document.getElementById('sbp-oklch-bar');
  const dateEl = document.getElementById('sbp-exif-date');
  const thumbs = Array.from(card03.querySelectorAll('.sbp-thumb'));

  const CATALOG_SLIDES = [
    {
      idx: '01 / 36',
      title: 'AERIAL GOURDS #1',
      src: '/sites/03-sambecker-photos/photos/photo-xGnIrl5DjT3Nurp3.jpg',
      camera: 'FUJIFILM X-T5',
      lens: 'XF35mmF1.4 R',
      focal: '35mm <em>53mm</em>',
      fnum: 'ƒ/1.4',
      shutter: '1/4700s',
      iso: 'ISO 500',
      film: 'CLASSIC NEG.',
      recipe: 'CLASSIC CUBAN +',
      palette: ['#e98b27', '#9c3400', '#f7b753', '#fffccb', '#a08f7f'],
      date: '18 OCT 2026 · OKLCH 61.2°',
    },
    {
      idx: '07 / 36',
      title: 'CRANING',
      src: '/sites/03-sambecker-photos/photos/photo-IluPcUDtQJDKT42M.jpeg',
      camera: 'FUJIFILM X-T5',
      lens: 'XF35mmF1.4 R',
      focal: '35mm <em>53mm</em>',
      fnum: 'ƒ/1.4',
      shutter: '1/120s',
      iso: 'ISO 500',
      film: 'CLASSIC NEG.',
      recipe: 'CLASSIC CUBAN +',
      palette: ['#d9a58f', '#475886', '#b0866e', '#f0f0e4', '#31271d'],
      date: '14 OCT 2026 · OKLCH 38.4°',
    },
    {
      idx: '09 / 36',
      title: 'BRIDGE',
      src: '/sites/03-sambecker-photos/photos/photo-sKjgaHDvSur4KvrJ.jpeg',
      camera: 'FUJIFILM X-T5',
      lens: 'XF35mmF1.4 R',
      focal: '35mm <em>53mm</em>',
      fnum: 'ƒ/1.4',
      shutter: '1/240s',
      iso: 'ISO 500',
      film: 'CLASSIC NEG.',
      recipe: 'PACIFIC BLUE +',
      palette: ['#4a3c25', '#408193', '#c4b399', '#605132', '#ffffec'],
      date: '09 OCT 2026 · OKLCH 214.0°',
    },
    {
      idx: '06 / 36',
      title: 'GLEN RAYS',
      src: '/sites/03-sambecker-photos/photos/photo-Akbgou84jNGg7ezB.jpeg',
      camera: 'FUJIFILM X-T5',
      lens: 'XF35mmF1.4 R',
      focal: '35mm <em>53mm</em>',
      fnum: 'ƒ/1.4',
      shutter: '1/1100s',
      iso: 'ISO 500',
      film: 'CLASSIC CHROME',
      recipe: 'ARIZONA +',
      palette: ['#69472f', '#aa9c6f', '#504831', '#ffffff', '#0e0a07'],
      date: '02 OCT 2026 · OKLCH 78.5°',
    },
  ];

  let activeSlide = 0;

  function syncThemeBadge() {
    if (!themePill) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themePill.textContent = isDark ? '☾ DARK' : '☀ LIGHT';
  }
  syncThemeBadge();

  const themeObs = new MutationObserver(syncThemeBadge);
  themeObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  function applySlide(index) {
    if (index === activeSlide || index < 0 || index >= CATALOG_SLIDES.length) return;
    activeSlide = index;
    const s = CATALOG_SLIDES[index];

    thumbs.forEach((t, i) => t.classList.toggle('is-active', i === index));
    if (heroImg && heroImg.getAttribute('src') !== s.src) {
      heroImg.src = s.src;
    }
    if (heroCounter) heroCounter.textContent = s.idx;
    if (titleEl) titleEl.textContent = s.title;
    if (camEl) camEl.textContent = s.camera;
    if (lensEl) lensEl.textContent = s.lens;
    if (focalEl) focalEl.innerHTML = s.focal;
    if (fnumEl) fnumEl.textContent = s.fnum;
    if (shutterEl) shutterEl.textContent = s.shutter;
    if (isoEl) isoEl.textContent = s.iso;
    if (filmEl) filmEl.textContent = s.film;
    if (recipeEl) recipeEl.textContent = s.recipe;
    if (dateEl) dateEl.textContent = s.date;

    if (dotsEl) {
      dotsEl.innerHTML = s.palette.map((c) => `<i style="background:${c}"></i>`).join('');
    }
    if (barEl) {
      const [c0, c1, c2, c3, c4] = s.palette;
      barEl.style.background = `linear-gradient(90deg, ${c0} 0%, ${c1} 26%, ${c2} 54%, ${c3} 78%, ${c4} 100%)`;
    }
  }

  card03.addEventListener(
    'pointermove',
    (e) => {
      const rect = card03.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      if (crosshair) {
        const dx = ((nx - 0.5) * 34).toFixed(1);
        const dy = ((ny - 0.5) * 24).toFixed(1);
        crosshair.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }

      const targetIdx = Math.min(
        CATALOG_SLIDES.length - 1,
        Math.floor(nx * CATALOG_SLIDES.length)
      );
      applySlide(targetIdx);
    },
    { passive: true }
  );

  card03.addEventListener(
    'pointerleave',
    () => {
      if (crosshair) crosshair.style.transform = '';
      applySlide(0);
    },
    { passive: true }
  );
}

/**
 * CARD #04 (:6063 IGLOO INC) LIVE LUSION 3D WEBGL2 STAGE ENGINE:
 * - Mounts the real :6063/?embed=card 3D WebGL2 scene (3D Igloo dome + floating ice blocks + polar snow mountains)
 * - Instant polar panorama backdrop (.igloo-stage-backdrop) crossfades to live 3D WebGL2 when 'decon:igloo-ready' fires
 * - Forwards card pointermove coordinates to :6063 via postMessage('decon:igloo-pointer') for live 3D camera parallax
 * - Unmounts iframe when #fullscreen-stage opens (pauseAll) to guarantee zero GPU context contention
 */
function initCard04IglooLiveStage() {
  const cardEl = document.getElementById('specimen-card-04');
  const iframe = document.getElementById('card-04-igloo-iframe');
  if (!cardEl || !iframe) return null;

  const targetSrc = iframe.dataset.src || 'http://127.0.0.1:6063/?embed=card';
  let mounted = false;
  let readyTimer = 0;

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'decon:igloo-ready') {
      clearTimeout(readyTimer);
      iframe.classList.add('is-ready');
      if ((galleryEngines.pausedAll || state.viewMode !== 'grid') && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ type: 'decon:card-visibility', visible: false }, '*');
        } catch (_) {}
      }
    }
  });

  iframe.addEventListener('load', () => {
    if (!mounted) return;
    clearTimeout(readyTimer);
    if ((galleryEngines.pausedAll || state.viewMode !== 'grid') && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({ type: 'decon:card-visibility', visible: false }, '*');
      } catch (_) {}
    }
    // Fallback fade-in in case postMessage arrived before listener or WebGL warmup took slightly longer
    readyTimer = setTimeout(() => {
      if (mounted) iframe.classList.add('is-ready');
    }, 950);
  });

  function mountIframe() {
    if (mounted) return;
    mounted = true;
    iframe.classList.remove('is-ready');
    if (iframe.getAttribute('src') !== targetSrc) {
      iframe.setAttribute('src', targetSrc);
    }
  }

  function unmountIframe() {
    if (!mounted) return;
    mounted = false;
    clearTimeout(readyTimer);
    iframe.classList.remove('is-ready');
    iframe.setAttribute('src', 'about:blank');
  }

  // Forward pointer coordinates on Card #04 to the live :6063 3D WebGL canvas
  cardEl.addEventListener(
    'pointermove',
    (e) => {
      if (!mounted || !iframe.contentWindow) return;
      const rect = cardEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      try {
        iframe.contentWindow.postMessage({ type: 'decon:igloo-pointer', nx, ny }, '*');
      } catch (_) {}
    },
    { passive: true }
  );

  cardEl.addEventListener(
    'pointerleave',
    () => {
      if (!mounted || !iframe.contentWindow) return;
      try {
        iframe.contentWindow.postMessage({ type: 'decon:igloo-pointer', nx: 0.5, ny: 0.5 }, '*');
      } catch (_) {}
    },
    { passive: true }
  );

  // Mount immediately if visible
  mountIframe();

  return {
    pause({ unmountWebGL = false } = {}) {
      // Only unmount live 3D iframe when Fullscreen Stage opens (unmountWebGL === true);
      // keep iframe alive across grid <-> list switches for 0ms instant restore!
      if (unmountWebGL || galleryEngines.unmountWebGL) {
        unmountIframe();
      } else if (mounted && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ type: 'decon:card-visibility', visible: false }, '*');
        } catch (_) {}
      }
    },
    resume() {
      if (!mounted) {
        mountIframe();
      } else if (iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ type: 'decon:card-visibility', visible: true }, '*');
        } catch (_) {}
      }
    },
  };
}

const galleryEngines = {
  card01: null,
  card01Visible: true,
  card02: null,
  card02Visible: true,
  card04: null,
  card04Visible: true,
  pausedAll: false,
  unmountWebGL: false,
};

function pauseGalleryEngines({ unmountWebGL = false } = {}) {
  galleryEngines.pausedAll = true;
  galleryEngines.unmountWebGL = Boolean(unmountWebGL);
  galleryEngines.card01?.pause?.();
  galleryEngines.card02?.pause?.();
  galleryEngines.card04?.pause?.({ unmountWebGL: galleryEngines.unmountWebGL });
}

function resumeGalleryEngines() {
  galleryEngines.pausedAll = false;
  galleryEngines.unmountWebGL = false;
  if (state.viewMode !== 'grid') return;
  if (galleryEngines.card01Visible) galleryEngines.card01?.resume?.();
  if (galleryEngines.card02Visible) galleryEngines.card02?.resume?.();
  if (galleryEngines.card04Visible) galleryEngines.card04?.resume?.();
}

function initSpecimenCards() {
  // --- Card #01: True JPEG (1:1 :6060 #view-home Replica & Theme-Adaptive Dot-Matrix) ---
  const card01El = document.getElementById('specimen-card-01');
  galleryEngines.card01 = initCard01TrueJpegEngine();
  if (card01El && galleryEngines.card01) {
    observeVisibility(card01El, (vis) => {
      galleryEngines.card01Visible = vis;
      if (vis && !galleryEngines.pausedAll) galleryEngines.card01.resume();
      else galleryEngines.card01.pause();
    });
  }

  // --- Card #02: musicForProgramming (Theme-Adaptive Dual-Column IDE & Live Spectrum) ---
  const card02El = document.getElementById('specimen-card-02');
  galleryEngines.card02 = initCard02MfpEngine();
  if (card02El && galleryEngines.card02) {
    observeVisibility(card02El, (vis) => {
      galleryEngines.card02Visible = vis;
      if (vis && !galleryEngines.pausedAll) galleryEngines.card02.resume();
      else galleryEngines.card02.pause();
    });
  }

  // --- Card #03: Sam Becker Photos (Fujifilm Editorial Stage & 3D Fan Stack) ---
  initSamBeckerGalleryFacade();

  // --- Card #04: Igloo Inc (Live :6063/?embed=card Lusion 3D WebGL2 Stage) ---
  const card04El = document.getElementById('specimen-card-04');
  galleryEngines.card04 = initCard04IglooLiveStage();
  if (card04El && galleryEngines.card04) {
    observeVisibility(card04El, (vis) => {
      galleryEngines.card04Visible = vis;
      if (vis && !galleryEngines.pausedAll) galleryEngines.card04.resume();
      else galleryEngines.card04.pause({ unmountWebGL: false });
    });
  }

  // Clicking any specimen card (or its top-right .card-button) opens the 100vw x 100vh Fullscreen Live Stage
  document.querySelectorAll('#specimens-cards-grid .card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.specimenId;
      if (id) openFullscreenStage(id);
    });
  });
}

/* ============================================================================
   8. 100% FULL-VIEWPORT LIVE STAGE (#fullscreen-stage) & TOP-LEFT LOGO RETURN
   ============================================================================ */

function handleStageEdgeProximity(clientX, clientY) {
  if (!state.stageOpen) return;
  const lucyBtn = document.getElementById('lucy-logo-btn');
  if (!lucyBtn) return;
  const nearTopLeft = clientX <= 165 && clientY <= 105;
  if (nearTopLeft) {
    clearTimeout(lucyBtn._peekTimer);
    setLucyStagePeeking(true);
  } else if (!lucyBtn.matches(':hover') && !lucyBtn.parentElement?.matches(':hover')) {
    setLucyStagePeeking(false);
  }
}

function bindStageIframeEvents(iframeEl) {
  if (!iframeEl || iframeEl.dataset.boundStageEvents === '1') return;
  iframeEl.dataset.boundStageEvents = '1';
  iframeEl.addEventListener('load', () => {
    try {
      const cw = iframeEl.contentWindow;
      cw?.addEventListener(
        'pointermove',
        (e) => handleStageEdgeProximity(e.clientX, e.clientY),
        { passive: true }
      );
    } catch (_) {}
  });
}

function setStageIframeUrl(url) {
  const iframe = document.getElementById('stage-iframe');
  if (!iframe) return;

  // When tearing down (about:blank), replace the iframe element with a clean
  // un-navigated clone so browser session history is NEVER polluted!
  if (!url || url === 'about:blank') {
    const fresh = iframe.cloneNode(false);
    fresh.removeAttribute('src');
    delete fresh.dataset.boundStageEvents;
    delete fresh.dataset.currentUrl;
    iframe.parentNode?.replaceChild(fresh, iframe);
    bindStageIframeEvents(fresh);
    return;
  }

  if (iframe.dataset.currentUrl === url) return;

  try {
    if (iframe.contentWindow && iframe.contentWindow.location) {
      // Verify same-origin access (succeeds when iframe is at initial about:blank)
      void iframe.contentWindow.location.href;
      iframe.dataset.currentUrl = url;
      iframe.contentWindow.location.replace(url);
      return;
    }
  } catch (_) {
    // Cross-origin fallback: recreate clean about:blank iframe and location.replace on it
    const fresh = iframe.cloneNode(false);
    fresh.removeAttribute('src');
    delete fresh.dataset.boundStageEvents;
    fresh.dataset.currentUrl = url;
    iframe.parentNode?.replaceChild(fresh, iframe);
    bindStageIframeEvents(fresh);
    try {
      if (fresh.contentWindow && fresh.contentWindow.location) {
        fresh.contentWindow.location.replace(url);
        return;
      }
    } catch (_err) {}
    fresh.src = url;
    return;
  }

  iframe.dataset.currentUrl = url;
  iframe.src = url;
}

function mountFullscreenStageDOM(id) {
  const spec = SPECIMENS[id];
  if (!spec) return;
  forceResetFloatingOverlays();
  state.activeSpecimenId = id;
  state.stageOpen = true;

  document.documentElement.setAttribute('data-stage-open', 'true');
  document.documentElement.setAttribute('data-stage-specimen', id);
  document.body.classList.add('is-stage-open');
  document.getElementById('navbar')?.classList.remove('is-navbar-scrolled-down');
  document.documentElement.classList.remove('is-navbar-scrolled-down');

  // 1. Completely pause all gallery engines & unmount WebGL card iframe so stage gets 100% GPU/CPU
  pauseGalleryEngines({ unmountWebGL: true });
  stopListPreviewCanvas();
  pauseLabSandboxes();

  // 2. Park homepage gallery sections non-destructively & lock body scroll
  const headerEl = document.getElementById('header');
  const specSec = document.getElementById('specimens-section');
  const listSec = document.getElementById('exp-list-section');
  const labSec = document.getElementById('lab-view-section');
  const footerEl = document.getElementById('portal-footer');
  const stageSec = document.getElementById('fullscreen-stage');

  if (headerEl) headerEl.hidden = true;
  if (specSec) specSec.classList.add('view-panel--inactive');
  if (listSec) listSec.classList.add('view-panel--inactive');
  if (labSec) labSec.classList.add('view-panel--inactive');
  if (footerEl) footerEl.hidden = true;
  if (stageSec) stageSec.hidden = false;
  document.body.style.overflow = 'hidden';

  updateFullscreenStageIframe();

  const lucyBtn = document.getElementById('lucy-logo-btn');
  if (lucyBtn) {
    setLucyStagePeeking(true);
    clearTimeout(lucyBtn._peekTimer);
    lucyBtn._peekTimer = setTimeout(() => {
      if (!lucyBtn.matches(':hover')) {
        setLucyStagePeeking(false);
      }
    }, 1100);
  }
}

function updateFullscreenStageIframe() {
  const spec = SPECIMENS[state.activeSpecimenId];
  if (!spec) return;
  const baseUrl = state.stageMode === 'lab' ? spec.labUrl : spec.url;
  const sep = baseUrl.includes('?') ? '&' : '?';
  const targetUrl = `${baseUrl}${sep}theme=${encodeURIComponent(state.theme)}`;

  const offlineOverlay = document.getElementById('stage-offline-overlay');
  const status = state.serverStatus[spec.id] || { online: true };

  if (status.online) {
    if (offlineOverlay) offlineOverlay.hidden = true;
    setStageIframeUrl(targetUrl);
  } else {
    if (offlineOverlay) offlineOverlay.hidden = false;
    const codeEl = document.getElementById('offline-box-code');
    const startBtn = document.getElementById('btn-offline-start');
    if (codeEl) codeEl.textContent = `${spec.name.toUpperCase()} · ENGINE STANDBY`;
    if (startBtn) startBtn.textContent = `WAKE ${spec.name.toUpperCase()}`;
    // Automatically wake in background if sleeping
    wakeServers(spec.id).then(() => {
      if (state.stageOpen && state.activeSpecimenId === spec.id) {
        if (offlineOverlay) offlineOverlay.hidden = true;
        setStageIframeUrl(targetUrl);
      }
    });
  }
}

function teardownFullscreenStageDOM() {
  state.stageOpen = false;
  document.documentElement.removeAttribute('data-stage-open');
  document.documentElement.removeAttribute('data-stage-specimen');
  document.body.classList.remove('is-stage-open');

  const stageSec = document.getElementById('fullscreen-stage');
  const headerEl = document.getElementById('header');
  const footerEl = document.getElementById('portal-footer');

  setStageIframeUrl('about:blank');
  if (stageSec) stageSec.hidden = true;
  if (headerEl) headerEl.hidden = false;
  if (footerEl) footerEl.hidden = false;
  document.body.style.overflow = '';
}

function openFullscreenStage(id, initialMode = 'site', { fromPopState = false } = {}) {
  if (!SPECIMENS[id]) return;
  forceResetFloatingOverlays();
  state.stageMode = initialMode;
  if (!fromPopState) {
    try {
      window.history.pushState(
        { viewMode: state.viewMode, stageOpen: true, specimenId: id },
        '',
        `/?specimen=${id}`
      );
    } catch (_) {}
  }
  playSwitch();
  triggerLucyJump();
  pauseGalleryEngines({ unmountWebGL: false });
  stopListPreviewCanvas();
  pauseLabSandboxes();
  transitionCover.play(() => mountFullscreenStageDOM(id));
}

function closeFullscreenStage({ fromPopState = false } = {}) {
  if (!state.stageOpen) return;
  forceResetFloatingOverlays();
  setLucyStagePeeking(false);
  if (!fromPopState) {
    syncUrlHistoryForView(state.viewMode, '', { replace: true });
  }
  playSwitch();
  triggerLucyJump();
  transitionCover.play(
    () => {
      teardownFullscreenStageDOM();
      applyViewModeDOM(state.viewMode, { deferResume: true, animate: false });
    },
    () => {
      if (state.viewMode === 'grid') {
        resumeGalleryEngines();
      } else if (state.viewMode === 'lab') {
        resumeLabSandboxes();
      }
    }
  );
}

/* ============================================================================
   9. 1:1 labs.lusion.co .exp-list CHRONICLE VIEW (4 Flagship Specimens)
   ============================================================================ */

let previewLoopId = 0;
let previewActiveItem = null;

// Preloaded authentic cover images for the `list` view floating preview card
const LIST_PREVIEW_IMAGES = {};
function getListPreviewImage(src) {
  if (!LIST_PREVIEW_IMAGES[src]) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    LIST_PREVIEW_IMAGES[src] = img;
  }
  return LIST_PREVIEW_IMAGES[src];
}

// Eagerly warm cache for the authentic specimen covers used in list preview
[
  '/sites/01-truejpeg/images/149.jpg',
  '/sites/01-truejpeg/images/168.jpg',
  '/sites/03-sambecker-photos/photos/photo-IluPcUDtQJDKT42M.jpeg',
].forEach(getListPreviewImage);

// Pre-seeded 28 parallax snow particles for Specimen 04 procedural cryo-dome preview
const CRYO_SNOW_PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  x: ((i * 73 + 19) % 100) / 100,
  y: ((i * 41 + 7) % 100) / 100,
  r: 0.9 + (i % 3) * 0.55,
  speedY: 14 + (i % 5) * 6,
  driftX: 8 + (i % 4) * 4,
  phase: i * 0.7,
  alpha: 0.28 + (i % 4) * 0.14,
}));

function drawImageCover2D(ctx, img, x, y, w, h) {
  if (!img || !img.complete || !img.naturalWidth) return false;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) * 0.5;
  const sy = (ih - sh) * 0.5;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  return true;
}

function startListPreviewCanvas(item) {
  previewActiveItem = item;
  const floater = document.getElementById('list-preview-floater');
  const canvas = document.getElementById('list-preview-canvas');
  if (!floater || !canvas) return;

  const W = 480;
  const H = 300;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width = W * dpr;
    canvas.height = H * dpr;
  }

  floater.classList.add('is-visible');
  cancelAnimationFrame(previewLoopId);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const start = performance.now();

  function renderPreview(now) {
    if (!previewActiveItem) return;
    const t = (now - start) * 0.001;
    const w = W;
    const h = H;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (item.specimenId === '01') {
      // True JPEG — 149.jpg + 168.jpg curated dual fine-art showcase + acid-lime halftone overlay
      ctx.fillStyle = '#262c36';
      ctx.fillRect(0, 0, w, h);
      const imgL = getListPreviewImage('/sites/01-truejpeg/images/149.jpg');
      const imgR = getListPreviewImage('/sites/01-truejpeg/images/168.jpg');
      drawImageCover2D(ctx, imgL, 0, 0, w * 0.5 - 2, h);
      drawImageCover2D(ctx, imgR, w * 0.5 + 2, 0, w * 0.5 - 2, h);

      // Subtle halftone dot wave overlay across top banner
      ctx.fillStyle = 'rgba(24, 28, 36, 0.52)';
      ctx.fillRect(0, 0, w, 44);
      const palette = ['#c2f046', '#f7b955', '#f494a8', '#ffffff'];
      for (let x = 16; x < w - 12; x += 12) {
        const wave = Math.sin(x * 0.05 + t * 3.6) * 0.5 + 0.5;
        const r = 1.4 + wave * 2.2;
        ctx.fillStyle = palette[Math.floor((x / 12) % palette.length)];
        ctx.beginPath();
        ctx.arc(x, 22, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (item.specimenId === '02') {
      // musicForProgramming — Emerald-Violet-Magenta synth aurora + 32-band spectrum
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1e353b');
      grad.addColorStop(0.52, '#28213d');
      grad.addColorStop(1, '#332035');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.font = '500 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#20c997';
      ctx.fillText('musicForProgramming("79: Corticyte");', 20, 28);

      const cols = 28;
      const bw = (w - 40) / cols;
      for (let i = 0; i < cols; i++) {
        const amp =
          0.25 +
          0.68 *
            Math.abs(Math.sin(i * 0.32 + t * 3.8) * Math.cos(i * 0.19 - t * 2.1));
        const rows = Math.floor(amp * 10);
        for (let r = 0; r < rows; r++) {
          ctx.fillStyle =
            r > 7 ? '#f06595' : r > 5 ? '#fcc419' : r > 3 ? '#5ccfe6' : '#20c997';
          ctx.fillRect(20 + i * bw, h - 20 - r * 14, bw - 3, 10);
        }
      }
    } else if (item.specimenId === '03') {
      // Sam Becker Photos — Real Leica Q2 Craning photograph + OKLCH palette bar
      ctx.fillStyle = '#2d323e';
      ctx.fillRect(0, 0, w, h);
      const img03 = getListPreviewImage(
        '/sites/03-sambecker-photos/photos/photo-IluPcUDtQJDKT42M.jpeg'
      );
      drawImageCover2D(ctx, img03, 0, 0, w, h);

      ctx.fillStyle = 'rgba(24, 28, 36, 0.76)';
      ctx.fillRect(14, h - 42, w - 28, 28);
      const oklchColors = ['#e8a855', '#a6632c', '#f2cf7e', '#364d3b', '#26221e'];
      oklchColors.forEach((c, idx) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(32 + idx * 20, h - 28, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f4f5fa';
      ctx.fillText('CRANING · LEICA Q2 28MM', 142, h - 24);
    } else {
      // Igloo Inc — 2x Retina Real-Time Procedural 3D Polar Geodesic Cryo-Dome & Frost Reticle
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#090d14');
      bgGrad.addColorStop(0.55, '#131b26');
      bgGrad.addColorStop(1, '#1b2636');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.58;
      const domeR = 98;
      const rotY = t * 0.52;
      const tiltX = 0.34;
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);

      const project3D = (x, y, z) => {
        const rx = x * Math.cos(rotY) - z * Math.sin(rotY);
        const rz = x * Math.sin(rotY) + z * Math.cos(rotY);
        const ry = y * cosX - rz * sinX;
        const fz = y * sinX + rz * cosX;
        const persp = 360 / (360 + fz * 0.45);
        return {
          x: cx + rx * persp,
          y: cy + ry * persp,
          z: fz,
        };
      };

      // Polar subsurface volumetric glow behind the geodesic dome
      const coreGlow = ctx.createRadialGradient(cx, cy - 18, 6, cx, cy - 12, domeR * 1.32);
      coreGlow.addColorStop(0, 'rgba(165, 232, 255, 0.32)');
      coreGlow.addColorStop(0.45, 'rgba(92, 178, 245, 0.14)');
      coreGlow.addColorStop(1, 'rgba(19, 27, 38, 0)');
      ctx.fillStyle = coreGlow;
      ctx.fillRect(0, 0, w, h);

      // Frozen lake reflection plane rings
      ctx.save();
      ctx.strokeStyle = 'rgba(155, 215, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let gr = 1; gr <= 3; gr++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy + 6, domeR * (0.65 + gr * 0.26), domeR * (0.65 + gr * 0.26) * sinX, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Helper to stroke paths with 5-Tap Chromatic Aberration dual-edge dispersion (±1.2px)
      const strokeCryoPath = (buildPathFn, mainAlpha = 0.78, lineWidth = 1.15) => {
        ctx.save();
        ctx.lineWidth = lineWidth;

        // Red/Magenta dispersion shift (-1.2px)
        ctx.save();
        ctx.translate(-1.2, 0);
        ctx.strokeStyle = `rgba(255, 110, 145, ${mainAlpha * 0.34})`;
        ctx.beginPath();
        buildPathFn();
        ctx.stroke();
        ctx.restore();

        // Cyan dispersion shift (+1.2px)
        ctx.save();
        ctx.translate(1.2, 0);
        ctx.strokeStyle = `rgba(88, 232, 255, ${mainAlpha * 0.42})`;
        ctx.beginPath();
        buildPathFn();
        ctx.stroke();
        ctx.restore();

        // Core crystalline ice highlight
        ctx.strokeStyle = `rgba(210, 238, 255, ${mainAlpha})`;
        ctx.beginPath();
        buildPathFn();
        ctx.stroke();
        ctx.restore();
      };

      // 1. Geodesic Dome Latitudinal Ice Rings (5 elevations from base to crown)
      const latLevels = [0, 0.22, 0.44, 0.66, 0.85];
      const segs = 28;
      latLevels.forEach((latFrac, idx) => {
        const phi = latFrac * (Math.PI * 0.5);
        const ringR = Math.cos(phi) * domeR;
        const ringY = -Math.sin(phi) * domeR;
        strokeCryoPath(
          () => {
            for (let s = 0; s <= segs; s++) {
              const theta = (s / segs) * Math.PI * 2;
              const p = project3D(Math.cos(theta) * ringR, ringY, Math.sin(theta) * ringR);
              if (s === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            }
          },
          idx === 0 ? 0.82 : 0.62,
          idx === 0 ? 1.35 : 1.0
        );
      });

      // 2. Geodesic Meridian Ribs (12 longitudes)
      const ribs = 12;
      const ribSteps = 12;
      for (let r = 0; r < ribs; r++) {
        const theta = (r / ribs) * Math.PI * 2;
        strokeCryoPath(
          () => {
            for (let s = 0; s <= ribSteps; s++) {
              const phi = (s / ribSteps) * (Math.PI * 0.5);
              const rad = Math.cos(phi) * domeR;
              const y = -Math.sin(phi) * domeR;
              const p = project3D(Math.cos(theta) * rad, y, Math.sin(theta) * rad);
              if (s === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            }
          },
          0.54,
          0.95
        );
      }

      // 3. Internal Suspended Octahedral Cryo Core (counter-rotating)
      const coreR = 34;
      const coreCenterY = -domeR * 0.38 + Math.sin(t * 2.2) * 3.5;
      const coreRot = -t * 1.15;
      const projectCore = (x, y, z) => {
        const rx = x * Math.cos(coreRot) - z * Math.sin(coreRot);
        const rz = x * Math.sin(coreRot) + z * Math.cos(coreRot);
        const ry = (y + coreCenterY) * cosX - rz * sinX;
        const fz = (y + coreCenterY) * sinX + rz * cosX;
        const persp = 360 / (360 + fz * 0.45);
        return { x: cx + rx * persp, y: cy + ry * persp };
      };
      const topV = projectCore(0, -coreR * 1.18, 0);
      const botV = projectCore(0, coreR * 1.18, 0);
      const eqV = [
        projectCore(coreR, 0, 0),
        projectCore(0, 0, coreR),
        projectCore(-coreR, 0, 0),
        projectCore(0, 0, -coreR),
      ];
      strokeCryoPath(
        () => {
          for (let i = 0; i < 4; i++) {
            const next = eqV[(i + 1) % 4];
            ctx.moveTo(topV.x, topV.y);
            ctx.lineTo(eqV[i].x, eqV[i].y);
            ctx.lineTo(botV.x, botV.y);
            ctx.moveTo(eqV[i].x, eqV[i].y);
            ctx.lineTo(next.x, next.y);
          }
        },
        0.92,
        1.25
      );

      // 4. 28 Real-time Falling Parallax Snow Particles
      ctx.fillStyle = 'rgba(228, 244, 255, 0.85)';
      for (let i = 0; i < CRYO_SNOW_PARTICLES.length; i++) {
        const sp = CRYO_SNOW_PARTICLES[i];
        const px =
          ((sp.x * w + Math.sin(t * 1.3 + sp.phase) * sp.driftX + t * 12) % w + w) % w;
        const py = ((sp.y * h + t * sp.speedY) % h + h) % h;
        ctx.globalAlpha = sp.alpha;
        ctx.beginPath();
        ctx.arc(px, py, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 5. Four-Corner Polar Optical Reticle Brackets
      const m = 14;
      const bLen = 12;
      ctx.strokeStyle = 'rgba(210, 238, 255, 0.52)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      // Top-left
      ctx.moveTo(m, m + bLen);
      ctx.lineTo(m, m);
      ctx.lineTo(m + bLen, m);
      // Top-right
      ctx.moveTo(w - m - bLen, m);
      ctx.lineTo(w - m, m);
      ctx.lineTo(w - m, m + bLen);
      // Bottom-left
      ctx.moveTo(m, h - m - bLen);
      ctx.lineTo(m, h - m);
      ctx.lineTo(m + bLen, h - m);
      // Bottom-right
      ctx.moveTo(w - m - bLen, h - m);
      ctx.lineTo(w - m, h - m);
      ctx.lineTo(w - m, h - m - bLen);
      ctx.stroke();

      // 6. Crisp 10px IBM Plex Mono Telemetry Readouts
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(218, 240, 255, 0.86)';
      ctx.fillText('SPECIMEN 04 // PROCEDURAL CRYO-DOME', 24, 29);
      ctx.fillStyle = 'rgba(170, 212, 245, 0.72)';
      ctx.fillText('LAT 78.22°N // TEMP -15.4°C // IOR 1.31', 24, h - 20);
    }

    previewLoopId = requestAnimationFrame(renderPreview);
  }

  previewLoopId = requestAnimationFrame(renderPreview);
}

function stopListPreviewCanvas() {
  previewActiveItem = null;
  cancelAnimationFrame(previewLoopId);
  document.getElementById('list-preview-floater')?.classList.remove('is-visible');
}

function renderExpListRows() {
  const host = document.getElementById('exp-list-rows');
  if (!host || host.dataset.rendered === '1') return;

  const galleryOrder = ['01', '03', '02', '04'];
  const specimenItems = galleryOrder
    .map((id) => SPECIMENS[id])
    .filter(Boolean)
    .map((s) => ({
      specimenId: s.id,
      title: s.name,
      origin: s.origin,
      tags: s.tags,
      url: s.url,
    }));

  host.innerHTML = '';

  specimenItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'exp-list__item';
    row.innerHTML = `
      <div class="exp-list__title" data-orig-title="${item.title}">${item.title}</div>
      <div class="exp-list__origin">${item.origin}</div>
      <div class="exp-list__tags">${item.tags}</div>
      <div class="exp-list__action">
        <span class="card-button" aria-hidden="true">
          <svg class="card-button__dot" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="currentColor"/></svg>
          <svg class="card-button__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 12L12 4M12 4H5.5M12 4V10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </div>
      <div class="exp-list__hr"></div>
    `;

    row.addEventListener('pointerenter', () => {
      host.classList.add('is-hovering');
      playTick();
      const titleEl = row.querySelector('.exp-list__title');
      if (titleEl) {
        MfpUI.scrambleText(titleEl, item.title, { duration: 340 });
      }
      startListPreviewCanvas(item);
    });

    row.addEventListener('pointerleave', () => {
      host.classList.remove('is-hovering');
      stopListPreviewCanvas();
    });

    row.addEventListener('click', () => {
      host.classList.remove('is-hovering');
      stopListPreviewCanvas();
      forceResetFloatingOverlays();
      openFullscreenStage(item.specimenId);
    });

    host.appendChild(row);
  });

  host.dataset.rendered = '1';
}

/* ============================================================================
   10. COMMAND PALETTE (⌘K) & GLOBAL EVENT BINDINGS
   ============================================================================ */

const cmdPalette = createCommandPalette(
  [
    {
      label: 'True JPEG — Enter Specimen (truejpeg.com)',
      meta: 'SPECIMEN',
      section: 'FLAGSHIP SPECIMENS',
      action: () => openFullscreenStage('01'),
    },
    {
      label: 'Sam Becker Photos — Enter Specimen (photos.sambecker.com)',
      meta: 'SPECIMEN',
      section: 'FLAGSHIP SPECIMENS',
      action: () => openFullscreenStage('03'),
    },
    {
      label: 'musicForProgramming — Enter Specimen (musicforprogramming.net)',
      meta: 'SPECIMEN',
      section: 'FLAGSHIP SPECIMENS',
      action: () => openFullscreenStage('02'),
    },
    {
      label: 'Igloo Inc — Enter Specimen (igloo.inc)',
      meta: 'SPECIMEN',
      section: 'FLAGSHIP SPECIMENS',
      action: () => openFullscreenStage('04'),
    },
    {
      label: 'Open Shared-UI Component Arsenal (/lab · 30 Primitives)',
      meta: '/LAB',
      section: 'PORTAL NAVIGATION',
      action: () => {
        setViewMode('lab');
      },
    },
    {
      label: 'Switch Exhibition View: Grid / List',
      meta: 'VIEW',
      section: 'PORTAL ACTIONS',
      action: () => setViewMode(state.viewMode === 'grid' ? 'list' : 'grid'),
    },
    {
      label: 'Toggle Light / Dark Gallery Theme (T)',
      meta: 'THEME',
      section: 'PORTAL ACTIONS',
      action: () => toggleTheme(),
    },
    {
      label: 'Wake All Specimen Engines',
      meta: 'ENGINE',
      section: 'PORTAL ACTIONS',
      action: () => wakeServers('all'),
    },
    ...ALL_30_PRIMITIVES.map((p) => ({
      label: `${p.id} · ${p.name} (Open in /lab#${p.target})`,
      meta: p.target.toUpperCase(),
      section: 'SHARED-UI 30 PRIMITIVES (/LAB)',
      action: () => {
        setViewMode('lab', { targetHash: p.target });
      },
    })),
  ],
  (chosen) => {
    if (chosen && typeof chosen.action === 'function') chosen.action();
  },
  { placeholder: 'Search 4 flagship specimens, 30 shared-ui primitives (/lab), or commands...' }
);

function resolveViewModeFromLocation() {
  const pathname = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  if (
    pathname === '/lab' ||
    pathname.startsWith('/lab/') ||
    pathname === '/arsenal' ||
    urlParams.get('view') === 'lab'
  ) {
    return 'lab';
  }
  if (pathname === '/list' || urlParams.get('view') === 'list') {
    return 'list';
  }
  return 'grid';
}

function initGlobalControls() {
  // View switch buttons (grid / list / lab) — 100% True SPA in-place switch
  document.querySelectorAll('.view-switch__option').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const mode = btn.dataset.viewMode;
      if (mode) setViewMode(mode);
    });
  });

  // Intercept footer /lab links so they switch in-place without full-page reload
  document.querySelectorAll('a[href="/lab"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setViewMode('lab');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Browser Back / Forward history synchronization (Zero Black Screen on Back!)
  window.addEventListener('popstate', (e) => {
    if (state.stageOpen) {
      closeFullscreenStage({ fromPopState: true });
      return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const specimenId = e.state?.specimenId || urlParams.get('specimen');
    if (
      (e.state?.stageOpen || urlParams.has('specimen')) &&
      specimenId &&
      SPECIMENS[specimenId]
    ) {
      openFullscreenStage(specimenId, 'site', { fromPopState: true });
      return;
    }
    const targetMode = resolveViewModeFromLocation();
    setViewMode(targetMode, {
      pushHistory: false,
      targetHash: window.location.hash || '',
    });
  });

  window.addEventListener('resize', () => updateViewSwitchGlider(), { passive: true });
  setTimeout(() => updateViewSwitchGlider(), 60);

  // Theme switcher
  document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);

  // Hero scroll down (adapts to active view panel)
  document.getElementById('btn-scroll-down')?.addEventListener('click', () => {
    const targetId =
      state.viewMode === 'lab'
        ? 'tools-bar'
        : state.viewMode === 'list'
        ? 'exp-list-section'
        : 'specimens-section';
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
  });

  // Smart scroll-down navbar logo avoidance (never blocks cards when scrolling down)
  let lastScrollY = window.scrollY;
  const navbarEl = document.getElementById('navbar');
  const lucyLogoBtn = document.getElementById('lucy-logo-btn');

  window.addEventListener(
    'scroll',
    () => {
      if (state.stageOpen || !navbarEl) return;
      const curY = window.scrollY;
      const deltaY = curY - lastScrollY;
      lastScrollY = curY;

      if (curY <= 48 || deltaY < -4) {
        navbarEl.classList.remove('is-navbar-scrolled-down');
        document.documentElement.classList.remove('is-navbar-scrolled-down');
      } else if (curY > 48 && deltaY > 2) {
        navbarEl.classList.add('is-navbar-scrolled-down');
        document.documentElement.classList.add('is-navbar-scrolled-down');
        lucyLogoBtn?.classList.remove('is-expanded');
        lucyLogoBtn?.blur();
      }
    },
    { passive: true }
  );

  // Top-Left Edge-Proximity Stealth Return & Top-Edge Navbar Reveal
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!state.stageOpen && navbarEl && e.clientY <= 72) {
        navbarEl.classList.remove('is-navbar-scrolled-down');
        document.documentElement.classList.remove('is-navbar-scrolled-down');
      }
      handleStageEdgeProximity(e.clientX, e.clientY);
    },
    { passive: true }
  );

  // Listen for child site postMessage signals (Back macro / Escape / Mouse Button 4 / Top-Left wake)
  window.addEventListener('message', (e) => {
    const data = e.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'decon:stage-back') {
      if (state.stageOpen) {
        closeFullscreenStage();
      }
    } else if (data.type === 'decon:stage-top-left') {
      if (state.stageOpen) {
        setLucyStagePeeking(Boolean(data.active));
      }
    }
  });

  // Bind Escape key listener & edge-proximity wake inside #stage-iframe contentWindow on load
  const stageIframe = document.getElementById('stage-iframe');
  if (stageIframe) {
    bindStageIframeEvents(stageIframe);
  }

  document.getElementById('btn-offline-start')?.addEventListener('click', async () => {
    if (state.activeSpecimenId) {
      await wakeServers(state.activeSpecimenId);
      updateFullscreenStageIframe();
    }
  });

  // Mouse Button 4 (Back side button: e.button === 3) macro support on parent window
  const handleParentMouseBackBtn = (e) => {
    if (e.button === 3 && state.stageOpen) {
      e.preventDefault();
      closeFullscreenStage();
    }
  };
  window.addEventListener('mouseup', handleParentMouseBackBtn, true);
  window.addEventListener('auxclick', handleParentMouseBackBtn, true);

  // Keyboard shortcuts & Back macros (Escape / BrowserBack / Alt+ArrowLeft / Backspace)
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const isInput =
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      Boolean(e.target && e.target.isContentEditable);

    if (
      state.stageOpen &&
      (e.key === 'Escape' ||
        e.key === 'BrowserBack' ||
        (e.altKey && e.key === 'ArrowLeft') ||
        (!isInput && e.key === 'Backspace'))
    ) {
      e.preventDefault();
      closeFullscreenStage();
      return;
    }

    if (isInput) return;

    if (e.key === 't' || e.key === 'T') {
      toggleTheme();
    } else if (e.key === 'm' || e.key === 'M') {
      state.soundEnabled = !state.soundEnabled;
    }
  });
}

/* ============================================================================
   11. BOOTSTRAP EXHIBITION PORTAL
   ============================================================================ */

function boot() {
  const themeLbl = document.querySelector('.header__theme-label');
  if (themeLbl) {
    themeLbl.textContent = state.theme === 'dark' ? 'DARK' : 'LIGHT';
  }

  initLusionCursor();
  initLucyMascot();
  initGlobalControls();
  initSpecimenCards();

  const initialMode = resolveViewModeFromLocation();
  applyViewModeDOM(initialMode, { animate: false });

  const initSpecimen = new URLSearchParams(window.location.search).get('specimen');
  if (initSpecimen && SPECIMENS[initSpecimen]) {
    mountFullscreenStageDOM(initSpecimen);
  } else if (initialMode === 'lab' && window.location.hash) {
    setTimeout(() => {
      focusSandboxById(window.location.hash);
    }, 80);
  }

  pollServerStatus();
  setInterval(pollServerStatus, 8000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
