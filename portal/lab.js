/**
 * ============================================================================
 * DECON-WEB // STANDALONE SHARED-UI COMPONENT ARSENAL (/lab)
 * 30 Zero-Dependency ES6 Primitives · 16 Live Bento Sandboxes (SB-01 to SB-16)
 * True IntersectionObserver Viewport Sleep Scheduler for 60/120fps Performance
 * ============================================================================
 */

import { TrueJpegUI } from '/shared-ui/truejpeg-ui.js';
import { MfpUI } from '/shared-ui/mfp-ui.js';
import {
  parseExif,
  extractColorPalette,
  createShutterAudio,
  createExifPlate,
  createFilmRecipeCard,
  createOpticalLoupe,
  createCompositionOverlay,
  createCommandPalette,
} from '/shared-ui/photo-vault-ui.js';
import {
  ASCII_WAVE_FRAMES_100,
  IGLOO_PORTFOLIO_DATA,
  IGLOO_ASSET_INDEX,
  createAsciiWaveLoader,
  createCryoAudioEngine,
  createFrostCutShader,
  createCryoCubeWebGL,
  createBlurTextCylinder,
  createPolarReticleHud,
} from '/shared-ui/igloo-ui.js';

/* ============================================================================
   1. 30 PRIMITIVES DIRECTORY & LAB STATE
   ============================================================================ */

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

const state = {
  theme: 'light',
  activeFilter: 'all',
  soundEnabled: true,
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
const mfpSound = MfpUI.createSoundEngine({ enabled: true });
const shutterSound = createShutterAudio();
const cryoSound = createCryoAudioEngine();

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
   2. 1:1 LUSION TRANSITION COVER (8° Slanted 3-Layer Parallelogram Wipe)
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

const isStandaloneLabPage = !document.getElementById('specimens-section');
const transitionCover = isStandaloneLabPage
  ? createTransitionCover()
  : { play: (cb, done) => { if (cb) cb(); if (done) done(); }, playReveal: (done) => { if (done) done(); } };

/* ============================================================================
   3. 1:1 LUSION INVERTED DISC CURSOR (.cursor) & LUCY MASCOT LOGO
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
        'a, button, input, select, label, .bento-card'
      );
      cursor.classList.toggle('is-hover', Boolean(interactive));
      if (!cursorRaf) cursorRaf = requestAnimationFrame(tick);
      wakeLucyAnimation();
    },
    { passive: true }
  );
}

let triggerLucyJump = () => {};

function initLucyMascot() {
  const btn = document.getElementById('lucy-logo-btn');
  const svg = document.getElementById('lucy-svg');
  const bgRect = document.getElementById('lucy-bg');
  const clipRect = document.getElementById('lucy-clip-rect');
  const eyeL = document.getElementById('lucy-eye-l');
  const eyeR = document.getElementById('lucy-eye-r');
  const mouth = document.getElementById('lucy-mouth');

  if (!btn || !svg || !bgRect || !clipRect || !eyeL || !eyeR || !mouth) return;

  let isHovered = false;
  let pillWidth = 50;
  let targetWidth = 50;

  let eyeLX = 18;
  let eyeLY = 21;
  let eyeRX = 32;
  let eyeRY = 21;
  let eyeRadius = 3.2;
  let lucyRaf = 0;

  // Cache Lucy's center coordinates; only recompute on window resize (NEVER inside rAF)
  let lucyCenter = { x: 65, y: 52 };
  function updateLucyCenter() {
    const rect = svg.getBoundingClientRect();
    if (rect.width > 0) {
      lucyCenter.x = rect.left + 25;
      lucyCenter.y = rect.top + 25;
    }
  }
  updateLucyCenter();
  window.addEventListener('resize', updateLucyCenter, { passive: true });

  function animateLucy() {
    lucyRaf = 0;
    pillWidth += (targetWidth - pillWidth) * 0.2;
    const wStr = pillWidth.toFixed(2);
    bgRect.setAttribute('width', wStr);
    clipRect.setAttribute('width', wStr);

    let targetLX;
    let targetLY;
    let targetRX;
    let targetRY;
    let targetR;

    if (isHovered) {
      targetLX = 124;
      targetLY = 19.5;
      targetRX = 124;
      targetRY = 30.5;
      targetR = 2.3;
    } else {
      const dx = Math.max(-1, Math.min(1, (state.mouse.x - lucyCenter.x) / 280));
      const dy = Math.max(-1, Math.min(1, (state.mouse.y - lucyCenter.y) / 280));
      const offsetX = dx * 3.4;
      const offsetY = dy * 2.8;

      targetLX = 18 + offsetX;
      targetLY = 21 + offsetY;
      targetRX = 32 + offsetX;
      targetRY = 21 + offsetY;
      targetR = 3.2;

      const mx1 = (20.5 + offsetX * 0.65).toFixed(2);
      const mx2 = (29.5 + offsetX * 0.65).toFixed(2);
      const my = (31.5 + offsetY * 0.55).toFixed(2);
      mouth.setAttribute('d', `M ${mx1} ${my} A 4.8 4.8 0 0 0 ${mx2} ${my}`);
    }

    eyeLX += (targetLX - eyeLX) * 0.22;
    eyeLY += (targetLY - eyeLY) * 0.22;
    eyeRX += (targetRX - eyeRX) * 0.22;
    eyeRY += (targetRY - eyeRY) * 0.22;
    eyeRadius += (targetR - eyeRadius) * 0.22;

    eyeL.setAttribute('cx', eyeLX.toFixed(2));
    eyeL.setAttribute('cy', eyeLY.toFixed(2));
    eyeL.setAttribute('r', eyeRadius.toFixed(2));

    eyeR.setAttribute('cx', eyeRX.toFixed(2));
    eyeR.setAttribute('cy', eyeRY.toFixed(2));
    eyeR.setAttribute('r', eyeRadius.toFixed(2));

    const pillDelta = Math.abs(targetWidth - pillWidth);
    const eyeDelta =
      Math.abs(targetLX - eyeLX) +
      Math.abs(targetLY - eyeLY) +
      Math.abs(targetRX - eyeRX) +
      Math.abs(targetRY - eyeRY);

    if (pillDelta > 0.05 || eyeDelta > 0.05) {
      lucyRaf = requestAnimationFrame(animateLucy);
    }
  }

  wakeLucyAnimation = () => {
    if (!lucyRaf) {
      lucyRaf = requestAnimationFrame(animateLucy);
    }
  };

  btn.addEventListener('pointerenter', () => {
    isHovered = true;
    targetWidth = 241;
    btn.classList.add('is-expanded');
    playTick();
    wakeLucyAnimation();
  });

  btn.addEventListener('pointerleave', () => {
    isHovered = false;
    targetWidth = 50;
    btn.classList.remove('is-expanded');
    wakeLucyAnimation();
  });

  triggerLucyJump = () => {
    svg.classList.remove('is-jumping');
    void svg.offsetWidth;
    svg.classList.add('is-jumping');
  };

  btn.addEventListener('click', () => {
    playSwitch();
    triggerLucyJump();
    transitionCover.play(() => {
      try {
        sessionStorage.setItem('decon-transition-in', '1');
      } catch (_) {}
      window.location.href = '/';
    });
  });

  wakeLucyAnimation();
}

/* ============================================================================
   4. 3-WAY VIEW SWITCHER (grid | list | lab), THEME SWITCHER & FILTER
   ============================================================================ */

function updateViewSwitchGlider(mode = 'lab') {
  const bg = document.getElementById('view-switch-bg');
  if (!bg) return;
  const idx = mode === 'list' ? 1 : mode === 'lab' ? 2 : 0;
  bg.style.transform = `translateX(${idx * 100}%)`;
}

function toggleTheme() {
  const nextTheme = state.theme === 'light' ? 'dark' : 'light';
  playSwitch();
  triggerLucyJump();
  state.theme = nextTheme;
  document.documentElement.setAttribute('data-theme', nextTheme);
  const label = document.querySelector('.header__theme-label');
  if (label) {
    label.textContent = nextTheme === 'dark' ? 'DARK' : 'LIGHT';
  }
  try {
    localStorage.setItem('decon-portal-theme', nextTheme);
  } catch (_) {}
  updateViewSwitchGlider('lab');
}

function syncBentoOddTail() {
  const allCards = Array.from(document.querySelectorAll('#arsenal-bento-grid .bento-card'));
  allCards.forEach((c) => c.classList.remove('is-odd-tail'));
  const visibleSingleCards = allCards.filter(
    (c) => !c.hidden && !c.classList.contains('bento-card--full')
  );
  if (visibleSingleCards.length % 2 === 1) {
    visibleSingleCards[visibleSingleCards.length - 1].classList.add('is-odd-tail');
  }
}

function applyCategoryFilter(filterKey) {
  state.activeFilter = filterKey;
  playTick();

  document.querySelectorAll('.filter__btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.filter === filterKey);
  });

  document.querySelectorAll('#arsenal-bento-grid .bento-card').forEach((card) => {
    const cats = (card.dataset.categories || '').split(/\s+/);
    const match = filterKey === 'all' || cats.includes(filterKey);
    card.hidden = !match;
  });

  syncBentoOddTail();
}

function focusSandboxById(sandboxId) {
  if (!sandboxId) return;
  const cleanId = sandboxId.replace(/^#/, '');
  if (state.activeFilter !== 'all') {
    applyCategoryFilter('all');
  }
  const target = document.getElementById(cleanId);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document
    .querySelectorAll('.bento-card.is-highlighted')
    .forEach((el) => el.classList.remove('is-highlighted'));
  target.classList.add('is-highlighted');
  setTimeout(() => {
    target.classList.remove('is-highlighted');
  }, 2400);
}

/* ============================================================================
   5. SYNTHETIC SCENES, EXIF GENERATOR & INTERSECTION OBSERVER SCHEDULER
   ============================================================================ */

function createSyntheticCanvasScene(type = 0, w = 320, h = 220) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');

  if (type === 0) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#09090b');
    grad.addColorStop(0.55, '#2b2d38');
    grad.addColorStop(1, '#f3efe6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#faf8f2';
    ctx.beginPath();
    ctx.arc(w * 0.54, h * 0.46, h * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#141416';
    ctx.fillRect(w * 0.16, h * 0.58, w * 0.5, h * 0.32);
  } else if (type === 1) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#d97724');
    grad.addColorStop(0.55, '#a84319');
    grad.addColorStop(1, '#26150d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fbe3b5';
    ctx.beginPath();
    ctx.arc(w * 0.68, h * 0.32, h * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#8cd2ff');
    grad.addColorStop(0.5, '#dbeafe');
    grad.addColorStop(1, '#384152');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.15);
    ctx.lineTo(w * 0.82, h * 0.82);
    ctx.lineTo(w * 0.18, h * 0.82);
    ctx.closePath();
    ctx.fill();
  }
  return cv;
}

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

function createMinimalExifJpegBuffer(presetIdx = 0) {
  const presets = [
    { make: 'FUJIFILM', model: 'X-T5', iso: 160, fnum: [20, 10], exp: [1, 1250], focal: [35, 1] },
    { make: 'Leica', model: 'M11 Monochrom', iso: 125, fnum: [14, 10], exp: [1, 4000], focal: [50, 1] },
    { make: 'RICOH', model: 'GR IIIx', iso: 400, fnum: [28, 10], exp: [1, 500], focal: [40, 1] },
  ];
  const p = presets[presetIdx % presets.length];

  const buf = new ArrayBuffer(256);
  const dv = new DataView(buf);
  const writeAscii = (offset, str) => {
    for (let i = 0; i < str.length; i++) dv.setUint8(offset + i, str.charCodeAt(i));
    dv.setUint8(offset + str.length, 0);
  };

  dv.setUint16(0, 0xffd8, false);
  dv.setUint16(2, 0xffe1, false);
  dv.setUint16(4, 240, false);
  writeAscii(6, 'Exif');
  dv.setUint8(11, 0);

  const tiff = 12;
  dv.setUint16(tiff, 0x4949, false);
  dv.setUint16(tiff + 2, 0x002a, true);
  dv.setUint32(tiff + 4, 8, true);

  const ifd0 = tiff + 8;
  dv.setUint16(ifd0, 3, true);

  dv.setUint16(ifd0 + 2, 0x010f, true);
  dv.setUint16(ifd0 + 4, 2, true);
  dv.setUint32(ifd0 + 6, p.make.length + 1, true);
  dv.setUint32(ifd0 + 10, 120, true);
  writeAscii(tiff + 120, p.make);

  dv.setUint16(ifd0 + 14, 0x0110, true);
  dv.setUint16(ifd0 + 16, 2, true);
  dv.setUint32(ifd0 + 18, p.model.length + 1, true);
  dv.setUint32(ifd0 + 22, 140, true);
  writeAscii(tiff + 140, p.model);

  dv.setUint16(ifd0 + 26, 0x8769, true);
  dv.setUint16(ifd0 + 28, 4, true);
  dv.setUint32(ifd0 + 30, 1, true);
  dv.setUint32(ifd0 + 34, 52, true);

  const sub = tiff + 52;
  dv.setUint16(sub, 4, true);

  dv.setUint16(sub + 2, 0x829a, true);
  dv.setUint16(sub + 4, 5, true);
  dv.setUint32(sub + 6, 1, true);
  dv.setUint32(sub + 10, 168, true);
  dv.setUint32(tiff + 168, p.exp[0], true);
  dv.setUint32(tiff + 172, p.exp[1], true);

  dv.setUint16(sub + 14, 0x829d, true);
  dv.setUint16(sub + 16, 5, true);
  dv.setUint32(sub + 18, 1, true);
  dv.setUint32(sub + 22, 176, true);
  dv.setUint32(tiff + 176, p.fnum[0], true);
  dv.setUint32(tiff + 180, p.fnum[1], true);

  dv.setUint16(sub + 26, 0x8827, true);
  dv.setUint16(sub + 28, 3, true);
  dv.setUint32(sub + 30, 1, true);
  dv.setUint16(sub + 34, p.iso, true);

  dv.setUint16(sub + 38, 0x920a, true);
  dv.setUint16(sub + 40, 5, true);
  dv.setUint32(sub + 42, 1, true);
  dv.setUint32(sub + 46, 184, true);
  dv.setUint32(tiff + 184, p.focal[0], true);
  dv.setUint32(tiff + 188, p.focal[1], true);

  return buf;
}

/* ============================================================================
   6. 16 INTERACTIVE BENTO SANDBOXES (SB-01 TO SB-16)
   ============================================================================ */

function initPrimitiveIndexStrip() {
  // Removed 30-button primitive index strip to keep the lab first-screen layout clean and spacious.
}

let labInitialized = false;
let labViewActive = true;
const labPauseHooks = [];
const labResumeHooks = [];

function initBentoSandboxes() {
  if (labInitialized) return;
  labInitialized = true;

  initPrimitiveIndexStrip();
  syncBentoOddTail();

  document.querySelectorAll('.filter__btn').forEach((btn) => {
    if (btn.dataset.boundFilter === '1') return;
    btn.dataset.boundFilter = '1';
    btn.addEventListener('click', () => {
      applyCategoryFilter(btn.dataset.filter || 'all');
    });
  });

  const sandboxTasks = [
    // --- SB-01: TrueJpegUI.dotType ---
    () => {
      const sb01Card = document.getElementById('sb-01');
      const sb01Cv = document.getElementById('sb01-canvas');
      const sb01Input = document.getElementById('sb01-input');
      let sb01Api = null;
      let sb01Vis = true;
      if (sb01Cv) {
        sb01Api = TrueJpegUI.dotType(sb01Cv, 'LUSION LABS', { maxH: 0.22 });
        observeVisibility(sb01Card || sb01Cv, (vis) => {
          sb01Vis = vis;
          if (vis && labViewActive) {
            if (sb01Cv.width <= 320 || !sb01Cv.dataset.sizedOnce) {
              sb01Cv.dataset.sizedOnce = '1';
              sb01Api?.setText((sb01Input?.value || 'LUSION LABS').trim().toUpperCase());
            }
            sb01Api?.resume?.();
          } else {
            sb01Api?.pause?.();
          }
        });
        labPauseHooks.push(() => sb01Api?.pause?.());
        labResumeHooks.push(() => {
          if (sb01Vis) {
            sb01Api?.setText((sb01Input?.value || 'LUSION LABS').trim().toUpperCase());
            sb01Api?.resume?.();
          }
        });
      }
      sb01Input?.addEventListener('input', () => {
        const val = sb01Input.value.trim() || 'TRUE JPEG';
        sb01Api?.setText(val.toUpperCase());
      });
      document.querySelectorAll('[data-sb01-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const txt = btn.dataset.sb01Preset;
          if (sb01Input) sb01Input.value = txt;
          sb01Api?.setText(txt);
          playTick();
        });
      });
    },

    // --- SB-02: TrueJpegUI.renderHalftone ---
    () => {
      const sb02Cv = document.getElementById('sb02-canvas');
      const sb02Step = document.getElementById('sb02-step');
      const sb02StepVal = document.getElementById('sb02-step-val');
      let sb02Inverted = false;
      let sb02SceneIdx = 0;

      function renderSb02() {
        if (!sb02Cv) return;
        const step = Number(sb02Step?.value || 6);
        if (sb02StepVal) sb02StepVal.textContent = `${step}px`;
        const src = createSyntheticCanvasScene(sb02SceneIdx, 380, 210);
        const dotCol = sb02Inverted ? '#111110' : '#ececea';
        const bgCol = sb02Inverted ? '#ececea' : '#111110';
        TrueJpegUI.renderHalftone(src, sb02Cv, step, dotCol, bgCol);
      }
      renderSb02();
      sb02Step?.addEventListener('input', renderSb02);
      document.getElementById('sb02-invert-btn')?.addEventListener('click', () => {
        sb02Inverted = !sb02Inverted;
        playTick();
        renderSb02();
      });
      document.getElementById('sb02-scene-btn')?.addEventListener('click', () => {
        sb02SceneIdx = (sb02SceneIdx + 1) % 3;
        playTick();
        renderSb02();
      });
    },

    // --- SB-03: TrueJpegUI.createGlobe ---
    () => {
      const sb03Card = document.getElementById('sb-03');
      const sb03Cv = document.getElementById('sb03-canvas');
      let sb03Globe = null;
      let sb03Auto = true;
      let sb03Visible = false;
      if (sb03Cv) {
        sb03Globe = TrueJpegUI.createGlobe(sb03Cv, 164);
        observeVisibility(sb03Card || sb03Cv, (vis) => {
          sb03Visible = vis;
        });
        setInterval(() => {
          if (sb03Auto && sb03Visible && labViewActive && sb03Globe) {
            sb03Globe.spin(0.24, 240);
          }
        }, 280);
      }
      document.getElementById('sb03-spin-btn')?.addEventListener('click', () => {
        sb03Globe?.spin(Math.PI * 1.25, 900);
        playTick();
      });
      document.getElementById('sb03-fast-btn')?.addEventListener('click', () => {
        sb03Globe?.spin(Math.PI * 4, 1400);
        playSwitch();
      });
      const sb03AutoBtn = document.getElementById('sb03-auto-btn');
      sb03AutoBtn?.addEventListener('click', () => {
        sb03Auto = !sb03Auto;
        sb03AutoBtn.classList.toggle('is-active', sb03Auto);
        playTick();
      });
    },

    // --- SB-04: TrueJpegUI.drawDotHistogram & analyzeImage ---
    () => {
      const sb04Thumb = document.getElementById('sb04-thumb');
      const sb04Hist = document.getElementById('sb04-hist');
      const sb04Stat = document.getElementById('sb04-stat');
      const sb04Swatches = document.getElementById('sb04-swatches');

      function updateSb04(presetIdx = 0) {
        if (!sb04Thumb || !sb04Hist) return;
        const src = createSyntheticCanvasScene(presetIdx, 96, 68);
        sb04Thumb.getContext('2d').drawImage(src, 0, 0);
        const analysis = TrueJpegUI.analyzeImage(src, {
          histCanvas: sb04Hist,
          cols: 38,
          rows: 9,
        });
        if (!analysis) return;
        if (sb04Stat) {
          sb04Stat.textContent =
            analysis.statText ||
            `${analysis.keyLabel || 'BALANCED'} · SHD ${analysis.darkPct || 50}% · LUM ${analysis.avgLum || 50}%`;
        }
        if (sb04Swatches && Array.isArray(analysis.swatches)) {
          sb04Swatches.innerHTML = analysis.swatches
            .map(
              (hex) =>
                `<span class="sb04-swatch" style="background:${hex}" title="${hex}"></span>`
            )
            .join('');
        }
      }
      updateSb04(0);
      document.querySelectorAll('[data-sb04-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
          document
            .querySelectorAll('[data-sb04-preset]')
            .forEach((b) => b.classList.toggle('is-active', b === btn));
          updateSb04(Number(btn.dataset.sb04Preset || 0));
          playTick();
        });
      });
    },

    // --- SB-05: winFrame, createWipe & scramble ---
    () => {
      const sb05Win = document.getElementById('sb05-win');
      const sb05Target = document.getElementById('sb05-scramble-target');
      const wipeCanvas = document.getElementById('portal-wipe-canvas');
      if (sb05Win) TrueJpegUI.winFrame(sb05Win);
      const wipeTrigger = wipeCanvas ? TrueJpegUI.createWipe(wipeCanvas) : null;

      const langTexts = {
        en: 'OPTICAL HALFTONE DARKROOM',
        ja: '光学網点暗室ラボラトリー',
        zh: '光学网点暗房标本实验室',
      };
      document.querySelectorAll('[data-sb05-lang]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const lang = btn.dataset.sb05Lang || 'en';
          if (sb05Target) {
            TrueJpegUI.scramble(sb05Target, langTexts[lang] || langTexts.en, lang);
          }
          playTick();
        });
      });
      document.getElementById('sb05-wipe-btn')?.addEventListener('click', (e) => {
        if (wipeTrigger) {
          wipeTrigger(e, () => showToast('Honeycomb radial dot-wave transition complete.'));
        }
      });
    },

    // --- SB-06: MfpUI.createAsciiBar & scrambleText ---
    () => {
      const sb06Prog = document.getElementById('sb06-bar-progress');
      const sb06Vol = document.getElementById('sb06-bar-volume');
      const sb06Title = document.getElementById('sb06-title');
      if (sb06Prog) {
        MfpUI.createAsciiBar(sb06Prog, {
          width: 24,
          value: 0.64,
          prefix: 'POS: ',
          sound: mfpSound,
          formatSuffix: (v) => `${Math.round(v * 58)}:24 / 58:24`,
        });
      }
      if (sb06Vol) {
        MfpUI.createAsciiBar(sb06Vol, {
          width: 24,
          value: 0.82,
          prefix: 'VOL: ',
          sound: mfpSound,
          formatSuffix: (v) => `${Math.round(v * 100)}%`,
        });
      }
      document.querySelectorAll('[data-sb06-ep]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (sb06Title) MfpUI.scrambleText(sb06Title, btn.dataset.sb06Ep);
          playTick();
        });
      });
    },

    // --- SB-07: MfpUI.createSpectrum & createAmbientPad ---
    () => {
      const sb07Card = document.getElementById('sb-07');
      const sb07Host = document.getElementById('sb07-spectrum-host');
      const sb07PlayBtn = document.getElementById('sb07-play-btn');
      const sb07ModeBtn = document.getElementById('sb07-mode-btn');
      const sb07Select = document.getElementById('sb07-chord-select');
      const sb07Cutoff = document.getElementById('sb07-cutoff');
      const sb07CutoffVal = document.getElementById('sb07-cutoff-val');
      const sb07ChordName = document.getElementById('sb07-chord-name');
      const sb07WaveOut = document.getElementById('sb07-wave-out');

      let sb07Pad = null;
      let sb07Mode = 'dots';
      let sb07Visible = false;
      const sb07Spec = sb07Host
        ? MfpUI.createSpectrum(sb07Host, { mode: 'dots', simulated: true })
        : null;
      if (sb07Spec) {
        observeVisibility(sb07Card || sb07Host, (vis) => {
          sb07Visible = vis;
          if (vis && labViewActive) sb07Spec.start();
          else sb07Spec.stop();
        });
        labPauseHooks.push(() => sb07Spec.stop());
        labResumeHooks.push(() => {
          if (sb07Visible) sb07Spec.start();
        });
      }

      if (sb07WaveOut) {
        const waveFrames7 = [
          "                       _.-+:*^~'",
          "               _.-+:*^~'        ",
          "       _.-+:*^~'                ",
          "_.-+:*^~'                       ",
        ];
        let p7 = 0;
        setInterval(() => {
          if (!sb07Visible || !labViewActive) return;
          p7 = (p7 + 1) % waveFrames7.length;
          sb07WaveOut.textContent = waveFrames7[p7];
        }, 220);
      }

      sb07PlayBtn?.addEventListener('click', () => {
        if (!sb07Pad) {
          sb07Pad = MfpUI.createAmbientPad({ preset: 0, cutoff: 520, volume: 0.22 });
        }
        const active = sb07Pad.toggle();
        sb07PlayBtn.textContent = active ? 'STOP AMBIENT PAD' : 'START AMBIENT PAD';
      });

      sb07ModeBtn?.addEventListener('click', () => {
        sb07Mode = sb07Mode === 'dots' ? 'ascii' : 'dots';
        sb07Spec?.setMode(sb07Mode);
        playTick();
      });

      sb07Select?.addEventListener('change', () => {
        const idx = Number(sb07Select.value || 0);
        const info = sb07Pad ? sb07Pad.setPreset(idx) : MfpUI.AMBIENT_CHORDS?.[idx];
        if (sb07ChordName && info) sb07ChordName.textContent = info.name;
        playTick();
      });

      sb07Cutoff?.addEventListener('input', () => {
        const hz = Number(sb07Cutoff.value || 520);
        if (sb07CutoffVal) sb07CutoffVal.textContent = `${hz}Hz`;
        sb07Pad?.setCutoff(hz);
      });
    },

    // --- SB-08: MfpUI.createFlowTimer ---
    () => {
      const sb08Host = document.getElementById('sb08-timer-host');
      const sb08Timer = sb08Host
        ? MfpUI.createFlowTimer(sb08Host, { sound: mfpSound, defaultMinutes: 25 })
        : null;
      document.getElementById('sb08-demo3s-btn')?.addEventListener('click', () => {
        sb08Timer?.reset(3);
        sb08Timer?.start();
      });
      document.getElementById('sb08-chime-btn')?.addEventListener('click', () => {
        mfpSound.chime();
      });
    },

    // --- SB-09: createFilmRecipeCard & createExifPlate ---
    () => {
      const sb09ExifHost = document.getElementById('sb09-exif-host');
      const sb09RecipeHost = document.getElementById('sb09-recipe-host');
      let sb09Pro = true;
      let sb09Idx = 0;

      const sb09Recipes = [
        {
          title: 'Classic Cuban Negative',
          camera: 'FUJIFILM X-T5',
          lens: 'XF 35mm f/1.4 R',
          focalLength: '35mm',
          aperture: 'f/2.0',
          shutter: '1/1250s',
          iso: '160',
          filmSimulation: 'Classic Chrome',
          dynamicRange: 'DR400',
          grain: 'Weak · Large',
          wb: 'Auto (R+4, B-5)',
          highlightTone: -1.5,
          shadowTone: +1.5,
          colorShift: '+2',
          palette: ['#C88A4B', '#7B4E34', '#D7B66E', '#EDE8D8', '#3B423E'],
        },
        {
          title: 'Kodak Portra 400 v2',
          camera: 'FUJIFILM X100VI',
          lens: '23mm f/2.0 II',
          focalLength: '23mm',
          aperture: 'f/2.8',
          shutter: '1/640s',
          iso: '320',
          filmSimulation: 'Classic Neg.',
          dynamicRange: 'DR200',
          grain: 'Strong · Small',
          wb: '5200K (R+2, B-4)',
          highlightTone: -1.0,
          shadowTone: -0.5,
          colorShift: '+1',
          palette: ['#D49B6A', '#8C583A', '#E6C79C', '#F4EFE6', '#2F3640'],
        },
        {
          title: 'Neopan Acros + Red Filter',
          camera: 'FUJIFILM X-Pro3',
          lens: 'XF 50mm f/1.0 R WR',
          focalLength: '50mm',
          aperture: 'f/1.4',
          shutter: '1/4000s',
          iso: '160',
          filmSimulation: 'Acros + R',
          dynamicRange: 'DR200',
          grain: 'Strong · Large',
          wb: 'Daylight (R0, B0)',
          highlightTone: +2.0,
          shadowTone: +2.5,
          colorShift: 'Mono',
          palette: ['#1E1E1E', '#525252', '#8A8A8A', '#C7C7C7', '#F2F2F2'],
        },
      ];

      function renderSb09() {
        const data = sb09Recipes[sb09Idx % sb09Recipes.length];
        if (sb09ExifHost) createExifPlate(sb09ExifHost, data, { proMode: sb09Pro });
        if (sb09RecipeHost) createFilmRecipeCard(sb09RecipeHost, data);
      }
      renderSb09();

      document.querySelectorAll('[data-sb09-recipe]').forEach((btn) => {
        btn.addEventListener('click', () => {
          sb09Idx = Number(btn.dataset.sb09Recipe || 0);
          document
            .querySelectorAll('[data-sb09-recipe]')
            .forEach((b) => b.classList.toggle('is-active', b === btn));
          renderSb09();
          playTick();
        });
      });
      document.getElementById('sb09-pro-btn')?.addEventListener('click', () => {
        sb09Pro = !sb09Pro;
        renderSb09();
        playTick();
      });
    },

    // --- SB-10: createOpticalLoupe & createCompositionOverlay ---
    () => {
      const sb10Stage = document.getElementById('sb10-stage');
      const sb10Img = document.getElementById('sb10-img');
      if (sb10Img) {
        sb10Img.src = '/sites/03-sambecker-photos/photos/photo-b4k539C292RuIEAD.jpeg';
      }
      const sb10Loupe =
        sb10Stage && sb10Img
          ? createOpticalLoupe(sb10Stage, sb10Img, { enabled: true, zoom: 2.5 })
          : null;
      const sb10Comp = sb10Stage
        ? createCompositionOverlay(sb10Stage, { mode: 'phi' })
        : null;

      const sb10LoupeBtn = document.getElementById('sb10-loupe-btn');
      sb10LoupeBtn?.addEventListener('click', () => {
        const on = sb10Loupe?.toggle();
        sb10LoupeBtn.classList.toggle('is-active', Boolean(on));
        sb10LoupeBtn.textContent = on ? 'LOUPE ON' : 'LOUPE OFF';
      });
      const sb10GridBtn = document.getElementById('sb10-grid-btn');
      sb10GridBtn?.addEventListener('click', () => {
        const next = sb10Comp?.cycleMode();
        if (next) sb10GridBtn.textContent = `GRID: ${next.toUpperCase()}`;
        playTick();
      });
      document.getElementById('sb10-shutter-btn')?.addEventListener('click', () => {
        shutterSound.playShutter();
      });
    },

    // --- SB-11: parseExif & extractColorPalette ---
    () => {
      const sb11Kv = document.getElementById('sb11-kv-grid');
      const sb11Palette = document.getElementById('sb11-palette-row');
      const sb11FileInput = document.getElementById('sb11-file-input');

      function inspectBinaryPreset(presetIdx = 0) {
        const buf = createMinimalExifJpegBuffer(presetIdx);
        const parsed = parseExif(buf) || {};
        const sceneCv = createSyntheticCanvasScene(presetIdx, 180, 120);
        const res = extractColorPalette(sceneCv, 5) || {};
        const rawPalette = Array.isArray(res) ? res : (res.palette || []);
        const defaultShares = [34, 24, 18, 14, 10];

        if (sb11Kv) {
          sb11Kv.innerHTML = `
            <div>MAKE: <strong>${parsed.make || 'FUJIFILM'}</strong></div>
            <div>MODEL: <strong>${parsed.model || 'X-T5'}</strong></div>
            <div>SHUTTER: <strong>${parsed.shutter || '1/1250s'}</strong></div>
            <div>APERTURE: <strong>${parsed.aperture || 'f/2.0'}</strong></div>
            <div>ISO: <strong>${parsed.iso || 160}</strong></div>
            <div>FOCAL: <strong>${parsed.focalLength || '35mm'}</strong></div>
          `;
        }
        if (sb11Palette) {
          sb11Palette.innerHTML = rawPalette
            .map((c, idx) => {
              const hex = typeof c === 'string' ? c : (c?.hex || '#64748B');
              const share =
                typeof c === 'object' && c?.share != null
                  ? c.share
                  : defaultShares[idx] || Math.round(100 / Math.max(1, rawPalette.length));
              return `<div class="sb11-chip" style="background:${hex};" title="${hex}"><span>${hex}</span><b>${share}%</b></div>`;
            })
            .join('');
        }
      }
      inspectBinaryPreset(0);

      document.querySelectorAll('[data-sb11-bin]').forEach((btn) => {
        btn.addEventListener('click', () => {
          document
            .querySelectorAll('[data-sb11-bin]')
            .forEach((b) => b.classList.toggle('is-active', b === btn));
          inspectBinaryPreset(Number(btn.dataset.sb11Bin || 0));
          playTick();
        });
      });

      sb11FileInput?.addEventListener('change', async () => {
        const file = sb11FileInput.files?.[0];
        if (!file) return;
        try {
          const buf = await file.arrayBuffer();
          const parsed = parseExif(buf) || {};
          if (sb11Kv) {
            sb11Kv.innerHTML = `
              <div>MAKE: <strong>${parsed.make || 'CUSTOM'}</strong></div>
              <div>MODEL: <strong>${parsed.model || file.name.slice(0, 12)}</strong></div>
              <div>SHUTTER: <strong>${parsed.shutter || 'N/A'}</strong></div>
              <div>APERTURE: <strong>${parsed.aperture || 'N/A'}</strong></div>
              <div>ISO: <strong>${parsed.iso || 'N/A'}</strong></div>
              <div>FOCAL: <strong>${parsed.focalLength || 'N/A'}</strong></div>
            `;
          }
          showToast(`Parsed EXIF from ${file.name}`);
        } catch {
          showToast('Could not parse EXIF from file.');
        }
      });
    },

    // --- SB-12: createFrostCutShader (with true IntersectionObserver pause/resume) ---
    () => {
      const sb12Card = document.getElementById('sb-12');
      const sb12Cv = document.getElementById('sb12-canvas');
      const sb12Prog = document.getElementById('sb12-progress');
      const sb12Ca = document.getElementById('sb12-ca');
      const sb12Frost = document.getElementById('sb12-frost');
      let sb12Vis = false;
      const sb12Shader = sb12Cv
        ? createFrostCutShader(sb12Cv, {
            initialProgress: 0.46,
            chromaticStrength: 1.15,
            frostDensity: 1.0,
          })
        : null;

      if (sb12Shader && sb12Card) {
        observeVisibility(sb12Card, (vis) => {
          sb12Vis = vis;
          if (vis && labViewActive) sb12Shader.resume();
          else sb12Shader.pause();
        });
        labPauseHooks.push(() => sb12Shader.pause());
        labResumeHooks.push(() => {
          if (sb12Vis) sb12Shader.resume();
        });
      }

      sb12Prog?.addEventListener('input', () => {
        const v = Number(sb12Prog.value);
        document.getElementById('sb12-prog-val').textContent = v.toFixed(2);
        sb12Shader?.setProgress(v);
      });
      sb12Ca?.addEventListener('input', () => {
        const v = Number(sb12Ca.value);
        document.getElementById('sb12-ca-val').textContent = v.toFixed(2);
        sb12Shader?.setChromaticStrength(v);
      });
      sb12Frost?.addEventListener('input', () => {
        const v = Number(sb12Frost.value);
        document.getElementById('sb12-frost-val').textContent = v.toFixed(2);
        sb12Shader?.setFrostDensity(v);
      });
      document.getElementById('sb12-sweep-btn')?.addEventListener('click', () => {
        if (sb12Shader) {
          sb12Shader.resume();
          let sweepT = 0;
          const sweepTimer = setInterval(() => {
            sweepT += 0.05;
            const p = sweepT <= 1 ? sweepT : Math.max(0.46, 2 - sweepT);
            sb12Shader.setProgress(p);
            if (sb12Prog) sb12Prog.value = p.toFixed(2);
            const valEl = document.getElementById('sb12-prog-val');
            if (valEl) valEl.textContent = p.toFixed(2);
            if (sweepT >= 1.54) clearInterval(sweepTimer);
          }, 30);
        }
        if (state.soundEnabled) cryoSound.playEnterCube();
      });
    },

    // --- SB-13: createCryoCubeWebGL (with true IntersectionObserver pause/resume) ---
    () => {
      const sb13Card = document.getElementById('sb-13');
      const sb13Cv = document.getElementById('sb13-canvas');
      let sb13Vis = false;
      const sb13Cube = sb13Cv
        ? createCryoCubeWebGL(sb13Cv, {
            specimen: 0,
            frostThickness: 0.42,
            ior: 1.31,
          })
        : null;

      if (sb13Cube && sb13Card) {
        observeVisibility(sb13Card, (vis) => {
          sb13Vis = vis;
          if (vis && labViewActive) sb13Cube.resume();
          else sb13Cube.pause();
        });
        labPauseHooks.push(() => sb13Cube.pause());
        labResumeHooks.push(() => {
          if (sb13Vis) sb13Cube.resume();
        });
      }

      document.querySelectorAll('[data-sb13-spec]').forEach((btn) => {
        btn.addEventListener('click', () => {
          document
            .querySelectorAll('[data-sb13-spec]')
            .forEach((b) => b.classList.toggle('is-active', b === btn));
          sb13Cube?.setSpecimen(Number(btn.dataset.sb13Spec || 0));
          playTick();
        });
      });
      document.getElementById('sb13-frost')?.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        document.getElementById('sb13-frost-val').textContent = v.toFixed(2);
        sb13Cube?.setFrostThickness(v);
      });
      document.getElementById('sb13-ior')?.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        document.getElementById('sb13-ior-val').textContent = v.toFixed(2);
        sb13Cube?.setIOR(v);
      });
      document.getElementById('sb13-explode-btn')?.addEventListener('click', () => {
        sb13Cube?.triggerExplode();
        if (state.soundEnabled) cryoSound.playShard();
      });
    },

    // --- SB-14: createAsciiWaveLoader & createBlurTextCylinder (Zero ctx.filter + IntersectionObserver) ---
    () => {
      const sb14Card = document.getElementById('sb-14');
      const sb14LoaderHost = document.getElementById('sb14-loader-host');
      const sb14CylCv = document.getElementById('sb14-cylinder-canvas');
      let sb14Vis = false;
      const sb14Loader = sb14LoaderHost
        ? createAsciiWaveLoader(sb14LoaderHost, { speed: 1.0 })
        : null;
      const sb14Cyl = sb14CylCv
        ? createBlurTextCylinder(sb14CylCv, { blurRadius: 6.5, speed: 0.65 })
        : null;

      if (sb14Card) {
        observeVisibility(sb14Card, (vis) => {
          sb14Vis = vis;
          if (vis && labViewActive) {
            sb14Loader?.resume?.();
            sb14Cyl?.resume?.();
          } else {
            sb14Loader?.pause?.();
            sb14Cyl?.pause?.();
          }
        });
        labPauseHooks.push(() => {
          sb14Loader?.pause?.();
          sb14Cyl?.pause?.();
        });
        labResumeHooks.push(() => {
          if (sb14Vis) {
            sb14Loader?.resume?.();
            sb14Cyl?.resume?.();
          }
        });
      }

      document.getElementById('sb14-blur')?.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        document.getElementById('sb14-blur-val').textContent = `${v.toFixed(1)}px`;
        sb14Cyl?.setBlurRadius(v);
      });
      document.getElementById('sb14-decode-btn')?.addEventListener('click', () => {
        if (sb14Loader?.scrambleText) {
          sb14Loader.scrambleText('////// LUSION CRYO MANIFESTO :: 2026', 540);
        }
        playTick();
      });
    },

    // --- SB-15: createPolarReticleHud & IGLOO_ASSET_INDEX ---
    () => {
      const sb15Card = document.getElementById('sb-15');
      const sb15Stage = document.getElementById('sb15-hud-stage');
      const sb15Readout = document.getElementById('sb15-asset-readout');
      let sb15Vis = false;
      const sb15Hud = sb15Stage
        ? createPolarReticleHud(sb15Stage, { depthProgress: 0, gridVisible: false })
        : null;

      if (sb15Card && sb15Hud) {
        observeVisibility(sb15Card, (vis) => {
          sb15Vis = vis;
          if (vis && labViewActive) sb15Hud.resume?.();
          else sb15Hud.pause?.();
        });
        labPauseHooks.push(() => sb15Hud.pause?.());
        labResumeHooks.push(() => {
          if (sb15Vis) sb15Hud.resume?.();
        });
      }

      if (sb15Readout) {
        sb15Readout.innerHTML = `
          <div>WAVE FRAMES: ${ASCII_WAVE_FRAMES_100.length} · SPECIMENS: ${IGLOO_PORTFOLIO_DATA.specimens.length} MONOLITHS</div>
          <div>DRC MESHES: ${Array.isArray(IGLOO_ASSET_INDEX) ? IGLOO_ASSET_INDEX.filter((a) => a.cat === 'DRC').length : 22} · TOTAL ASSETS: ${Array.isArray(IGLOO_ASSET_INDEX) ? IGLOO_ASSET_INDEX.length : 83}</div>
        `;
      }
      document.getElementById('sb15-depth')?.addEventListener('input', (e) => {
        const p = Number(e.target.value);
        const meters = (32 - p * 80).toFixed(1);
        document.getElementById('sb15-depth-val').textContent =
          `${meters >= 0 ? '+' : ''}${meters}m`;
        sb15Hud?.setDepthProgress(p);
      });
      document.getElementById('sb15-grid-btn')?.addEventListener('click', () => {
        sb15Hud?.toggleGrid?.();
        playTick();
      });
    },

    // --- SB-16: Cross-Site Web Audio Synthesizer Matrix + Copy Import buttons ---
    () => {
      const sb16Card = document.getElementById('sb-16');
      const oscCanvas = document.getElementById('sb16-osc-canvas');
      const lastTrig = document.getElementById('sb16-last-triggered');
      let oscEnergy = 0.08;
      let sb16Visible = false;

      if (oscCanvas) {
        const octx = oscCanvas.getContext('2d');
        let phase16 = 0;
        let oscRaf = 0;
        function drawOsc() {
          oscRaf = 0;
          if (!sb16Visible || !labViewActive) return;
          phase16 += 0.14;
          oscEnergy = Math.max(0.06, oscEnergy * 0.94);
          const w = oscCanvas.width;
          const h = oscCanvas.height;
          octx.clearRect(0, 0, w, h);
          octx.strokeStyle = '#ffffff';
          octx.lineWidth = 1.6;
          octx.beginPath();
          for (let x = 0; x < w; x += 3) {
            const y =
              h / 2 +
              Math.sin(x * 0.045 + phase16) *
                Math.cos(x * 0.018 - phase16 * 0.7) *
                (h * 0.42 * oscEnergy);
            if (x === 0) octx.moveTo(x, y);
            else octx.lineTo(x, y);
          }
          octx.stroke();
          oscRaf = requestAnimationFrame(drawOsc);
        }
        observeVisibility(sb16Card || oscCanvas, (vis) => {
          sb16Visible = vis;
          if (vis && labViewActive && !oscRaf) oscRaf = requestAnimationFrame(drawOsc);
        });
        labPauseHooks.push(() => {
          if (oscRaf) {
            cancelAnimationFrame(oscRaf);
            oscRaf = 0;
          }
        });
        labResumeHooks.push(() => {
          if (sb16Visible && !oscRaf) oscRaf = requestAnimationFrame(drawOsc);
        });
      }

      document.querySelectorAll('[data-sound]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.sound;
          oscEnergy = 1.0;
          if (lastTrig) lastTrig.textContent = `TRIGGERED: ${key.toUpperCase()}`;

          switch (key) {
            case 'tj-tick':
              tjSound.tick();
              break;
            case 'tj-switch':
              tjSound.switch();
              break;
            case 'tj-shutter':
              tjSound.shutter();
              break;
            case 'tj-copy':
              tjSound.copy();
              break;
            case 'tj-ambient': {
              const nextOn = !tjSound.isOn();
              tjSound.ambient(nextOn);
              btn.classList.toggle('is-active', nextOn);
              btn.textContent = nextOn ? 'Darkroom Hum: On' : 'Darkroom Hum: Off';
              break;
            }
            case 'mfp-beep':
              mfpSound.beep();
              break;
            case 'mfp-tick':
              mfpSound.tick();
              break;
            case 'mfp-switch':
              mfpSound.switch();
              break;
            case 'mfp-chime':
              mfpSound.chime();
              break;
            case 'sb-shutter':
              shutterSound.playShutter();
              break;
            case 'sb-aperture':
              shutterSound.playApertureClick();
              break;
            case 'ig-beep1':
              cryoSound.playBeep();
              break;
            case 'ig-shard':
              cryoSound.playShard();
              break;
            case 'ig-dive':
              cryoSound.playEnterCube();
              break;
            case 'ig-wind': {
              const on = cryoSound.toggleArcticWind();
              btn.classList.toggle('is-active', on);
              btn.textContent = on ? 'Arctic Blizzard: On' : 'Arctic Blizzard: Off';
              break;
            }
          }
        });
      });

      document.querySelectorAll('[data-copy-code]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const code = (btn.dataset.copyCode || '').replace(/\\n/g, '\n');
          try {
            await navigator.clipboard.writeText(code);
          } catch {
            /* ignore */
          }
          if (state.soundEnabled) tjSound.copy();
          showToast('ESM import snippet copied to clipboard.');
        });
      });
    },
  ];

  let taskIdx = 0;
  function runNextBatch() {
    if (taskIdx >= sandboxTasks.length) return;
    const batchSize = labViewActive ? 3 : 1;
    const end = Math.min(taskIdx + batchSize, sandboxTasks.length);
    while (taskIdx < end) {
      try {
        sandboxTasks[taskIdx]();
      } catch (err) {
        console.warn('[Lab Sandbox Init Error]', taskIdx, err);
      }
      taskIdx++;
    }
    if (taskIdx < sandboxTasks.length) {
      if (labViewActive) {
        requestAnimationFrame(runNextBatch);
      } else if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(runNextBatch, { timeout: 600 });
      } else {
        setTimeout(runNextBatch, 32);
      }
    } else if (!labViewActive) {
      pauseLabSandboxes();
    }
  }
  runNextBatch();
}

export function ensureLabInitialized({ active = true } = {}) {
  labViewActive = Boolean(active);
  if (!labInitialized) {
    initBentoSandboxes();
  } else if (labViewActive) {
    resumeLabSandboxes();
  }
}

export function pauseLabSandboxes() {
  labViewActive = false;
  for (let i = 0; i < labPauseHooks.length; i += 1) {
    labPauseHooks[i]();
  }
}

export function resumeLabSandboxes() {
  labViewActive = true;
  for (let i = 0; i < labResumeHooks.length; i += 1) {
    labResumeHooks[i]();
  }
}

export { applyCategoryFilter, focusSandboxById };

/* ============================================================================
   7. MAGNETIC DOCK, COMMAND PALETTE (⌘K) & GLOBAL CONTROLS (Standalone /lab.html fallback)
   ============================================================================ */

let cmdPalette = null;

function initMagneticDock() {
  const dock = document.getElementById('portal-dock');
  if (!dock) return;
  const items = Array.from(dock.querySelectorAll('.dock-item'));

  dock.addEventListener('pointermove', (e) => {
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(e.clientX - center);
      const scale = Math.max(1, 1.22 - dist / 260);
      item.style.transform = `scale(${scale.toFixed(3)}) translateY(${((1 - scale) * 10).toFixed(1)}px)`;
    });
  });

  dock.addEventListener('pointerleave', () => {
    items.forEach((item) => {
      item.style.transform = '';
    });
  });

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.dataset.dockAction;
      if (action === 'exhibition') {
        window.location.href = '/';
      } else if (action?.startsWith('filter-')) {
        items.forEach((i) => i.classList.toggle('is-active', i === item));
        applyCategoryFilter(action.replace('filter-', ''));
      } else if (action === 'cmd') {
        cmdPalette?.open();
      } else if (action === 'theme') {
        toggleTheme();
      }
    });
  });
}

function initGlobalControls() {
  updateViewSwitchGlider('lab');

  document.querySelectorAll('.view-switch__option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.viewMode;
      if (!mode || mode === 'lab') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      playSwitch();
      triggerLucyJump();
      document.querySelectorAll('.view-switch__option').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.viewMode === mode);
      });
      updateViewSwitchGlider(mode);
      window.location.href = mode === 'list' ? '/?view=list' : '/';
    });
  });

  document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);

  document.getElementById('btn-scroll-down')?.addEventListener('click', () => {
    document.getElementById('tools-bar')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Scroll-down navbar avoidance for standalone /lab.html
  let lastScrollY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const curY = window.scrollY;
      const navbar = document.getElementById('navbar');
      if (curY > 48 && curY > lastScrollY + 4) {
        navbar?.classList.add('is-navbar-scrolled-down');
        document.documentElement.classList.add('is-navbar-scrolled-down');
      } else if (curY < lastScrollY - 6 || curY <= 36) {
        navbar?.classList.remove('is-navbar-scrolled-down');
        document.documentElement.classList.remove('is-navbar-scrolled-down');
      }
      lastScrollY = curY;
    },
    { passive: true }
  );

  window.addEventListener('keydown', (e) => {
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'SELECT'
    ) {
      return;
    }
    if (e.key === 't' || e.key === 'T') {
      toggleTheme();
    } else if (e.key === 'm' || e.key === 'M') {
      state.soundEnabled = !state.soundEnabled;
    }
  });

  window.addEventListener('hashchange', () => {
    if (window.location.hash) {
      focusSandboxById(window.location.hash);
    }
  });
}

/* ============================================================================
   8. BOOTSTRAP LAB ARSENAL (Only when /lab.html is loaded standalone)
   ============================================================================ */

function boot() {
  if (!isStandaloneLabPage) return;

  cmdPalette = createCommandPalette(
    [
      {
        label: '← Return to Main Exhibition Portal (/)',
        meta: 'EXHIBITION',
        section: 'NAVIGATION',
        action: () => {
          window.location.href = '/';
        },
      },
      {
        label: 'Toggle Light / Dark Gallery Theme (T)',
        meta: 'THEME',
        section: 'LAB ACTIONS',
        action: () => toggleTheme(),
      },
      {
        label: 'Show All 16 Bento Sandboxes',
        meta: 'FILTER',
        section: 'LAB ACTIONS',
        action: () => applyCategoryFilter('all'),
      },
      ...ALL_30_PRIMITIVES.map((p) => ({
        label: `${p.id} · ${p.name}`,
        meta: p.target.toUpperCase(),
        section: 'SHARED-UI 30 PRIMITIVES',
        action: () => focusSandboxById(p.target),
      })),
    ],
    (chosen) => {
      if (chosen && typeof chosen.action === 'function') chosen.action();
    },
    { placeholder: 'Search 30 shared-ui primitives, 16 sandboxes, or lab commands...' }
  );

  const themeLabel = document.querySelector('#btn-theme-toggle .header__theme-label');
  if (themeLabel) {
    themeLabel.textContent = state.theme === 'dark' ? 'DARK' : 'LIGHT';
  }

  initLusionCursor();
  initLucyMascot();
  initGlobalControls();
  ensureLabInitialized();
  initMagneticDock();

  if (window.location.hash) {
    setTimeout(() => {
      focusSandboxById(window.location.hash);
    }, 180);
  }
}

if (isStandaloneLabPage) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
