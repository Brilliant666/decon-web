(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad3 = (n) => String(n).padStart(3, '0');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mq = (q) => window.matchMedia(q).matches;
  const cancelAnims = (el) => el.getAnimations().forEach((a) => a.cancel());
  // a hidden tab pauses the animation timeline; never let UI state hang on it
  const settle = (anim, ms) => Promise.race([anim.finished.catch(() => {}), wait(ms + 150)]);

  // counts for us (worker/stats.js): which works get opened and copied, and which post (?s= on /w/<id> links)
  // or site brought the visit. No cookies or ids; a failed beacon is simply lost.
  const SRC = (() => {
    const s = new URLSearchParams(location.search).get('s');
    if (s && /^[A-Za-z0-9_.:-]{1,32}$/.test(s)) return s;
    try {
      const h = document.referrer && new URL(document.referrer).hostname;
      if (h && h !== location.hostname) return `ref:${h.replace(/^www\./, '')}`.slice(0, 32);
    } catch (_) { /* no usable referrer */ }
    return '';
  })();
  const track = (t, w = '') => {
    try { navigator.sendBeacon('/api/e', JSON.stringify({ t, w, s: SRC })); } catch (_) { /* counts are best effort */ }
  };

  const REDUCE = mq('(prefers-reduced-motion: reduce)');
  const FINE = mq('(hover: hover) and (pointer: fine)');
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const EASE_IO = 'cubic-bezier(.65,0,.35,1)';
  const I18N = window.TJ_I18N;
  const { t, tx } = I18N;
  const ASSET_V = new URL(document.currentScript.src).searchParams.get('v') || '';

  /* ---------- data ---------- */
  const DATA = window.GALLERY || { site: {}, works: [] };
  const site = Object.assign({
    name: 'True JPEG',
    handle: '@yourhandle',
    x: 'https://x.com/',
    tagline: 'Images, and the *words* that made them.',
    intro: '',
  }, DATA.site);

  // seeded soft gradients, used until real images are supplied
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function placeholder(key, ratio) {
    const r = rng(hash(key));
    const w = 800, h = Math.round(800 * ratio);
    const base = Math.floor(r() * 360);
    const blobs = Array.from({ length: 5 }, (_, i) => ({
      cx: r() * 100, cy: r() * 100, rx: 35 + r() * 55, ry: 30 + r() * 55,
      hue: Math.round((base + (r() - 0.5) * 110 + i * 18 + 360) % 360),
      s: Math.round(22 + r() * 30), l: Math.round(62 + r() * 20), o: (0.55 + r() * 0.4).toFixed(2),
    }));
    const defs = blobs.map((b, i) => `<radialGradient id="g${i}"><stop offset="0" stop-color="hsl(${b.hue} ${b.s}% ${b.l}%)" stop-opacity="${b.o}"/><stop offset="1" stop-color="hsl(${b.hue} ${b.s}% ${b.l}%)" stop-opacity="0"/></radialGradient>`).join('');
    const shapes = blobs.map((b, i) => `<ellipse cx="${b.cx.toFixed(1)}%" cy="${b.cy.toFixed(1)}%" rx="${b.rx.toFixed(1)}%" ry="${b.ry.toFixed(1)}%" fill="url(#g${i})"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs><rect width="100%" height="100%" fill="hsl(${base} 14% 90%)"/>${shapes}</svg>`;
    return { src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), color: `hsl(${base} 12% 90%)` };
  }

  function parseRatio(w) {
    if (w.width && w.height) return w.height / w.width;
    if (w.ratio || w.slot) {
      const [a, b] = String(w.ratio || w.slot).split(/[:x/]/).map(Number);
      if (a && b) return b / a;
    }
    return null;
  }

  // the most common aspect ratio drives the column count;
  // images without a known size are assumed to share it until they load
  const DOMINANT = (() => {
    const tally = new Map();
    (DATA.works || []).forEach((w) => {
      if (w.slot) return;
      const r = parseRatio(w);
      if (r) { const k = r.toFixed(2); tally.set(k, (tally.get(k) || 0) + 1); }
    });
    let best = null, n = 0;
    tally.forEach((v, k) => { if (v > n) { n = v; best = +k; } });
    return best || 1.25;
  })();
  const TALL = DOMINANT > 1.4;

  // Chinese prompts are the originals in works.js; English and Japanese come from prompts/<lang>.json
  // (tools/import_translations.py), fetched for the page language. A work without one stays Chinese
  const translated = {};
  const promptOf = (w) => (translated[I18N.lang] || {})[w.id] || w.prompt;
  function loadPrompts(lang) {
    if (lang === 'zh' || translated[lang]) return;
    translated[lang] = {};
    fetch(`prompts/${lang}.json?v=${ASSET_V}`).then((r) => r.json()).then((set) => {
      translated[lang] = set;
      if (lang === I18N.lang && vOpen && current()) fillPanel(current());
    }).catch(() => { delete translated[lang]; });
  }
  loadPrompts(I18N.lang);

  function halfSet(w) {
    const tw = Math.min(w.width, w.width > w.height ? 1280 : 720);
    return `${w.thumb.replace('/thumbs/', '/thumbs/sm/')} ${Math.round(tw * 2 / 3)}w, ${w.thumb} ${tw}w`;
  }

  // display numbers run 001, 002 ... over real works in list order; empty slots get none
  let seq = 0;
  const works = (DATA.works || []).map((w, i) => {
    const id = String(w.id != null ? w.id : pad3(i + 1));
    const ratio = parseRatio(w);
    // an empty frame that only previews where a future image of this ratio would sit
    if (w.slot) return { id, slot: String(w.slot), title: '', prompt: '', tags: [], ratio: ratio || DOMINANT, known: true };
    const ph = w.image ? null : placeholder(id + (w.title || ''), ratio || DOMINANT);
    return {
      id,
      n: i + 1,
      no: pad3(++seq),
      title: w.title || `Untitled ${pad3(i + 1)}`,
      prompt: w.prompt || '',
      tags: w.tags || [],
      params: w.params || {},
      px: w.width && w.height ? `${w.width} × ${w.height}` : '',
      date: w.date || '',
      full: w.image || ph.src,
      thumb: w.thumb || w.image || ph.src,
      // the grid takes the smaller copy while a card is small (tools/import_export.py makes both)
      srcset: w.thumb && w.width && w.height ? halfSet(w) : '',
      // the same two sizes as AVIF, about half the bytes (tools/make_derived.py); browsers without it keep the JPEGs
      avifset: w.thumb && w.width && w.height && /\.jpe?g$/i.test(w.thumb) ? halfSet(w).replace(/\.jpe?g( \d+w)/gi, '.avif$1') : '',
      color: w.color || (ph ? ph.color : ''),
      ratio: ratio || DOMINANT,
      known: !!ratio,
      // the picture the work was generated from, if any: downloadable as the original file
      ref: w.ref && w.ref.file ? { ...w.ref, kind: w.ref.file.split('.').pop().toUpperCase() } : null,
    };
  });

  /* ---------- static text ---------- */
  document.title = site.name;
  $$('[data-site-name]').forEach((el) => { el.textContent = site.name; });
  $$('[data-handle]').forEach((el) => { el.textContent = site.handle; });
  const realWorks = works.filter((w) => !w.slot);
  const isNsfw = (w) => w.tags.includes('NSFW');
  const safeWorks = realWorks.filter((w) => !isNsfw(w)); // the home and Generate windows never play NSFW works
  $$('[data-count]').forEach((el) => { el.textContent = realWorks.length; });
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  $$('[data-x]').forEach((el) => { el.href = site.x; });

  // referral cards in Generate, one per partner; a partner with no url loses its card
  const tools = Object.fromEntries((site.tools || []).filter((t) => t.url).map((t) => [t.key, t]));
  $$('[data-tool-wrap]').forEach((wrap) => {
    const t = tools[wrap.dataset.toolWrap];
    if (!t) return wrap.remove();
    $('[data-tool]', wrap).href = t.url;
    $$('[data-tool-name]', wrap).forEach((el) => { el.textContent = t.name; });
  });

  // the paid generator ships later: until data.js says studio: true its card is left out and Generate shows the partners only
  const STUDIO = site.studio === true;
  if (!STUDIO) $('[data-go="studio"]').parentElement.remove();

  // translated text needs these values
  Object.assign(I18N.vars, { count: realWorks.length, handle: site.handle, year: new Date().getFullYear(), site: site.name });
  I18N.apply();
  const latest = realWorks.map((w) => w.date).filter(Boolean).sort().pop();
  $$('[data-latest]').forEach((el) => { el.textContent = latest ? latest.replace(/-/g, '.') : '—'; });

  /* ---------- smooth wheel scrolling ---------- */
  const smooth = (() => {
    const enabled = FINE && !REDUCE;
    const maxY = () => document.documentElement.scrollHeight - innerHeight;
    let target = scrollY, current = scrollY, raf = 0, last = 0, stopped = true;

    function tick(t) {
      const dt = last ? Math.min(64, t - last) : 16.7;
      last = t;
      current += (target - current) * (1 - Math.pow(1 - 0.11, dt / 16.7));
      if (Math.abs(target - current) < 0.4) current = target;
      window.scrollTo(0, current);
      if (current !== target) raf = requestAnimationFrame(tick);
      else { raf = 0; last = 0; }
    }
    function run() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
    function halt() { if (raf) { cancelAnimationFrame(raf); raf = 0; last = 0; } target = current = scrollY; }

    if (enabled) {
      addEventListener('wheel', (e) => {
        if (stopped || e.ctrlKey) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        if (e.target.closest && e.target.closest('[data-native-scroll]')) return;
        // a trackpad (Chrome and Safari report its legacy wheelDelta as -3 × deltaY) already glides, with its
        // own momentum: easing it again drags the page behind the fingers and ties every frame to this thread,
        // where a busy moment shows as a jump. Leave it to the browser; only a mouse wheel's steps are eased
        if (e.wheelDeltaY && e.wheelDeltaY === -3 * e.deltaY) { if (raf) halt(); return; }
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
        if (!raf) current = scrollY;
        target = clamp(target + e.deltaY * unit, 0, maxY());
        run();
      }, { passive: false });
      // keyboard / scrollbar / anchors: follow the native position
      addEventListener('scroll', () => { if (!raf) target = current = scrollY; }, { passive: true });
    }

    return {
      to(y, immediate) {
        y = clamp(y, 0, maxY());
        if (immediate || !enabled) {
          halt();
          window.scrollTo({ top: y, behavior: immediate || REDUCE ? 'auto' : 'smooth' });
          target = current = y;
          return;
        }
        if (!raf) current = scrollY;
        target = y;
        run();
      },
      stop() { stopped = true; halt(); },
      start() { stopped = false; target = current = scrollY; },
    };
  })();

  /* ---------- copy + toast ---------- */
  const ICON_COPY = '<svg class="i-copy" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>';
  const ICON_CHECK = '<svg class="i-check" viewBox="0 0 24 24"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const copyButton = (cls, label, aria, done = tx('copied')) =>
    `<button class="copy ${cls}" type="button" aria-label="${esc(aria || label)}"><span class="copy__ico" aria-hidden="true">${ICON_COPY}${ICON_CHECK}</span><span class="copy__lbl" aria-hidden="true"><span>${esc(label)}</span><span>${esc(done)}</span></span></button>`;

  const relabel = (btn, label, aria, doneText = tx('copied')) => {
    btn.setAttribute('aria-label', aria || label);
    const [now, done] = btn.querySelectorAll('.copy__lbl > span');
    now.textContent = label;
    done.textContent = doneText;
  };

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (__) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  const toastEl = $('#toast');
  const toastLink = $('.toast__link', toastEl);
  let toastTimer = 0, toastMs = 2200;
  const hideToastLater = () => {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), toastMs);
  };
  function toast(msg, isError, withTool) {
    $('.toast__msg', toastEl).textContent = msg;
    toastEl.classList.toggle('is-error', !!isError);
    if (toastLink) toastLink.hidden = !withTool;
    toastMs = withTool && toastLink ? 4000 : 2200;
    toastEl.classList.remove('is-on');
    void toastEl.offsetWidth;
    toastEl.classList.add('is-on');
    hideToastLater();
  }
  // hovering the toast keeps it up so the link can be clicked
  toastEl.addEventListener('pointerenter', () => clearTimeout(toastTimer));
  toastEl.addEventListener('pointerleave', hideToastLater);

  async function doCopy(btn, text, msg, withTool, id) {
    if (!text) return;
    const ok = await copyText(text);
    if (!ok) { toast(tx('copyFailed'), true); return; }
    if (id) track('copy', id);
    if (btn) {
      btn.classList.remove('is-done');
      void btn.offsetWidth;
      btn.classList.add('is-done');
      clearTimeout(btn._t);
      btn._t = setTimeout(() => btn.classList.remove('is-done'), 1800);
    }
    toast(msg, false, withTool);
  }

  /* ---------- grid ---------- */
  const RATIOS = [['9:16', 16 / 9], ['2:3', 1.5], ['3:4', 4 / 3], ['1:1', 1], ['4:3', 0.75], ['3:2', 2 / 3], ['16:9', 0.5625]];
  const ratioName = (r) => RATIOS.reduce((a, b) => (Math.abs(b[1] - r) < Math.abs(a[1] - r) ? b : a))[0];
  const grid = $('#grid');
  const byId = new Map();

  const cells = works.map((w) => {
    const el = document.createElement('article');
    el.className = 'cell';
    el.dataset.id = w.id;
    if (w.slot) {
      el.classList.add('is-slot');
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `<div class="card card--slot"><span class="card__slot">${esc(w.slot)}</span></div>`;
      grid.appendChild(el);
      const cell = { w, el, card: $('.card', el), media: null, img: null, shown: true, placed: false, x: 0, y: 0 };
      byId.set(w.id, cell);
      return cell;
    }
    el.innerHTML = `
      <div class="card">
        <div class="card__media" style="background-color:${esc(w.color)}"><picture>${w.avifset ? '<source type="image/avif">' : ''}<img alt="${esc(w.title)}" loading="lazy" decoding="async" draggable="false"></picture></div>
        <span class="card__num" aria-hidden="true">${w.no}</span>
        ${w.ref ? '<span class="card__ref" aria-hidden="true">REF</span>' : ''}
        <button class="card__open" type="button" aria-label="${esc(tx('openWork', { no: w.no, title: w.title }))}"></button>
        <div class="card__info">
          <span class="card__ratio" aria-hidden="true">${ratioName(w.ratio)}</span>
          ${w.prompt ? copyButton('card__copy', 'Copy', tx('copyPromptOf', { title: w.title }), 'Copied') : ''}
        </div>
      </div>`;
    const cell = { w, el, card: $('.card', el), media: $('.card__media', el), img: $('img', el), avif: $('source', el), shown: true, placed: false, x: 0, y: 0 };
    const done = () => {
      cell.media.classList.add('is-loaded');
      if (!w.known && cell.img.naturalWidth) {
        w.ratio = cell.img.naturalHeight / cell.img.naturalWidth;
        w.known = true;
        scheduleLayout(true);
      }
    };
    cell.img.addEventListener('load', done, { once: true });
    const failed = () => {
      // an AVIF copy that is missing or will not decode: fall back to the JPEG once
      if (cell.avif && /\.avif$/i.test(cell.img.currentSrc)) {
        cell.avif.remove();
        cell.avif = null;
        cell.img.addEventListener('error', failed, { once: true });
        cell.img.srcset = w.srcset;
        return;
      }
      cell.media.classList.add('is-loaded');
    };
    cell.img.addEventListener('error', failed, { once: true });
    // a card with a smaller copy gets its image in layout(), once its width is known
    if (!w.srcset) cell.img.src = w.thumb;
    grid.appendChild(el);
    byId.set(w.id, cell);
    return cell;
  });

  /* ---------- layouts ---------- */
  const LAYOUTS = [
    ['masonry', 'masonry', '<rect x="3.5" y="3.5" width="7" height="10" rx="1.5"/><rect x="3.5" y="16.5" width="7" height="4" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="4" rx="1.5"/><rect x="13.5" y="10.5" width="7" height="10" rx="1.5"/>'],
    ['rows', 'rows', '<rect x="3.5" y="4.5" width="10" height="6" rx="1.5"/><rect x="16.5" y="4.5" width="4" height="6" rx="1.5"/><rect x="3.5" y="13.5" width="5" height="6" rx="1.5"/><rect x="11.5" y="13.5" width="9" height="6" rx="1.5"/>'],
    ['sheet', 'sheet', '<rect x="3.5" y="3.5" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="3.5" width="4.5" height="4.5" rx="1"/><rect x="16" y="3.5" width="4.5" height="4.5" rx="1"/><rect x="3.5" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="16" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="3.5" y="16" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="16" width="4.5" height="4.5" rx="1"/><rect x="16" y="16" width="4.5" height="4.5" rx="1"/>'],
  ];
  const SIZES = ['S', 'M', 'L'];
  const SIZE_KEYS = ['small', 'medium', 'large'];
  let mode = 'masonry';
  let density = 1;
  try {
    const m = localStorage.getItem('pa:layout');
    const d = localStorage.getItem('pa:density');
    if (LAYOUTS.some((l) => l[0] === m)) mode = m;
    if (d !== null && SIZES[+d]) density = +d;
  } catch (_) { /* storage unavailable: use defaults */ }
  grid.dataset.layout = mode;
  grid.dataset.density = density;

  const baseCols = (vw) => (vw >= 1680 ? 5 : vw >= 1240 ? 4 : vw >= 820 ? 3 : 2);

  // returns a box for every shown cell, in grid-local pixels
  function place(W, vw) {
    const gap = vw >= 1240 ? 16 : vw >= 820 ? 14 : 10;
    const small = vw < 820;
    const shown = cells.filter((c) => c.shown);
    const out = [];
    let total = 0;

    if (mode === 'masonry') {
      // tall sets (e.g. 9:16) get one extra column so a screen holds more than one row
      const cols = clamp(baseCols(vw) + (1 - density) + (TALL && !small ? 1 : 0), 1, 8);
      const colW = (W - gap * (cols - 1)) / cols;
      const heights = new Array(cols).fill(0);
      shown.forEach((c) => {
        if (cols >= 3 && c.w.ratio < 0.8) {
          // landscape image: span two adjacent columns
          let k = 0, top = Infinity;
          for (let j = 0; j < cols - 1; j++) {
            const t = Math.max(heights[j], heights[j + 1]);
            if (t < top - 1) { top = t; k = j; }
          }
          const w = colW * 2 + gap, h = w * c.w.ratio;
          out.push({ c, x: k * (colW + gap), y: top, w, h });
          heights[k] = heights[k + 1] = top + h + gap;
          return;
        }
        let k = 0;
        for (let j = 1; j < cols; j++) if (heights[j] < heights[k] - 1) k = j;
        const h = colW * c.w.ratio;
        out.push({ c, x: k * (colW + gap), y: heights[k], w: colW, h });
        heights[k] += h + gap;
      });
      total = Math.max(0, ...heights) - gap;
    } else if (mode === 'rows') {
      // justified rows: every row fills the width, images keep their full frame
      const target = [190, 280, 400][density] * (small ? 0.55 : vw < 1240 ? 0.8 : 1);
      let row = [], sum = 0, y = 0;
      const flush = (last) => {
        let h = (W - gap * (row.length - 1)) / sum;
        if (last) h = Math.min(h, target);
        let x = 0;
        row.forEach((c) => { const w = h / c.w.ratio; out.push({ c, x, y, w, h }); x += w + gap; });
        y += h + gap;
        row = []; sum = 0;
      };
      shown.forEach((c) => {
        row.push(c);
        sum += 1 / c.w.ratio;
        if (sum * target + gap * (row.length - 1) >= W) flush(false);
      });
      if (row.length) flush(true);
      total = y - gap;
    } else if (mode === 'sheet') {
      // contact sheet: uniform darkroom proof frames in a high-density grid
      const sheetGap = small ? 8 : 12;
      const cols = clamp((vw >= 1680 ? 8 : vw >= 1240 ? 6 : vw >= 820 ? 5 : 3) + (1 - density) * 2, 2, 12);
      const colW = (W - sheetGap * (cols - 1)) / cols;
      const cellH = colW * 1.18;
      shown.forEach((c, i) => {
        const col = i % cols, r = Math.floor(i / cols);
        out.push({ c, x: col * (colW + sheetGap), y: r * (cellH + sheetGap), w: colW, h: cellH });
      });
      const rows = Math.ceil(shown.length / cols);
      total = rows ? rows * (cellH + sheetGap) - sheetGap : 0;
    }
    return { out, total: Math.max(0, total) };
  }

  // moving(p): when given, only the cards it picks animate and the rest jump into place,
  // so a change of size doesn't resize (and repaint) every card on the page each frame
  function layout(animate, moving) {
    const { out, total } = place(grid.clientWidth, innerWidth);
    const pick = animate && moving ? moving(out) : null;
    const snap = out.filter((p) => !animate || !p.c.placed || (pick && !pick(p))).map((p) => p.c);
    snap.forEach((c) => c.el.classList.add('is-snap'));
    out.forEach(({ c, x, y, w, h }) => {
      c.x = Math.round(x);
      c.y = Math.round(y);
      c.cw = Math.round(x + w) - c.x;
      c.h = Math.round(y + h) - c.y;
      c.el.style.width = `${c.cw}px`;
      c.el.style.height = `${c.h}px`;
      c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
      // the image covers the card: tell the browser how wide it will be drawn so it can pick the smaller copy
      if (c.img && c.w.srcset) {
        c.img.sizes = `${Math.ceil(Math.max(w, h / c.w.ratio))}px`;
        if (c.avif) c.avif.sizes = c.img.sizes;
        // set before the first real width and the browser fetches the large copy as well
        if (!c.img.srcset && w > 0) {
          if (c.avif) c.avif.srcset = c.w.avifset;
          c.img.srcset = c.w.srcset;
          c.img.src = c.w.thumb;
        }
      }
      c.placed = true;
    });
    grid.style.height = `${Math.round(total)}px`;
    if (snap.length) {
      void grid.offsetWidth;
      snap.forEach((c) => c.el.classList.remove('is-snap'));
    }
  }

  let layoutRaf = 0, layoutAnim = false;
  function scheduleLayout(animate) {
    layoutAnim = layoutAnim || animate;
    if (layoutRaf) return;
    layoutRaf = requestAnimationFrame(() => {
      layoutRaf = 0;
      const a = layoutAnim;
      layoutAnim = false;
      layout(a);
    });
  }

  let lastGridW = 0;
  new ResizeObserver(() => {
    const w = grid.clientWidth;
    if (w === lastGridW) return;
    lastGridW = w;
    scheduleLayout(false);
  }).observe(grid);

  /* ---------- scroll reveal ---------- */
  const cellOf = (el) => byId.get(el.dataset.id);
  let revealQueue = [], revealRaf = 0;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { revealQueue.push(e.target); io.unobserve(e.target); }
    }
    if (revealQueue.length && !revealRaf) revealRaf = requestAnimationFrame(flushReveal);
  }, { rootMargin: '0px 0px -6% 0px' });

  function flushReveal() {
    revealRaf = 0;
    const batch = revealQueue.map(cellOf).sort((a, b) => (a.y - b.y) || (a.x - b.x));
    revealQueue = [];
    batch.forEach((c, i) => {
      c.card.style.setProperty('--d', `${Math.min(i * 70, 600)}ms`);
      develop(c, Math.min(i * 70, 600));
      c.card.classList.add('in');
      setTimeout(() => c.card.style.removeProperty('--d'), 2200);
    });
  }

  function revealNow(c) {
    if (c.card.classList.contains('in')) return;
    io.unobserve(c.el);
    c.card.classList.add('is-snap', 'in');
    void c.card.offsetWidth;
    c.card.classList.remove('is-snap');
  }

  /* ---------- layout controls ---------- */
  const layoutsEl = $('#layouts');
  const densityEl = $('#density');
  layoutsEl.insertAdjacentHTML('beforeend', LAYOUTS.map(([key, label, icon], i) =>
    `<button class="seg__btn" type="button" data-layout="${key}" data-tip="${esc(tx(label))} · ${i + 1}" aria-label="${esc(tx('layoutAria', { name: tx(label) }))}" aria-pressed="${key === mode}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></button>`).join(''));
  densityEl.insertAdjacentHTML('beforeend', SIZES.map((s, i) =>
    `<button class="seg__btn" type="button" data-density="${i}" data-tip="${esc(tx(SIZE_KEYS[i]))}" aria-label="${esc(tx('sizeAria', { name: tx(SIZE_KEYS[i]) }))}" aria-pressed="${i === density}">${s}</button>`).join(''));

  // category filter: a work's category is the first of Portrait / Anime / Poster in its tags.
  // An NSFW tag overrides that: such a work shows only under NSFW, never under All, and the tab asks for age first
  const CATS = ['all', 'Portrait', 'Anime', 'Poster', 'NSFW'];
  const CAT_KEYS = ['catAll', 'catPortrait', 'catAnime', 'catPoster', 'catNsfw'];
  const catOf = (w) => (isNsfw(w) ? 'NSFW' : w.tags.find((t) => t !== 'all' && CATS.includes(t)) || 'Portrait');
  const inCat = (w, k) => (k === 'all' ? !isNsfw(w) : catOf(w) === k);
  const catCount = (k) => realWorks.filter((w) => inCat(w, k)).length;
  const catsEl = $('#cats');
  let cat = 'all';
  catsEl.insertAdjacentHTML('beforeend', CATS.map((k, i) =>
    `<button class="seg__btn" type="button" data-cat="${k}" aria-label="${esc(tx('catAria', { name: tx(CAT_KEYS[i]), count: catCount(k) }))}" aria-pressed="${k === cat}"><span>${esc(tx(CAT_KEYS[i]))}</span><i>${catCount(k)}</i></button>`).join(''));
  // All is the first tab: NSFW works start out of the grid
  cells.forEach((c) => {
    if (c.w.slot || !isNsfw(c.w)) return;
    c.shown = false;
    c.el.inert = true;
    c.el.classList.add('is-out', 'is-gone');
  });

  // words drawn by script follow the language switch
  document.addEventListener('tj:lang', () => {
    $$('.seg__btn', catsEl).forEach((b, i) => {
      $('span', b).textContent = tx(CAT_KEYS[i]);
      b.setAttribute('aria-label', tx('catAria', { name: tx(CAT_KEYS[i]), count: catCount(b.dataset.cat) }));
    });
    $$('.seg__btn', layoutsEl).forEach((b, i) => {
      const label = tx(LAYOUTS[i][1]);
      b.dataset.tip = `${label} · ${i + 1}`;
      b.setAttribute('aria-label', tx('layoutAria', { name: label }));
    });
    $$('.seg__btn', densityEl).forEach((b, i) => {
      b.dataset.tip = tx(SIZE_KEYS[i]);
      b.setAttribute('aria-label', tx('sizeAria', { name: tx(SIZE_KEYS[i]) }));
    });
    cells.forEach((c) => {
      if (c.w.slot) return;
      $('.card__open', c.el)?.setAttribute('aria-label', tx('openWork', { no: c.w.no, title: c.w.title }));
      const cp = $('.card__copy', c.el);
      if (cp) relabel(cp, 'Copy', tx('copyPromptOf', { title: c.w.title }), 'Copied');
    });
    relabel(vCopy, tx('copyPrompt'));
    loadPrompts(I18N.lang);
    if (vOpen && current()) fillPanel(current());
    requestAnimationFrame(() => movePill(true));
  });

  function slide(group, instant) {
    const btn = $('[aria-pressed="true"]', group);
    const p = $('.seg__pill', group);
    if (!btn || !p) return;
    if (instant) p.style.transition = 'none';
    p.style.width = `${btn.offsetWidth}px`;
    p.style.transform = `translateX(${btn.offsetLeft}px)`;
    if (instant) { void p.offsetWidth; p.style.transition = ''; }
    const l = btn.offsetLeft, r = l + btn.offsetWidth;
    if (l < group.scrollLeft || r > group.scrollLeft + group.clientWidth) {
      group.scrollTo({ left: l - 24, behavior: REDUCE ? 'auto' : 'smooth' });
    }
  }
  function movePill(instant) { [catsEl, layoutsEl, densityEl].forEach((g) => slide(g, instant)); }

  const toolbar = $('#toolbar');
  const stickyOffset = () => toolbar.offsetHeight;

  let morphTimer = 0;
  function setLayout(m, d) {
    if (m === mode && d === density) return;
    // keep the card at the top of the screen in view across the change
    const off = stickyOffset();
    const gridTop = grid.getBoundingClientRect().top + scrollY;
    const anchor = scrollY + off > gridTop
      ? cells.find((c) => c.shown && c.el.getBoundingClientRect().bottom > off + 10)
      : null;

    mode = m;
    density = d;
    grid.dataset.layout = mode;
    grid.dataset.density = density;
    try { localStorage.setItem('pa:layout', mode); localStorage.setItem('pa:density', String(density)); } catch (_) { /* ignore */ }
    $$('.seg__btn', layoutsEl).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === mode)));
    $$('.seg__btn', densityEl).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.density === density)));
    movePill(false);

    grid.classList.add('is-morphing');
    clearTimeout(morphTimer);
    morphTimer = setTimeout(() => grid.classList.remove('is-morphing'), 1100);
    // cards on screen now, or on screen once the anchor has been scrolled back to the top, take part in the morph
    const margin = innerHeight * .25;
    const now = scrollY - gridTop;
    const meets = (top, h, at) => top + h > at - margin && top < at + innerHeight + margin;
    layout(true, (out) => {
      const a = anchor && out.find((p) => p.c === anchor);
      const next = a ? a.y - off - 12 : now;
      return (p) => (p.c.placed && meets(p.c.y, p.c.h || 0, now)) || meets(p.y, p.h, next);
    });
    if (anchor) smooth.to(gridTop + anchor.y - off - 12);
  }

  let catTimer = 0;
  async function setCategory(k, asked) {
    if (k === cat || !CATS.includes(k)) return;
    if (k === 'NSFW' && !asked && !(await ageOk())) return;
    cat = k;
    $$('.seg__btn', catsEl).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
    movePill(false);
    // after a switch the grid starts from its top: bring the toolbar back to it if the page is scrolled past
    const off = stickyOffset();
    const gridTop = grid.getBoundingClientRect().top + scrollY;
    const lift = scrollY + off > gridTop;
    cells.forEach((c) => {
      c.shown = c.w.slot ? cat === 'all' : inCat(c.w, cat);
      c.el.inert = !c.shown;
      c.el.classList.toggle('is-out', !c.shown);
      if (c.shown) c.el.classList.remove('is-gone');
    });
    // out of sight once faded, so they can't take focus or sit under the cards that are left
    clearTimeout(catTimer);
    catTimer = setTimeout(() => cells.forEach((c) => {
      c.el.classList.toggle('is-gone', !c.shown);
      if (!c.shown) c.placed = false; // it snaps to its spot when it comes back
    }), 460);

    grid.classList.add('is-morphing');
    clearTimeout(morphTimer);
    morphTimer = setTimeout(() => grid.classList.remove('is-morphing'), 1100);
    const margin = innerHeight * .25;
    const now = scrollY - gridTop;
    const next = lift ? -off - 12 : now;
    const meets = (top, h, at) => top + h > at - margin && top < at + innerHeight + margin;
    layout(true, () => (p) => (p.c.placed && meets(p.c.y, p.c.h || 0, now)) || meets(p.y, p.h, next));
    if (lift) smooth.to(gridTop - off - 12);
  }

  catsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.seg__btn');
    if (b) setCategory(b.dataset.cat);
  });
  layoutsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.seg__btn');
    if (b) setLayout(b.dataset.layout, density);
  });
  densityEl.addEventListener('click', (e) => {
    const b = e.target.closest('.seg__btn');
    if (b) setLayout(mode, +b.dataset.density);
  });


  grid.addEventListener('click', (e) => {
    const cellEl = e.target.closest('.cell');
    if (!cellEl) return;
    const c = cellOf(cellEl);
    const btn = e.target.closest('.copy');
    if (btn) { doCopy(btn, promptOf(c.w), tx('promptCopied'), true, c.w.id); return; }
    if (e.target.closest('.card__open')) openViewer(c, true);
  });

  /* ---------- viewer ---------- */
  const page = $('#page');
  const viewer = $('#viewer');
  const stage = $('#v-stage');
  const frame = $('#v-frame');
  const vImg = $('#v-img');
  const vBody = $('#v-body');
  $('#v-copy-wrap').innerHTML = copyButton('copy--big', tx('copyPrompt'));
  const vCopy = $('#v-copy-wrap .copy');

  let vList = [], vIndex = -1, vOpen = false, vBusy = false, vClosing = false, vPushed = false, vRef = false;
  let vZoom = Promise.resolve(); // the opening zoom; the full-size image waits for it
  const current = () => vList[vIndex];
  const srcRect = (c) => c.media.getBoundingClientRect();

  function fitFrame(w) {
    const cs = getComputedStyle(stage);
    const pw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ph = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const r = vRef && w.ref ? w.ref.height / w.ref.width : w.ratio;
    let fw = pw, fh = pw * r;
    if (fh > ph) { fh = ph; fw = ph / r; }
    frame.style.width = `${Math.round(fw)}px`;
    frame.style.height = `${Math.round(fh)}px`;
  }

  // 5x7 digits; every cell is a 3x3 patch of dots, lit cells in the foreground and the rest left faintly on
  const DIGITS = {
    0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110',
    2: '01110100010000100010001000100011111', 3: '11111000100010000010000011000101110',
    4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110',
    6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000',
    8: '01110100011000101110100011000101110', 9: '01110100011000101111000010001001100',
  };
  const vNo = $('#v-no');
  function drawNo(no) {
    const s = String(no).replace(/\D/g, '');
    const c = 7, sub = 3, gap = 1, dpr = Math.max(2, devicePixelRatio || 1);
    const W = s.length * (5 + gap) * c - gap * c, H = 7 * c;
    vNo.style.width = `${W}px`;
    vNo.style.height = `${H}px`;
    vNo.width = W * dpr;
    vNo.height = H * dpr;
    vNo.setAttribute('aria-label', `No.${no}`);
    const x = vNo.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement);
    const on = cs.getPropertyValue('--ink-fg').trim() || '#ececea';
    const off = cs.getPropertyValue('--dot').trim() || '#1d1d1c';
    [...s].forEach((ch, i) => [...DIGITS[ch]].forEach((b, k) => {
      const lit = b === '1';
      x.fillStyle = lit ? on : off;
      x.beginPath();
      for (let a = 0; a < sub; a++) for (let d = 0; d < sub; d++) {
        const px = i * (5 + gap) * c + (k % 5) * c + (a + .5) * c / sub, py = Math.floor(k / 5) * c + (d + .5) * c / sub;
        x.moveTo(px, py);
        x.arc(px, py, lit ? 1.05 : .6, 0, Math.PI * 2);
      }
      x.fill();
    }));
  }

  function fillPanel(c) {
    const w = c.w;
    drawNo(w.no);
    $('#v-title').textContent = w.title;
    vCopy.disabled = !w.prompt;
    // "人物：…" / "Subject: …" paragraphs: the label gets its own weight so the sections can be scanned
    $('#v-prompt').innerHTML = promptOf(w).split('\n\n').map(p => {
      const m = p.match(/^(?:([^：\n]{1,6})：|([A-Z][A-Za-z ]{0,15}): )([\s\S]*)$/);
      return m ? `<span class="fold__sec"><b>${esc(m[1] || m[2])}</b>${esc(m[3])}</span>` : `<span class="fold__sec">${esc(p)}</span>`;
    }).join('');
    vReveal.hidden = !w.prompt;
    showPrompt(promptOpen && !!w.prompt);
    const meta = [];
    if (w.params.Model) meta.push(['model', w.params.Model]);
    meta.push(['size', w.px ? `${ratioName(w.ratio)} · ${w.px}` : ratioName(w.ratio)]);
    const ref = w.ref ? `<div class="meta__ref">
        <button class="ref__thumb" type="button" aria-pressed="${vRef}" aria-label="${esc(tx('viewRef'))}"><img src="${esc(w.ref.thumb || w.ref.file)}" alt="" draggable="false"></button>
        <div class="ref__txt"><dt>${esc(tx('ref'))}</dt><dd>${w.ref.width} × ${w.ref.height} · ${esc(w.ref.kind)}</dd></div>
        <a class="ref__dl" href="${esc(w.ref.file)}" download="${esc(`${w.no}-reference.${w.ref.kind.toLowerCase()}`)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5v11M7 11l5 5 5-5M5.5 19.5h13"/></svg>${esc(tx('download'))}</a>
      </div>` : '';
    $('#v-meta').innerHTML = meta.map(([k, v]) => `<div><dt>${esc(tx(k))}</dt><dd>${esc(v)}</dd></div>`).join('') + ref;
    vCopy.classList.remove('is-done');
  }

  // the full prompt is folded away until asked for; once opened it stays open while browsing
  const vReveal = $('#v-reveal');
  const vFold = $('#v-fold');
  const vLabToggle = $('#v-lab-toggle');
  const vLabFold = $('#v-lab-fold');
  let promptOpen = false, labOpen = false;
  function showPrompt(on) {
    vFold.classList.toggle('is-open', on);
    vFold.inert = !on;
    vReveal.setAttribute('aria-expanded', String(on));
    $('.reveal__lbl', vReveal).textContent = tx(on ? 'hidePrompt' : 'showPrompt');
  }
  function showLab(on) {
    if (!vLabFold || !vLabToggle) return;
    vLabFold.classList.toggle('is-open', on);
    vLabFold.inert = !on;
    vLabToggle.setAttribute('aria-expanded', String(on));
    if (on && lastHistBins) requestAnimationFrame(() => drawHistCanvas(lastHistBins));
  }
  vReveal.addEventListener('click', () => { promptOpen = !promptOpen; showPrompt(promptOpen); });
  if (vLabToggle) vLabToggle.addEventListener('click', () => { labOpen = !labOpen; showLab(labOpen); });

  function setImage(c) {
    const w = c.w;
    vRef = false;
    const t = $('.ref__thumb', vBody);
    if (t) t.setAttribute('aria-pressed', 'false');
    // the copy the card already has on screen is decoded and ready, so the zoom starts with a picture
    vImg.src = (c.img && c.img.currentSrc) || w.thumb;
    vImg.alt = w.title;
    frame.style.backgroundColor = w.color || '';
    analyzeWorkImage(vImg);
    if (w.full !== w.thumb) {
      const im = new Image();
      im.src = w.full;
      // swapping in a large image mid-zoom repaints the moving frame; wait until it has landed
      Promise.all([im.decode(), vZoom]).then(() => { if (current() === c && !vRef) vImg.src = w.full; }).catch(() => {});
    }
  }

  function preloadAround() {
    [-1, 1].forEach((d) => {
      const n = vList[(vIndex + d + vList.length) % vList.length];
      if (n) new Image().src = n.w.thumb;
    });
  }

  function openViewer(c, push) {
    if (vOpen) return;
    vList = cells.filter((x) => x.shown && !x.w.slot);
    vIndex = vList.indexOf(c);
    if (vIndex < 0) { vList = cells.filter((x) => !x.w.slot && isNsfw(x.w) === isNsfw(c.w)); vIndex = vList.indexOf(c); }
    vOpen = true;
    promptOpen = false;

    fillPanel(c);
    let landed;
    vZoom = new Promise((r) => { landed = r; });
    setImage(c);
    smooth.stop();
    document.documentElement.classList.add('is-locked');
    page.inert = true;
    viewer.inert = false;
    viewer.setAttribute('aria-hidden', 'false');
    viewer.classList.add('is-open');
    $('.viewer__panel', viewer).scrollTop = 0;
    viewer.scrollTop = 0;
    fitFrame(c.w);
    cancelAnims(frame);
    cancelAnims(vImg);

    const to = frame.getBoundingClientRect();
    const from = srcRect(c);
    const onScreen = c.card.classList.contains('in') && from.bottom > 0 && from.top < innerHeight && from.width > 0;

    if (onScreen && !REDUCE) {
      const sx = from.width / to.width, sy = from.height / to.height;
      c.el.classList.add('is-source');
      // transform only, so the zoom runs on the compositor without repainting the image
      const a = frame.animate([
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})` },
        { transform: 'none' },
      ], { duration: 860, easing: EASE });
      settle(a, 860).then(() => { landed(); if (!vClosing) c.el.classList.remove('is-source'); });
    } else {
      settle(frame.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: REDUCE ? 1 : 600, easing: EASE }), 600).then(landed);
    }
    requestAnimationFrame(() => viewer.classList.add('is-active'));

    vPushed = !!push;
    if (push) history.pushState({ viewer: c.w.id }, '', `#${encodeURIComponent(c.w.id)}`);
    track('open', c.w.id);
    preloadAround();
    setTimeout(() => $('#v-close').focus({ preventScroll: true, focusVisible: false }), 60);
  }

  function requestClose() {
    if (!vOpen || vClosing) return;
    if (vPushed && history.state && history.state.viewer) history.back(); // popstate closes
    else {
      history.replaceState({ view: 'prompt' }, '', '#prompt');
      closeViewer();
    }
  }

  // instant: drop the viewer at once, for when a page change is already covering the screen
  async function closeViewer(instant) {
    if (!vOpen || vClosing) return;
    vClosing = true;
    const c = current();
    cancelAnims(frame);
    cancelAnims(vImg);
    cancelAnims(vBody);
    vList.forEach((x) => x !== c && x.el.classList.remove('is-source'));
    if (vRef) { vRef = false; frame.style.opacity = ''; vImg.src = c.w.thumb; vImg.alt = c.w.title; fitFrame(c.w); }

    // bring the card under the overlay into view so the image can land on it
    if (c.shown && !instant) {
      const bar = stickyOffset();
      const r = c.el.getBoundingClientRect();
      if (r.top < bar || r.bottom > innerHeight) {
        smooth.to(scrollY + r.top - Math.max(bar + 16, (innerHeight - r.height) / 2), true);
      }
      revealNow(c);
    }
    viewer.classList.remove('is-active');

    const to = frame.getBoundingClientRect();
    const from = srcRect(c);
    const onScreen = !instant && c.shown && from.bottom > 0 && from.top < innerHeight && !REDUCE;
    let anim;
    if (onScreen) {
      const sx = from.width / to.width, sy = from.height / to.height;
      c.el.classList.add('is-source');
      anim = frame.animate([
        { transform: 'none' },
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})` },
      ], { duration: 720, easing: 'cubic-bezier(.6,0,.1,1)', fill: 'forwards' });
    } else {
      anim = frame.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.96)' }], { duration: REDUCE || instant ? 1 : 320, easing: 'ease', fill: 'forwards' });
    }
    await settle(anim, 720);

    c.el.classList.remove('is-source');
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    viewer.inert = true;
    page.inert = false;
    cancelAnims(frame);
    document.documentElement.classList.remove('is-locked');
    smooth.start();
    vOpen = false;
    vClosing = false;
    const opener = $('.card__open', c.el);
    if (c.shown && opener) opener.focus({ preventScroll: true, focusVisible: false });
  }

  async function step(dir) {
    if (!vOpen || vBusy || vClosing || vList.length < 2) return;
    vBusy = true;
    vList.forEach((x) => x.el.classList.remove('is-source'));
    cancelAnims(frame);
    cancelAnims(vImg);
    cancelAnims(vBody);
    const out = { duration: REDUCE ? 1 : 230, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' };
    const a = frame.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 56}px) scale(.97)` }], out);
    vBody.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }], out);
    await settle(a, 230);

    vIndex = (vIndex + dir + vList.length) % vList.length;
    const c = current();
    fillPanel(c);
    setImage(c);
    fitFrame(c.w);
    await Promise.race([vImg.decode().catch(() => {}), wait(450)]);
    if (!vOpen || vClosing) { vBusy = false; return; }

    cancelAnims(frame);
    cancelAnims(vBody);
    const inn = { duration: REDUCE ? 1 : 680, easing: EASE };
    frame.animate([{ opacity: 0, transform: `translateX(${dir * 56}px) scale(.97)` }, { opacity: 1, transform: 'none' }], inn);
    vBody.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { ...inn, delay: REDUCE ? 0 : 70, fill: 'backwards' });
    history.replaceState(vPushed ? { viewer: c.w.id } : null, '', `#${encodeURIComponent(c.w.id)}`);
    track('open', c.w.id);
    preloadAround();
    vBusy = false;
  }

  viewer.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close')) requestClose();
  });
  $('#v-close').addEventListener('click', requestClose);
  $('#v-prev').addEventListener('click', () => step(-1));
  $('#v-next').addEventListener('click', () => step(1));
  vCopy.addEventListener('click', () => doCopy(vCopy, promptOf(current().w), tx('promptCopied'), true, current().w.id));

  // the reference thumbnail swaps the big frame between the work and the picture it was made from
  async function showRef(on) {
    const c = current();
    if (!c || !c.w.ref || vBusy || on === vRef) return;
    vBusy = true;
    cancelAnims(frame);
    const a = frame.animate([{ opacity: 1 }, { opacity: 0 }], { duration: REDUCE ? 1 : 180, easing: 'ease', fill: 'forwards' });
    await settle(a, 180);
    vRef = on;
    vImg.src = on ? c.w.ref.file : c.w.full;
    vImg.alt = on ? `${tx('ref')} · ${c.w.title}` : c.w.title;
    fitFrame(c.w);
    await Promise.race([vImg.decode().catch(() => {}), wait(450)]);
    cancelAnims(frame);
    frame.animate([{ opacity: 0, transform: 'scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: REDUCE ? 1 : 420, easing: EASE });
    const t = $('.ref__thumb', vBody);
    if (t) t.setAttribute('aria-pressed', String(on));
    vBusy = false;
  }
  vBody.addEventListener('click', (e) => {
    if (e.target.closest('.ref__thumb')) { showRef(!vRef); return; }
    const sw = e.target.closest('.v-swatch');
    if (sw && sw.dataset.hex) {
      copyText(sw.dataset.hex).then((ok) => {
        if (ok) toast(tx('hexCopied', { hex: sw.dataset.hex }));
      });
    }
  });

  /* ---------- Pro Darkroom 1: Live Dot-Matrix Histogram & 5-Chip Color Gene Swatches ---------- */
  const vHist = $('#v-hist');
  const vEvStat = $('#v-ev-stat');
  const vSwatches = $('#v-swatches');
  const histSampleCv = document.createElement('canvas');
  histSampleCv.width = 72;
  histSampleCv.height = 72;
  const histSampleCtx = histSampleCv.getContext('2d', { willReadFrequently: true });
  let lastHistBins = null;

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function drawHistCanvas(bins) {
    if (!vHist || !bins) return;
    const W = vHist.clientWidth || 280, H = 54;
    const dpr = Math.min(2, devicePixelRatio || 1);
    vHist.width = Math.round(W * dpr);
    vHist.height = Math.round(H * dpr);
    const ctx = vHist.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cs = getComputedStyle(document.documentElement);
    const onCol = cs.getPropertyValue('--ink-fg').trim() || '#ececea';
    const dimCol = cs.getPropertyValue('--dot').trim() || '#2e2e2c';
    const COLS = bins.length; // 40 columns
    const ROWS = 10;
    const stepX = W / COLS, stepY = H / ROWS;
    const maxVal = Math.max(0.001, ...bins);

    for (let c = 0; c < COLS; c++) {
      const norm = Math.pow(bins[c] / maxVal, 0.62); // gamma lift so small highlight spikes show clearly
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

  function runImageAnalysis(imgEl) {
    if (!imgEl || !imgEl.naturalWidth) return;
    try {
      histSampleCtx.clearRect(0, 0, 72, 72);
      histSampleCtx.drawImage(imgEl, 0, 0, 72, 72);
      const data = histSampleCtx.getImageData(0, 0, 72, 72).data;
      const COLS = 40;
      const bins = new Float32Array(COLS);
      let lumSum = 0, darkCount = 0;
      const totalPx = 72 * 72;

      // 5 luminance/saturation buckets for representative 5-chip palette extraction
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
        // Bucket 4 reserves high-saturation accent color (e.g., neon green heels, Tiffany blue)
        let bIdx;
        if (sat > 0.45 && lum > 35 && lum < 235) {
          bIdx = 4;
        } else {
          bIdx = clamp(Math.floor((lum / 256) * 4), 0, 3);
        }
        const weight = bIdx === 4 ? (sat * 3 + 0.5) : 1;
        buckets[bIdx].r += r * weight;
        buckets[bIdx].g += g * weight;
        buckets[bIdx].b += b * weight;
        buckets[bIdx].w += weight;
      }

      lastHistBins = bins;
      drawHistCanvas(bins);

      const avgLum = Math.round((lumSum / totalPx / 255) * 100);
      const darkPct = Math.round((darkCount / totalPx) * 100);
      const keyLabel = avgLum < 32 ? 'LOW-KEY' : avgLum > 65 ? 'HIGH-KEY' : 'BALANCED';
      if (vEvStat) vEvStat.textContent = `${keyLabel} // SHD ${darkPct}% · LUM ${avgLum}%`;

      if (vSwatches) {
        const hexes = [];
        buckets.forEach((bk) => {
          if (bk.w > 0) hexes.push(rgbToHex(bk.r / bk.w, bk.g / bk.w, bk.b / bk.w));
        });
        while (hexes.length < 5) hexes.push('#1A1A19');
        vSwatches.innerHTML = hexes.slice(0, 5).map((hex) =>
          `<button class="v-swatch" type="button" data-hex="${hex}" title="Click to copy ${hex}"><span class="v-swatch__dot" style="background:${hex}"></span><span>${hex}</span></button>`
        ).join('');
      }
    } catch (_) { /* ignore tainted canvas if any */ }
  }

  function analyzeWorkImage(imgEl) {
    if (imgEl.complete && imgEl.naturalWidth) runImageAnalysis(imgEl);
    else imgEl.addEventListener('load', () => runImageAnalysis(imgEl), { once: true });
  }

  /* ---------- Pro Darkroom 2: Optical Loupe (100% Detail Magnifier inside #v-frame) ---------- */
  const vLoupe = $('#v-loupe');
  const vLoupeHud = $('#v-loupe-hud');
  let loupeActive = false, loupeZoom = 2.5, loupeX = 0, loupeY = 0;

  function drawLoupe() {
    if (!loupeActive || !vLoupe || !vImg.naturalWidth) return;
    const L = 210, R = L / 2;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (vLoupe.width !== Math.round(L * dpr)) {
      vLoupe.width = Math.round(L * dpr);
      vLoupe.height = Math.round(L * dpr);
    }
    const ctx = vLoupe.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L, L);

    const rect = frame.getBoundingClientRect();
    const u = clamp(loupeX / rect.width, 0, 1);
    const v = clamp(loupeY / rect.height, 0, 1);
    const iw = vImg.naturalWidth, ih = vImg.naturalHeight;
    const srcW = (L / rect.width) * iw / loupeZoom;
    const srcH = (L / rect.height) * ih / loupeZoom;
    const sx = u * iw - srcW / 2;
    const sy = v * ih - srcH / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#0d0d0c';
    ctx.fillRect(0, 0, L, L);
    ctx.drawImage(vImg, sx, sy, srcW, srcH, 0, 0, L, L);

    // Subtle darkroom crosshair & reticle ticks
    ctx.strokeStyle = 'rgba(236, 236, 234, 0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(R - 14, R); ctx.lineTo(R - 4, R);
    ctx.moveTo(R + 4, R); ctx.lineTo(R + 14, R);
    ctx.moveTo(R, R - 14); ctx.lineTo(R, R - 4);
    ctx.moveTo(R, R + 4); ctx.lineTo(R, R + 14);
    // Ruler ticks around inner rim
    for (let a = 0; a < 36; a++) {
      const ang = (a * 10 * Math.PI) / 180;
      const len = a % 3 === 0 ? 7 : 3.5;
      ctx.moveTo(R + Math.cos(ang) * (R - 3), R + Math.sin(ang) * (R - 3));
      ctx.lineTo(R + Math.cos(ang) * (R - 3 - len), R + Math.sin(ang) * (R - 3 - len));
    }
    ctx.stroke();
    ctx.restore();

    // Dotted outer bezel ring matching True JPEG's dot-matrix language
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

    vLoupe.style.left = `${loupeX}px`;
    vLoupe.style.top = `${loupeY}px`;
    if (vLoupeHud) {
      const pxX = String(Math.round(u * iw)).padStart(4, '0');
      const pxY = String(Math.round(v * ih)).padStart(4, '0');
      vLoupeHud.textContent = `LOUPE ${loupeZoom.toFixed(1)}× // X:${pxX} Y:${pxY}`;
    }
  }

  function updateLoupePos(e) {
    if (document.documentElement.getAttribute('data-pro') !== '1') return;
    const rect = frame.getBoundingClientRect();
    loupeX = clamp(e.clientX - rect.left, 0, rect.width);
    loupeY = clamp(e.clientY - rect.top, 0, rect.height);
    if (loupeActive) drawLoupe();
    else if (vLoupeHud) vLoupeHud.textContent = `${tx('loupeHint')} (${loupeZoom.toFixed(1)}×)`;
  }

  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !vOpen || document.documentElement.getAttribute('data-pro') !== '1') return;
    e.preventDefault();
    loupeActive = true;
    frame.setPointerCapture(e.pointerId);
    frame.classList.add('is-louping');
    updateLoupePos(e);
  });
  frame.addEventListener('pointermove', updateLoupePos);
  const stopLoupe = () => {
    if (!loupeActive) return;
    loupeActive = false;
    frame.classList.remove('is-louping');
    if (vLoupeHud) vLoupeHud.textContent = `${tx('loupeHint')} (${loupeZoom.toFixed(1)}×)`;
  };
  frame.addEventListener('pointerup', stopLoupe);
  frame.addEventListener('pointercancel', stopLoupe);
  frame.addEventListener('pointerenter', () => {
    if (document.documentElement.getAttribute('data-pro') !== '1') return;
    if (!loupeActive && vLoupeHud) vLoupeHud.textContent = `${tx('loupeHint')} (${loupeZoom.toFixed(1)}×)`;
  });
  frame.addEventListener('wheel', (e) => {
    if (!vOpen || document.documentElement.getAttribute('data-pro') !== '1') return;
    e.preventDefault();
    loupeZoom = clamp(loupeZoom + (e.deltaY < 0 ? 0.5 : -0.5), 1.5, 6.0);
    if (loupeActive) drawLoupe();
    else if (vLoupeHud) vLoupeHud.textContent = `${tx('loupeHint')} (${loupeZoom.toFixed(1)}×)`;
  }, { passive: false });

  // swipe between works on touch screens
  let touchX = null;
  stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ---------- age check: asked once before any NSFW work shows, the yes is remembered on this browser ---------- */
  const gate = { el: $('#age'), open: false, mark: null };
  const AGE_KEY = 'tj.adult';
  // the local preview asks every time, so the check can be looked at again and again
  const LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  const adult = () => { if (LOCAL) return false; try { return gate.yes || localStorage.getItem(AGE_KEY) === '1'; } catch (_) { return !!gate.yes; } };
  function ageOk() {
    if (adult()) return Promise.resolve(true);
    if (gate.open) return Promise.resolve(false);
    const el = gate.el, back = document.activeElement;
    gate.open = true;
    smooth.stop();
    document.documentElement.classList.add('is-locked');
    page.inert = true;
    viewer.inert = true;
    el.hidden = false;
    // built on first use: the canvas needs the band on screen to measure
    if (!gate.mark) gate.mark = dotType($('#age-num'), 'R18', $('.age__band', el), 0.12);
    void el.offsetWidth;
    el.classList.add('is-open');
    clearTimeout(gate.timer);
    gate.timer = setTimeout(() => gate.mark.play(), REDUCE ? 0 : 650); // R18 prints in once the band has wiped across
    $('[data-age="yes"]', el).focus({ preventScroll: true, focusVisible: false });
    return new Promise((resolve) => {
      const done = (yes) => {
        el.removeEventListener('click', onClick);
        removeEventListener('keydown', onKey, true);
        if (yes) { gate.yes = true; try { localStorage.setItem(AGE_KEY, '1'); } catch (_) { /* private mode: asked again on the next visit */ } }
        el.classList.remove('is-open');
        setTimeout(() => { el.hidden = true; }, REDUCE ? 0 : 300);
        gate.open = false;
        page.inert = vOpen;
        viewer.inert = !vOpen;
        if (!vOpen) { document.documentElement.classList.remove('is-locked'); smooth.start(); }
        if (back && back.focus) back.focus({ preventScroll: true });
        resolve(yes);
      };
      const onClick = (e) => {
        const b = e.target.closest('[data-age]');
        if (b) done(b.dataset.age === 'yes');
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
        else if (e.key === 'Tab') {
          // the two buttons are all there is to reach
          const bs = $$('button', el), i = bs.indexOf(document.activeElement);
          e.preventDefault();
          bs[(i + (e.shiftKey ? bs.length - 1 : 1)) % bs.length].focus();
        }
      };
      el.addEventListener('click', onClick);
      addEventListener('keydown', onKey, true);
    });
  }
  // a link straight to an NSFW work: ask first, then open it inside the NSFW tab; a no lands on the gallery
  async function adultRoute(r) {
    if (!r.cell || !isNsfw(r.cell.w)) return r;
    if (await ageOk()) { await setCategory('NSFW', true); return r; }
    history.replaceState({ view: 'prompt' }, '', '#prompt');
    return { view: 'prompt' };
  }

  /* ---------- views: home, prompt, generate (chooser), studio (generator), other ---------- */
  // #generate is the chooser; #studio and legacy #tool open the generator. Work ids open Prompt; no hash is home.
  const VIEWS = {};
  $$('[data-view]').forEach((el) => { VIEWS[el.dataset.view] = el; });
  const routeOf = (hash) => {
    const r = route(hash);
    return r.view === 'studio' && !STUDIO ? { view: 'generate' } : r;
  };
  const route = (hash) => {
    const h = decodeURIComponent(hash.slice(1));
    if (new URLSearchParams(location.search).has('checkout')) return { view: 'studio' };
    if (!h || h === 'home') return { view: 'home' };
    if (VIEWS[h]) return { view: h };
    if (h === 'tool' || h.startsWith('login=')) return { view: 'studio' }; // old name; sign-in link (tool.js reads the token)
    const c = byId.get(h);
    return c && !c.w.slot ? { view: 'prompt', cell: c } : { view: 'home' };
  };
  const hrefOf = (name) => (name === 'home' ? location.pathname + location.search : `#${name}`);

  let view = null, going = false;
  const scrollMemo = {};
  let marks = {};
  const reels = []; // { view, r }: windows with moving pictures
  const homeFrames = [];

  function show(name) {
    Object.entries(VIEWS).forEach(([k, el]) => { el.hidden = k !== name; el.classList.remove('is-in'); });
    view = name;
    document.title = name === 'home' ? site.name : `${name === 'studio' ? 'Generate' : name[0].toUpperCase() + name.slice(1)} — ${site.name}`;
    void document.body.offsetWidth;
    VIEWS[name].classList.add('is-in');
    if (marks[name]) marks[name].play();
    document.dispatchEvent(new CustomEvent('tj:view', { detail: name }));
    homeFrames.forEach((f) => f.set(false)); // a hidden window gets no pointerleave
    reels.forEach(({ view: v, r }) => {
      if (v !== name) r.stop();
      else { r.prime(); if (!FINE) r.start(); }
    });
    if (name === 'prompt') {
      // lay out now: the grid had no width while hidden, and the reveal observer must see real positions
      lastGridW = grid.clientWidth;
      layout(false);
      movePill(true);
      onScroll();
    }
  }

  /* dot wipe: dots swell out from where you clicked until they cover the page, then shrink away */
  const wipe = (() => {
    const cv = $('#wipe');
    const ctx = cv.getContext('2d');
    const STEP = 18, SPREAD = 0.6;
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    return function run(origin, cover) {
      return new Promise((resolve) => {
        const W = innerWidth, H = innerHeight;
        const dpr = Math.min(2, devicePixelRatio || 1);
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
          cv.width = Math.round(W * dpr);
          cv.height = Math.round(H * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cv.classList.add('is-on');
        const cs = getComputedStyle(document.documentElement);
        const ink = cs.getPropertyValue('--paper').trim();
        const lit = cs.getPropertyValue('--fg').trim();
        const o = origin || { x: W / 2, y: H / 2 };
        const far = Math.max(Math.hypot(o.x, o.y), Math.hypot(W - o.x, o.y), Math.hypot(o.x, H - o.y), Math.hypot(W - o.x, H - o.y));
        const R = STEP * 0.72, rowH = STEP * 0.866;
        const dur = REDUCE ? 1 : cover ? 620 : 760;
        const t0 = performance.now();
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          if (cover) { ctx.fillStyle = ink; ctx.fillRect(0, 0, W, H); } else { ctx.clearRect(0, 0, W, H); cv.classList.remove('is-on'); }
          resolve();
        };
        const frame = (t) => {
          if (done) return;
          const p = Math.min(1, (t - t0) / dur);
          const big = new Path2D(), spark = new Path2D();
          for (let y = 0, row = 0; y < H + STEP; y += rowH, row++) {
            for (let x = row % 2 ? STEP / 2 : 0; x < W + STEP; x += STEP) {
              const d = Math.hypot(x - o.x, y - o.y) / far;
              const k = clamp(p * (1 + SPREAD) - d * SPREAD, 0, 1);
              const e = ease(k);
              const r = (cover ? e : 1 - e) * R;
              if (r > 0.3) { big.moveTo(x + r, y); big.arc(x, y, r, 0, Math.PI * 2); }
              // a glint of light dots rides the front of the wave
              const g = Math.sin(k * Math.PI) * STEP * 0.13;
              if (g > 0.4) { spark.moveTo(x + g, y); spark.arc(x, y, g, 0, Math.PI * 2); }
            }
          }
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = ink;
          ctx.fill(big);
          ctx.fillStyle = lit;
          ctx.fill(spark);
          if (p < 1) requestAnimationFrame(frame); else finish();
        };
        requestAnimationFrame(frame);
        setTimeout(finish, dur + 400); // hidden tabs pause rAF
      });
    };
  })();

  // covered: work to do while the wipe hides the screen (e.g. dropping the viewer)
  async function go(name, origin, push = true, covered) {
    if (going || name === view || !VIEWS[name]) return false;
    going = true;
    scrollMemo[view] = scrollY;
    if (push) history.pushState({ view: name }, '', hrefOf(name));
    smooth.stop();
    await wipe(origin, true);
    if (covered) await covered();
    show(name);
    smooth.start();
    smooth.to(name === 'prompt' ? scrollMemo.prompt || 0 : 0, true);
    await wipe(origin, false);
    going = false;
    return true;
  }

  // "Generate now" in the viewer: off to the generator with this work's prompt, model and ratio filled in.
  // While the generator is still closed it lands on the Generate chooser instead.
  const vGen = $('#v-gen');
  vGen.addEventListener('click', async (e) => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (!vOpen || vClosing) return;
    const w = current().w;
    const b = vGen.getBoundingClientRect();
    const origin = e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    const done = await go(STUDIO ? 'studio' : 'generate', origin, true, () => closeViewer(true));
    if (done && STUDIO) {
      document.dispatchEvent(new CustomEvent('tj:prefill', { detail: { prompt: promptOf(w), model: w.params.Model, aspect: ratioName(w.ratio) } }));
    }
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-go]');
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    let origin = { x: e.clientX, y: e.clientY };
    if (!e.clientX && !e.clientY) { const b = a.getBoundingClientRect(); origin = { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
    go(a.dataset.go, origin);
  });

  addEventListener('popstate', async () => {
    const r = await adultRoute(routeOf(location.hash));
    if (vOpen && !r.cell) await closeViewer();
    if (r.view !== view) await go(r.view, null, false);
    if (r.cell && !vOpen) openViewer(r.cell, false);
  });

  /* ---------- keyboard ---------- */
  addEventListener('keydown', (e) => {
    if (gate.open) return;
    if (vOpen) {
      if (e.key === 'Escape') requestClose();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey && !e.altKey && !String(getSelection())) {
        doCopy(vCopy, promptOf(current().w), tx('promptCopied'), true, current().w.id);
      }
      return;
    }
    const plain = !e.metaKey && !e.ctrlKey && !e.altKey;
    if (going) return;
    if (view === 'home') {
      const to = ['prompt', 'generate', 'other'][+e.key - 1];
      if (to && plain) go(to, null);
      return;
    }
    if (view !== 'prompt') {
      if (e.key !== 'Escape') return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) document.activeElement.blur();
      else go(view === 'studio' ? 'generate' : 'home', null);
      return;
    }
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && LAYOUTS[+e.key - 1]) {
      const targetLayout = LAYOUTS[+e.key - 1][0];
      if (targetLayout === 'sheet' && document.documentElement.getAttribute('data-pro') !== '1') return;
      setLayout(targetLayout, density);
    }
  });

  // partner marks drawn as dots like the numerals, in a w x h box
  const LOGOS = {
    yir: { w: 30, h: 25, d: 'M0 0H10V7Q10.5 10.5 14 11H20V0H30V8Q30 11 26 11.5L24 12V24Q24 25 23 25H15Q14 25 14 24V13Q4 12 1 9Q0 8 0 7Z' },
    // Higgsfield's glyph as on higgsfield.ai (20 x 20); the loop at its foot is a hole
    higgsfield: { w: 20, h: 19.4, rule: 'evenodd', d: 'M18.3498 9.83713L18.3339 9.65759C18.1831 7.93447 17.0963 4.69261 14.0816 4.69261C11.8445 4.69261 10.1545 6.97097 8.66311 8.97967C7.47302 10.5883 6.4419 11.9683 5.3073 11.9683C5.00574 11.9357 4.61708 11.7805 4.3792 11.4294C4.16497 11.1108 4.10948 10.7026 4.22046 10.2126C4.39489 9.43684 5.39463 8.7182 6.44963 7.95063C7.02864 7.54238 7.6238 7.10955 8.03634 6.69311C9.22643 5.5091 9.82932 4.65164 9.82932 3.2717C9.82932 1.89176 9.09157 1.20565 8.47276 0.911636C7.23514 0.323844 5.41851 0.666781 4.26026 1.69583C4.08583 1.85922 3.91117 2.01418 3.75243 2.16119C2.58622 3.23097 1.80094 3.95781 0 3.40232V5.63972C2.38791 6.72588 4.39512 4.65164 5.15675 3.69633C5.74372 3.06758 6.36253 2.70006 6.82283 2.70006H6.84671C7.05298 2.70825 7.22741 2.78995 7.35454 2.93696C7.56081 3.18204 7.64018 3.46786 7.60038 3.78622C7.51305 4.45594 6.83875 5.23967 5.60113 6.09713C4.14928 7.10159 1.7218 8.78374 1.53122 10.8987C1.3884 12.4177 2.15003 13.9365 3.34012 14.5243C6.11669 15.8798 7.80665 13.5444 9.5994 11.0783C10.9719 9.1756 12.273 7.37103 14.0818 7.37103C15.7081 7.37103 16.311 8.75916 16.311 9.63301V9.80459L16.1523 9.83713C12.2095 10.5558 10.0595 14.3611 10.0595 16.1167C10.0595 17.8724 11.5034 19.375 13.2804 19.375C15.359 19.375 17.9293 17.5458 18.3419 12.4013L18.3578 12.2136H20V9.83737H18.3498V9.83713ZM16.1998 12.4746C15.8826 15.5531 14.3513 16.9904 13.4232 16.9904C13.0027 16.9904 12.4158 16.631 12.4158 15.9615C12.4158 15.2104 13.5026 12.932 15.946 12.2543L16.2316 12.1808L16.1998 12.4748V12.4746Z' },
  };

  /* ---------- big type set in dots, pushed around by the cursor; word may also be a shape from LOGOS ---------- */
  function dotType(cv, word, host, maxH) {
    const ctx = cv.getContext('2d');
    const shape = typeof word === 'string' ? null : word;
    const text = shape ? '' : word.toUpperCase();
    const FONT = (fs) => `700 ${fs}px Inter, "Helvetica Neue", sans-serif`;
    let xs, ys, ox, oy, sc, seed, n = 0, W = 0, H = 0, dpr = 1, step = 6, r0 = 2;
    let raf = 0, t0 = 0, built = false;
    const ptr = { x: -1e4, y: -1e4 };

    function build() {
      W = cv.clientWidth;
      if (!W) return;
      dpr = Math.min(2, devicePixelRatio || 1);
      const o = document.createElement('canvas').getContext('2d');
      let fs = 100, k = 0;
      if (shape) {
        k = Math.min(W / shape.w, (innerHeight * maxH) / shape.h);
        H = Math.ceil(shape.h * k);
        fs = H / 0.74; // the dot size a word this tall would get
      } else {
        o.font = FONT(fs);
        o.letterSpacing = `${-fs * 0.02}px`;
        fs = Math.min(fs * W / o.measureText(text).width, innerHeight * maxH);
        H = Math.ceil(fs * 0.74);
      }
      if (!H) return; // a window still hidden or squeezed to nothing; the resize observer builds it later
      cv.style.height = `${H}px`;
      o.canvas.width = W;
      o.canvas.height = H;
      if (shape) {
        o.setTransform(k, 0, 0, k, (W - shape.w * k) / 2, 0);
        o.fill(new Path2D(shape.d), shape.rule || 'nonzero');
      } else {
        o.font = FONT(fs);
        o.letterSpacing = `${-fs * 0.02}px`;
        // text-align: center on the canvas sets the word in the middle when its height cap leaves room
        const x0 = getComputedStyle(cv).textAlign === 'center' ? Math.max(0, (W - o.measureText(text).width) / 2) : 0;
        o.fillText(text, x0, H - 1);
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
      for (let i = 0; i < n; i++) { xs[i] = pts[2 * i]; ys[i] = pts[2 * i + 1]; seed[i] = Math.random(); }
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      built = true;
    }

    function frame(t) {
      raf = 0;
      // print in from left to right on first show
      const p = REDUCE ? 2 : (t - t0) / 1400;
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

    const move = (e) => {
      const b = cv.getBoundingClientRect();
      ptr.x = e.clientX - b.left;
      ptr.y = e.clientY - b.top;
      kick();
    };
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', () => { ptr.x = ptr.y = -1e4; kick(); });

    let lastW = 0;
    new ResizeObserver(() => {
      if (cv.clientWidth === lastW || !built) return;
      lastW = cv.clientWidth;
      build();
      t0 = -1e9;
      kick();
    }).observe(cv);

    return {
      play() { build(); lastW = W; t0 = performance.now(); kick(); },
    };
  }

  /* ---------- an image redrawn as a dot screen of itself ---------- */
  // sm: a small canvas, one pixel per dot, to read the tones from; ctx: the canvas the dots go on.
  // The dot worker below runs this from its source text, so it must use nothing from outside
  function drawDots(sm, img, ctx, w, h, step, dpr, fg, bg) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const cols = sm.canvas.width, rows = sm.canvas.height;
    // same crop as object-fit: cover
    let sw = iw, sh = ih;
    if (iw / ih > cols / rows) sw = ih * cols / rows; else sh = iw * rows / cols;
    sm.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cols, rows);
    const px = sm.getImageData(0, 0, cols, rows).data;
    ctx.scale(dpr, dpr);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    ctx.fillStyle = fg;
    ctx.beginPath();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const k = (y * cols + x) * 4;
        const lum = (0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2]) / 255;
        const r = step * 0.56 * Math.sqrt(lum);
        if (r < 0.35) continue;
        const cx = x * step + step / 2 + (y % 2 ? step / 2 : 0), cy = y * step + step / 2;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }

  // the page has one set of colours: read each once, not on every card (each read restyles the page)
  const inks = new Map();
  const ink = (name) => {
    if (!inks.has(name)) inks.set(name, getComputedStyle(document.documentElement).getPropertyValue(name).trim());
    return inks.get(name);
  };

  function halftone(img, w, h, step, bg) {
    if (!w || !h || !img.naturalWidth) return null;
    const sm = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    sm.canvas.width = Math.ceil(w / step);
    sm.canvas.height = Math.ceil(h / step);
    const dpr = Math.min(2, devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    try { drawDots(sm, img, cv.getContext('2d'), w, h, step, dpr, ink('--fg'), bg && ink(bg)); } catch (_) { return null; }
    return cv;
  }

  // the same dots drawn in a worker: done here, a row of cards coming into view held the scroll
  // up for a frame or more each. The worker reads the picture from the browser cache and decodes it
  // itself (createImageBitmap(img) here would decode it again on this thread). Null where a worker
  // can't draw (no OffscreenCanvas); halftoneLater then draws here as before, and also when the worker fails
  const dotWorker = (() => {
    if (typeof OffscreenCanvas !== 'function' || typeof createImageBitmap !== 'function' || !window.Worker) return null;
    const src = `${drawDots}
onmessage = async (e) => {
  const { id, url, w, h, step, dpr, fg, bg } = e.data;
  let out;
  try {
    const bmp = await createImageBitmap(await (await fetch(url, { cache: 'force-cache' })).blob());
    const sm = new OffscreenCanvas(Math.ceil(w / step), Math.ceil(h / step)).getContext('2d', { willReadFrequently: true });
    const cv = new OffscreenCanvas(Math.round(w * dpr), Math.round(h * dpr));
    drawDots(sm, bmp, cv.getContext('2d'), w, h, step, dpr, fg, bg);
    bmp.close();
    out = cv.transferToImageBitmap();
  } catch (_) {}
  postMessage({ id, out }, out ? [out] : []);
};`;
    let wk;
    try { wk = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); } catch (_) { return null; }
    const jobs = new Map();
    let seq = 0, broken = false;
    wk.onmessage = (e) => {
      const done = jobs.get(e.data.id);
      jobs.delete(e.data.id);
      if (done) done(e.data.out);
    };
    // undefined, not null: "draw it here instead"
    wk.onerror = () => { broken = true; jobs.forEach((done) => done(undefined)); jobs.clear(); };
    return {
      draw(job) {
        return new Promise((done) => {
          if (broken) { done(undefined); return; }
          const id = ++seq;
          jobs.set(id, done);
          wk.postMessage({ id, ...job });
        });
      },
    };
  })();

  function halftoneLater(img, w, h, step, bg) {
    if (!w || !h || !img.naturalWidth) return Promise.resolve(null);
    if (!dotWorker || !img.currentSrc) return Promise.resolve(halftone(img, w, h, step, bg));
    const dpr = Math.min(2, devicePixelRatio || 1);
    return dotWorker.draw({ url: img.currentSrc, w, h, step, dpr, fg: ink('--fg'), bg: bg && ink(bg) })
      .then((out) => {
        if (out === undefined) return halftone(img, w, h, step, bg);
        if (!out) return null;
        const cv = document.createElement('canvas');
        cv.width = out.width;
        cv.height = out.height;
        cv.getContext('bitmaprenderer').transferFromImageBitmap(out);
        return cv;
      })
      .catch(() => null);
  }

  /* ---------- cards develop from a dot screen of their own image ---------- */
  function develop(c, delay) {
    if (REDUCE || !c.img || c.developed) return;
    c.developed = true;
    const start = () => {
      const t0 = performance.now();
      // the photo waits behind the plain dot screen for its own dots, but not for long (a slow phone)
      c.media.classList.add('is-developing');
      const giveUp = setTimeout(() => c.media.classList.remove('is-developing'), delay + 700);
      // the worker reads the picture itself; drawn here, it is decoded off the main thread first,
      // or drawing it into the canvas would decode it right there, mid-scroll
      const decoded = c.img.decode().catch(() => {});
      (dotWorker ? Promise.resolve() : decoded)
        .then(() => halftoneLater(c.img, c.cw || c.media.clientWidth, c.h || c.media.clientHeight, 7))
        .then((cv) => {
          clearTimeout(giveUp);
          if (!cv || !c.media.classList.contains('is-developing')) { c.media.classList.remove('is-developing'); return; }
          cv.className = 'card__dots';
          c.media.appendChild(cv);
          setTimeout(() => {
            c.media.classList.remove('is-developing');
            setTimeout(() => cv.remove(), 900);
          }, Math.max(160, t0 + delay + 260 - performance.now()));
        });
    };
    if (c.img.complete && c.img.naturalWidth) start();
    else c.img.addEventListener('load', () => { delay = 0; start(); }, { once: true });
  }

  /* ---------- home windows: a dotted outline with a glint that runs round it on hover ---------- */
  function perimeter(W, H, r, spacing) {
    const segs = [], arc = Math.PI * r / 2;
    const line = (x0, y0, x1, y1) => segs.push({ len: Math.hypot(x1 - x0, y1 - y0), at: (t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0] });
    const corner = (cx, cy, a0) => segs.push({ len: arc, at: (t) => { const a = a0 + t * Math.PI / 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1]; } });
    line(r, 0, W - r, 0); corner(W - r, r, -Math.PI / 2);
    line(W, r, W, H - r); corner(W - r, H - r, 0);
    line(W - r, H, r, H); corner(r, H - r, Math.PI / 2);
    line(0, H - r, 0, r); corner(r, r, Math.PI);
    const L = segs.reduce((a, b) => a + b.len, 0), n = Math.round(L / spacing), pts = [];
    for (let k = 0; k < n; k++) {
      let d = k * L / n, i = 0;
      while (d > segs[i].len && i < segs.length - 1) d -= segs[i++].len;
      const [x, y, c] = segs[i].at(Math.min(1, d / segs[i].len));
      pts.push({ x, y, c, u: k / n });
    }
    return pts;
  }

  function winFrame(win) {
    const cv = $('.win__frame', win), ctx = cv.getContext('2d'), bar = $('.win__bar', win);
    const OUT = 8, R = 16, GLINT = 0.16, LAP = 2600;
    let W = 0, H = 0, B = 40, dpr = 1, pts = [], raf = 0, on = false, glow = 0, t0 = 0, col = {};

    function size() {
      W = win.offsetWidth; H = win.offsetHeight; B = bar.offsetHeight;
      if (!W) return;
      dpr = Math.min(2, devicePixelRatio || 1);
      cv.style.width = `${W + OUT * 2}px`;
      cv.style.height = `${H + OUT * 2}px`;
      cv.width = Math.round((W + OUT * 2) * dpr);
      cv.height = Math.round((H + OUT * 2) * dpr);
      pts = perimeter(W, H, R, 5);
      const cs = getComputedStyle(document.documentElement), v = (k) => cs.getPropertyValue(k).trim();
      col = { fg: v('--fg'), side: v('--line-2'), line: v('--line'), tick: v('--fg-3') };
      draw(performance.now());
    }

    function draw(t) {
      raf = 0;
      if (!W) return;
      glow += ((on ? 1 : 0) - glow) * (REDUCE ? 1 : 0.12);
      const head = ((t - t0) / LAP) % 1;
      ctx.setTransform(dpr, 0, 0, dpr, OUT * dpr, OUT * dpr);
      ctx.clearRect(-OUT, -OUT, W + OUT * 2, H + OUT * 2);
      // dim dotted sides, lit corners; the glint is a run of bright dots chasing round
      ctx.fillStyle = col.side;
      ctx.beginPath();
      const lit = new Path2D();
      for (const p of pts) {
        let r = p.c ? 1.35 : 1, hot = p.c;
        if (glow > 0.02 && !REDUCE) {
          const d = (head - p.u + 1) % 1;
          if (d < GLINT) { const k = (1 - d / GLINT) * glow; r += 0.7 * k; hot = hot || k > 0.25; }
        }
        (hot ? lit : ctx).moveTo(p.x + r, p.y);
        (hot ? lit : ctx).arc(p.x, p.y, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = col.fg;
      ctx.fill(lit);
      // the bar divider, with a scale of ticks along it
      ctx.fillStyle = col.line;
      ctx.fillRect(0, B, W, 1);
      for (let x = 16, i = 0; x < W - 12; x += 8, i++) {
        ctx.fillStyle = i % 5 ? col.line : col.tick;
        ctx.fillRect(x, B + 1, 1, i % 5 ? 3 : 6);
      }
      if (on || glow > 0.02) raf = requestAnimationFrame(draw);
    }

    new ResizeObserver(size).observe(win);
    return {
      set(v) {
        if (v === on) return;
        on = v;
        if (on && glow < 0.02) t0 = performance.now() - LAP * 0.94; // start the run just before the top-left corner
        if (!raf) raf = requestAnimationFrame(draw);
      },
      refresh: size,
    };
  }

  /* ---------- the Prompt window plays the gallery: a batch develops, holds, the next replaces it ---------- */
  // a frame arrives as its own halftone (the unloaded look); develop turns it into the photo while alive() holds
  function frameIn(tile, img, dev, alive) {
    (REDUCE ? Promise.resolve(null) : halftoneLater(img, tile.clientWidth, tile.clientHeight, 5, '--paper')).then((dots) => {
      const old = $$('.win__layer', tile);
      const layer = document.createElement('span');
      layer.className = 'win__layer';
      layer.appendChild(img);
      if (dots) layer.appendChild(dots);
      tile.appendChild(layer);
      void layer.offsetWidth;
      layer.classList.add('is-dots');
      if (!dots) layer.classList.add('is-photo');
      else if (dev) setTimeout(() => { if (alive()) layer.classList.add('is-photo'); }, 300);
      setTimeout(() => old.forEach((el) => el.remove()), dots && dev ? 1100 : 300);
    });
  }
  // back to the unloaded look: only the latest frame, as dots
  function frameOut(tile) {
    const ls = $$('.win__layer', tile);
    ls.slice(0, -1).forEach((el) => el.remove());
    if (ls.length && ls[ls.length - 1].lastElementChild.tagName === 'CANVAS') ls[ls.length - 1].classList.remove('is-photo');
  }
  const loadThumb = (w) => new Promise((res) => {
    const im = new Image();
    im.alt = '';
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = w.thumb;
  });
  const shuffled = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  function reel(view, list) {
    const tiles = $$('.win__tile', view);
    const pool = shuffled(list);
    let at = 0, gen = 0, timer = 0, next = null, playing = false;
    const prep = () => {
      const batch = tiles.map(() => pool[at++ % pool.length]);
      next = Promise.all(batch.map(loadThumb));
    };

    const put = (tile, img, dev) => frameIn(tile, img, dev, () => playing);

    async function play() {
      const g = gen;
      const imgs = await next;
      if (g !== gen) return;
      prep();
      imgs.forEach((img, i) => { if (img) setTimeout(() => { if (g === gen) put(tiles[i], img, true); }, REDUCE ? 0 : i * 80); });
      timer = setTimeout(play, REDUCE ? 5000 : 2200);
    }

    prep();
    let primed = false;
    return {
      // the first batch sits in the window from the start, still undeveloped
      prime() {
        if (primed || !tiles[0].clientWidth) return;
        primed = true;
        const g = gen;
        next.then((imgs) => {
          if (g !== gen) return;
          prep();
          imgs.forEach((img, i) => { if (img) put(tiles[i], img, false); });
        });
      },
      start() {
        if (playing) return;
        playing = true;
        gen++;
        view.classList.add('is-playing');
        const shown = tiles.map((t) => t.lastElementChild).filter(Boolean);
        shown.forEach((l, i) => setTimeout(() => { if (playing) l.classList.add('is-photo'); }, REDUCE ? 0 : i * 80));
        if (shown.length) timer = setTimeout(play, REDUCE ? 5000 : 1800); else play();
      },
      stop() {
        if (!playing) return;
        playing = false;
        gen++;
        clearTimeout(timer);
        view.classList.remove('is-playing');
        tiles.forEach(frameOut);
      },
    };
  }

  /* ---------- Generate's window: a console runs a gallery work's settings to a finished render, no pictures ---------- */
  function panel(view, list) {
    // only works that name their model, so no row ever reads blank
    const named = list.filter((w) => w.params && w.params.Model);
    const pool = shuffled(named.length ? named : list);
    const box = $('.con', view);
    const STEPS = 40, CELLS = 24;
    box.innerHTML = ['model', 'ratio', 'size', 'seed'].map((k) => `<span class="con__row"><b>${k}</b><span data-k="${k}"></span></span>`).join('')
      + `<span class="con__run"><span class="con__bar">${'<i></i>'.repeat(CELLS)}</span><span class="con__n"></span></span>`;
    const out = {};
    $$('[data-k]', box).forEach((el) => { out[el.dataset.k] = el; });
    const cells = $$('.con__bar i', box), count = $('.con__n', box);
    let at = 0, gen = 0, timer = 0, playing = false, primed = false;
    const seed = () => String(10000 + Math.floor(Math.random() * 90000));
    const values = (w) => ({ model: (w.params && w.params.Model) || '—', ratio: ratioName(w.ratio), size: w.px || '—', seed: seed() });
    function progress(n) {
      const lit = Math.round((n / STEPS) * CELLS);
      cells.forEach((c, i) => c.classList.toggle('is-on', i < lit));
      count.textContent = n >= STEPS ? 'DONE' : `${String(n).padStart(2, '0')}/${STEPS}`;
      count.classList.toggle('is-done', n >= STEPS);
    }
    // new values flicker through random characters before they settle
    function settle(v, g, done) {
      const CH = '0123456789ABCDEF:×.-';
      let f = REDUCE ? 6 : 0;
      const tick = () => {
        if (g !== gen) return;
        Object.entries(v).forEach(([k, s]) => {
          out[k].textContent = f >= 6 ? s : s.replace(/\S/g, (c, i) => (i < (f / 6) * s.length ? c : CH[Math.floor(Math.random() * CH.length)]));
        });
        if (f++ < 6) timer = setTimeout(tick, 45); else done();
      };
      tick();
    }
    function next(g) {
      const w = pool[at++ % pool.length];
      progress(0);
      settle(values(w), g, () => {
        let n = REDUCE ? STEPS : 0;
        const step = () => {
          if (g !== gen) return;
          n = Math.min(STEPS, n + 1);
          progress(n);
          if (n < STEPS) { timer = setTimeout(step, 55); return; }
          timer = setTimeout(() => next(g), REDUCE ? 5000 : 1600);
        };
        timer = setTimeout(step, 200);
      });
    }
    return {
      // the first work sits there finished
      prime() {
        if (primed || !pool.length) return;
        primed = true;
        const v = values(pool[at++ % pool.length]);
        Object.entries(v).forEach(([k, s]) => { out[k].textContent = s; });
        progress(STEPS);
      },
      start() {
        if (playing || !pool.length) return;
        playing = true;
        view.classList.add('is-playing');
        const g = ++gen;
        next(g);
      },
      stop() {
        if (!playing) return;
        playing = false;
        gen++;
        clearTimeout(timer);
        view.classList.remove('is-playing');
      },
    };
  }

  // what tool.js may use from here
  window.TJ = { toast, esc, go: (name) => go(name, null), scrollTo: (y) => smooth.to(y) };

  /* ---------- toolbar on scroll ---------- */
  let scrollRaf = 0;
  // back to the top of the gallery, offered once a screen or so has scrolled by
  const toTop = $('#totop');
  const pageFoot = $('#page .foot');
  function onScroll() {
    scrollRaf = 0;
    const stuck = scrollY > 0 && toolbar.getBoundingClientRect().top <= 1;
    toolbar.classList.toggle('is-stuck', stuck);
    document.body.classList.toggle('toolbar-stuck', stuck);
    const far = view === 'prompt' && scrollY > innerHeight * 0.8;
    if (far !== toTop.classList.contains('is-on')) {
      toTop.classList.toggle('is-on', far);
      toTop.tabIndex = far ? 0 : -1;
    }
    // keep it clear of the footer text at the very bottom
    if (far) toTop.style.setProperty('--lift', Math.max(0, innerHeight - pageFoot.getBoundingClientRect().top) + 'px');
  }
  addEventListener('scroll', () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(onScroll); }, { passive: true });
  document.addEventListener('tj:view', onScroll);
  toTop.addEventListener('click', () => smooth.to(0));

  addEventListener('resize', () => {
    movePill(true);
    if (vOpen) fitFrame(current().w);
  });

  /* ---------- language switch ---------- */
  // A small globe set in dots, like the titles, with the language in use written beside it.
  // Clicking either slides the other two names out to its left.
  const langEl = $('#lang');
  const langToggle = $('#lang-toggle');
  const langBtns = $$('.lang__btn', langEl);
  // the viewer covers the top bar, so its panel has its own row of the three names
  const vLangBtns = $$('#v-lang button');
  const globe = (() => {
    const cv = $('.lang__dots', langEl);
    const ctx = cv.getContext('2d');
    const rad = Math.PI / 180, TILT = 0.42, GS = 18, H = 36, CY = 18;
    const G = [];
    [-50, 0, 50].forEach((lat) => { for (let lon = 0; lon < 360; lon += 30) G.push([lat * rad, lon * rad]); });
    [0, 60, 120].forEach((lon) => [lon, lon + 180].forEach((l) => [-75, -50, -25, 25, 50, 75].forEach((lat) => G.push([lat * rad, l * rad]))));
    G.push([90 * rad, 0], [-90 * rad, 0]);
    const gx = new Float32Array(G.length), gy = new Float32Array(G.length), gz = new Float32Array(G.length);
    let W = 0, dpr = 1, CX = 0;
    let turn = 0.3, spinFrom = 0, spinTo = 0.3, spinT0 = 0, spinDur = 1;
    // P runs 0 → 1 as the list opens; each dot leaves at its own moment inside that run
    let P = 0, pFrom = 0, pTo = 0, pT0 = 0, pDur = 1;
    let labels = [];
    let active = -1, hover = -1, glow = 0.62;
    const line = { x0: 0, x1: 0, ready: false };
    let raf = 0;

    function project() {
      const R = GS / 2 - 1.2;
      G.forEach(([lat, lon], i) => {
        const x = Math.cos(lat) * Math.sin(lon + turn), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon + turn);
        gx[i] = CX + x * R;
        gy[i] = CY - (y * Math.cos(TILT) - z * Math.sin(TILT)) * R;
        gz[i] = y * Math.sin(TILT) + z * Math.cos(TILT);
      });
    }

    // the canvas spans the words too, for the strip behind them and the dotted line under the one in use
    function build() {
      const menu = $('.lang__menu', langEl);
      const tBtn = $('#theme-toggle');
      const pBtn = $('#pro-toggle');
      const tw = (tBtn ? tBtn.offsetWidth : 0) + (pBtn ? pBtn.offsetWidth : 0);
      W = Math.ceil(menu.offsetWidth + 4 + langToggle.offsetWidth + tw + 24);
      dpr = Math.min(2, devicePixelRatio || 1);
      cv.style.width = `${W}px`;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      CX = W - tw - langToggle.offsetWidth / 2;
      const o = document.createElement('canvas').getContext('2d');
      const left = W - tw - langToggle.offsetWidth - 4 - menu.offsetWidth;
      labels = langBtns.map((btn) => {
        const cs = getComputedStyle(btn);
        o.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        o.letterSpacing = cs.letterSpacing;
        const bx = left + btn.offsetLeft, bw = btn.offsetWidth, tw0 = o.measureText(btn.textContent).width;
        return { x0: bx + (bw - tw0) / 2, x1: bx + (bw + tw0) / 2 };
      });
      line.ready = false;
    }

    function draw() {
      if (!W) return;
      const fg = getComputedStyle(cv).color;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      project();
      // while open, the words get a strip of page colour under them so nothing in the bar shows through
      if (P > 0.001) {
        const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
        const tBtn = $('#theme-toggle');
        const pBtn = $('#pro-toggle');
        const tw = (tBtn ? tBtn.offsetWidth : 0) + (pBtn ? pBtn.offsetWidth : 0);
        const edge = W - tw - langToggle.offsetWidth - 4 - $('.lang__menu', langEl).offsetWidth;
        const g = ctx.createLinearGradient(edge - 20, 0, edge + 6, 0);
        g.addColorStop(0, 'transparent'); g.addColorStop(1, paper);
        ctx.globalAlpha = Math.min(1, P * 2.5);
        ctx.fillStyle = g;
        ctx.fillRect(Math.max(0, edge - 20), 0, W, H);
      }
      ctx.fillStyle = fg;
      // the globe itself
      for (let i = 0; i < G.length; i++) {
        const z = gz[i];
        ctx.globalAlpha = (z > 0 ? 0.45 + z * 0.55 : 0.22) * glow;
        ctx.beginPath();
        ctx.arc(gx[i], gy[i], z > 0 ? 0.62 + z * 0.2 : 0.48, 0, Math.PI * 2);
        ctx.fill();
      }
      if (P > 0) {
        // a row of dots under the language in use, drawn in once the words are there
        if (active >= 0 && labels[active]) {
          const reveal = clamp((P - 0.55) / 0.45, 0, 1);
          ctx.globalAlpha = 0.9;
          for (let x = line.x0; x <= line.x0 + (line.x1 - line.x0) * reveal; x += 3) {
            ctx.beginPath();
            ctx.arc(x, CY + 10, 0.65, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      raf = 0;
      let moving = false;
      const ks = clamp((t - spinT0) / spinDur, 0, 1);
      turn = spinFrom + (spinTo - spinFrom) * (1 - Math.pow(1 - ks, 3));
      if (ks < 1) moving = true;
      const kp = clamp((t - pT0) / pDur, 0, 1);
      P = pFrom + (pTo - pFrom) * kp;
      if (kp < 1) moving = true;
      const near = (v, to, f) => { const n = v + (to - v) * f; if (Math.abs(to - n) > 0.004) moving = true; return Math.abs(to - n) > 0.004 ? n : to; };
      glow = near(glow, pTo > 0 || hover === -2 ? 1 : 0.62, 0.18);
      if (active >= 0 && labels[active]) {
        const L = labels[active];
        if (!line.ready) { line.x0 = L.x0; line.x1 = L.x1; line.ready = true; }
        line.x0 = near(line.x0, L.x0, 0.2);
        line.x1 = near(line.x1, L.x1, 0.2);
      }
      draw();
      if (moving) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    return {
      // the page language swaps the fonts, which can change the words' widths
      build(force) {
        const w = $('.lang__menu', langEl).offsetWidth;
        if (!force && w === this.w) return;
        this.w = w;
        build();
        kick();
      },
      draw: kick,
      spin(by, ms) {
        if (REDUCE) return;
        spinFrom = turn; spinTo += by; spinDur = ms; spinT0 = performance.now();
        kick();
      },
      open(on) {
        pFrom = P; pTo = on ? 1 : 0; pT0 = performance.now();
        pDur = REDUCE ? 1 : (on ? 700 : 300) * Math.abs(pTo - pFrom) || 1;
        kick();
      },
      setActive(i) { active = i; kick(); },
      setHover(i) { hover = i; kick(); },
    };
  })();

  function placeLang() {
    langBtns.concat(vLangBtns).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === I18N.lang)));
    // the language in use moves next to the globe, so the names are measured again every time
    globe.build(true);
    globe.setActive(langBtns.findIndex((b) => b.dataset.lang === I18N.lang));
    // the bars on each page keep their right end clear of the globe
    const shown = $('.lang__btn[aria-pressed="true"]', langEl).offsetWidth + 4;
    document.documentElement.style.setProperty('--lang-w', `${langEl.offsetWidth + shown}px`);
  }

  // short labels decode through random glyphs of the new script; longer copy settles out of a blur.
  // Both run as a wave that starts at the switch.
  const GLYPHS = {
    en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_',
    ja: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモラリルレロン',
    zh: '点图生成模型提示词复制余额购买登录尺寸比例价格版块进入开放方式作品全部更新',
  };
  const TEXT = '[data-i18n], .copy__lbl, #t-go-lbl, #t-cost, #t-note, #t-who, #t-res, #t-pack-row, #t-pack-note, #t-hist, #v-meta';
  const inView = (el) => {
    if (el.closest('#lang')) return null;
    const r = el.getBoundingClientRect();
    return r.width && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth ? r : null;
  };
  const wave = (o) => {
    const far = Math.hypot(innerWidth, innerHeight);
    return $$(TEXT).map((el) => {
      const r = inView(el);
      return r && { el, d: Math.hypot(r.left + r.width / 2 - o.x, r.top + r.height / 2 - o.y) / far };
    }).filter(Boolean);
  };

  function scramble(el, delay) {
    const final = el.textContent;
    const set = GLYPHS[I18N.lang];
    const rand = [...final].map(() => Math.random());
    const dur = Math.min(640, 300 + final.length * 14);
    const t0 = performance.now() + delay;
    let last = null;
    const tick = () => {
      if (last !== null && el.textContent !== last) return; // something else rewrote it
      const p = (performance.now() - t0) / dur;
      if (p >= 1) { el.textContent = final; return; }
      if (p >= 0) {
        last = [...final].map((ch, i) => (/\s/.test(ch) || p > (i / final.length) * 0.55 + rand[i] * 0.45 ? ch : set[Math.floor(Math.random() * set.length)])).join('');
        el.textContent = last;
      }
      setTimeout(tick, 45);
    };
    tick();
  }

  // the viewer's two big buttons decode their label on hover; one run at a time so a run never captures half-scrambled text
  [['#v-copy-wrap .copy', '.copy__lbl > span:first-child'], ['#v-gen', '[data-i18n]']].forEach(([btn, lbl]) => {
    const b = $(btn), el = $(lbl, b);
    let busy = false;
    b.addEventListener('pointerenter', () => {
      if (REDUCE || busy || switching || b.disabled || b.classList.contains('is-done')) return;
      busy = true;
      scramble(el, 0);
      setTimeout(() => { busy = false; }, 700);
    });
  });

  let switching = false;
  async function switchLang(next, origin) {
    if (switching || next === I18N.lang) return;
    if (REDUCE) { I18N.set(next); placeLang(); return; }
    switching = true;
    globe.spin(Math.PI * 1.25, 1100);
    const outs = wave(origin).map(({ el, d }) => el.animate(
      [{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(3px)' }],
      { duration: 160, delay: d * 200, easing: 'ease-in', fill: 'forwards' }));
    await Promise.all(outs.map((a) => settle(a, 400)));
    I18N.set(next);
    placeLang();
    outs.forEach((a) => a.cancel());
    wave(origin).forEach(({ el, d }) => {
      const delay = d * 340;
      const plain = !el.children.length && el.textContent.trim().length > 0 && el.textContent.length <= 40;
      if (plain) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay, fill: 'backwards' });
        scramble(el, delay);
      } else {
        el.animate([{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)' }], { duration: 560, delay, easing: EASE, fill: 'backwards' });
      }
    });
    await wait(500);
    switching = false;
  }

  // the other two names show once the globe or the name in use is clicked; picking one, Escape or a click elsewhere folds them back
  function openLang(open) {
    if (open === langEl.classList.contains('is-open')) return;
    langEl.classList.toggle('is-open', open);
    langToggle.setAttribute('aria-expanded', String(open));
    globe.spin(open ? Math.PI * 1.5 : -Math.PI * 0.75, open ? 1100 : 700);
    globe.open(open);
  }
  langToggle.addEventListener('click', () => openLang(!langEl.classList.contains('is-open')));
  langEl.addEventListener('click', (e) => {
    const b = e.target.closest('.lang__btn');
    if (!b) return;
    if (!langEl.classList.contains('is-open')) return openLang(true);
    const r = b.getBoundingClientRect();
    const next = b.dataset.lang;
    // let the dotted line slide over to the new language before the words fly home
    if (next !== I18N.lang) setTimeout(() => openLang(false), REDUCE ? 0 : 650);
    else openLang(false);
    switchLang(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  });
  langBtns.forEach((b, i) => {
    b.addEventListener('pointerenter', () => globe.setHover(i));
    b.addEventListener('pointerleave', () => globe.setHover(-1));
  });
  document.addEventListener('pointerdown', (e) => { if (!langEl.contains(e.target)) openLang(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !langEl.classList.contains('is-open')) return;
    e.stopPropagation();
    openLang(false);
    langToggle.focus();
  }, true);
  langToggle.addEventListener('pointerenter', () => { globe.setHover(-2); globe.spin(Math.PI / 3, 900); });
  langToggle.addEventListener('pointerleave', () => globe.setHover(-1));
  addEventListener('resize', () => placeLang());
  vLangBtns.forEach((b) => b.addEventListener('click', () => {
    const r = b.getBoundingClientRect();
    switchLang(b.dataset.lang, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }));
  placeLang();

  /* ---------- theme switch (INK / PAPER with honeycomb dot-wave wipe) ---------- */
  const themeBtn = $('#theme-toggle');
  const themeLbl = $('#theme-lbl');
  const THEME_KEY = 'tj.theme';
  let themeBusy = false;

  function applyTheme(mode, silent) {
    const isLight = mode === 'light';
    if (isLight) document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    if (themeLbl) {
      const nextText = isLight ? 'PAPER' : 'INK';
      themeLbl.textContent = nextText;
      if (!silent && !REDUCE) scramble(themeLbl, 0);
    }
    const metaTheme = $('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = isLight ? '#f4f3ee' : '#111110';
    inks.clear();
    homeFrames.forEach((f) => f.refresh && f.refresh());
    if (view && marks[view]) marks[view].play();
    if (vOpen && current()) {
      drawNo(current().w.no);
      if (lastHistBins) drawHistCanvas(lastHistBins);
    }
    globe.build(true);
    placeLang();
  }

  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') applyTheme('light', true);
  } catch (_) {}

  async function toggleTheme(originEl, e) {
    if (themeBusy || going) return;
    themeBusy = true;
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
    let origin = e && (e.clientX || e.clientY) ? { x: e.clientX, y: e.clientY } : null;
    if (!origin && originEl) {
      const b = originEl.getBoundingClientRect();
      origin = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }
    globe.spin(Math.PI * 1.25, 950);
    await wipe(origin, true);
    applyTheme(next, false);
    await wipe(origin, false);
    themeBusy = false;
  }

  if (themeBtn) themeBtn.addEventListener('click', (e) => toggleTheme(themeBtn, e));
  addEventListener('keydown', (e) => {
    if ((e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      toggleTheme(themeBtn, null);
    }
  });

  /* ---------- PRO / RAW mode switch (Hardware LED + Shortcut P) ---------- */
  const proBtn = $('#pro-toggle');
  const proLbl = $('#pro-lbl');
  const PRO_KEY = 'tj.pro';

  function applyPro(on, silent) {
    if (on) document.documentElement.setAttribute('data-pro', '1');
    else document.documentElement.removeAttribute('data-pro');
    const txt = on ? 'PRO' : 'RAW';
    if (proBtn) proBtn.setAttribute('aria-pressed', String(on));
    if (proLbl) {
      proLbl.textContent = txt;
      if (!silent && !REDUCE) scramble(proLbl, 0);
    }
    if (!on) {
      stopLoupe();
      if (mode === 'sheet') setLayout('masonry', density);
    } else if (vOpen && labOpen && lastHistBins) {
      requestAnimationFrame(() => drawHistCanvas(lastHistBins));
    }
    requestAnimationFrame(() => {
      movePill(true);
      globe.build(true);
      placeLang();
    });
  }

  try {
    if (localStorage.getItem(PRO_KEY) === '1') applyPro(true, true);
    else if (mode === 'sheet') {
      mode = 'masonry';
      grid.dataset.layout = 'masonry';
    }
  } catch (_) {}

  function togglePro() {
    const next = document.documentElement.getAttribute('data-pro') !== '1';
    try { localStorage.setItem(PRO_KEY, next ? '1' : '0'); } catch (_) {}
    applyPro(next, false);
    toast(next ? 'PRO DARKROOM // ON' : 'RAW 1:1 MODE // ON');
  }

  if (proBtn) proBtn.addEventListener('click', togglePro);
  addEventListener('keydown', (e) => {
    if ((e.key === 'p' || e.key === 'P') && !e.metaKey && !e.ctrlKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      togglePro();
    }
  });

  /* ---------- intro ---------- */
  (async function intro() {
    const homeMark = dotType($('#home-mark'), site.name, VIEWS.home, 0.4);
    // window numerals play with the view they sit in
    const nums = $$('.win__num').map((cv) => ({ view: cv.closest('[data-view]').dataset.view, m: dotType(cv, cv.dataset.num || LOGOS[cv.dataset.logo], cv.closest('.win'), 0.2) }));
    const playNums = (v) => nums.forEach((n) => { if (n.view === v) n.m.play(); });
    $$('.win').forEach((win) => {
      const fr = winFrame(win);
      homeFrames.push(fr);
      const pics = $('[data-reel], [data-console]', win);
      const rl = pics ? ('reel' in pics.dataset ? reel(pics, safeWorks) : panel(pics, safeWorks)) : null;
      if (rl) reels.push({ view: win.closest('[data-view]').dataset.view, r: rl });
      if (win.classList.contains('is-closed')) return; // nothing to open, so it doesn't answer the pointer
      const on = () => { fr.set(true); if (rl && FINE) rl.start(); };
      const off = () => { if (document.activeElement === win && win.matches(':focus-visible')) return; fr.set(false); if (rl && FINE) rl.stop(); };
      win.addEventListener('pointerenter', on);
      win.addEventListener('pointerleave', off);
      win.addEventListener('focus', () => { if (win.matches(':focus-visible')) on(); });
      win.addEventListener('blur', () => { fr.set(false); if (rl && FINE) rl.stop(); });
    });
    // section names may grow taller than before so even a short word like Prompt runs the full width
    const MARK_H = 0.44;
    marks = {
      home: { play() { homeMark.play(); playNums('home'); } },
      prompt: dotType($('#wordmark'), 'Prompt', $('#top'), MARK_H),
    };
    $$('canvas[data-word]').forEach((cv) => {
      const v = cv.closest('[data-view]').dataset.view, mark = dotType(cv, cv.dataset.word, VIEWS[v], MARK_H);
      marks[v] = { play() { mark.play(); playNums(v); } };
    });
    const route = routeOf(location.hash);
    layout(false);
    // lazy images inside a hidden view never load, so only wait for them when Prompt opens first
    const first = (route.view === 'prompt' ? cells : []).filter((c) => c.img).slice(0, 8).map((c) => (c.img.complete ? null : new Promise((r) => {
      c.img.addEventListener('load', r, { once: true });
      c.img.addEventListener('error', r, { once: true });
    })));
    await Promise.race([Promise.all([document.fonts && document.fonts.ready, ...first]), wait(1800)]);
    await wait(REDUCE ? 0 : 120);

    document.body.classList.remove('is-loading');
    globe.build(true); // fonts are in now
    placeLang();
    document.body.classList.add('is-ready');
    smooth.start();
    // the post tag has been read (SRC); drop it so a copied address does not carry it on
    const here = new URL(location.href);
    here.searchParams.delete('s');
    history.replaceState({ view: route.view }, '', here.href);
    track('view', route.cell ? route.cell.w.id : '');
    show(route.view);
    setTimeout(() => cells.forEach((c) => io.observe(c.el)), REDUCE ? 0 : 300);

    if (route.cell) setTimeout(async () => {
      const r = await adultRoute(route);
      if (r.cell) openViewer(r.cell, false);
    }, REDUCE ? 0 : 500);
  })();
})();
