/**
 * shared-ui/lumen-muse-audio.js
 * Specimen #05: LUMEN MUSE · 潜影缪斯 (Optics LM-05 · 85mm f/1.2)
 * 48kHz Procedural WebAudio Synthesizer: Medium-Format Leaf Shutter,
 * 0.10x Macro Time-Dilated Helicoid Ticks & D5 / F#5 Crystal Cathedral Chimes.
 * Zero dependencies · Zero external audio assets · Lazy 48kHz AudioContext
 * @license MIT
 */

export const LUMEN_CHIME_NOTES = Object.freeze({
  D5: 587.33, FS5: 739.99, 'F#5': 739.99, A5: 880.00, D6: 1174.66
});

export function createLumenMuseAudio(options = {}) {
  const clampVal = (v, min, max) => Math.min(max, Math.max(min, v));
  const getNowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
  const targetVol = clampVal(typeof options.volume === 'number' ? options.volume : 0.26, 0.0001, 1);
  const defaultHammerCb = typeof options.onHammerStrike === 'function' ? options.onHammerStrike : null;

  let muted = Boolean(options.muted || options.embedCard || options.enabled === false);
  let destroyed = false, unlockBound = false, repeaterActive = false;
  let ctx = null, masterGain = null, voiceBus = null, reverbSend = null, reverbOut = null, analyser = null, noiseBuf = null;
  let reverbNodes = [], repeaterTimers = [], pendingCue = null;
  let tickParity = 0, lastFocusTickAt = 0, lastShutterAt = 0, lastRepeaterAt = 0;
  let lastElapsed = 0, nextTickElapsed = 0.08, shutterFired = false, crystalFired = false, repeaterFired = false;

  function buildPinkNoise(ac) {
    const len = Math.floor(ac.sampleRate * 1.6), buf = ac.createBuffer(1, len, ac.sampleRate), out = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.76160 * b5 - w * 0.0168980;
      out[i] = clampVal((b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.18, -0.92, 0.92); b6 = w * 0.115926;
    }
    return buf;
  }

  function buildCathedralReverb(ac, dest) {
    const input = ac.createGain(), hp = ac.createBiquadFilter(), ap1 = ac.createBiquadFilter(), ap2 = ac.createBiquadFilter();
    const merger = ac.createChannelMerger(2), wet = ac.createGain(), lfo = ac.createOscillator(), lfoGain = ac.createGain();
    hp.type = 'highpass'; hp.frequency.value = 230;
    ap1.type = 'allpass'; ap1.frequency.value = 760; ap1.Q.value = 0.7;
    ap2.type = 'allpass'; ap2.frequency.value = 1840; ap2.Q.value = 0.7;
    wet.gain.value = 0.44; lfo.type = 'sine'; lfo.frequency.value = 0.36; lfoGain.gain.value = 0.00042;
    lfo.connect(lfoGain); input.connect(hp); hp.connect(ap1); ap1.connect(ap2);
    const delays = [0.0437, 0.0593, 0.0739, 0.0893], feedbacks = [0.77, 0.79, 0.81, 0.82];
    const tracked = [input, hp, ap1, ap2, merger, wet, lfo, lfoGain];
    for (let i = 0; i < 4; i++) {
      const dly = ac.createDelay(0.15), damp = ac.createBiquadFilter(), fb = ac.createGain();
      dly.delayTime.value = delays[i]; damp.type = 'lowpass'; damp.frequency.value = 3900 - i * 260; fb.gain.value = feedbacks[i];
      if (i < 2) lfoGain.connect(dly.delayTime);
      ap2.connect(dly); dly.connect(damp); damp.connect(fb); fb.connect(dly); damp.connect(merger, 0, i % 2);
      tracked.push(dly, damp, fb);
    }
    merger.connect(wet); wet.connect(dest); lfo.start(ac.currentTime);
    reverbNodes = tracked; reverbOut = wet;
    return input;
  }

  function unbindUnlock() {
    if (!unlockBound || typeof window === 'undefined') return;
    unlockBound = false;
    for (const ev of unlockEvents) window.removeEventListener(ev, onGesture, true);
  }

  function onUnlocked() {
    if (destroyed || muted || !ctx || ctx.state !== 'running') return;
    unbindUnlock();
    const cue = pendingCue; pendingCue = null;
    if (cue && getNowMs() - cue.ts < 200) cue.fn(ctx, voiceBus);
  }

  function onGesture() {
    if (!destroyed && !muted && ctx) {
      if (ctx.state === 'suspended') ctx.resume().then(onUnlocked).catch(() => {});
      else if (ctx.state === 'running') onUnlocked();
    }
  }

  function ensureContext() {
    if (destroyed || muted || typeof window === 'undefined') return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC({ sampleRate: 48000 }); } catch (_) { try { ctx = new AC(); } catch (__) { return null; } }
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      masterGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.025);
      voiceBus = ctx.createGain(); analyser = ctx.createAnalyser();
      analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.8; analyser.minDecibels = -86; analyser.maxDecibels = -16;
      reverbSend = buildCathedralReverb(ctx, voiceBus);
      voiceBus.connect(masterGain); masterGain.connect(analyser); analyser.connect(ctx.destination);
      noiseBuf = buildPinkNoise(ctx);
      if (ctx.state !== 'running' && !unlockBound) {
        unlockBound = true;
        for (const ev of unlockEvents) window.addEventListener(ev, onGesture, { capture: true, passive: true });
      }
    }
    if (ctx.state === 'suspended') ctx.resume().then(onUnlocked).catch(() => {});
    return ctx;
  }

  function withAudio(fn) {
    const ac = ensureContext();
    if (!ac || !voiceBus) return;
    if (ac.state === 'running') fn(ac, voiceBus); else pendingCue = { fn, ts: getNowMs() };
  }

  function routeStereo(ac, dest, pan) {
    if (!pan || typeof ac.createStereoPanner !== 'function') return { entry: dest, end: () => {} };
    const sp = ac.createStereoPanner();
    sp.pan.setValueAtTime(clampVal(pan, -1, 1), ac.currentTime); sp.connect(dest);
    return { entry: sp, end: () => { try { sp.disconnect(); } catch (_) {} } };
  }

  function tone(ac, dest, type, f0, f1, t0, atk, dur, peak, wet = 0, pan = 0) {
    const osc = ac.createOscillator(), g = ac.createGain(), st = routeStereo(ac, dest, pan);
    osc.type = type; osc.frequency.setValueAtTime(Math.max(20, f0), t0);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + atk); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(st.entry);
    let wg = null;
    if (wet > 0 && reverbSend) { wg = ac.createGain(); wg.gain.setValueAtTime(wet, t0); g.connect(wg); wg.connect(reverbSend); }
    osc.onended = () => { try { g.disconnect(); if (wg) wg.disconnect(); } catch (_) {} st.end(); };
    osc.start(t0); osc.stop(t0 + dur + 0.01);
  }

  function noiseBurst(ac, dest, t0, atk, dur, f0, f1, q, peak, wet = 0) {
    if (!noiseBuf) return;
    const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.setValueAtTime(q, t0); bp.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + atk); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(dest);
    let wg = null;
    if (wet > 0 && reverbSend) { wg = ac.createGain(); wg.gain.setValueAtTime(wet, t0); g.connect(wg); wg.connect(reverbSend); }
    src.onended = () => { try { g.disconnect(); bp.disconnect(); if (wg) wg.disconnect(); } catch (_) {} };
    src.start(t0, Math.random() * 0.8, dur + 0.016);
  }

  function clearRepeaterTimers() {
    repeaterActive = false;
    while (repeaterTimers.length) clearTimeout(repeaterTimers.pop());
  }

  function playShutter() {
    if (destroyed) return;
    const ms = getNowMs();
    if (ms - lastShutterAt < 120) return;
    lastShutterAt = ms;
    if (muted) return;
    withAudio((ac, bus) => {
      const t = ac.currentTime;
      tone(ac, bus, 'triangle', 1720, 290, t, 0.001, 0.014, 0.42, 0.06);
      noiseBurst(ac, bus, t, 0.001, 0.011, 3100, 1700, 2.8, 0.30, 0.05);
      tone(ac, bus, 'triangle', 640, 148, t + 0.026, 0.001, 0.018, 0.46, 0.08);
      tone(ac, bus, 'sine', 195, 76, t + 0.026, 0.003, 0.032, 0.34, 0.04);
      tone(ac, bus, 'triangle', 2260, 1380, t + 0.056, 0.002, 0.038, 0.22, 0.12);
      noiseBurst(ac, bus, t + 0.056, 0.002, 0.036, 2100, 940, 3.2, 0.18, 0.08);
    });
  }

  function playFocusTick(timeScale = 1.0, gainScale = 1.0) {
    if (destroyed || muted) return;
    const slow = Number(timeScale) <= 0.2, ms = getNowMs();
    if (ms - lastFocusTickAt < (slow ? 85 : 24)) return;
    lastFocusTickAt = ms; tickParity ^= 1;
    const inflect = (tickParity ? 1.024 : 0.982) * (0.99 + Math.random() * 0.02), amp = clampVal(gainScale, 0.15, 1.25);
    withAudio((ac, bus) => {
      const t = ac.currentTime;
      if (slow) {
        tone(ac, bus, 'sine', 245 * inflect, 56, t, 0.005, 0.112, 0.48 * amp, 0.16);
        noiseBurst(ac, bus, t, 0.006, 0.110, 1960 * inflect, 310, 5.4, 0.34 * amp, 0.18);
        tone(ac, bus, 'triangle', 1290 * inflect, 610, t + 0.003, 0.004, 0.095, 0.22 * amp, 0.15);
        tone(ac, bus, 'sine', 2680 * inflect, 2490, t + 0.006, 0.005, 0.086, 0.09 * amp, 0.22);
      } else {
        tone(ac, bus, 'triangle', 2160 * inflect, 370, t, 0.001, 0.011, 0.34 * amp, 0.02);
        tone(ac, bus, 'sine', 3480 * inflect, 2600, t, 0.001, 0.008, 0.10 * amp, 0);
        noiseBurst(ac, bus, t, 0.001, 0.009, 3200 * inflect, 2100, 3.2, 0.22 * amp, 0.02);
      }
    });
  }

  function playCrystalMorph() {
    if (destroyed || muted) return;
    withAudio((ac, bus) => {
      const t = ac.currentTime;
      noiseBurst(ac, bus, t, 0.03, 0.24, 920, 3200, 3.6, 0.20, 0.35);
      tone(ac, bus, 'sine', 880.0, 1174.66, t + 0.01, 0.03, 0.42, 0.14, 0.55, -0.18);
      tone(ac, bus, 'sine', 1318.51, 1760.0, t + 0.04, 0.03, 0.46, 0.10, 0.60, 0.18);
    });
  }

  function strikeChimeInternal(note = 'D5', accent = 1.0, hammerCb = defaultHammerCb) {
    if (destroyed) return;
    const raw = String(note || 'D5').toUpperCase(), norm = raw === 'F#5' ? 'FS5' : raw;
    const f0 = LUMEN_CHIME_NOTES[norm] || LUMEN_CHIME_NOTES.D5;
    const hammer = norm === 'FS5' || norm === 'A5' ? 'FS5' : 'D5', pan = hammer === 'D5' ? -0.26 : 0.26;
    if (typeof hammerCb === 'function') { try { hammerCb(hammer); } catch (_) {} }
    if (muted) return;
    withAudio((ac, bus) => {
      const t = ac.currentTime, a = clampVal(accent, 0.2, 1.2);
      noiseBurst(ac, bus, t, 0.001, 0.015, 1860, 740, 2.3, 0.18 * a, 0.15);
      tone(ac, bus, 'triangle', f0 * 3.0, f0, t, 0.001, 0.010, 0.14 * a, 0.10, pan);
      tone(ac, bus, 'sine', f0 * 0.5, f0 * 0.5, t, 0.008, 1.35, 0.10 * a, 0.45, pan * 0.5);
      tone(ac, bus, 'sine', f0, f0, t, 0.004, 2.40, 0.44 * a, 0.72, pan);
      tone(ac, bus, 'sine', f0 * 2.0, f0 * 2.0, t, 0.004, 1.65, 0.20 * a, 0.65, pan);
      tone(ac, bus, 'sine', f0 * 2.756, f0 * 2.754, t + 0.002, 0.004, 0.78, 0.065 * a, 0.68, -pan * 0.6);
      tone(ac, bus, 'sine', f0 * 4.01, f0 * 4.005, t + 0.002, 0.003, 0.56, 0.085 * a, 0.72, pan * 0.8);
      tone(ac, bus, 'sine', f0 * 5.404, f0 * 5.40, t + 0.003, 0.003, 0.34, 0.042 * a, 0.70, -pan * 0.7);
    });
  }

  function strikeChime(note = 'D5', customHammerCb) {
    strikeChimeInternal(note, 1.0, typeof customHammerCb === 'function' ? customHammerCb : defaultHammerCb);
  }

  function playRepeaterSequence(customHammerCb) {
    if (destroyed) return;
    const ms = getNowMs();
    if (repeaterActive && ms - lastRepeaterAt < 400) return;
    clearRepeaterTimers();
    repeaterActive = true; lastRepeaterAt = ms; repeaterFired = true;
    const cb = typeof customHammerCb === 'function' ? customHammerCb : defaultHammerCb;
    const ac = !muted ? ensureContext() : null, baseAudioTime = ac && ac.state === 'running' ? ac.currentTime : null;
    const phrase = [[0, 'D5', 1], [0.42, 'FS5', 0.94], [1.28, 'D5', 0.96], [1.70, 'FS5', 0.92], [2.56, 'D5', 0.95], [2.98, 'FS5', 0.92], [3.68, 'A5', 0.78], [4.32, 'D6', 0.70]];
    for (const [sec, note, accent] of phrase) {
      const delayMs = baseAudioTime !== null && ctx && ctx.state === 'running' ? Math.max(0, (baseAudioTime + sec - ctx.currentTime) * 1000) : sec * 1000;
      repeaterTimers.push(setTimeout(() => { if (!destroyed && repeaterActive) strikeChimeInternal(note, accent, cb); }, delayMs));
    }
    repeaterTimers.push(setTimeout(() => { repeaterActive = false; }, 4800));
  }

  function resetTimeline() {
    clearRepeaterTimers();
    lastElapsed = 0; nextTickElapsed = 0.08; shutterFired = crystalFired = repeaterFired = false;
  }

  function syncTimeline(elapsedSec, shotId, timeScale = 1.0) {
    if (destroyed) return;
    const t = Math.max(0, Number(elapsedSec) || 0);
    if (t < lastElapsed - 0.5) resetTimeline();
    if (!shutterFired && t >= 5.0 && t < 5.6) { shutterFired = true; playShutter(); }
    if (!crystalFired && t >= 9.0 && t < 9.6) { crystalFired = true; playCrystalMorph(); }
    if (!repeaterFired && t >= 17.5 && t < 18.3) { repeaterFired = true; playRepeaterSequence(); }

    const inMacro = (t >= 11.0 && t < 17.0) || shotId === 'shot-03' || Number(timeScale) <= 0.2;
    const inLume = (t >= 17.0 && t < 23.0) || shotId === 'shot-04';
    const interval = inMacro ? 1.66 : inLume ? 0.34 : 0.1667;
    if (nextTickElapsed > t + interval * 1.1) nextTickElapsed = t + interval * 0.5;
    if (t >= nextTickElapsed && t < 23.95) {
      playFocusTick(inMacro ? 0.10 : 1.0, inLume ? 0.42 : 1.0);
      nextTickElapsed = Math.max(t + interval * 0.65, nextTickElapsed + interval);
    }
    lastElapsed = t;
  }

  function setMuted(mutedBool) {
    if (destroyed) return true;
    muted = Boolean(mutedBool);
    if (muted) {
      pendingCue = null;
      if (ctx && masterGain && ctx.state !== 'closed') {
        masterGain.gain.cancelScheduledValues(ctx.currentTime); masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
      }
    } else {
      const ac = ensureContext();
      if (ac && masterGain) {
        masterGain.gain.cancelScheduledValues(ac.currentTime); masterGain.gain.setTargetAtTime(targetVol, ac.currentTime, 0.025);
      }
    }
    return muted;
  }

  return {
    playShutter, playFocusTick, strikeChime, playRepeaterSequence, syncTimeline, resetTimeline,
    setMuted, toggleMute: () => setMuted(!muted), isMuted: () => muted, getAnalyser: () => analyser,
    stop() {
      pendingCue = null; clearRepeaterTimers();
      if (ctx && voiceBus && masterGain && ctx.state !== 'closed') {
        const oldBus = voiceBus, t = ctx.currentTime;
        oldBus.gain.cancelScheduledValues(t); oldBus.gain.setTargetAtTime(0.0001, t, 0.015);
        setTimeout(() => { try { oldBus.disconnect(); } catch (_) {} }, 110);
        voiceBus = ctx.createGain(); voiceBus.connect(masterGain);
        if (reverbOut) { try { reverbOut.disconnect(); reverbOut.connect(voiceBus); } catch (_) {} }
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; muted = true; pendingCue = null; clearRepeaterTimers(); unbindUnlock();
      if (ctx) {
        const ac = ctx; ctx = null;
        try {
          if (masterGain && ac.state !== 'closed') masterGain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.01);
          for (const n of reverbNodes) {
            if (typeof n.stop === 'function') { try { n.stop(); } catch (_) {} }
            try { n.disconnect(); } catch (_) {}
          }
          if (voiceBus) voiceBus.disconnect(); if (masterGain) masterGain.disconnect(); if (analyser) analyser.disconnect();
        } catch (_) {}
        if (ac.state !== 'closed') ac.close().catch(() => {});
      }
      reverbNodes = []; voiceBus = masterGain = reverbSend = reverbOut = analyser = noiseBuf = null;
    }
  };
}

export default createLumenMuseAudio;
