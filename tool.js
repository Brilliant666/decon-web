(() => {
  'use strict';

  /* The generator in the Tool section. It talks to the worker under /api; app.js owns routing and the toast. */
  const $ = (s, r = document) => r.querySelector(s);
  const TJ = window.TJ;
  const esc = TJ.esc;
  const toast = (msg, isError) => TJ.toast(msg, isError);
  const I18N = window.TJ_I18N;
  const { tx } = I18N;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(`tj.${k}`)); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(`tj.${k}`, JSON.stringify(v)); } catch (_) { /* private mode */ } },
  };

  // a sign-in link (#login=TOKEN) and a Stripe return (?checkout=cs_...) are read once, then cleared from the address bar
  let loginToken = null, checkoutId = null;
  if (location.hash.startsWith('#login=')) loginToken = location.hash.slice(7);
  const qs = new URLSearchParams(location.search);
  if (/^cs_[A-Za-z0-9_]+$/.test(qs.get('checkout') || '')) checkoutId = qs.get('checkout');
  if (loginToken || qs.has('checkout')) history.replaceState(history.state, '', `${location.pathname}#studio`);

  async function api(path, body) {
    const init = body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    let res, data = null;
    try { res = await fetch(path, { credentials: 'same-origin', ...init }); } catch (_) { res = null; }
    if (res) { try { data = await res.json(); } catch (_) { data = null; } }
    if (!res || !res.ok || !data) {
      const code = data?.error?.code || 'offline';
      const e = new Error(I18N.errText(code, data?.error?.message || tx('offline')));
      e.code = code;
      e.status = res ? res.status : 0;
      throw e;
    }
    return data;
  }

  const form = $('#t-form');
  const modelSel = $('#t-model');
  const resBox = $('#t-res');
  const aspectBox = $('#t-aspect');
  const promptEl = $('#t-prompt');
  const goBtn = $('#t-go');
  const hist = $('#t-hist');
  const signin = $('#t-signin');

  let cat = null; // { models, packs, point_days, max_prompt }
  let me = { email: null, balance: { points: 0, next_expiry: null } };
  let sel = Object.assign({ model: 'openai/gpt-image-2', resolution: '1K', aspect: '1:1' }, store.get('sel'));
  let items = [];
  let more = false, busy = false, started = null, pollTimer = 0, sentTo = '';

  const isOpen = (it) => it.status === 'queued' || it.status === 'running' || it.status === 'delivering';
  const model = () => cat && cat.models.find((m) => m.id === sel.model);
  // some ratios cost more or less than the size's base (models.js `over`)
  const ptsOf = (m, res, aspect) => m.over?.[`${res} ${aspect}`] ?? m.specs[res];
  const cost = () => { const m = model(); return m ? ptsOf(m, sel.resolution, sel.aspect) : 0; };
  const ratioCss = (r) => { const [w, h] = String(r).split(':').map(Number); return w && h ? `${w} / ${h}` : '1 / 1'; };
  const day = (t) => { const d = new Date(t * 1000); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };

  /* ---------- form ---------- */
  function fillModels() {
    const makers = [...new Set(cat.models.map((m) => m.maker))];
    modelSel.innerHTML = makers.map((mk) => `<optgroup label="${esc(mk)}">${cat.models.filter((m) => m.maker === mk).map((m) => {
      const pts = [...Object.values(m.specs), ...Object.values(m.over || {})];
      const lo = Math.min(...pts), hi = Math.max(...pts);
      return `<option value="${esc(m.id)}">${esc(m.name)} — ${esc(tx('ptsN', { n: lo === hi ? lo : `${lo}–${hi}` }))}</option>`;
    }).join('')}</optgroup>`).join('');
    if (!model()) sel.model = cat.models[0].id;
    modelSel.value = sel.model;
  }

  function opt(group, value, label, checked, before = '', after = '') {
    return `<button class="opt" type="button" role="radio" aria-checked="${checked}" data-${group}="${esc(value)}">${before}<span>${esc(label)}</span>${after}</button>`;
  }

  function fillSpecs() {
    const m = model();
    const sizes = Object.keys(m.specs);
    if (!sizes.includes(sel.resolution)) sel.resolution = sizes[0];
    if (!m.aspects.includes(sel.aspect)) sel.aspect = m.aspects.includes('1:1') ? '1:1' : m.aspects[0];
    resBox.innerHTML = sizes.map((s) => opt('res', s, s === 'native' ? tx('native') : s, s === sel.resolution, '', `<b class="opt__pts mono">${esc(tx('costPts', { n: ptsOf(m, s, sel.aspect) }))}</b>`)).join('');
    aspectBox.innerHTML = m.aspects.map((a) => opt('aspect', a, a, a === sel.aspect, `<i class="opt__box" style="aspect-ratio:${ratioCss(a)}"></i>`)).join('');
    store.set('sel', sel);
    paintCost();
  }

  function paintCost() {
    if (!cat) return;
    const c = cost();
    const bal = me.balance.points;
    $('#t-cost').textContent = tx('costPts', { n: c });
    const n = promptEl.value.trim().length;
    $('#t-count').textContent = n > cat.max_prompt * 0.8 ? `${n} / ${cat.max_prompt}` : '';
    let label = tx('generate'), note = '';
    if (!me.email) { label = tx('signToGen'); note = tx('noteSign'); }
    else if (bal < c) { label = tx('buyPoints'); note = tx('noteShort', { c, b: bal }); }
    else note = tx('noteBal', { b: bal, a: bal - c });
    $('#t-go-lbl').textContent = busy ? tx('sending') : label;
    $('#t-note').textContent = note;
    goBtn.disabled = busy;
  }

  modelSel.addEventListener('change', () => { sel.model = modelSel.value; fillSpecs(); });
  resBox.addEventListener('click', (e) => { const b = e.target.closest('[data-res]'); if (b) { sel.resolution = b.dataset.res; fillSpecs(); } });
  aspectBox.addEventListener('click', (e) => { const b = e.target.closest('[data-aspect]'); if (b) { sel.aspect = b.dataset.aspect; fillSpecs(); } });
  // arrow keys move through a radio row, like native radios
  [resBox, aspectBox].forEach((box) => box.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const all = [...box.querySelectorAll('.opt')];
    const i = all.indexOf(document.activeElement);
    const next = all[(i + d + all.length) % all.length];
    next.click();
    box.querySelectorAll('.opt')[all.indexOf(next)].focus();
  }));

  promptEl.value = store.get('draft') || '';
  promptEl.addEventListener('input', () => { store.set('draft', promptEl.value); paintCost(); });
  promptEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit(); } });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!cat || busy) return;
    if (!me.email) { openSignin(); return; }
    if (me.balance.points < cost()) { scrollToId('t-packs'); return; }
    const prompt = promptEl.value.trim();
    if (!prompt) { toast(tx('writePrompt'), true); promptEl.focus(); return; }
    busy = true;
    paintCost();
    try {
      const it = await api('/api/generate', { model: sel.model, resolution: sel.resolution, aspect_ratio: sel.aspect, prompt });
      items.unshift(it);
      renderHist();
      if (it.status === 'failed') toast(I18N.failText(it.error || 'Generation failed. Points refunded.'), true);
      schedulePoll(3000);
    } catch (err) {
      if (err.status === 401) signedOut();
      toast(err.message, true);
    }
    busy = false;
    await loadMe();
  });

  /* ---------- account ---------- */
  async function loadMe() {
    try {
      const got = await api('/api/me');
      me = { email: got.email, balance: got.balance || { points: 0, next_expiry: null } };
    } catch (_) { /* keep the last known state */ }
    paintAccount();
  }

  function paintAccount() {
    $('#t-balance').textContent = me.email ? me.balance.points.toLocaleString('en') : '—';
    $('#t-expiry').textContent = me.email && me.balance.next_expiry ? day(me.balance.next_expiry) : '—';
    $('#t-who').innerHTML = me.email
      ? `<span class="tool__email">${esc(me.email)}</span><button class="tool__barbtn" type="button" id="t-out">${esc(tx('signOut'))}</button>`
      : `<button class="tool__barbtn" type="button" data-signin>${esc(tx('signIn'))}</button>`;
    if (me.email) signin.hidden = true;
    paintCost();
  }

  function signedOut() {
    me = { email: null, balance: { points: 0, next_expiry: null } };
    items = [];
    renderHist();
    paintAccount();
  }

  function openSignin() {
    signin.hidden = false;
    $('#t-signin-form').hidden = false;
    sentTo = '';
    $('#t-signin-text').textContent = tx('signinText');
    scrollToId('t-signin');
    setTimeout(() => $('#t-email').focus({ preventScroll: true }), 300);
  }

  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-signin]')) { openSignin(); return; }
    if (e.target.closest('#t-signin-x')) { signin.hidden = true; return; }
    if (e.target.closest('#t-out')) {
      try { await api('/api/auth/logout', {}); } catch (_) { /* the cookie is gone either way once it expires */ }
      signedOut();
      toast(tx('signedOut'));
      return;
    }
    const sc = e.target.closest('[data-scroll]');
    if (sc) { e.preventDefault(); scrollToId(sc.dataset.scroll); }
  });

  $('#t-signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#t-email').value.trim();
    const btn = $('.signin__go', signin);
    btn.disabled = true;
    try {
      await api('/api/auth/link', { email });
      $('#t-signin-form').hidden = true;
      sentTo = email;
      $('#t-signin-text').textContent = tx('checkInbox', { email });
    } catch (err) {
      toast(err.message, true);
    }
    btn.disabled = false;
  });

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) TJ.scrollTo(el.getBoundingClientRect().top + scrollY - 24);
  }

  /* ---------- history ---------- */
  function card(it) {
    const ratio = it.width && it.height ? `${it.width} / ${it.height}` : ratioCss(it.aspect_ratio);
    let media;
    if (it.image) media = `<a class="hcard__img" href="${esc(it.image)}" target="_blank" rel="noopener" aria-label="${esc(tx('openFull'))}"><img src="${esc(it.image)}" alt="" loading="lazy" onload="this.parentNode.parentNode.classList.add('is-loaded')"></a>`;
    else if (it.status === 'failed') media = `<span class="hcard__state mono">${esc(I18N.failText(it.error))}</span>`;
    else media = `<span class="hcard__state mono">${esc(tx(it.status === 'queued' ? 'queued' : 'generating'))}<i class="hcard__dots" aria-hidden="true"></i></span>`;
    const acts = [
      it.image ? `<a class="linkbtn" href="${esc(it.image)}?download=1">${esc(tx('download'))}</a>` : '',
      `<button class="linkbtn" type="button" data-reuse="${esc(it.id)}">${esc(tx('reuse'))}</button>`,
    ].join('');
    return `<article class="hcard is-${esc(it.status)}" data-id="${esc(it.id)}">
      <div class="hcard__media" style="aspect-ratio:${ratio}">${media}</div>
      <div class="hcard__meta"><span>${esc(it.model_name)}</span><span class="mono">${esc(it.resolution)} // ${esc(it.aspect_ratio)} // ${esc(it.status === 'failed' ? tx('refundedTag') : tx('costPts', { n: it.points }))}</span></div>
      <p class="hcard__prompt">${esc(it.prompt)}</p>
      <div class="hcard__acts">${acts}</div>
    </article>`;
  }

  function renderHist() {
    // keep cards whose state didn't change, so loaded images don't flash
    const old = new Map([...hist.children].map((el) => [el.dataset.id, el]));
    const frag = document.createDocumentFragment();
    items.forEach((it) => {
      const key = `${I18N.lang}|${it.status}|${it.image || ''}|${it.error || ''}`;
      let el = old.get(it.id);
      if (!el || el.dataset.key !== key) {
        const t = document.createElement('template');
        t.innerHTML = card(it).trim();
        el = t.content.firstChild;
        el.dataset.key = key;
      }
      frag.appendChild(el);
    });
    hist.replaceChildren(frag);
    $('#t-hist-empty').hidden = items.length > 0;
    $('#t-hist-n').textContent = items.length ? `${items.length}${more ? '+' : ''}` : '';
    $('#t-more').hidden = !more;
  }

  hist.addEventListener('click', (e) => {
    const b = e.target.closest('[data-reuse]');
    if (!b) return;
    const it = items.find((x) => x.id === b.dataset.reuse);
    if (!it) return;
    if (cat.models.some((m) => m.id === it.model)) {
      sel = { model: it.model, resolution: it.resolution, aspect: it.aspect_ratio };
      modelSel.value = sel.model;
      fillSpecs();
    }
    promptEl.value = it.prompt;
    store.set('draft', it.prompt);
    paintCost();
    scrollToId('t-form');
    promptEl.focus({ preventScroll: true });
  });

  async function loadHist(append) {
    if (!me.email) return;
    const last = items[items.length - 1];
    try {
      const { items: got } = await api(`/api/generations${append && last ? `?before=${last.created_at}` : ''}`);
      items = append ? items.concat(got) : got;
      more = got.length === 30;
      renderHist();
      schedulePoll(3000);
    } catch (err) {
      if (err.status === 401) signedOut();
    }
  }
  $('#t-more').addEventListener('click', () => loadHist(true));

  function schedulePoll(ms) {
    clearTimeout(pollTimer);
    if (items.some(isOpen)) pollTimer = setTimeout(poll, ms);
  }

  async function poll() {
    let finished = false;
    for (const it of items.filter(isOpen)) {
      try {
        const next = await api(`/api/generations/${it.id}`);
        Object.assign(it, next);
        if (!isOpen(next)) {
          finished = true;
          if (next.status === 'failed') toast(I18N.failText(next.error || 'Generation failed. Points refunded.'), true);
        }
      } catch (err) {
        if (err.status === 401) { signedOut(); return; }
      }
    }
    renderHist();
    if (finished) loadMe();
    schedulePoll(3000);
  }

  /* ---------- packs ---------- */
  function fillPacks() {
    const low = Math.min(...cat.models.flatMap((m) => [...Object.values(m.specs), ...Object.values(m.over || {})]));
    $('#t-pack-row').innerHTML = cat.packs.map((p) => {
      const bonus = p.points - p.cents; // 1 point = 1 cent
      return `<button class="pack" type="button" data-pack="${esc(p.id)}">
        <span class="pack__pts">${p.points.toLocaleString('en')}<small>${esc(tx('packPts'))}</small></span>
        <span class="pack__bonus mono">${esc(bonus > 0 ? tx('bonus', { n: bonus.toLocaleString('en') }) : tx('baseRate'))}</span>
        <span class="pack__foot"><span class="pack__price">$${(p.cents / 100).toLocaleString('en')}</span><span class="mono">${I18N.t('packFoot', { n: Math.floor(p.points / low).toLocaleString('en'), p: low })}</span></span>
      </button>`;
    }).join('');
    $('#t-pack-note').textContent = tx('packNote', { d: cat.point_days });
  }

  $('#t-pack-row').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pack]');
    if (!b) return;
    if (!me.email) { openSignin(); return; }
    b.disabled = true;
    try {
      const { url } = await api('/api/checkout', { pack: b.dataset.pack });
      location.href = url;
    } catch (err) {
      if (err.status === 401) signedOut();
      toast(err.message, true);
      b.disabled = false;
    }
  });

  // Stripe sent the buyer back; the webhook may not have landed yet, so ask the server to check the session
  async function confirmCheckout() {
    const id = checkoutId;
    checkoutId = null;
    for (let i = 0; i < 6; i++) {
      try {
        const { status } = await api('/api/checkout/confirm', { session_id: id });
        if (status === 'paid') { await loadMe(); toast(tx('pointsAdded')); return; }
      } catch (err) {
        toast(err.message, true);
        return;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    toast(tx('stillProcessing'));
  }

  /* ---------- start ---------- */
  function start() {
    if (started) return started;
    started = (async () => {
      try {
        cat = await api('/api/catalogue');
      } catch (err) {
        form.classList.add('is-off');
        $('#t-note').textContent = tx('offlineNote');
        goBtn.disabled = true;
        started = null; // try again next time the section opens
        return;
      }
      form.classList.remove('is-off');
      promptEl.maxLength = cat.max_prompt;
      fillModels();
      fillSpecs();
      fillPacks();
      if (loginToken) {
        const token = loginToken;
        loginToken = null;
        try { await api('/api/auth/verify', { token }); toast(tx('signedIn')); } catch (err) { toast(err.message, true); }
      }
      await loadMe();
      if (me.email) {
        await loadHist(false);
        if (checkoutId) confirmCheckout();
      }
    })();
    return started;
  }

  renderHist();
  document.addEventListener('tj:lang', () => {
    $('#t-signin-text').textContent = sentTo ? tx('checkInbox', { email: sentTo }) : tx('signinText');
    if (form.classList.contains('is-off')) $('#t-note').textContent = tx('offlineNote');
    paintAccount();
    renderHist();
    if (!cat) return;
    fillModels();
    fillSpecs();
    fillPacks();
  });
  document.addEventListener('tj:view', (e) => { if (e.detail === 'studio') start(); });
  // detail: a prompt, or { prompt, model, aspect } from a gallery work; model is matched by name
  document.addEventListener('tj:prefill', async (e) => {
    const d = typeof e.detail === 'string' ? { prompt: e.detail } : e.detail || {};
    promptEl.value = d.prompt || '';
    store.set('draft', promptEl.value);
    await start();
    if (cat) {
      const key = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const m = d.model && cat.models.find((x) => key(x.name) === key(d.model));
      if (m) sel.model = m.id;
      if (d.aspect && model().aspects.includes(d.aspect)) sel.aspect = d.aspect;
      fillModels();
      fillSpecs();
    }
    paintCost();
    setTimeout(() => promptEl.focus({ preventScroll: true }), 900);
  });
  if (loginToken || checkoutId) start();
})();
