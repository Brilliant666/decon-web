/**
 * sites/05-lumen-muse/app.js
 * Specimen #05: LUMEN MUSE (潜影缪斯 · Optics LM-05 · 85mm f/1.2)
 * Director Cut Controller, ?embed=card Fast Path & 2.5s Auto-Hiding Studio Capsule
 *
 * SPDX-License-Identifier: MIT
 */

import {
  createLumenMuseStage,
  createLumenMuseAudio,
  scrambleText,
  transitionCaptionPlate
} from '/shared-ui/lumen-muse-ui.js';

const searchParams = new URLSearchParams(window.location.search || '');
const IS_EMBED_CARD =
  searchParams.get('embed') === 'card' ||
  document.documentElement.getAttribute('data-embed') === 'card';

const SHOT_CAPTION_BOOK = Object.freeze([
  {
    code: 'SHOT 01',
    title: 'LUMEN MUSE · Optics LM-05',
    subtitle: 'Real-Time WebGL2 PBR · 85mm f/1.2 Latent Optical Developer'
  },
  {
    code: 'SHOT 02',
    title: 'Mid-Air 8-Layer Optical Architecture',
    subtitle: 'Aspheric Thin-Film Lens · 9-Blade Iris · Full Optical Crystal Body'
  },
  {
    code: 'SHOT 03',
    title: '0.10x Macro · Iris & Latent Denoising',
    subtitle: '52,800-Vertex 3D Maiden Muse Relief · Gaussian Stardust Convergence'
  },
  {
    code: 'SHOT 04',
    title: 'Darkroom Lume & D5 / F#5 Crystal Chimes',
    subtitle: 'Super-LumiNova #8CD2FF / #F59E0B · 48kHz Dual-Hammer Acoustic Chime'
  }
]);

const canvas = document.getElementById('lumen-canvas');

function notifyParentReady() {
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({ type: 'decon:lumen-ready' }, '*');
    } catch (_) {}
  }
}

if (IS_EMBED_CARD) {
  document.documentElement.setAttribute('data-embed', 'card');

  let readySent = false;
  const sendReadyOnce = () => {
    if (readySent) return;
    readySent = true;
    notifyParentReady();
  };

  const embedStage = createLumenMuseStage(canvas, {
    embedCard: true,
    musePreset: 'ccd',
    caseMaterial: 'titanium',
    autoPlay: false,
    onReady: () => {
      sendReadyOnce();
    }
  });

  requestAnimationFrame(sendReadyOnce);

  window.addEventListener('message', (event) => {
    const data = event && event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'decon:lumen-pointer') {
      const nx = Number(data.nx) || 0;
      const ny = Number(data.ny) || 0;
      embedStage?.setPointer?.(nx, ny);
    } else if (data.type === 'decon:card-visibility') {
      if (data.visible) {
        embedStage?.resume?.();
      } else {
        embedStage?.pause?.();
      }
    }
  });
} else {
  const captionEl = document.getElementById('lumen-caption');
  const captionMetaEl = document.getElementById('caption-meta');
  const captionTitleEl = document.getElementById('caption-title');
  const captionSubEl = document.getElementById('caption-sub');
  const capsuleEl = document.getElementById('lumen-capsule');
  const explodeInput = document.getElementById('ctrl-explode');
  const museBtns = Array.from(document.querySelectorAll('[data-muse]'));
  const matBtns = Array.from(document.querySelectorAll('[data-mat]'));
  const btnLume = document.getElementById('btn-lume');
  const btnMacro = document.getElementById('btn-macro');
  const btnChime = document.getElementById('btn-chime');
  const btnReplay = document.getElementById('btn-replay');
  const btnSound = document.getElementById('btn-sound');

  let stage = null;
  let lumeActive = false;
  let macroActive = false;
  let chimeToggleIdx = 0;
  let activeShotIdx = -1;
  let userDraggingExplode = false;
  let pointerInsideCapsule = false;
  let capsuleIdleTimer = 0;
  let lastTopLeftState = false;

  const audio = createLumenMuseAudio({
    muted: false,
    enabled: true,
    embedCard: false,
    volume: 0.26,
    onHammerStrike: (note) => {
      stage?.pulseChimeHammer?.(note);
    }
  });

  function formatTris(count) {
    const n = Number(count) || 226494;
    return `${Math.round(n).toLocaleString('en-US')} TRIS`;
  }

  function applyShotCaption(shotIndex, customShot) {
    const idx = Math.max(0, Math.min(SHOT_CAPTION_BOOK.length - 1, Number(shotIndex) || 0));
    if (idx === activeShotIdx) return;
    activeShotIdx = idx;
    const entry = SHOT_CAPTION_BOOK[idx];
    const title = (customShot && customShot.title) || entry.title;
    const subtitle = (customShot && customShot.subtitle) || entry.subtitle;

    transitionCaptionPlate(captionEl, () => {
      if (captionTitleEl) captionTitleEl.textContent = title;
      if (captionSubEl) captionSubEl.textContent = subtitle;
    });

    const st = stage?.getState?.();
    const fps = st && st.fps ? Math.round(st.fps) : 60;
    const tris = formatTris(st && st.triangleCount);
    scrambleText(captionMetaEl, `${entry.code} · ${tris} · 2048² SHADOWS · ${fps} FPS`, 240);
  }

  stage = createLumenMuseStage(canvas, {
    embedCard: false,
    musePreset: 'ccd',
    caseMaterial: 'titanium',
    autoPlay: true,
    onShotChange: (shot, index) => {
      const resolvedIdx = typeof index === 'number' ? index : (shot && shot.index) || 0;
      applyShotCaption(resolvedIdx, shot);
    },
    onShutter: () => {
      audio.playShutter();
    },
    onTick: (timeScale) => {
      audio.playFocusTick(typeof timeScale === 'number' ? timeScale : 1.0);
    },
    onChimeTrigger: () => {
      audio.playRepeaterSequence((note) => {
        stage?.pulseChimeHammer?.(note);
      });
    },
    onReady: () => {
      notifyParentReady();
    }
  });

  // 2.5s auto-hiding capsule logic for unobstructed 92% studio screen recording
  function scheduleCapsuleHide() {
    if (capsuleIdleTimer) clearTimeout(capsuleIdleTimer);
    capsuleIdleTimer = setTimeout(() => {
      if (!pointerInsideCapsule && !userDraggingExplode && capsuleEl) {
        capsuleEl.classList.add('is-idle');
      }
    }, 2500);
  }

  function wakeCapsule() {
    if (capsuleEl) {
      capsuleEl.classList.remove('is-idle');
    }
    scheduleCapsuleHide();
  }

  scheduleCapsuleHide();

  if (capsuleEl) {
    capsuleEl.addEventListener('pointerenter', () => {
      pointerInsideCapsule = true;
      wakeCapsule();
    });
    capsuleEl.addEventListener('pointerleave', () => {
      pointerInsideCapsule = false;
      scheduleCapsuleHide();
    });
  }

  // Synchronize live telemetry, slider readout & 48kHz procedural timeline score
  let lastHudSyncAt = 0;
  function telemetryLoop(now) {
    const st = stage?.getState?.();
    if (st) {
      if (!audio.isMuted() && typeof st.elapsed === 'number') {
        audio.syncTimeline(st.elapsed, st.shotId, st.timeScale ?? 1.0);
      }

      if (typeof st.shotIndex === 'number' && st.shotIndex !== activeShotIdx) {
        applyShotCaption(st.shotIndex, {
          title: st.shotTitle,
          subtitle: st.shotSubtitle
        });
      }

      if (now - lastHudSyncAt > 420) {
        lastHudSyncAt = now;
        const shotEntry = SHOT_CAPTION_BOOK[Math.max(0, Math.min(3, st.shotIndex || 0))];
        const fps = Math.max(1, Math.min(240, Math.round(st.fps || 60)));
        if (captionMetaEl && !captionMetaEl.__lumenScrambleRaf) {
          captionMetaEl.textContent = `${shotEntry.code} · ${formatTris(st.triangleCount)} · 2048² SHADOWS · ${fps} FPS`;
        }
        if (explodeInput && !userDraggingExplode && typeof st.explode === 'number') {
          explodeInput.value = st.explode.toFixed(2);
        }
        if (typeof st.caseMaterial === 'string') {
          matBtns.forEach((b) => {
            b.classList.toggle('is-active', b.dataset.mat === st.caseMaterial);
          });
        }
      }
    }
    requestAnimationFrame(telemetryLoop);
  }
  requestAnimationFrame(telemetryLoop);

  // Capsule Interactive Bindings
  if (explodeInput) {
    explodeInput.addEventListener('pointerdown', () => {
      userDraggingExplode = true;
    });
    window.addEventListener('pointerup', () => {
      if (userDraggingExplode) {
        userDraggingExplode = false;
        scheduleCapsuleHide();
      }
    });
    explodeInput.addEventListener('input', () => {
      const val = parseFloat(explodeInput.value);
      if (!Number.isNaN(val)) {
        stage?.setExplode?.(val);
      }
    });
  }

  museBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.muse;
      if (!id) return;
      museBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      audio.playShutter();
      stage?.setMusePreset?.(id);
      wakeCapsule();
    });
  });

  matBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mat = btn.dataset.mat;
      if (!mat) return;
      matBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      audio.playFocusTick(1.0, 0.9);
      stage?.setCaseMaterial?.(mat);
      wakeCapsule();
    });
  });

  if (btnLume) {
    btnLume.addEventListener('click', () => {
      lumeActive = !lumeActive;
      btnLume.classList.toggle('is-active', lumeActive);
      btnLume.setAttribute('aria-pressed', String(lumeActive));
      audio.playFocusTick(1.0, 0.75);
      stage?.setDarkroomLume?.(lumeActive);
      wakeCapsule();
    });
  }

  if (btnMacro) {
    btnMacro.addEventListener('click', () => {
      macroActive = !macroActive;
      btnMacro.classList.toggle('is-active', macroActive);
      btnMacro.setAttribute('aria-pressed', String(macroActive));
      audio.playFocusTick(macroActive ? 0.1 : 1.0, 0.95);
      stage?.setMacroSlowMo?.(macroActive);
      wakeCapsule();
    });
  }

  if (btnChime) {
    btnChime.addEventListener('click', () => {
      const notes = ['D5', 'FS5', 'A5', 'D6'];
      const note = notes[chimeToggleIdx % notes.length];
      chimeToggleIdx += 1;
      audio.strikeChime(note, (struck) => stage?.pulseChimeHammer?.(struck));
      wakeCapsule();
    });
  }

  if (btnReplay) {
    btnReplay.addEventListener('click', () => {
      lumeActive = false;
      macroActive = false;
      btnLume?.classList.remove('is-active');
      btnLume?.setAttribute('aria-pressed', 'false');
      btnMacro?.classList.remove('is-active');
      btnMacro?.setAttribute('aria-pressed', 'false');
      activeShotIdx = -1;
      audio.resetTimeline();
      audio.playShutter();
      stage?.playDirectorCut?.();
      wakeCapsule();
    });
  }

  if (btnSound) {
    btnSound.addEventListener('click', () => {
      const nowMuted = audio.toggleMute();
      const soundOn = !nowMuted;
      btnSound.classList.toggle('is-active', soundOn);
      btnSound.setAttribute('aria-pressed', String(soundOn));
      btnSound.textContent = soundOn ? 'Sound' : 'Muted';
      if (soundOn) {
        audio.playFocusTick(1.0, 0.7);
      }
      wakeCapsule();
    });
  }

  // Pointer parallax & Portal fullscreen stage top-left back pill bridge
  window.addEventListener(
    'pointermove',
    (e) => {
      wakeCapsule();
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      stage?.setPointer?.(nx, ny);

      if (window.parent && window.parent !== window) {
        const nearTopLeft = e.clientX < 280 && e.clientY < 88;
        if (nearTopLeft !== lastTopLeftState) {
          lastTopLeftState = nearTopLeft;
          try {
            window.parent.postMessage({ type: 'decon:stage-top-left', active: nearTopLeft }, '*');
          } catch (_) {}
        }
      }
    },
    { passive: true }
  );

  window.addEventListener('pointerdown', wakeCapsule, { passive: true });

  window.addEventListener('keydown', (e) => {
    wakeCapsule();
    if (e.key === 'Escape' && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'decon:stage-back' }, '*');
      } catch (_) {}
    } else if (e.key === ' ' && document.activeElement === document.body) {
      e.preventDefault();
      btnReplay?.click();
    }
  });

  window.addEventListener('message', (event) => {
    const data = event && event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'decon:card-visibility') {
      if (data.visible) {
        stage?.resume?.();
      } else {
        audio.stop();
        stage?.pause?.();
      }
    }
  });
}
