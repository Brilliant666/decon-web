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
      if (moving) raf = requestAnimationFrame(frame);
    }

    const kick = () => { if (!raf && built) raf = requestAnimationFrame(frame); };

    host.addEventListener('pointermove', (e) => {
      const b = cv.getBoundingClientRect();
      ptr.x = e.clientX - b.left;
      ptr.y = e.clientY - b.top;
      kick();
    });
    host.addEventListener('pointerleave', () => { ptr.x = ptr.y = -1e4; kick(); });

    let lastW = 0;
    new ResizeObserver(() => {
      if (cv.clientWidth === lastW || !built) return;
      lastW = cv.clientWidth;
      build();
      t0 = -1e9;
      kick();
    }).observe(cv);

    const api = {
      play(newWord) {
        if (typeof newWord === 'string') text = newWord.toUpperCase();
        build();
        lastW = W;
        t0 = performance.now();
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

  return { dotType, winFrame, renderHalftone, createWipe, scramble, createGlobe };
})();
