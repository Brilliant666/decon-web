/**
 * TrueJPEG Dot-Matrix & Industrial UI Kit
 * Extracted & modularized from truejpeg.com (@RTJLDR)
 * Zero dependencies, pure Vanilla JS + Canvas 2D + OffscreenCanvas Worker
 */

export const TrueJpegUI = (() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ==========================================================================
   * 1. Interactive Dot-Matrix Wordmark / SVG Logo (dotType)
   * Renders text or an SVG Path2D into a grid of dots that repel from the cursor.
   * ========================================================================== */
  function dotType(cv, wordOrShape, options = {}) {
    const ctx = cv.getContext('2d');
    const host = options.host || cv.parentElement || cv;
    const maxH = options.maxH || 0.16;
    const shape = typeof wordOrShape === 'string' ? null : wordOrShape;
    let text = shape ? '' : String(wordOrShape).toUpperCase();
    const FONT = (fs) => `700 ${fs}px Inter, "Helvetica Neue", sans-serif`;

    let xs, ys, ox, oy, sc, seed, n = 0, W = 0, H = 0, dpr = 1, step = 6, r0 = 2;
    let raf = 0, t0 = 0, built = false;
    const ptr = { x: -1e4, y: -1e4 };

    function build() {
      W = cv.clientWidth;
      if (!W) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const o = document.createElement('canvas').getContext('2d');
      let fs = 100, k = 0;

      if (shape) {
        k = Math.min(W / shape.w, (window.innerHeight * maxH) / shape.h);
        H = Math.ceil(shape.h * k);
        fs = H / 0.74;
      } else {
        o.font = FONT(fs);
        const m = o.measureText(text || 'A').width || 100;
        fs = Math.min((fs * W) / m, window.innerHeight * maxH);
        H = Math.max(28, Math.ceil(fs * 0.76));
      }
      if (!H) return;
      cv.style.height = `${H}px`;
      o.canvas.width = W;
      o.canvas.height = H;

      if (shape) {
        o.setTransform(k, 0, 0, k, (W - shape.w * k) / 2, 0);
        o.fill(new Path2D(shape.d), shape.rule || 'nonzero');
      } else {
        o.font = FONT(fs);
        const x0 = getComputedStyle(cv).textAlign === 'center'
          ? Math.max(0, (W - o.measureText(text).width) / 2)
          : 0;
        o.fillText(text, x0, H - Math.ceil(H * 0.08));
      }

      const px = o.getImageData(0, 0, W, H).data;
      step = clamp(fs / 24, 4, 10);
      r0 = step * 0.38;
      const pts = [];
      for (let y = step / 2; y < H; y += step) {
        for (let x = step / 2; x < W; x += step) {
          if (px[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 120) pts.push(x, y);
        }
      }
      n = pts.length / 2;
      xs = new Float32Array(n); ys = new Float32Array(n);
      ox = new Float32Array(n); oy = new Float32Array(n);
      sc = new Float32Array(n).fill(1); seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        xs[i] = pts[2 * i];
        ys[i] = pts[2 * i + 1];
        seed[i] = Math.random();
      }
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      built = true;
    }

    function frame(t) {
      raf = 0;
      const p = (t - t0) / 1400;
      const R = step * 15;
      let moving = p < 1.25;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = getComputedStyle(cv).color;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const show = clamp((p - (xs[i] / W) * 0.75 - seed[i] * 0.25) * 6, 0, 1);
        if (!show) continue;
        const dx = xs[i] - ptr.x, dy = ys[i] - ptr.y;
        const d = Math.hypot(dx, dy) || 1;
        let tx = 0, ty = 0, ts = 1;
        if (d < R) {
          const f = (1 - d / R) ** 2;
          tx = (dx / d) * f * R * 0.45;
          ty = (dy / d) * f * R * 0.45;
          ts = 1 - f * 0.65;
        }
        ox[i] += (tx - ox[i]) * 0.16;
        oy[i] += (ty - oy[i]) * 0.16;
        sc[i] += (ts - sc[i]) * 0.16;
        if (Math.abs(tx - ox[i]) > 0.05 || Math.abs(ty - oy[i]) > 0.05) moving = true;
        const r = r0 * sc[i] * show;
        const x = xs[i] + ox[i], y = ys[i] + oy[i];
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
      if (moving && !paused) raf = requestAnimationFrame(frame);
    }

    let paused = false;
    const kick = () => {
      if (!raf && built && !paused) raf = requestAnimationFrame(frame);
    };

    host.addEventListener('pointermove', (e) => {
      const b = cv.getBoundingClientRect();
      ptr.x = e.clientX - b.left;
      ptr.y = e.clientY - b.top;
      kick();
    });
    host.addEventListener('pointerleave', () => { ptr.x = ptr.y = -1e4; kick(); });

    let lastW = 0;
    new ResizeObserver(() => {
      const cw = cv.clientWidth;
      if (!cw || cw === lastW || !built) return;
      lastW = cw;
      build();
      t0 = -1e9;
      kick();
    }).observe(cv);

    const api = {
      play(newWord) {
        paused = false;
        if (typeof newWord === 'string') text = newWord.toUpperCase();
        build();
        lastW = W;
        t0 = performance.now();
        kick();
      },
      pause() {
        paused = true;
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      resume() {
        if (!paused) return;
        paused = false;
        if (!built && cv.clientWidth > 0) {
          build();
          lastW = W;
          t0 = -1e9;
        }
        kick();
      },
      setText(newWord) {
        if (typeof newWord === 'string') text = newWord.toUpperCase();
        build();
        lastW = W;
        t0 = -1e9;
        kick();
      },
    };
    api.play();
    return api;
  }

  /* ==========================================================================
   * 2. Dotted Window Frame with Running Glint & Ruler Ticks (winFrame)
   * ========================================================================== */
  function perimeter(W, H, r, spacing) {
    const segs = [], arc = (Math.PI * r) / 2;
    const line = (x0, y0, x1, y1) => segs.push({
      len: Math.hypot(x1 - x0, y1 - y0),
      at: (t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0]
    });
    const corner = (cx, cy, a0) => segs.push({
      len: arc,
      at: (t) => {
        const a = a0 + (t * Math.PI) / 2;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1];
      }
    });
    line(r, 0, W - r, 0); corner(W - r, r, -Math.PI / 2);
    line(W, r, W, H - r); corner(W - r, H - r, 0);
    line(W - r, H, r, H); corner(r, H - r, Math.PI / 2);
    line(0, H - r, 0, r); corner(r, r, Math.PI);
    const L = segs.reduce((a, b) => a + b.len, 0);
    const n = Math.round(L / spacing);
    const pts = [];
    for (let k = 0; k < n; k++) {
      let d = (k * L) / n, i = 0;
      while (d > segs[i].len && i < segs.length - 1) d -= segs[i++].len;
      const [x, y, c] = segs[i].at(Math.min(1, d / segs[i].len));
      pts.push({ x, y, c, u: k / n });
    }
    return pts;
  }

  function winFrame(win) {
    let cv = win.querySelector('.win__frame');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.className = 'win__frame';
      cv.setAttribute('aria-hidden', 'true');
      win.prepend(cv);
    }
    const ctx = cv.getContext('2d');
    const bar = win.querySelector('.win__bar');
    const OUT = 8, R = 16, GLINT = 0.16, LAP = 2600;
    let W = 0, H = 0, B = 40, dpr = 1, pts = [], raf = 0, on = false, glow = 0, t0 = 0, col = {};

    function size() {
      W = win.offsetWidth;
      H = win.offsetHeight;
      B = bar ? bar.offsetHeight : 38;
      if (!W) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.style.width = `${W + OUT * 2}px`;
      cv.style.height = `${H + OUT * 2}px`;
      cv.width = Math.round((W + OUT * 2) * dpr);
      cv.height = Math.round((H + OUT * 2) * dpr);
      pts = perimeter(W, H, R, 5);
      const cs = getComputedStyle(document.documentElement);
      const v = (k, fb) => cs.getPropertyValue(k).trim() || fb;
      col = {
        fg: v('--fg', '#ececea'),
        side: v('--line-2', '#3d3d3b'),
        line: v('--line', '#2a2a28'),
        tick: v('--fg-3', '#636360'),
      };
      draw(performance.now());
    }

    function draw(t) {
      raf = 0;
      if (!W) return;
      glow += ((on ? 1 : 0) - glow) * 0.12;
      const head = ((t - t0) / LAP) % 1;
      ctx.setTransform(dpr, 0, 0, dpr, OUT * dpr, OUT * dpr);
      ctx.clearRect(-OUT, -OUT, W + OUT * 2, H + OUT * 2);

      ctx.fillStyle = col.side;
      ctx.beginPath();
      const lit = new Path2D();
      for (const p of pts) {
        let r = p.c ? 1.35 : 1, hot = p.c;
        if (glow > 0.02) {
          const d = (head - p.u + 1) % 1;
          if (d < GLINT) {
            const k = (1 - d / GLINT) * glow;
            r += 0.7 * k;
            hot = hot || k > 0.25;
          }
        }
        (hot ? lit : ctx).moveTo(p.x + r, p.y);
        (hot ? lit : ctx).arc(p.x, p.y, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = col.fg;
      ctx.fill(lit);

      // Ruler ticks under top bar
      ctx.fillStyle = col.line;
      ctx.fillRect(0, B, W, 1);
      for (let x = 16, i = 0; x < W - 12; x += 8, i++) {
        ctx.fillStyle = i % 5 ? col.line : col.tick;
        ctx.fillRect(x, B + 1, 1, i % 5 ? 3 : 6);
      }
      if (on || glow > 0.02) raf = requestAnimationFrame(draw);
    }

    new ResizeObserver(size).observe(win);
    win.addEventListener('pointerenter', () => api.set(true));
    win.addEventListener('pointerleave', () => api.set(false));

    const api = {
      set(v) {
        if (v === on) return;
        on = v;
        if (on && glow < 0.02) t0 = performance.now() - LAP * 0.94;
        if (!raf) raf = requestAnimationFrame(draw);
      }
    };
    return api;
  }

  /* ==========================================================================
   * 3. Halftone Dot-Screen Image Developer (drawDots + halftone)
   * ========================================================================== */
  function drawDots(sm, img, ctx, w, h, step, dpr, fg, bg) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const cols = sm.canvas.width, rows = sm.canvas.height;
    let sw = iw, sh = ih;
    if (iw / ih > cols / rows) sw = (ih * cols) / rows;
    else sh = (iw * rows) / cols;
    sm.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cols, rows);
    const px = sm.getImageData(0, 0, cols, rows).data;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    ctx.fillStyle = fg;
    ctx.beginPath();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const k = (y * cols + x) * 4;
        const lum = (0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2]) / 255;
        const r = step * 0.56 * Math.sqrt(lum);
        if (r < 0.35) continue;
        const cx = x * step + step / 2 + (y % 2 ? step / 2 : 0);
        const cy = y * step + step / 2;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }

  function renderHalftone(img, targetCanvas, step = 6, fg = '#ececea', bg = '#111110') {
    const w = targetCanvas.clientWidth || 320;
    const h = targetCanvas.clientHeight || 240;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    targetCanvas.width = Math.round(w * dpr);
    targetCanvas.height = Math.round(h * dpr);
    const sm = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    sm.canvas.width = Math.max(1, Math.ceil(w / step));
    sm.canvas.height = Math.max(1, Math.ceil(h / step));
    drawDots(sm, img, targetCanvas.getContext('2d'), w, h, step, dpr, fg, bg);
  }

  /* ==========================================================================
   * 4. Full-Screen Honeycomb Dot-Wave Transition (wipe)
   * ========================================================================== */
  function createWipe(cv) {
    const ctx = cv.getContext('2d');
    const STEP = 18, SPREAD = 0.6;
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

    function runPhase(origin, cover) {
      return new Promise((resolve) => {
        const W = window.innerWidth, H = window.innerHeight;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cv.classList.add('is-on');
        const cs = getComputedStyle(document.documentElement);
        const ink = cs.getPropertyValue('--paper').trim() || '#111110';
        const lit = cs.getPropertyValue('--fg').trim() || '#ececea';
        const o = origin || { x: W / 2, y: H / 2 };
        const far = Math.max(
          Math.hypot(o.x, o.y),
          Math.hypot(W - o.x, o.y),
          Math.hypot(o.x, H - o.y),
          Math.hypot(W - o.x, H - o.y)
        );
        const R = STEP * 0.72, rowH = STEP * 0.866;
        const dur = cover ? 580 : 700;
        const t0 = performance.now();

        function frame(t) {
          const p = Math.min(1, (t - t0) / dur);
          const big = new Path2D(), spark = new Path2D();
          for (let y = 0, row = 0; y < H + STEP; y += rowH, row++) {
            for (let x = row % 2 ? STEP / 2 : 0; x < W + STEP; x += STEP) {
              const d = Math.hypot(x - o.x, y - o.y) / far;
              const k = clamp(p * (1 + SPREAD) - d * SPREAD, 0, 1);
              const e = ease(k);
              const r = (cover ? e : 1 - e) * R;
              if (r > 0.3) { big.moveTo(x + r, y); big.arc(x, y, r, 0, Math.PI * 2); }
              const g = Math.sin(k * Math.PI) * STEP * 0.14;
              if (g > 0.4) { spark.moveTo(x + g, y); spark.arc(x, y, g, 0, Math.PI * 2); }
            }
          }
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = ink;
          ctx.fill(big);
          ctx.fillStyle = lit;
          ctx.fill(spark);
          if (p < 1) requestAnimationFrame(frame);
          else {
            if (!cover) { ctx.clearRect(0, 0, W, H); cv.classList.remove('is-on'); }
            resolve();
          }
        }
        requestAnimationFrame(frame);
      });
    }

    return async function triggerWipe(origin, onCovered) {
      await runPhase(origin, true);
      if (onCovered) await onCovered();
      await runPhase(origin, false);
    };
  }

  /* ==========================================================================
   * 5. Text Scramble / Matrix Cipher Decoder (scramble)
   * ========================================================================== */
  const GLYPHS = {
    en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_:#',
    ja: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモラリルレロン',
    zh: '点图生成模型提示词复制余额购买登录尺寸比例价格版块进入开放方式作品全部更新直闪光圈焦段',
  };

  function scramble(el, targetText, lang = 'zh', delay = 0) {
    const final = targetText != null ? targetText : el.textContent;
    const set = GLYPHS[lang] || GLYPHS.en;
    const rand = [...final].map(() => Math.random());
    const dur = Math.min(680, 300 + final.length * 14);
    const t0 = performance.now() + delay;

    function tick() {
      const p = (performance.now() - t0) / dur;
      if (p >= 1) { el.textContent = final; return; }
      if (p >= 0) {
        el.textContent = [...final].map((ch, i) => (
          /\s/.test(ch) || p > (i / final.length) * 0.55 + rand[i] * 0.45
            ? ch
            : set[Math.floor(Math.random() * set.length)]
        )).join('');
      }
      setTimeout(tick, 42);
    }
    tick();
  }

  /* ==========================================================================
   * 6. 3D Dot-Matrix Spinning Globe (createGlobe)
   * ========================================================================== */
  function createGlobe(cv, size = 36) {
    const ctx = cv.getContext('2d');
    const rad = Math.PI / 180, TILT = 0.42;
    const G = [];
    [-50, 0, 50].forEach((lat) => { for (let lon = 0; lon < 360; lon += 30) G.push([lat * rad, lon * rad]); });
    [0, 60, 120].forEach((lon) => [lon, lon + 180].forEach((l) => [-75, -50, -25, 25, 50, 75].forEach((lat) => G.push([lat * rad, l * rad]))));
    G.push([90 * rad, 0], [-90 * rad, 0]);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr;
    cv.height = size * dpr;
    cv.style.width = `${size}px`;
    cv.style.height = `${size}px`;

    let turn = 0.3, spinFrom = 0.3, spinTo = 0.3, spinT0 = 0, spinDur = 1, raf = 0;

    function draw() {
      const R = size * 0.38, CX = size / 2, CY = size / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = getComputedStyle(cv).color || '#ececea';
      G.forEach(([lat, lon]) => {
        const x = Math.cos(lat) * Math.sin(lon + turn);
        const y = Math.sin(lat);
        const z = Math.cos(lat) * Math.cos(lon + turn);
        const gx = CX + x * R;
        const gy = CY - (y * Math.cos(TILT) - z * Math.sin(TILT)) * R;
        const gz = y * Math.sin(TILT) + z * Math.cos(TILT);
        ctx.globalAlpha = gz > 0 ? 0.45 + gz * 0.55 : 0.2;
        ctx.beginPath();
        ctx.arc(gx, gy, gz > 0 ? 1.1 + gz * 0.4 : 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      raf = 0;
      const ks = clamp((t - spinT0) / spinDur, 0, 1);
      turn = spinFrom + (spinTo - spinFrom) * (1 - Math.pow(1 - ks, 3));
      draw();
      if (ks < 1) raf = requestAnimationFrame(frame);
    }

    draw();
    return {
      spin(angle = Math.PI * 1.25, ms = 1000) {
        spinFrom = turn;
        spinTo += angle;
        spinDur = ms;
        spinT0 = performance.now();
        if (!raf) raf = requestAnimationFrame(frame);
      }
    };
  }

  /* ==========================================================================
   * 7. Darkroom Dot-Matrix Exposure Histogram & 5-Chip Color Gene Analyzer
   * ========================================================================== */
  const sampleCv = document.createElement('canvas');
  sampleCv.width = 72;
  sampleCv.height = 72;
  const sampleCtx = sampleCv.getContext('2d', { willReadFrequently: true });

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function drawDotHistogram(cv, bins, options = {}) {
    if (!cv || !bins) return;
    const W = cv.clientWidth || options.width || 280;
    const H = options.height || cv.clientHeight || 54;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cs = getComputedStyle(document.documentElement);
    const onCol = options.onColor || cs.getPropertyValue('--ink-fg').trim() || cs.getPropertyValue('--fg').trim() || '#ececea';
    const dimCol = options.dimColor || cs.getPropertyValue('--dot').trim() || '#2e2e2c';
    const COLS = bins.length;
    const ROWS = options.rows || 10;
    const stepX = W / COLS, stepY = H / ROWS;
    const maxVal = Math.max(0.001, ...bins);

    for (let c = 0; c < COLS; c++) {
      const norm = Math.pow(bins[c] / maxVal, 0.62);
      const litRows = Math.round(norm * ROWS);
      const cx = (c + 0.5) * stepX;
      for (let r = 0; r < ROWS; r++) {
        const rowFromBottom = ROWS - 1 - r;
        const isLit = rowFromBottom < litRows;
        const cy = (r + 0.5) * stepY;
        ctx.fillStyle = isLit ? onCol : dimCol;
        ctx.beginPath();
        ctx.arc(cx, cy, isLit ? 1.45 : 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function analyzeImage(imgEl, options = {}) {
    if (!imgEl || !(imgEl.naturalWidth || imgEl.width)) return null;
    try {
      sampleCtx.clearRect(0, 0, 72, 72);
      sampleCtx.drawImage(imgEl, 0, 0, 72, 72);
      const data = sampleCtx.getImageData(0, 0, 72, 72).data;
      const COLS = options.cols || 40;
      const bins = new Float32Array(COLS);
      let lumSum = 0, darkCount = 0;
      const totalPx = 72 * 72;
      const buckets = Array.from({ length: 5 }, () => ({ r: 0, g: 0, b: 0, w: 0 }));

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        lumSum += lum;
        if (lum < 64) darkCount++;
        const binIdx = clamp(Math.floor((lum / 256) * COLS), 0, COLS - 1);
        bins[binIdx]++;

        const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
        const bIdx = (sat > 0.45 && lum > 35 && lum < 235) ? 4 : clamp(Math.floor((lum / 256) * 4), 0, 3);
        const weight = bIdx === 4 ? (sat * 3 + 0.5) : 1;
        buckets[bIdx].r += r * weight;
        buckets[bIdx].g += g * weight;
        buckets[bIdx].b += b * weight;
        buckets[bIdx].w += weight;
      }

      const avgLum = Math.round((lumSum / totalPx / 255) * 100);
      const darkPct = Math.round((darkCount / totalPx) * 100);
      const keyLabel = avgLum < 32 ? 'LOW-KEY' : avgLum > 65 ? 'HIGH-KEY' : 'BALANCED';
      const statText = `${keyLabel} // SHD ${darkPct}% · LUM ${avgLum}%`;

      const swatches = [];
      buckets.forEach((bk) => {
        if (bk.w > 0) swatches.push(rgbToHex(bk.r / bk.w, bk.g / bk.w, bk.b / bk.w));
      });
      while (swatches.length < 5) swatches.push('#1A1A19');

      if (options.histCanvas) drawDotHistogram(options.histCanvas, bins, options);
      return { bins, avgLum, darkPct, keyLabel, statText, swatches: swatches.slice(0, 5) };
    } catch (_) {
      if (options.histCanvas) {
        const ctx = options.histCanvas.getContext('2d');
        ctx.clearRect(0, 0, options.histCanvas.width, options.histCanvas.height);
      }
      return null;
    }
  }

  /* ==========================================================================
   * 8. Darkroom Optical Loupe (attachLoupe)
   * ========================================================================== */
  function attachLoupe(frameEl, imgEl, loupeCv, options = {}) {
    const L = options.size || 180;
    const R = L / 2;
    const hudEl = options.hudEl || null;
    const hintText = options.hintText || 'HOLD TO LOUPE · WHEEL ZOOM';
    let active = false, zoom = options.initialZoom || 2.5, lx = 0, ly = 0;

    function draw() {
      const iw = imgEl.naturalWidth || imgEl.width;
      const ih = imgEl.naturalHeight || imgEl.height;
      if (!active || !loupeCv || !iw) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetPx = Math.round(L * dpr);
      if (loupeCv.width !== targetPx || loupeCv.height !== targetPx) {
        loupeCv.width = targetPx;
        loupeCv.height = targetPx;
        loupeCv.style.width = `${L}px`;
        loupeCv.style.height = `${L}px`;
      }
      const ctx = loupeCv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, L, L);

      const rect = frameEl.getBoundingClientRect();
      const cw = rect.width || 1, ch = rect.height || 1;
      const scale = Math.max(cw / iw, ch / ih);
      const drawW = iw * scale;
      const drawH = ih * scale;
      const posX = options.posX != null ? options.posX : 0.5;
      const posY = options.posY != null ? options.posY : 0.5;
      const imgLeft = (cw - drawW) * posX;
      const imgTop = (ch - drawH) * posY;
      const dx = R + (imgLeft - lx) * zoom;
      const dy = R + (imgTop - ly) * zoom;
      const dw = drawW * zoom;
      const dh = drawH * zoom;
      const imgX = clamp(((lx - imgLeft) / drawW) * iw, 0, iw);
      const imgY = clamp(((ly - imgTop) / drawH) * ih, 0, ih);

      ctx.save();
      ctx.beginPath();
      ctx.arc(R, R, R - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#0d0d0c';
      ctx.fillRect(0, 0, L, L);
      ctx.drawImage(imgEl, dx, dy, dw, dh);

      ctx.strokeStyle = 'rgba(236, 236, 234, 0.38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(R - 14, R); ctx.lineTo(R - 4, R);
      ctx.moveTo(R + 4, R); ctx.lineTo(R + 14, R);
      ctx.moveTo(R, R - 14); ctx.lineTo(R, R - 4);
      ctx.moveTo(R, R + 4); ctx.lineTo(R, R + 14);
      for (let a = 0; a < 36; a++) {
        const ang = (a * 10 * Math.PI) / 180;
        const len = a % 3 === 0 ? 7 : 3.5;
        ctx.moveTo(R + Math.cos(ang) * (R - 3), R + Math.sin(ang) * (R - 3));
        ctx.lineTo(R + Math.cos(ang) * (R - 3 - len), R + Math.sin(ang) * (R - 3 - len));
      }
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#ececea';
      const dots = 64;
      ctx.beginPath();
      for (let i = 0; i < dots; i++) {
        const a = (i / dots) * Math.PI * 2;
        const dx = R + Math.cos(a) * (R - 1.5);
        const dy = R + Math.sin(a) * (R - 1.5);
        ctx.moveTo(dx + 1.1, dy);
        ctx.arc(dx, dy, i % 8 === 0 ? 1.4 : 0.9, 0, Math.PI * 2);
      }
      ctx.fill();

      loupeCv.style.left = `${lx}px`;
      loupeCv.style.top = `${ly}px`;
      if (hudEl) {
        const pxX = String(Math.round(imgX)).padStart(4, '0');
        const pxY = String(Math.round(imgY)).padStart(4, '0');
        hudEl.textContent = `LOUPE ${zoom.toFixed(1)}× // X:${pxX} Y:${pxY}`;
      }
    }

    function updatePos(e) {
      const rect = frameEl.getBoundingClientRect();
      lx = clamp(e.clientX - rect.left, 0, rect.width);
      ly = clamp(e.clientY - rect.top, 0, rect.height);
      if (active) draw();
      else if (hudEl) hudEl.textContent = `${hintText} (${zoom.toFixed(1)}×)`;
    }

    frameEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      active = true;
      frameEl.setPointerCapture(e.pointerId);
      frameEl.classList.add('is-louping');
      if (options.sound && options.sound.switch) options.sound.switch(true);
      updatePos(e);
    });
    frameEl.addEventListener('pointermove', updatePos);
    const stop = () => {
      if (!active) return;
      active = false;
      frameEl.classList.remove('is-louping');
      if (options.sound && options.sound.switch) options.sound.switch(false);
      if (hudEl) hudEl.textContent = `${hintText} (${zoom.toFixed(1)}×)`;
    };
    frameEl.addEventListener('pointerup', stop);
    frameEl.addEventListener('pointercancel', stop);
    frameEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const prev = zoom;
      zoom = clamp(zoom + (e.deltaY < 0 ? 0.5 : -0.5), 1.5, 6.0);
      if (zoom !== prev && options.sound && options.sound.tick) {
        options.sound.tick(0.75 + (zoom - 1.5) * 0.18);
      }
      if (active) draw();
      else if (hudEl) hudEl.textContent = `${hintText} (${zoom.toFixed(1)}×)`;
    }, { passive: false });

    return {
      refresh() { if (active) draw(); },
      setZoom(z) { zoom = clamp(z, 1.5, 6.0); if (active) draw(); },
      getZoom() { return zoom; }
    };
  }

  /* ==========================================================================
   * 9. Web Audio Mechanical Tactile & Darkroom Sound Engine (createSoundEngine)
   * Zero external audio assets; procedural triangle + filtered noise synthesis
   * ========================================================================== */
  function createSoundEngine(options = {}) {
    const masterVol = options.volume != null ? options.volume : 1.0;
    const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ctx = null;
    let noiseBuf = null;
    let ambNodes = null;
    let ambOn = false;
    let lastTick = 0;

    function ensure() {
      if (reduce()) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        // Pre-build 2.5s normalized pink/brown hybrid noise buffer for tactile bursts & darkroom ambient
        const sr = ctx.sampleRate;
        const len = Math.floor(sr * 2.5);
        noiseBuf = ctx.createBuffer(1, len, sr);
        const out = noiseBuf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          out[i] = clamp((b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.24, -0.95, 0.95);
          b6 = w * 0.115926;
        }
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }

    function tick(pitch = 1) {
      const nowMs = performance.now();
      if (nowMs - lastTick < 26) return;
      lastTick = nowMs;
      const c = ensure();
      if (!c) return;
      const t = c.currentTime;
      const p = clamp(pitch, 0.5, 2.5) * (0.97 + Math.random() * 0.06);

      // Metallic ratchet transient
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1380 * p, t);
      osc.frequency.exponentialRampToValueAtTime(230 * p, t + 0.011);
      g.gain.setValueAtTime(0.22 * masterVol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.013);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.014);

      // Crisp micro-noise click
      if (noiseBuf) {
        const ns = c.createBufferSource();
        const bp = c.createBiquadFilter();
        const ng = c.createGain();
        ns.buffer = noiseBuf;
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(2600 * p, t);
        bp.Q.setValueAtTime(2.4, t);
        ng.gain.setValueAtTime(0.24 * masterVol, t);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.009);
        ns.connect(bp);
        bp.connect(ng);
        ng.connect(c.destination);
        ns.start(t, Math.random() * 1.5, 0.011);
      }
    }

    function toggleSwitch(on = true) {
      const c = ensure();
      if (!c) return;
      const t = c.currentTime;

      // Pulse 1: mechanical detent press
      const o1 = c.createOscillator();
      const g1 = c.createGain();
      o1.type = 'triangle';
      o1.frequency.setValueAtTime(420, t);
      o1.frequency.exponentialRampToValueAtTime(150, t + 0.012);
      g1.gain.setValueAtTime(0.20 * masterVol, t);
      g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);
      o1.connect(g1);
      g1.connect(c.destination);
      o1.start(t);
      o1.stop(t + 0.015);

      // Pulse 2 (+18ms): latch lock (brighter when on=true, deeper when on=false)
      const t2 = t + 0.018;
      const o2 = c.createOscillator();
      const g2 = c.createGain();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(on ? 1620 : 920, t2);
      o2.frequency.exponentialRampToValueAtTime(on ? 620 : 290, t2 + 0.016);
      g2.gain.setValueAtTime(0.25 * masterVol, t2);
      g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.018);
      o2.connect(g2);
      g2.connect(c.destination);
      o2.start(t2);
      o2.stop(t2 + 0.019);

      if (noiseBuf) {
        const ns = c.createBufferSource();
        const bp = c.createBiquadFilter();
        const ng = c.createGain();
        ns.buffer = noiseBuf;
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(on ? 2800 : 1700, t2);
        bp.Q.setValueAtTime(2.0, t2);
        ng.gain.setValueAtTime(0.18 * masterVol, t2);
        ng.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.012);
        ns.connect(bp);
        bp.connect(ng);
        ng.connect(c.destination);
        ns.start(t2, Math.random() * 1.5, 0.014);
      }
    }

    function shutter(cover = true) {
      const c = ensure();
      if (!c || !noiseBuf) return;
      const t = c.currentTime;

      // Subtle curtain release transient
      const osc = c.createOscillator();
      const og = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(cover ? 520 : 380, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.014);
      og.gain.setValueAtTime(0.14 * masterVol, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.016);
      osc.connect(og);
      og.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.018);

      // Filtered pink-noise focal-plane curtain sweep
      const ns = c.createBufferSource();
      const bp = c.createBiquadFilter();
      const g = c.createGain();
      ns.buffer = noiseBuf;
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(1.5, t);
      bp.frequency.setValueAtTime(cover ? 380 : 1480, t);
      bp.frequency.exponentialRampToValueAtTime(cover ? 1560 : 340, t + 0.16);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.24 * masterVol, t + 0.028);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      ns.connect(bp);
      bp.connect(g);
      g.connect(c.destination);
      ns.start(t, Math.random() * 0.8, 0.18);
    }

    function copy() {
      const c = ensure();
      if (!c) return;
      const t = c.currentTime;
      [
        [1318.5, 0, 0.055],     // E6
        [1760.0, 0.052, 0.085]  // A6
      ].forEach(([freq, delay, dur]) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + delay);
        g.gain.setValueAtTime(0.0001, t + delay);
        g.gain.linearRampToValueAtTime(0.18 * masterVol, t + delay + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(t + delay);
        osc.stop(t + delay + dur + 0.006);
      });
    }

    function ambient(on) {
      const next = on != null ? !!on : !ambOn;
      if (!next) {
        ambOn = false;
        if (ambNodes && ctx) {
          const t = ctx.currentTime;
          const { master, src, drone1, drone2 } = ambNodes;
          ambNodes = null;
          master.gain.cancelScheduledValues(t);
          master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
          master.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
          setTimeout(() => {
            try { src.stop(); drone1.stop(); drone2.stop(); } catch (_) {}
          }, 380);
        }
        return false;
      }
      const c = ensure();
      if (!c || !noiseBuf) return false;
      if (ambOn && ambNodes) return true;
      ambOn = true;
      const t = c.currentTime;

      const master = c.createGain();
      master.gain.setValueAtTime(0.0001, t);
      master.gain.linearRampToValueAtTime(0.16 * masterVol, t + 0.45);
      master.connect(c.destination);

      // Layer 1: Warm low-passed analog tape / darkroom air noise (520Hz cutoff so laptop speakers reproduce it clearly)
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(520, t);
      lp.Q.setValueAtTime(0.7, t);
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.75, t);
      src.connect(lp);
      lp.connect(ng);
      ng.connect(master);

      // Layer 2: Subtle darkroom enlarger / film machine warm harmonic hum (110Hz A2 + 165Hz E3)
      const drone1 = c.createOscillator();
      const drone2 = c.createOscillator();
      const dg = c.createGain();
      drone1.type = 'sine';
      drone2.type = 'triangle';
      drone1.frequency.setValueAtTime(110, t);
      drone2.frequency.setValueAtTime(165, t);
      const dlp = c.createBiquadFilter();
      dlp.type = 'lowpass';
      dlp.frequency.setValueAtTime(240, t);
      dg.gain.setValueAtTime(0.14, t);
      drone1.connect(dlp);
      drone2.connect(dlp);
      dlp.connect(dg);
      dg.connect(master);

      src.start(t);
      drone1.start(t);
      drone2.start(t);
      ambNodes = { master, src, drone1, drone2 };
      return true;
    }

    return {
      tick,
      switch: toggleSwitch,
      shutter,
      copy,
      ambient,
      isAmbientOn: () => ambOn
    };
  }

  return { dotType, winFrame, renderHalftone, createWipe, scramble, createGlobe, drawDotHistogram, analyzeImage, attachLoupe, createSoundEngine };
})();
