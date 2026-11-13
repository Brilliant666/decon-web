/**
 * shared-ui/lumen-muse-ui.js
 * Specimen #05: LUMEN MUSE (潜影缪斯 · Optics LM-05 · 85mm f/1.2)
 * Unified ESM Barrel, Motion Telemetry Helpers & Self-Contained Mount API
 *
 * SPDX-License-Identifier: MIT
 */

import {
  LUMEN_MAT,
  LUMEN_LAYER_META,
  MUSE_PRESETS,
  IRIS_PIVOT_RADIUS,
  HAMMER_PIVOTS,
  buildMechanicalGeometry,
  buildProceduralMuseCore,
  buildImageMuseCore,
  buildLatentParticleBuffers
} from './lumen-muse-geometry.js';

import {
  DIRECTOR_SHOTS,
  createLumenMuseStage
} from './lumen-muse-stage.js';

import {
  LUMEN_CHIME_NOTES,
  createLumenMuseAudio
} from './lumen-muse-audio.js';

const SCRAMBLE_GLYPHS = '0123456789ABCDEF·/:+=-';

/**
 * Zero-CLS monospace scramble transition for optical telemetry strings.
 */
export function scrambleText(el, nextText, durationMs = 240) {
  if (!el) return;
  const target = String(nextText ?? '');
  if (el.dataset.lumenTarget === target) return;
  el.dataset.lumenTarget = target;

  if (typeof window === 'undefined' || durationMs <= 0) {
    el.textContent = target;
    return;
  }

  if (el.__lumenScrambleRaf) {
    cancelAnimationFrame(el.__lumenScrambleRaf);
    el.__lumenScrambleRaf = 0;
  }

  const start = performance.now();
  const len = target.length;

  const step = (now) => {
    const p = Math.min(1, (now - start) / durationMs);
    if (p >= 1) {
      el.textContent = target;
      el.__lumenScrambleRaf = 0;
      return;
    }
    const lockCount = Math.floor(p * len);
    let out = target.slice(0, lockCount);
    for (let i = lockCount; i < len; i++) {
      const ch = target[i];
      if (ch === ' ' || ch === '·' || ch === '|') {
        out += ch;
      } else {
        out += SCRAMBLE_GLYPHS[(i * 7 + Math.floor(now * 0.06)) % SCRAMBLE_GLYPHS.length];
      }
    }
    el.textContent = out;
    el.__lumenScrambleRaf = requestAnimationFrame(step);
  };

  el.__lumenScrambleRaf = requestAnimationFrame(step);
}

/**
 * Smooth GPU-composited opacity & subtle vertical drift swap for cinema captions (CLS = 0).
 */
export function transitionCaptionPlate(plateEl, updateDomFn) {
  if (!plateEl || typeof updateDomFn !== 'function') {
    if (typeof updateDomFn === 'function') updateDomFn();
    return;
  }
  if (typeof window === 'undefined') {
    updateDomFn();
    return;
  }
  plateEl.classList.add('is-swapping');
  if (plateEl.__lumenSwapTimer) {
    clearTimeout(plateEl.__lumenSwapTimer);
  }
  plateEl.__lumenSwapTimer = setTimeout(() => {
    updateDomFn();
    plateEl.classList.remove('is-swapping');
    plateEl.__lumenSwapTimer = 0;
  }, 135);
}

/**
 * High-level turnkey mount helper for LUMEN MUSE · Optics LM-05.
 * Connects WebGL2 PBR optical developer stage + 48kHz procedural acoustic engine.
 */
export function mountLumenMuse(container, options = {}) {
  const host =
    typeof container === 'string' && typeof document !== 'undefined'
      ? document.querySelector(container)
      : container;

  if (!host) {
    throw new Error('[LumenMuseUI] mountLumenMuse requires a valid container element.');
  }

  const {
    embedCard = false,
    musePreset = 'ccd',
    caseMaterial = 'titanium',
    autoPlay = !embedCard,
    muted = false,
    volume = 0.26,
    enableTimelineAudio = !embedCard,
    onShotChange = null,
    onReady = null
  } = options;

  let ownsCanvas = false;
  let canvas =
    host.tagName === 'CANVAS' ? host : host.querySelector('canvas');

  if (!canvas && typeof document !== 'undefined') {
    ownsCanvas = true;
    const computedPos =
      typeof window !== 'undefined' ? window.getComputedStyle(host).position : '';
    if (computedPos === 'static') {
      host.style.position = 'relative';
    }
    canvas = document.createElement('canvas');
    canvas.className = 'lumen-muse-mounted-canvas';
    canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;';
    host.appendChild(canvas);
  }

  let stageRef = null;
  let timelineRaf = 0;
  let paused = false;
  let destroyed = false;

  const audio = createLumenMuseAudio({
    muted,
    enabled: !embedCard,
    embedCard,
    volume,
    onHammerStrike: (note) => {
      if (stageRef && typeof stageRef.pulseChimeHammer === 'function') {
        stageRef.pulseChimeHammer(note);
      }
    }
  });

  stageRef = createLumenMuseStage(canvas, {
    embedCard,
    musePreset,
    caseMaterial,
    autoPlay,
    onShotChange: (shot, index) => {
      if (typeof onShotChange === 'function') onShotChange(shot, index);
    },
    onShutter: () => {
      audio.playShutter();
    },
    onTick: (timeScale) => {
      audio.playFocusTick(typeof timeScale === 'number' ? timeScale : 1.0);
    },
    onChimeTrigger: () => {
      audio.playRepeaterSequence((note) => {
        if (stageRef && typeof stageRef.pulseChimeHammer === 'function') {
          stageRef.pulseChimeHammer(note);
        }
      });
    },
    onReady: (info) => {
      if (typeof onReady === 'function') onReady(info);
    }
  });

  const pumpAudioTimeline = () => {
    if (destroyed) return;
    if (!paused && enableTimelineAudio && !audio.isMuted() && stageRef) {
      const st = stageRef.getState();
      if (st && typeof st.elapsed === 'number') {
        audio.syncTimeline(st.elapsed, st.shotId, st.timeScale ?? 1.0);
      }
    }
    timelineRaf = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(pumpAudioTimeline)
      : 0;
  };

  if (enableTimelineAudio && typeof requestAnimationFrame === 'function') {
    timelineRaf = requestAnimationFrame(pumpAudioTimeline);
  }

  const onPointerMove = (e) => {
    if (destroyed || paused || !stageRef || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    stageRef.setPointer(nx, ny);
  };

  if (!embedCard && canvas && typeof canvas.addEventListener === 'function') {
    canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  return {
    stage: stageRef,
    audio,
    canvas,
    playDirectorCut() {
      audio.resetTimeline();
      stageRef?.playDirectorCut?.();
    },
    setExplode(value) {
      stageRef?.setExplode?.(value);
    },
    setMusePreset(id) {
      audio.playShutter();
      stageRef?.setMusePreset?.(id);
    },
    setCaseMaterial(mat) {
      audio.playFocusTick(1.0, 0.85);
      stageRef?.setCaseMaterial?.(mat);
    },
    setDarkroomLume(enabled) {
      stageRef?.setDarkroomLume?.(enabled);
    },
    setMacroSlowMo(enabled) {
      stageRef?.setMacroSlowMo?.(enabled);
    },
    setAperture(fStop) {
      stageRef?.setAperture?.(fStop);
    },
    strikeChime(note = 'D5') {
      audio.strikeChime(note, (struck) => stageRef?.pulseChimeHammer?.(struck));
    },
    pause() {
      paused = true;
      audio.stop();
      stageRef?.pause?.();
    },
    resume() {
      paused = false;
      stageRef?.resume?.();
    },
    getState() {
      return stageRef?.getState?.() || null;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (timelineRaf && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(timelineRaf);
        timelineRaf = 0;
      }
      if (canvas && typeof canvas.removeEventListener === 'function') {
        canvas.removeEventListener('pointermove', onPointerMove);
      }
      audio.destroy();
      stageRef?.destroy?.();
      if (ownsCanvas && canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };
}

export const LumenMuseUI = Object.freeze({
  LUMEN_MAT,
  LUMEN_LAYER_META,
  MUSE_PRESETS,
  IRIS_PIVOT_RADIUS,
  HAMMER_PIVOTS,
  DIRECTOR_SHOTS,
  LUMEN_CHIME_NOTES,
  buildMechanicalGeometry,
  buildProceduralMuseCore,
  buildImageMuseCore,
  buildLatentParticleBuffers,
  createLumenMuseStage,
  createLumenMuseAudio,
  scrambleText,
  transitionCaptionPlate,
  mountLumenMuse
});

if (typeof window !== 'undefined') {
  window.LumenMuseUI = LumenMuseUI;
}

export {
  LUMEN_MAT,
  LUMEN_LAYER_META,
  MUSE_PRESETS,
  IRIS_PIVOT_RADIUS,
  HAMMER_PIVOTS,
  DIRECTOR_SHOTS,
  LUMEN_CHIME_NOTES,
  buildMechanicalGeometry,
  buildProceduralMuseCore,
  buildImageMuseCore,
  buildLatentParticleBuffers,
  createLumenMuseStage,
  createLumenMuseAudio
};

export default LumenMuseUI;
