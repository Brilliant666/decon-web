/**
 * musicForProgramming(); — Monospace IDE, ASCII Audio & Flow State UI Kit (MfpUI)
 * Deconstructed & extracted from https://musicforprogramming.net/ (Datassette)
 * Zero dependencies · Pure Vanilla JS + Web Audio API + Canvas 2D
 */

export const MfpUI = (() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const MFP_GLYPHS = '~+=|[].+$^@*()%!?#/<>_:;-';
  const BLOCK_CHARS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const MFP_WAVE_ROWS = [
    "                       _.-+:*^~'",
    "               _.-+:*^~'        ",
    "       _.-+:*^~'                ",
    "_.-+:*^~'                       "
  ];

  /* ==========================================================================
   * 1. ASCII Character Progress / Volume Bar Controller (createAsciiBar)
   * Renders an interactive, clickable & pointer-draggable pure ASCII bar:
   * e.g. [||||||||||||..................] 14:20 / 58:00  or  [Vol: ||||||--]
   * Fixed-width, tabular-nums, zero layout shift during playback updates.
   * ========================================================================== */
  function createAsciiBar(el, options = {}) {
    let width = options.width || 28;
    let value = clamp(options.value != null ? options.value : 0, 0, 1);
    const fillChar = options.fillChar || '|';
    const emptyChar = options.emptyChar || '.';
    const prefix = options.prefix || '';
    const openBracket = options.openBracket != null ? options.openBracket : '[';
    const closeBracket = options.closeBracket != null ? options.closeBracket : ']';
    let suffix = options.suffix || '';
    const formatSuffix = options.formatSuffix || null;
    const step = options.step || (1 / width);
    let dragging = false;
    let lastLitCols = -1;

    el.classList.add('mfp-ascii-bar');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');

    const trackSpan = document.createElement('span');
    trackSpan.className = 'mfp-ascii-bar__track';

    const brOpenSpan = document.createElement('span');
    brOpenSpan.className = 'mfp-ascii-bar__br';
    brOpenSpan.textContent = `${openBracket}${prefix}`;

    const fillSpan = document.createElement('span');
    fillSpan.className = 'mfp-ascii-bar__fill';

    const emptySpan = document.createElement('span');
    emptySpan.className = 'mfp-ascii-bar__empty';

    const brCloseSpan = document.createElement('span');
    brCloseSpan.className = 'mfp-ascii-bar__br';
    brCloseSpan.textContent = closeBracket;

    trackSpan.append(brOpenSpan, fillSpan, emptySpan, brCloseSpan);

    const suffixSpan = document.createElement('span');
    suffixSpan.className = 'mfp-ascii-bar__suffix';

    el.innerHTML = '';
    el.append(trackSpan, suffixSpan);

    let prevLit = -1;
    let prevW = -1;
    let prevSuffix = null;

    function render() {
      const lit = clamp(Math.round(value * width), 0, width);
      if (lit !== prevLit || width !== prevW) {
        fillSpan.textContent = fillChar.repeat(lit);
        emptySpan.textContent = emptyChar.repeat(width - lit);
        prevLit = lit;
        prevW = width;
      }
      const sufText = formatSuffix ? formatSuffix(value) : suffix;
      const formattedSuf = sufText ? ` ${sufText}` : '';
      if (formattedSuf !== prevSuffix) {
        suffixSpan.textContent = formattedSuf;
        prevSuffix = formattedSuf;
      }
      el.setAttribute('aria-valuenow', String(Math.round(value * 100)));
    }

    function ratioFromEvent(e) {
      const rect = trackSpan.getBoundingClientRect();
      if (!rect.width) return value;
      const totalChars = openBracket.length + prefix.length + width + closeBracket.length;
      const charW = rect.width / totalChars;
      const startX = rect.left + (openBracket.length + prefix.length) * charW;
      const barW = Math.max(1, width * charW);
      return clamp((e.clientX - startX) / barW, 0, 1);
    }

    function updateFromPointer(e, isCommit = false) {
      const next = ratioFromEvent(e);
      const litCols = Math.round(next * width);
      if (litCols !== lastLitCols) {
        if (lastLitCols !== -1 && options.sound && options.sound.tick) {
          options.sound.tick(0.75 + next * 0.55);
        }
        lastLitCols = litCols;
      }
      value = next;
      render();
      if (options.onInput) options.onInput(value);
      if (isCommit && options.onChange) options.onChange(value);
    }

    trackSpan.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      lastLitCols = Math.round(value * width);
      trackSpan.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
      updateFromPointer(e, false);
    });

    trackSpan.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      updateFromPointer(e, false);
    });

    const stopDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');
      updateFromPointer(e, true);
    };

    trackSpan.addEventListener('pointerup', stopDrag);
    trackSpan.addEventListener('pointercancel', stopDrag);

    el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        value = clamp(value - step, 0, 1);
        render();
        if (options.sound && options.sound.tick) options.sound.tick(0.85);
        if (options.onInput) options.onInput(value);
        if (options.onChange) options.onChange(value);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        value = clamp(value + step, 0, 1);
        render();
        if (options.sound && options.sound.tick) options.sound.tick(1.1);
        if (options.onInput) options.onInput(value);
        if (options.onChange) options.onChange(value);
      }
    });

    render();

    return {
      setValue(v, silent = true) {
        if (dragging && silent) return;
        value = clamp(v, 0, 1);
        render();
      },
      getValue: () => value,
      setSuffix(s) {
        suffix = s;
        render();
      },
      setWidth(w) {
        width = Math.max(4, w);
        render();
      },
      isDragging: () => dragging,
      render
    };
  }

  /* ==========================================================================
   * 2. Real-Time 32-Band ASCII & LED Dot-Matrix Spectrum Analyzer (createSpectrum)
   * Supports dual visualization modes:
   *   - 'ascii': 32 locked vertical column tracks of Unicode block bars (▁▂▃▄▅▆▇█)
   *              with peak hold — 100% immune to font fallback width/height jitter!
   *   - 'dots' : Hardware 32x12 LED dot-matrix Canvas with peak-hold dots
   * Plus outputs the 4-row original MFP `_.-•:*^º'` wave strings on each frame!
   * ========================================================================== */
  function createSpectrum(hostEl, options = {}) {
    const bandsCount = options.bands || 32;
    const asciiRows = options.asciiRows || 6;
    const dotRows = options.dotRows || 12;
    let mode = options.mode || 'ascii'; // 'ascii' | 'dots'
    let analyser = options.analyser || null;
    let simulated = !!options.simulated;
    let running = false;
    let raf = 0;

    const smoothBands = new Float32Array(bandsCount);
    const peaks = new Float32Array(bandsCount);
    const peakHoldFrames = new Uint16Array(bandsCount);
    let freqBuf = analyser ? new Uint8Array(analyser.frequencyBinCount) : new Uint8Array(1024);

    // Build internal DOM inside hostEl with strict fixed-size viewport
    hostEl.classList.add('mfp-spectrum');
    const stageEl = document.createElement('div');
    stageEl.className = 'mfp-spectrum__stage';

    const asciiGrid = document.createElement('div');
    asciiGrid.className = 'mfp-spectrum__ascii';
    asciiGrid.setAttribute('aria-hidden', 'true');

    // Pre-build 32 locked vertical columns x asciiRows cells so glyphs never shift neighbors
    const cellNodes = [];
    const cellChars = [];
    const rowColorClass = [];
    for (let r = 0; r < asciiRows; r++) {
      // r=0 is top row, r=asciiRows-1 is bottom row
      const rowFromBottom = asciiRows - 1 - r;
      rowColorClass[r] = rowFromBottom >= asciiRows - 1 ? 'fuschia'
        : rowFromBottom >= asciiRows - 2 ? 'orange'
        : rowFromBottom >= asciiRows - 3 ? 'yellow'
        : 'green';
    }

    for (let b = 0; b < bandsCount; b++) {
      const colEl = document.createElement('div');
      colEl.className = 'mfp-spectrum__col';
      const colCells = [];
      const colState = [];
      for (let r = 0; r < asciiRows; r++) {
        const cell = document.createElement('span');
        cell.className = `mfp-spectrum__cell ${rowColorClass[r]}`;
        cell.textContent = '.';
        colEl.appendChild(cell);
        colCells.push(cell);
        colState.push('.');
      }
      asciiGrid.appendChild(colEl);
      cellNodes.push(colCells);
      cellChars.push(colState);
    }

    const dotCanvas = document.createElement('canvas');
    dotCanvas.className = 'mfp-spectrum__canvas';

    stageEl.append(asciiGrid, dotCanvas);

    const scaleRow = document.createElement('div');
    scaleRow.className = 'mfp-spectrum__scale';
    scaleRow.innerHTML =
      '<span>32Hz</span><span>125Hz</span><span>500Hz</span><span>2kHz</span><span>8kHz</span><span>16kHz</span>';

    hostEl.innerHTML = '';
    hostEl.append(stageEl, scaleRow);

    function applyModeDom() {
      asciiGrid.hidden = mode !== 'ascii';
      dotCanvas.hidden = mode !== 'dots';
      hostEl.setAttribute('data-spectrum-mode', mode);
    }
    applyModeDom();

    function sampleBands(t) {
      let hasSignal = false;
      if (analyser) {
        if (freqBuf.length !== analyser.frequencyBinCount) {
          freqBuf = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(freqBuf);
        for (let i = 0; i < 64; i++) {
          if (freqBuf[i] > 2) { hasSignal = true; break; }
        }
      }

      const wave0 = [];
      const wave1 = [];
      const wave2 = [];
      const wave3 = [];

      let c = 1;
      let s = -40;
      let l = 1.08;

      for (let o = 0; o < bandsCount; o++) {
        let rawByte = 0;
        if (hasSignal) {
          const idx = clamp(Math.floor(c) + o, 0, freqBuf.length - 1);
          rawByte = freqBuf[idx];
        } else if (simulated) {
          const norm = o / bandsCount;
          const slow = Math.sin(t * 0.0018 + o * 0.28) * 0.5 + 0.5;
          const mid = Math.sin(t * 0.0031 - o * 0.45) * 0.5 + 0.5;
          const env = Math.exp(-norm * 1.65) * 0.72 + Math.exp(-Math.pow((norm - 0.35) * 4, 2)) * 0.38;
          rawByte = clamp(Math.round((slow * 0.6 + mid * 0.4) * env * 215 + 18), 0, 255);
        }

        const mfpIdx = clamp(Math.max((rawByte + s) >> 3, 0), 0, 31);
        c *= l;
        s += 1.5;
        l += 0.01;

        wave0.push(MFP_WAVE_ROWS[0][mfpIdx] || ' ');
        wave1.push(MFP_WAVE_ROWS[1][mfpIdx] || ' ');
        wave2.push(MFP_WAVE_ROWS[2][mfpIdx] || ' ');
        wave3.push(MFP_WAVE_ROWS[3][mfpIdx] || ' ');

        const target = clamp((rawByte + (o * 1.35)) / 245, 0, 1);
        smoothBands[o] += (target - smoothBands[o]) * (target > smoothBands[o] ? 0.38 : 0.16);

        if (smoothBands[o] >= peaks[o]) {
          peaks[o] = smoothBands[o];
          peakHoldFrames[o] = 22;
        } else if (peakHoldFrames[o] > 0) {
          peakHoldFrames[o]--;
        } else {
          peaks[o] = Math.max(0, peaks[o] - 0.018);
        }
      }

      return [wave0.join(''), wave1.join(''), wave2.join(''), wave3.join('')];
    }

    function renderAscii() {
      for (let b = 0; b < bandsCount; b++) {
        const val = smoothBands[b] * asciiRows;
        const peakRowFromBottom = Math.floor(peaks[b] * asciiRows - 0.01);
        const colCells = cellNodes[b];
        const colState = cellChars[b];

        for (let r = 0; r < asciiRows; r++) {
          const rowFromBottom = asciiRows - 1 - r;
          const cellFill = clamp(val - rowFromBottom, 0, 1);
          const charIdx = Math.round(cellFill * 8);
          let ch = '.';
          if (charIdx > 0) {
            ch = BLOCK_CHARS[charIdx];
          } else if (rowFromBottom === peakRowFromBottom && peaks[b] > 0.06) {
            ch = '-';
          }
          if (colState[r] !== ch) {
            colState[r] = ch;
            colCells[r].textContent = ch;
          }
        }
      }
    }

    function renderDots() {
      const W = stageEl.clientWidth || hostEl.clientWidth || 380;
      const H = stageEl.clientHeight || 108;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (dotCanvas.width !== Math.round(W * dpr) || dotCanvas.height !== Math.round(H * dpr)) {
        dotCanvas.width = Math.round(W * dpr);
        dotCanvas.height = Math.round(H * dpr);
      }
      const ctx = dotCanvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cs = getComputedStyle(document.body);
      const colGreen = cs.getPropertyValue('--c-green').trim() || '#1beb9e';
      const colYellow = cs.getPropertyValue('--c-yellow').trim() || '#dddd25';
      const colOrange = cs.getPropertyValue('--c-orange').trim() || '#ff9528';
      const colFuschia = cs.getPropertyValue('--c-fuschia').trim() || '#ff45b4';
      const colDim = cs.getPropertyValue('--c-grey').trim() || '#898989';

      const stepX = W / bandsCount;
      const stepY = H / dotRows;
      const rOn = Math.min(stepX, stepY) * 0.34;
      const rOff = Math.max(0.8, rOn * 0.42);

      for (let b = 0; b < bandsCount; b++) {
        const litCount = Math.round(smoothBands[b] * dotRows);
        const peakRow = Math.min(dotRows - 1, Math.floor(peaks[b] * dotRows));
        const cx = (b + 0.5) * stepX;

        for (let r = 0; r < dotRows; r++) {
          const rowFromBottom = dotRows - 1 - r;
          const cy = (r + 0.5) * stepY;
          const isLit = rowFromBottom < litCount;
          const isPeak = !isLit && rowFromBottom === peakRow && peaks[b] > 0.05;

          if (isLit || isPeak) {
            const ratio = rowFromBottom / dotRows;
            ctx.fillStyle = ratio > 0.82 ? colFuschia
              : ratio > 0.62 ? colOrange
              : ratio > 0.42 ? colYellow
              : colGreen;
            ctx.globalAlpha = isPeak ? 0.9 : 1;
            ctx.beginPath();
            ctx.arc(cx, cy, isPeak ? rOn * 0.82 : rOn, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = colDim;
            ctx.globalAlpha = 0.22;
            ctx.beginPath();
            ctx.arc(cx, cy, rOff, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      if (!running) return;
      const waveRows = sampleBands(t);
      if (options.onWaveFrame) options.onWaveFrame(waveRows, smoothBands);
      if (mode === 'ascii') renderAscii();
      else renderDots();
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    sampleBands(0);
    renderAscii();

    return {
      start,
      stop,
      setAnalyser(node) { analyser = node; },
      setSimulated(v) { simulated = !!v; },
      isSimulated: () => simulated,
      setMode(m) {
        mode = m === 'dots' ? 'dots' : 'ascii';
        applyModeDom();
        if (mode === 'ascii') renderAscii();
        else renderDots();
      },
      toggleMode() {
        const next = mode === 'ascii' ? 'dots' : 'ascii';
        this.setMode(next);
        return next;
      },
      getMode: () => mode,
      getBands: () => smoothBands
    };
  }

  /* ==========================================================================
   * 3. Procedural Ambient Drone Synthesizer (createAmbientPad)
   * Pure Web Audio API harmonic multi-voice sine/triangle pad + slow LFO
   * low-pass filter sweep + generative pentatonic/modal bell overtones.
   * Calm, warm, zero harsh noise — guarantees instant playback & spectrum drive!
   * ========================================================================== */
  const AMBIENT_CHORDS = [
    {
      name: 'Dmaj9 // Hypnagogic Warmth',
      notes: [73.42, 110.00, 146.83, 185.00, 220.00, 277.18, 329.63],
      shimmer: [440.00, 554.37, 659.25, 739.99, 880.00]
    },
    {
      name: 'F#m11 // Subterranean Flow',
      notes: [92.50, 138.59, 185.00, 220.00, 277.18, 329.63, 415.30],
      shimmer: [440.00, 554.37, 659.25, 830.61, 987.77]
    },
    {
      name: 'Cmaj9#11 // Lydian Horizon',
      notes: [65.41, 98.00, 130.81, 164.81, 196.00, 246.94, 293.66],
      shimmer: [369.99, 493.88, 587.33, 659.25, 783.99]
    },
    {
      name: 'Em9 // Nocturnal Compiler',
      notes: [82.41, 123.47, 164.81, 196.00, 246.94, 293.66, 369.99],
      shimmer: [493.88, 587.33, 659.25, 739.99, 987.77]
    },
    {
      name: 'Asus2/F // Tape Memory',
      notes: [87.31, 110.00, 164.81, 220.00, 246.94, 329.63, 440.00],
      shimmer: [493.88, 659.25, 880.00, 987.77, 1108.73]
    },
    {
      name: 'Bbmaj9 // Stratosphere Drift',
      notes: [58.27, 116.54, 174.61, 220.00, 261.63, 349.23, 392.00],
      shimmer: [440.00, 523.25, 698.46, 783.99, 880.00]
    }
  ];

  function createAmbientPad(options = {}) {
    let ctx = options.audioContext || null;
    let outNode = options.outputNode || null;
    let analyser = options.analyser || null;
    let presetIdx = (options.preset || 0) % AMBIENT_CHORDS.length;
    let volume = options.volume != null ? options.volume : 0.85;
    let filterCutoff = options.cutoff || 520;
    let lfoRate = options.lfoRate || 0.065;
    let shimmerEnabled = options.shimmer !== false;

    let playing = false;
    let activeGraph = null;
    let shimmerTimer = 0;

    function ensureContext() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!analyser) {
        analyser = ctx.createAnalyser();
        analyser.minDecibels = -114;
        analyser.maxDecibels = -30;
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.72;
      }
      if (!outNode) {
        outNode = ctx.createGain();
        outNode.gain.value = Math.pow(volume, 1.5);
        analyser.connect(outNode);
        outNode.connect(ctx.destination);
      }
      return ctx;
    }

    function triggerShimmerNote() {
      if (!playing || !shimmerEnabled || !activeGraph || !ctx) return;
      const chord = AMBIENT_CHORDS[presetIdx];
      const pool = chord.shimmer;
      const freq = pool[Math.floor(Math.random() * pool.length)];
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const noteLp = ctx.createBiquadFilter();

      osc.type = 'sine';
      sub.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      sub.frequency.setValueAtTime(freq * 0.5, now);
      sub.detune.setValueAtTime((Math.random() - 0.5) * 8, now);

      noteLp.type = 'lowpass';
      noteLp.frequency.setValueAtTime(filterCutoff * 2.1, now);
      noteLp.Q.setValueAtTime(0.7, now);

      const peakGain = 0.055 + Math.random() * 0.035;
      const attack = 0.65 + Math.random() * 0.45;
      const decay = 2.8 + Math.random() * 1.6;

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(peakGain, now + attack);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);

      osc.connect(noteLp);
      sub.connect(noteLp);
      noteLp.connect(noteGain);
      noteGain.connect(activeGraph.padBus);

      osc.start(now);
      sub.start(now);
      osc.stop(now + attack + decay + 0.05);
      sub.stop(now + attack + decay + 0.05);
    }

    function start(customPresetIdx) {
      if (customPresetIdx != null) {
        presetIdx = Math.abs(Math.round(customPresetIdx)) % AMBIENT_CHORDS.length;
      }
      const c = ensureContext();
      if (!c) return false;
      if (playing) {
        updateChordFrequencies();
        return true;
      }
      playing = true;
      const now = c.currentTime;
      const chord = AMBIENT_CHORDS[presetIdx];

      const padBus = c.createGain();
      padBus.gain.setValueAtTime(0.0001, now);
      padBus.gain.linearRampToValueAtTime(0.55, now + 1.2);

      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(filterCutoff, now);
      lp.Q.setValueAtTime(1.15, now);

      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(lfoRate, now);
      lfoGain.gain.setValueAtTime(filterCutoff * 0.55, now);
      lfo.connect(lfoGain);
      lfoGain.connect(lp.frequency);
      lfo.start(now);

      const delay = c.createDelay(1.0);
      const delayFb = c.createGain();
      const delayLp = c.createBiquadFilter();
      delay.delayTime.setValueAtTime(0.42, now);
      delayFb.gain.setValueAtTime(0.32, now);
      delayLp.type = 'lowpass';
      delayLp.frequency.setValueAtTime(1100, now);

      padBus.connect(lp);
      lp.connect(analyser);

      lp.connect(delay);
      delay.connect(delayLp);
      delayLp.connect(delayFb);
      delayFb.connect(delay);
      delayLp.connect(analyser);

      const voices = chord.notes.map((freq, idx) => {
        const osc = c.createOscillator();
        const vGain = c.createGain();
        const breatheLfo = c.createOscillator();
        const breatheDepth = c.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        const detuneCents = (idx - 3) * 2.4;
        osc.detune.setValueAtTime(detuneCents, now);

        const baseAmp = idx === 0 ? 0.16 : (0.12 / Math.pow(idx + 1, 0.35));
        vGain.gain.setValueAtTime(baseAmp, now);

        breatheLfo.type = 'sine';
        breatheLfo.frequency.setValueAtTime(0.05 + idx * 0.023, now);
        breatheDepth.gain.setValueAtTime(baseAmp * 0.38, now);
        breatheLfo.connect(breatheDepth);
        breatheDepth.connect(vGain.gain);

        osc.connect(vGain);
        vGain.connect(padBus);

        osc.start(now);
        breatheLfo.start(now);
        return { osc, vGain, breatheLfo };
      });

      activeGraph = { padBus, lp, lfo, lfoGain, delay, delayFb, delayLp, voices };

      triggerShimmerNote();
      shimmerTimer = setInterval(triggerShimmerNote, 2200);
      return true;
    }

    function updateChordFrequencies() {
      if (!activeGraph || !ctx) return;
      const chord = AMBIENT_CHORDS[presetIdx];
      const now = ctx.currentTime;
      activeGraph.voices.forEach((v, idx) => {
        const targetFreq = chord.notes[idx % chord.notes.length];
        v.osc.frequency.cancelScheduledValues(now);
        v.osc.frequency.setValueAtTime(v.osc.frequency.value, now);
        v.osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.85);
      });
    }

    function stop() {
      if (!playing) return false;
      playing = false;
      if (shimmerTimer) {
        clearInterval(shimmerTimer);
        shimmerTimer = 0;
      }
      if (activeGraph && ctx) {
        const now = ctx.currentTime;
        const graph = activeGraph;
        activeGraph = null;
        graph.padBus.gain.cancelScheduledValues(now);
        graph.padBus.gain.setValueAtTime(Math.max(0.0001, graph.padBus.gain.value), now);
        graph.padBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        setTimeout(() => {
          try {
            graph.lfo.stop();
            graph.voices.forEach((v) => {
              v.osc.stop();
              v.breatheLfo.stop();
            });
            graph.padBus.disconnect();
            graph.lp.disconnect();
            graph.delayLp.disconnect();
          } catch (_) {}
        }, 500);
      }
      return false;
    }

    return {
      start,
      stop,
      toggle() { return playing ? stop() : start(); },
      isPlaying: () => playing,
      setPreset(idx) {
        presetIdx = Math.abs(Math.round(idx)) % AMBIENT_CHORDS.length;
        if (playing) updateChordFrequencies();
        return AMBIENT_CHORDS[presetIdx];
      },
      getPresetIndex: () => presetIdx,
      getPreset: () => AMBIENT_CHORDS[presetIdx],
      getPresets: () => AMBIENT_CHORDS,
      setFilterCutoff(hz) {
        filterCutoff = clamp(hz, 120, 2400);
        if (activeGraph && ctx) {
          activeGraph.lp.frequency.setTargetAtTime(filterCutoff, ctx.currentTime, 0.15);
          activeGraph.lfoGain.gain.setTargetAtTime(filterCutoff * 0.55, ctx.currentTime, 0.15);
        }
      },
      setLfoRate(rate) {
        lfoRate = clamp(rate, 0.01, 2.0);
        if (activeGraph && ctx) {
          activeGraph.lfo.frequency.setTargetAtTime(lfoRate, ctx.currentTime, 0.1);
        }
      },
      setShimmer(on) { shimmerEnabled = !!on; },
      setVolume(v) {
        volume = clamp(v, 0, 1);
        if (outNode && ctx) {
          outNode.gain.setTargetAtTime(Math.pow(volume, 1.5), ctx.currentTime, 0.05);
        }
      },
      triggerShimmerNote,
      getAudioContext: () => { ensureContext(); return ctx; },
      getAnalyser: () => { ensureContext(); return analyser; },
      getOutputNode: () => { ensureContext(); return outNode; }
    };
  }

  /* ==========================================================================
   * 4. Code-Comment Flow Pomodoro Timer (createFlowTimer)
   * Renders: /* FLOW_TIMER: 25:00 [START] [25m/50m] [RESET] * /
   * Triggers a warm two-tone harmonic overtone chime when countdown finishes.
   * ========================================================================== */
  function createFlowTimer(el, options = {}) {
    const presets = options.presets || [25 * 60, 50 * 60];
    let presetIdx = 0;
    let totalSec = options.initialSeconds || presets[0];
    let remainSec = totalSec;
    let running = false;
    let timerId = 0;
    let sessions = 0;

    el.classList.add('mfp-flow-timer');

    function fmt(sec) {
      const s = Math.max(0, Math.floor(sec));
      const m = Math.floor(s / 60);
      const r = s % 60;
      return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    }

    function render() {
      const startLbl = running ? 'PAUSE' : (remainSec < totalSec && remainSec > 0 ? 'RESUME' : 'START');
      const modeLbl = `${Math.round(presets[0] / 60)}m/${Math.round(presets[1] / 60)}m`;
      const activeMode = `${Math.round(totalSec / 60)}m`;
      const pct = totalSec > 0 ? clamp(1 - remainSec / totalSec, 0, 1) : 0;
      const barCols = 8;
      const lit = Math.round(pct * barCols);
      const miniBar = '#'.repeat(lit) + '.'.repeat(barCols - lit);

      el.innerHTML =
        `<span class="mfp-flow__comment">/* FLOW_TIMER: </span>` +
        `<span class="mfp-flow__time ${running ? 'green' : 'yellow'}">${fmt(remainSec)}</span> ` +
        `<span class="mfp-flow__bar grey">[${miniBar}]</span> ` +
        `<button type="button" class="mfp-flow__btn ${running ? 'orange' : 'green'} hover" data-act="toggle">[${startLbl}]</button> ` +
        `<button type="button" class="mfp-flow__btn purple hover" data-act="mode" title="Active preset: ${activeMode}">[${modeLbl}]</button> ` +
        `<button type="button" class="mfp-flow__btn fuschia hover" data-act="reset">[RESET]</button>` +
        (sessions > 0 ? ` <span class="mfp-flow__sessions yellow">// x${sessions}</span>` : '') +
        `<span class="mfp-flow__comment"> */</span>`;
    }

    function complete() {
      pause();
      sessions++;
      remainSec = 0;
      render();
      if (options.sound && options.sound.chime) {
        options.sound.chime();
      }
      if (options.onComplete) options.onComplete(sessions);
    }

    function tick() {
      if (!running) return;
      if (remainSec <= 1) {
        complete();
        return;
      }
      remainSec--;
      render();
      if (options.onTick) options.onTick(remainSec, totalSec);
    }

    function start() {
      if (running) return;
      if (remainSec <= 0) remainSec = totalSec;
      running = true;
      timerId = setInterval(tick, 1000);
      render();
      if (options.sound && options.sound.switch) options.sound.switch(true);
    }

    function pause() {
      if (!running) return;
      running = false;
      if (timerId) { clearInterval(timerId); timerId = 0; }
      render();
    }

    function toggle() {
      if (running) {
        pause();
        if (options.sound && options.sound.switch) options.sound.switch(false);
      } else {
        start();
      }
    }

    function cycleMode() {
      pause();
      presetIdx = (presetIdx + 1) % presets.length;
      totalSec = presets[presetIdx];
      remainSec = totalSec;
      render();
      if (options.sound && options.sound.tick) options.sound.tick(1.15);
    }

    function reset(customSeconds) {
      pause();
      if (typeof customSeconds === 'number' && customSeconds > 0) {
        totalSec = customSeconds;
      } else {
        totalSec = presets[presetIdx];
      }
      remainSec = totalSec;
      render();
      if (options.sound && options.sound.tick) options.sound.tick(0.8);
    }

    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      if (act === 'toggle') toggle();
      else if (act === 'mode') cycleMode();
      else if (act === 'reset') reset();
    });

    render();

    return {
      start,
      pause,
      toggle,
      reset,
      cycleMode,
      isRunning: () => running,
      getRemaining: () => remainSec,
      getSessions: () => sessions
    };
  }

  /* ==========================================================================
   * 5. Authentic MFP Cipher Text Scramble Transition (scrambleText)
   * Uses the original musicforprogramming.net glyph set: "—~±§|[].+$^@*()•x%!?#"
   * ========================================================================== */
  function scrambleText(el, targetText, options = {}) {
    if (!el) return;
    const runId = (el._scrambleId = (el._scrambleId || 0) + 1);
    const finalStr = targetText != null ? String(targetText) : el.textContent;
    const dur = options.duration || Math.min(620, 220 + finalStr.length * 10);
    const delay = options.delay || 0;
    const glyphs = options.glyphs || MFP_GLYPHS;
    const t0 = performance.now() + delay;

    function step(now) {
      if (el._scrambleId !== runId) return;
      const elapsed = now - t0;
      if (elapsed < 0) {
        requestAnimationFrame(step);
        return;
      }
      const p = clamp(elapsed / dur, 0, 1);
      if (p >= 1) {
        el.textContent = finalStr;
        return;
      }
      const ease = Math.pow(-(Math.cos(Math.PI * p) - 1) / 2, 2);
      const revealCount = Math.floor(finalStr.length * ease);
      const scrambleWindow = Math.max(3, Math.floor(2 * (0.5 - Math.abs(ease - 0.5)) * finalStr.length * 0.9));

      let out = '';
      for (let i = 0; i < finalStr.length; i++) {
        const ch = finalStr[i];
        if (ch === ' ' || ch === '\n') {
          out += ch;
        } else if (i < revealCount) {
          out += ch;
        } else if (i < revealCount + scrambleWindow) {
          out += Math.random() > 0.72 ? ch : glyphs[Math.floor(Math.random() * glyphs.length)];
        } else {
          out += '\u00A0';
        }
      }
      el.textContent = out;
      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  /* ==========================================================================
   * 6. Web Audio Tactile & Harmonic Sound Engine (createSoundEngine)
   * ========================================================================== */
  function createSoundEngine(options = {}) {
    let ctx = options.audioContext || null;
    const masterVol = options.volume != null ? options.volume : 1.0;
    let lastTick = 0;

    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }

    function beep(freq = 5555) {
      const c = ensure();
      if (!c) return;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.065 * masterVol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.021);
    }

    function tick(pitch = 1) {
      const nowMs = performance.now();
      if (nowMs - lastTick < 24) return;
      lastTick = nowMs;
      const c = ensure();
      if (!c) return;
      const t = c.currentTime;
      const p = clamp(pitch, 0.5, 2.5) * (0.98 + Math.random() * 0.04);

      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1420 * p, t);
      osc.frequency.exponentialRampToValueAtTime(240 * p, t + 0.011);
      g.gain.setValueAtTime(0.18 * masterVol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.013);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.014);
    }

    function toggleSwitch(on = true) {
      const c = ensure();
      if (!c) return;
      const t = c.currentTime;

      const o1 = c.createOscillator();
      const g1 = c.createGain();
      o1.type = 'triangle';
      o1.frequency.setValueAtTime(420, t);
      o1.frequency.exponentialRampToValueAtTime(150, t + 0.012);
      g1.gain.setValueAtTime(0.18 * masterVol, t);
      g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);
      o1.connect(g1);
      g1.connect(c.destination);
      o1.start(t);
      o1.stop(t + 0.015);

      const t2 = t + 0.018;
      const o2 = c.createOscillator();
      const g2 = c.createGain();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(on ? 1680 : 920, t2);
      o2.frequency.exponentialRampToValueAtTime(on ? 640 : 290, t2 + 0.016);
      g2.gain.setValueAtTime(0.22 * masterVol, t2);
      g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.018);
      o2.connect(g2);
      g2.connect(c.destination);
      o2.start(t2);
      o2.stop(t2 + 0.019);
    }

    function chime() {
      const c = ensure();
      if (!c) return;
      const t = c.currentTime;
      const notes = [
        { freq: 528.0, delay: 0.0, dur: 1.4, amp: 0.16, type: 'sine' },
        { freq: 1056.0, delay: 0.0, dur: 0.9, amp: 0.06, type: 'triangle' },
        { freq: 792.0, delay: 0.22, dur: 1.8, amp: 0.18, type: 'sine' },
        { freq: 1584.0, delay: 0.22, dur: 1.1, amp: 0.05, type: 'triangle' }
      ];
      notes.forEach(({ freq, delay, dur, amp, type }) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t + delay);
        g.gain.setValueAtTime(0.0001, t + delay);
        g.gain.linearRampToValueAtTime(amp * masterVol, t + delay + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(t + delay);
        osc.stop(t + delay + dur + 0.02);
      });
    }

    return {
      tick,
      switch: toggleSwitch,
      beep,
      chime,
      setAudioContext(ac) { ctx = ac; }
    };
  }

  return {
    createAsciiBar,
    createSpectrum,
    createAmbientPad,
    createFlowTimer,
    scrambleText,
    createSoundEngine,
    AMBIENT_CHORDS,
    MFP_GLYPHS
  };
})();

export default MfpUI;
