/**
 * sites/04-igloo-inc/pro-hud.js
 * Specimen #04: Igloo Inc (igloo.inc by Lusion)
 * Non-Intrusive Stealth RAW / PRO Polar Telemetry & WebGL2 Shader Deconstruction Suite
 *
 * Guarantees:
 *   - Default RAW mode renders ZERO visible external buttons/DOM on screen (100.00% pure native igloo.inc)
 *   - RAW mode strictly locks data-igloo-optics="CRYO-STD" (unfiltered 100% native color)
 *   - Stealth Keyboard Summon:
 *       [P]   -> Summon / Dismiss PRO Telemetry HUD Overlay
 *       [Esc] -> Exit PRO mode back to pure RAW mode
 *       [L]   -> Open /lab in a new tab
 *       [T]   -> Cycle Optical Filters (PRO mode only)
 *       [G]   -> Toggle Polar Reticle Grid (PRO mode only)
 */

import {
  IGLOO_PORTFOLIO_DATA,
  createPolarReticleHud,
  createCryoAudioEngine
} from '/shared-ui/igloo-ui.js';

const OPTICS_MODES = ['CRYO-STD', 'POLAR-NIGHT', 'THERMAL-IR', 'WIREFRAME-XRAY'];

// ============================================================================
// 1. NON-INTRUSIVE WEBGL2 PIPELINE & SHADER UNIFORM PROBE
// ============================================================================

const glTelemetry = {
  drawCallsPerFrame: 0,
  trianglesPerFrame: 0,
  lastFrameDrawCalls: 0,
  lastFrameTriangles: 0,
  renderedActiveFrames: 0,
  shaderPrograms: 0,
  uProgress: 0.0,
  uProgressVel: 0.0,
  uDetailProgress: 0.0,
  uInCubes: 0
};

(function installWebGL2Probe() {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const ctx = origGetContext.call(this, type, attrs);
    if (ctx && (type === 'webgl2' || type === 'webgl') && !ctx.__iglooProbed) {
      ctx.__iglooProbed = true;
      const uniformMap = new WeakMap();

      const origCreateProgram = ctx.createProgram.bind(ctx);
      ctx.createProgram = function () {
        glTelemetry.shaderPrograms++;
        return origCreateProgram();
      };

      const origGetUniformLocation = ctx.getUniformLocation.bind(ctx);
      ctx.getUniformLocation = function (program, name) {
        const loc = origGetUniformLocation(program, name);
        if (
          loc &&
          (name === 'uProgress' ||
            name === 'uProgressVel' ||
            name === 'uDetailProgress' ||
            name === 'uInCubes')
        ) {
          uniformMap.set(loc, name);
        }
        return loc;
      };

      const origUniform1f = ctx.uniform1f.bind(ctx);
      ctx.uniform1f = function (location, v0) {
        const name = location && uniformMap.get(location);
        if (name) {
          glTelemetry[name] = v0;
        }
        return origUniform1f(location, v0);
      };

      const origUniform1i = ctx.uniform1i.bind(ctx);
      ctx.uniform1i = function (location, v0) {
        const name = location && uniformMap.get(location);
        if (name) {
          glTelemetry[name] = v0;
        }
        return origUniform1i(location, v0);
      };

      const origDrawElements = ctx.drawElements.bind(ctx);
      ctx.drawElements = function (mode, count, typeEnum, offset) {
        glTelemetry.drawCallsPerFrame++;
        if (mode === ctx.TRIANGLES) {
          glTelemetry.trianglesPerFrame += Math.floor(count / 3);
        }
        return origDrawElements(mode, count, typeEnum, offset);
      };

      const origDrawArrays = ctx.drawArrays.bind(ctx);
      ctx.drawArrays = function (mode, first, count) {
        glTelemetry.drawCallsPerFrame++;
        if (mode === ctx.TRIANGLES) {
          glTelemetry.trianglesPerFrame += Math.floor(count / 3);
        }
        return origDrawArrays(mode, first, count);
      };
    }
    return ctx;
  };
})();

// ============================================================================
// 2. INITIALIZE STEALTH PRO TELEMETRY HUD ORGANS (100% HIDDEN IN RAW MODE)
// ============================================================================

function initIglooProHud() {
  const htmlEl = document.documentElement;
  let currentMode = 'RAW'; // Default RAW mode: 100% pure native igloo.inc with zero external UI
  let opticsIndex = 0;
  let virtualDepth = 0.0; // 0.0 (Igloo Surface) -> 0.34 (Pudgy 0°C) -> 0.64 (Overpass -3°C) -> 0.92 (VDB Chamber)
  let activeSpecimenIdx = 0;
  let manualSpecimenLock = false;
  let pulseTimer = null;

  htmlEl.setAttribute('data-igloo-mode', 'RAW');
  htmlEl.setAttribute('data-igloo-optics', 'CRYO-STD');

  console.info('[IGLOO DECON] Pure RAW mode active. Press [P] for PRO Telemetry HUD, [L] for Shader Lab.');

  const cryoAudio = createCryoAudioEngine();

  // Inject SVG filter for THERMAL-IR optical mode (active only in PRO mode)
  const svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgDefs.setAttribute('width', '0');
  svgDefs.setAttribute('height', '0');
  svgDefs.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;width:0;height:0;';
  svgDefs.innerHTML = `
    <defs>
      <filter id="igloo-thermal-ir-filter" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="
          1.45 -0.35 -0.10 0 0.04
         -0.25  1.15 -0.15 0 0.00
         -0.55 -0.25  1.65 0 0.12
          0     0     0    1 0" />
      </filter>
    </defs>
  `;
  document.body.appendChild(svgDefs);

  // PRO Mode Root Container (Hidden in RAW mode so RAW has 0 visible external DOM elements)
  const proRoot = document.createElement('div');
  proRoot.className = 'igloo-pro-root';
  proRoot.id = 'igloo-pro-root';

  // PRO-Only Top Control Capsule Bar (Inside .igloo-pro-root)
  const capsule = document.createElement('nav');
  capsule.className = 'igloo-hw-capsule';
  capsule.setAttribute('aria-label', 'Igloo PRO Cryo-Optics & Telemetry Controls');
  capsule.innerHTML = `
    <button type="button" class="igloo-hw-btn igloo-hw-btn--optics" id="igloo-btn-optics" title="Cycle Optical Filter Theme (Hotkey: T)">
      [OPTICS: CRYO-STD (T)]
    </button>
    <button type="button" class="igloo-hw-btn igloo-hw-btn--grid" id="igloo-btn-top-grid" data-active="true" title="Toggle Polar Reticle Grid (Hotkey: G)">
      [GRID: ON (G)]
    </button>
    <a href="/lab" target="_blank" rel="noopener" class="igloo-hw-btn igloo-hw-btn--lab" title="Open 2x2 WebGL Shader & Cryo Component Lab (Hotkey: L)">
      [LAB ↗ (L)]
    </a>
    <button type="button" class="igloo-hw-btn igloo-hw-btn--exit" id="igloo-btn-exit-pro" title="Exit PRO Mode back to pure RAW Mode (Hotkey: P / ESC)">
      [EXIT PRO (P / ESC)]
    </button>
  `;
  proRoot.appendChild(capsule);

  // Organ 1: Polar Telemetry Reticle & Depth Gauge
  const reticleContainer = document.createElement('div');
  reticleContainer.className = 'igloo-pro-reticle-layer';
  proRoot.appendChild(reticleContainer);
  const reticleHud = createPolarReticleHud(reticleContainer, {
    depthProgress: 0.0,
    gridVisible: true
  });

  // Organ 2: WebGL2 & Frost-Cut Shader Telemetry Drawer
  const shaderDrawer = document.createElement('aside');
  shaderDrawer.className = 'igloo-pro-shader-drawer';
  shaderDrawer.innerHTML = `
    <div class="igloo-hud-header">
      <span>// ORGAN_02 :: WEBGL2 & FROST-CUT PROBE</span>
      <span class="igloo-hud-badge" id="igloo-stage-badge">SCENE_01: IGLOO_EXTERIOR</span>
    </div>
    <div class="igloo-kv-grid">
      <div class="igloo-kv-item">
        <span class="igloo-kv-label">FPS / FRAME</span>
        <span class="igloo-kv-val" id="igloo-kv-fps">60 // 16.6ms</span>
      </div>
      <div class="igloo-kv-item">
        <span class="igloo-kv-label">DRAW / TRIS</span>
        <span class="igloo-kv-val" id="igloo-kv-draws">32 // 148K</span>
      </div>
      <div class="igloo-kv-item">
        <span class="igloo-kv-label">CA_ITERATIONS</span>
        <span class="igloo-kv-val">5 (SPECTRAL)</span>
      </div>
      <div class="igloo-kv-item">
        <span class="igloo-kv-label">SLOPE_DISP</span>
        <span class="igloo-kv-val" id="igloo-kv-slope">-0.20 * aspect</span>
      </div>
    </div>
    <div class="igloo-progress-bar-wrap">
      <div class="igloo-progress-bar-label">
        <span>class f3 :: uProgress (DIAGONAL FROST CUT)</span>
        <span id="igloo-uprogress-val">0.000</span>
      </div>
      <div class="igloo-progress-track">
        <div class="igloo-progress-fill" id="igloo-uprogress-bar"></div>
      </div>
    </div>
    <div class="igloo-progress-bar-wrap">
      <div class="igloo-progress-bar-label">
        <span>class f3 :: uProgressVel (SCROLL INERTIA)</span>
        <span id="igloo-uvel-val">0.000</span>
      </div>
      <div class="igloo-progress-track">
        <div class="igloo-progress-fill" id="igloo-uvel-bar"></div>
      </div>
    </div>
    <div style="font-size:9.5px;color:#9BA7B8;margin-top:6px;letter-spacing:0.06em;">
      // CHAPTER QUICK-JUMP (SMOOTH WHEEL PULSE)
    </div>
    <div class="igloo-jump-grid" id="igloo-jump-grid">
      <button type="button" class="igloo-jump-btn" data-jump-idx="0" data-target-depth="0.00" data-active="true">
        00 // IGLOO MONOLITH
      </button>
      <button type="button" class="igloo-jump-btn" data-jump-idx="1" data-target-depth="0.34">
        01 // PUDGY PENGUINS (0°C)
      </button>
      <button type="button" class="igloo-jump-btn" data-jump-idx="2" data-target-depth="0.64">
        02 // OVERPASS (-3°C)
      </button>
      <button type="button" class="igloo-jump-btn" data-jump-idx="3" data-target-depth="0.92">
        03 // MANIFESTO & LINKS
      </button>
    </div>
    <div class="igloo-hud-controls-row">
      <button type="button" class="igloo-mini-btn" id="igloo-btn-wind" data-active="false">
        [SYNTH WIND: OFF]
      </button>
      <button type="button" class="igloo-mini-btn" id="igloo-btn-shard">
        [SHARD PULSE ♪]
      </button>
      <button type="button" class="igloo-mini-btn" id="igloo-btn-grid" data-active="true" title="Hotkey: G">
        [RETICLE: ON]
      </button>
    </div>
  `;
  proRoot.appendChild(shaderDrawer);

  // Organ 3: Cryo-Specimen Metadata Inspector
  const specimenCard = document.createElement('aside');
  specimenCard.className = 'igloo-pro-specimen-card';
  specimenCard.innerHTML = `
    <div class="igloo-hud-header">
      <span>// ORGAN_03 :: CRYO-SPECIMEN INSPECTOR</span>
      <span class="igloo-hud-badge" id="igloo-spec-temp">-18°C // +32.0m</span>
    </div>
    <div class="igloo-specimen-tabs" id="igloo-spec-tabs">
      <button type="button" class="igloo-specimen-tab" data-spec-idx="0" data-active="true">00 IGLOO</button>
      <button type="button" class="igloo-specimen-tab" data-spec-idx="1">01 PUDGY</button>
      <button type="button" class="igloo-specimen-tab" data-spec-idx="2">02 OVERPASS</button>
      <button type="button" class="igloo-specimen-tab" data-spec-idx="3">03 VDB</button>
    </div>
    <div style="font-size:11px;font-weight:600;color:#FFFFFF;margin-bottom:4px;" id="igloo-spec-title">
      IGLOO_EXTERIOR // ARCTIC DOME
    </div>
    <div style="font-size:9.5px;color:#8CD2FF;margin-bottom:6px;" id="igloo-spec-shader">
      class F3 (IglooExteriorScene) + class f3 (FrostCutComposite)
    </div>
    <div style="font-size:9.5px;color:#9BA7B8;">DRACO 3D GEOMETRIES (.drc):</div>
    <div class="igloo-asset-pill-list" id="igloo-spec-drc"></div>
    <div style="font-size:9.5px;color:#9BA7B8;">BASIS KTX2 / EXR TEXTURE CHANNELS:</div>
    <div class="igloo-asset-pill-list" id="igloo-spec-ktx2"></div>
    <div class="igloo-specimen-summary" id="igloo-spec-summary"></div>
  `;
  proRoot.appendChild(specimenCard);
  document.body.appendChild(proRoot);

  // ============================================================================
  // 3. UI BINDINGS, RAW QUALITY LOCK & STEALTH KEYBOARD SUMMON
  // ============================================================================

  const btnOptics = document.getElementById('igloo-btn-optics');
  const btnTopGrid = document.getElementById('igloo-btn-top-grid');
  const btnExitPro = document.getElementById('igloo-btn-exit-pro');
  const btnWind = document.getElementById('igloo-btn-wind');
  const btnShard = document.getElementById('igloo-btn-shard');
  const btnGrid = document.getElementById('igloo-btn-grid');

  const specTitleEl = document.getElementById('igloo-spec-title');
  const specTempEl = document.getElementById('igloo-spec-temp');
  const specShaderEl = document.getElementById('igloo-spec-shader');
  const specDrcEl = document.getElementById('igloo-spec-drc');
  const specKtx2El = document.getElementById('igloo-spec-ktx2');
  const specSummaryEl = document.getElementById('igloo-spec-summary');
  const specTabs = Array.from(document.querySelectorAll('.igloo-specimen-tab'));
  const jumpBtns = Array.from(document.querySelectorAll('.igloo-jump-btn'));

  function renderSpecimenCard(idx) {
    const spec = IGLOO_PORTFOLIO_DATA.specimens[idx] || IGLOO_PORTFOLIO_DATA.specimens[0];
    activeSpecimenIdx = idx;
    specTitleEl.textContent = `${spec.title} [${spec.date}]`;
    specTempEl.textContent = `${spec.temp}°C // ${spec.altitude}`;
    specShaderEl.textContent = spec.shaderClass;
    specDrcEl.innerHTML = spec.drcMeshes.map((m) => `<span class="igloo-asset-pill">${m}</span>`).join('');
    specKtx2El.innerHTML = spec.ktx2Maps.map((t) => `<span class="igloo-asset-pill">${t}</span>`).join('');
    specSummaryEl.textContent = `${spec.summary} — Manifesto: "${IGLOO_PORTFOLIO_DATA.manifesto.text}"`;

    specTabs.forEach((btn, i) => {
      btn.setAttribute('data-active', i === idx ? 'true' : 'false');
    });
    jumpBtns.forEach((btn, i) => {
      btn.setAttribute('data-active', i === idx ? 'true' : 'false');
    });
  }

  renderSpecimenCard(0);

  function cycleOptics() {
    // Strictly only active in PRO mode; RAW mode is locked to CRYO-STD
    if (currentMode !== 'PRO') {
      htmlEl.setAttribute('data-igloo-optics', 'CRYO-STD');
      return;
    }
    opticsIndex = (opticsIndex + 1) % OPTICS_MODES.length;
    const modeName = OPTICS_MODES[opticsIndex];
    htmlEl.setAttribute('data-igloo-optics', modeName);
    btnOptics.textContent = `[OPTICS: ${modeName} (T)]`;
    cryoAudio.playBeep(2);
  }

  function setMode(nextMode) {
    currentMode = nextMode === 'PRO' ? 'PRO' : 'RAW';
    htmlEl.setAttribute('data-igloo-mode', currentMode);

    if (currentMode === 'PRO') {
      htmlEl.setAttribute('data-igloo-optics', OPTICS_MODES[opticsIndex]);
      btnOptics.textContent = `[OPTICS: ${OPTICS_MODES[opticsIndex]} (T)]`;
      cryoAudio.playBeep(1);
    } else {
      // Returning to RAW mode: reset opticsIndex to 0 (CRYO-STD) & silence synth wind
      opticsIndex = 0;
      htmlEl.setAttribute('data-igloo-optics', 'CRYO-STD');
      btnOptics.textContent = '[OPTICS: CRYO-STD (T)]';
      if (cryoAudio.isWindActive()) {
        cryoAudio.toggleArcticWind(false);
        btnWind.textContent = '[SYNTH WIND: OFF]';
        btnWind.setAttribute('data-active', 'false');
      }
    }
  }

  function toggleProMode() {
    setMode(currentMode === 'RAW' ? 'PRO' : 'RAW');
  }

  function toggleGridOverlay() {
    if (currentMode !== 'PRO') return;
    const vis = reticleHud.toggleGrid();
    btnGrid.textContent = `[RETICLE: ${vis ? 'ON' : 'OFF'}]`;
    btnGrid.setAttribute('data-active', vis ? 'true' : 'false');
    btnTopGrid.textContent = `[GRID: ${vis ? 'ON' : 'OFF'} (G)]`;
    btnTopGrid.setAttribute('data-active', vis ? 'true' : 'false');
    cryoAudio.playBeep(3);
  }

  btnOptics.addEventListener('click', cycleOptics);
  btnTopGrid.addEventListener('click', toggleGridOverlay);
  btnExitPro.addEventListener('click', () => setMode('RAW'));

  btnWind.addEventListener('click', () => {
    const active = cryoAudio.toggleArcticWind();
    btnWind.textContent = `[SYNTH WIND: ${active ? 'ON' : 'OFF'}]`;
    btnWind.setAttribute('data-active', active ? 'true' : 'false');
  });

  btnShard.addEventListener('click', () => {
    cryoAudio.playShard();
  });

  btnGrid.addEventListener('click', toggleGridOverlay);

  specTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const idx = Number(tab.getAttribute('data-spec-idx')) || 0;
      manualSpecimenLock = true;
      renderSpecimenCard(idx);
      cryoAudio.playBeep(1);
    });
  });

  // Smooth Wheel Pulse Dispatcher to jump chapters inside the live Lusion WebGL 3D scene
  function pulseJumpToChapter(targetDepth, specIdx) {
    if (pulseTimer) clearInterval(pulseTimer);
    manualSpecimenLock = false;
    renderSpecimenCard(specIdx);
    cryoAudio.playEnterCube();

    const diff = targetDepth - virtualDepth;
    const totalSteps = 22;
    let step = 0;
    const deltaPerStep = (diff * 3400) / totalSteps;

    pulseTimer = setInterval(() => {
      step++;
      const targetEl = document.querySelector('#app canvas') || window;
      const ev = new WheelEvent('wheel', {
        deltaX: 0,
        deltaY: deltaPerStep,
        deltaMode: 0,
        bubbles: true,
        cancelable: true
      });
      targetEl.dispatchEvent(ev);
      if (targetEl !== window) {
        window.dispatchEvent(
          new WheelEvent('wheel', {
            deltaX: 0,
            deltaY: deltaPerStep,
            deltaMode: 0,
            bubbles: true,
            cancelable: true
          })
        );
      }
      virtualDepth = Math.max(0, Math.min(1, virtualDepth + diff / totalSteps));
      reticleHud.setDepthProgress(virtualDepth);

      if (step >= totalSteps) {
        clearInterval(pulseTimer);
        pulseTimer = null;
      }
    }, 24);
  }

  jumpBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-jump-idx')) || 0;
      const targetDepth = Number(btn.getAttribute('data-target-depth')) || 0;
      pulseJumpToChapter(targetDepth, idx);
    });
  });

  // Track user wheel / keydown scrolling to synchronize depth gauge & active specimen
  window.addEventListener(
    'wheel',
    (e) => {
      if (!e.isTrusted) return;
      manualSpecimenLock = false;
      virtualDepth = (virtualDepth + e.deltaY * 0.00022 + 1.0) % 1.0;
      reticleHud.setDepthProgress(virtualDepth);
    },
    { passive: true }
  );

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Escape') {
      if (currentMode === 'PRO') {
        e.preventDefault();
        setMode('RAW');
      }
      return;
    }

    const k = e.key.toLowerCase();
    if (k === 'p') {
      e.preventDefault();
      toggleProMode();
    } else if (k === 'l') {
      e.preventDefault();
      window.open('/lab', '_blank', 'noopener');
    } else if (k === 't' && currentMode === 'PRO') {
      e.preventDefault();
      cycleOptics();
    } else if (k === 'g' && currentMode === 'PRO') {
      e.preventDefault();
      toggleGridOverlay();
    } else if (e.key === 'ArrowDown') {
      virtualDepth = (virtualDepth + 0.04) % 1.0;
      reticleHud.setDepthProgress(virtualDepth);
    } else if (e.key === 'ArrowUp') {
      virtualDepth = (virtualDepth - 0.04 + 1.0) % 1.0;
      reticleHud.setDepthProgress(virtualDepth);
    }
  });

  // ============================================================================
  // 4. REAL-TIME 60FPS TELEMETRY LOOP
  // ============================================================================

  const fpsEl = document.getElementById('igloo-kv-fps');
  const drawsEl = document.getElementById('igloo-kv-draws');
  const slopeEl = document.getElementById('igloo-kv-slope');
  const stageBadgeEl = document.getElementById('igloo-stage-badge');
  const uProgValEl = document.getElementById('igloo-uprogress-val');
  const uProgBarEl = document.getElementById('igloo-uprogress-bar');
  const uVelValEl = document.getElementById('igloo-uvel-val');
  const uVelBarEl = document.getElementById('igloo-uvel-bar');

  let frameCount = 0;
  let lastFpsStamp = performance.now();
  let lastFrameStamp = performance.now();
  let currentFps = 60;

  function telemetryTick(now) {
    const dtMs = now - lastFrameStamp;
    lastFrameStamp = now;
    frameCount++;

    if (glTelemetry.drawCallsPerFrame > 2) {
      glTelemetry.lastFrameDrawCalls = glTelemetry.drawCallsPerFrame;
      glTelemetry.lastFrameTriangles = glTelemetry.trianglesPerFrame;
      glTelemetry.renderedActiveFrames++;
    } else if (glTelemetry.drawCallsPerFrame > 0) {
      glTelemetry.lastFrameDrawCalls = glTelemetry.drawCallsPerFrame;
      glTelemetry.lastFrameTriangles = glTelemetry.trianglesPerFrame;
    }
    glTelemetry.drawCallsPerFrame = 0;
    glTelemetry.trianglesPerFrame = 0;

    if (currentMode === 'RAW' && htmlEl.getAttribute('data-igloo-optics') !== 'CRYO-STD') {
      htmlEl.setAttribute('data-igloo-optics', 'CRYO-STD');
    }

    if (now - lastFpsStamp >= 400) {
      currentFps = Math.min(120, Math.max(1, Math.round((frameCount * 1000) / (now - lastFpsStamp))));
      frameCount = 0;
      lastFpsStamp = now;

      if (currentMode === 'PRO') {
        fpsEl.textContent = `${currentFps} // ${dtMs.toFixed(1)}ms`;
        const trisK = (glTelemetry.lastFrameTriangles / 1000).toFixed(0);
        drawsEl.textContent = `${glTelemetry.lastFrameDrawCalls} // ${trisK}K`;
      }
    }

    if (currentMode === 'PRO') {
      const uProg = Math.max(0, Math.min(1, Number(glTelemetry.uProgress) || 0));
      const uVel = Math.max(0, Math.min(1, Number(glTelemetry.uProgressVel) || 0));
      const aspect = (window.innerWidth / Math.max(window.innerHeight, 1)).toFixed(2);

      uProgValEl.textContent = uProg.toFixed(3);
      uProgBarEl.style.width = `${(uProg * 100).toFixed(1)}%`;
      uVelValEl.textContent = uVel.toFixed(3);
      uVelBarEl.style.width = `${Math.min(100, uVel * 100).toFixed(1)}%`;
      slopeEl.textContent = `${(-0.2 * Number(aspect)).toFixed(2)} (A=${aspect})`;

      let stageText = 'SCENE_01: IGLOO_EXTERIOR';
      let inferredIdx = 0;

      if (uProg > 0.02 && uProg < 0.98) {
        stageText = 'TRANSITION: DIAGONAL_FROST_CUT (CA=5)';
      } else if (virtualDepth >= 0.22 && virtualDepth < 0.54) {
        stageText = 'SCENE_02: CRYO_CUBES [PUDGY 0°C]';
        inferredIdx = 1;
      } else if (virtualDepth >= 0.54 && virtualDepth < 0.82) {
        stageText = 'SCENE_02: CRYO_CUBES [OVERPASS -3°C]';
        inferredIdx = 2;
      } else if (virtualDepth >= 0.82) {
        stageText = 'SCENE_03: INTERIOR_VDB [VOLUMES]';
        inferredIdx = 3;
      }

      if (glTelemetry.uDetailProgress > 0.1) {
        stageText = 'DETAIL_VAULT: CAUSTICS_INTERIOR';
      }

      stageBadgeEl.textContent = stageText;

      if (!manualSpecimenLock && inferredIdx !== activeSpecimenIdx) {
        renderSpecimenCard(inferredIdx);
      }
    }

    requestAnimationFrame(telemetryTick);
  }

  requestAnimationFrame(telemetryTick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIglooProHud);
} else {
  initIglooProHud();
}

// ============================================================================
// 3. PORTAL CARD EMBED BRIDGE (?embed=card) — LIVE 3D HOVER, VISIBILITY & READY SIGNAL
// ============================================================================
(function initPortalCardEmbedBridge() {
  const isCardEmbed = window.location.search.includes('embed=card');
  if (!isCardEmbed) return;

  // Only hide external PRO HUD controls in card embed mode; keep native #loader ASCII animation & 3D intro intact!
  const embedStyle = document.createElement('style');
  embedStyle.textContent = `
    .igloo-pro-root, .igloo-hw-capsule { display: none !important; }
  `;
  document.head.appendChild(embedStyle);

  const nativeRaf = window.requestAnimationFrame.bind(window);
  const nativeCancelRaf = window.cancelAnimationFrame.bind(window);
  let cardEmbedPaused = false;
  let readySent = false;
  let syntheticRafId = 900000;
  const pendingRafCallbacks = new Map();

  // Never freeze requestAnimationFrame until the 3D scene & its intro animation have fully settled (> 240 active draw frames)
  window.requestAnimationFrame = function (cb) {
    if (typeof cb !== 'function') return 0;
    if (cardEmbedPaused && readySent && glTelemetry.renderedActiveFrames > 240) {
      const id = ++syntheticRafId;
      pendingRafCallbacks.set(id, cb);
      return id;
    }
    return nativeRaf(cb);
  };

  window.cancelAnimationFrame = function (id) {
    if (pendingRafCallbacks.has(id)) {
      pendingRafCallbacks.delete(id);
      return;
    }
    return nativeCancelRaf(id);
  };

  function check3DReady() {
    if (readySent) return;
    const canvas = document.querySelector('#app canvas') || document.querySelector('canvas');
    if (canvas && glTelemetry.renderedActiveFrames > 8) {
      readySent = true;
      try {
        window.parent.postMessage({ type: 'decon:igloo-ready' }, '*');
      } catch (_) {}
      return;
    }
    nativeRaf(check3DReady);
  }
  nativeRaf(check3DReady);

  // Receive visibility suspend/wake & normalized pointer coordinates from parent portal Card #04
  window.addEventListener('message', (e) => {
    const data = e.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'decon:card-visibility') {
      const nextPaused = !data.visible;
      if (cardEmbedPaused === nextPaused) return;
      cardEmbedPaused = nextPaused;
      if (!cardEmbedPaused && pendingRafCallbacks.size > 0) {
        const queued = Array.from(pendingRafCallbacks.values());
        pendingRafCallbacks.clear();
        for (let i = 0; i < queued.length; i += 1) {
          nativeRaf(queued[i]);
        }
      }
      return;
    }

    if (data.type !== 'decon:igloo-pointer' || cardEmbedPaused) return;
    const x = Math.round(Number(data.nx) * window.innerWidth);
    const y = Math.round(Number(data.ny) * window.innerHeight);
    const target =
      document.querySelector('#app canvas') ||
      document.getElementById('app') ||
      document.body ||
      window;

    const evInit = {
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      bubbles: true,
      cancelable: true,
      view: window,
    };

    try {
      target.dispatchEvent(
        new PointerEvent('pointermove', { ...evInit, pointerId: 1, isPrimary: true })
      );
    } catch (_) {}
    try {
      target.dispatchEvent(new MouseEvent('mousemove', evInit));
    } catch (_) {}
  });
})();

/* --- Decon-Web Parent Stage Bridge (Progressive Back / Shortcuts / Top-Left Wake) --- */
if (
  window.parent &&
  window.parent !== window &&
  !window.location.search.includes('embed=card')
) {
  const notifyStageBack = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    window.parent.postMessage({ type: 'decon:stage-back' }, '*');
  };

  // 1. 捕获键盘返回宏：Escape / BrowserBack / Alt+ArrowLeft / 非输入框 Backspace
  window.addEventListener(
    'keydown',
    (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const isInput =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (e.target && e.target.isContentEditable);
      if (e.key === 'Escape') {
        // 若处于 PRO 模式，按 Escape 优先由子站自身监听器切回 RAW 模式，不直接关闭舞台
        if (document.documentElement.getAttribute('data-igloo-mode') === 'PRO') {
          return;
        }
        notifyStageBack(e);
      } else if (
        e.key === 'BrowserBack' ||
        (e.altKey && e.key === 'ArrowLeft') ||
        (!isInput && e.key === 'Backspace')
      ) {
        notifyStageBack(e);
      }
    },
    true
  );

  // 2. 捕获鼠标侧键返回（Mouse Button 4 / XButton1: e.button === 3）
  const onMouseBackBtn = (e) => {
    if (e.button === 3) {
      notifyStageBack(e);
    }
  };
  window.addEventListener('mouseup', onMouseBackBtn, true);
  window.addEventListener('auxclick', onMouseBackBtn, true);

  // 3. 同步左上角指针靠近状态给父窗口（双重保障唤醒左上角 Logo）
  let lastTopLeftState = false;
  window.addEventListener(
    'pointermove',
    (e) => {
      const inTopLeft = e.clientX <= 260 && e.clientY <= 105;
      if (inTopLeft !== lastTopLeftState) {
        lastTopLeftState = inTopLeft;
        window.parent.postMessage({ type: 'decon:stage-top-left', active: inTopLeft }, '*');
      }
    },
    { passive: true }
  );
}
