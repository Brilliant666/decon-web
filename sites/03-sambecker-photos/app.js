/**
 * app.js — Specimen #03: Sam Becker Photos (photos.sambecker.com) 1:1 Controller
 */

import {
  CURATED_PHOTOS,
  CAMERAS,
  FILM_RECIPES,
  getFilmRecipeById
} from './catalog.js';

import {
  createExifPlate,
  parseExif,
  extractColorPalette,
  createCompositionOverlay,
  createOpticalLoupe,
  createCommandPalette,
  createShutterAudio
} from '/shared-ui/photo-vault-ui.js';

const THEMES = ['gallery-light', 'obsidian-dark', 'warm-contact'];
const THEME_LABELS = {
  'gallery-light': { icon: '☀', text: 'LIGHT' },
  light: { icon: '☀', text: 'LIGHT' },
  'obsidian-dark': { icon: '☾', text: 'DARK' },
  dark: { icon: '☾', text: 'DARK' },
  'warm-contact': { icon: '◐', text: 'WARM' }
};

const state = {
  photos: [...CURATED_PHOTOS],
  view: 'full', // 'full' | 'grid' | 'library'
  sortBy: 'newest', // 'newest' | 'oldest' | 'color'
  theme: localStorage.getItem('sb_theme') || 'gallery-light',
  proMode: localStorage.getItem('sb_pro_mode') === 'true',
  filter: null, // { kind: 'camera'|'lens'|'recipe'|'film'|'focal'|'tag', value: string, label: string }
  guideMode: 'off',
  loupeEnabled: false,
  lightboxIndex: -1,
  stageControllers: [],
  pendingIngest: null
};

const urlTheme = new URLSearchParams(window.location.search).get('theme');
if (urlTheme === 'dark' || urlTheme === 'light') {
  state.theme = urlTheme;
}

const shutterAudio = createShutterAudio();
let cmdPalette = null;
let lbOverlayCtrl = null;
let lbLoupeCtrl = null;

function playProShutter() {
  if (state.proMode) shutterAudio.playShutter();
}

function playProAperture() {
  if (state.proMode) shutterAudio.playApertureClick();
}

function showToast(msg) {
  const el = document.getElementById('sbToast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    el.hidden = true;
  }, 2200);
}

function getFilteredAndSortedPhotos() {
  let list = [...state.photos];

  if (state.filter) {
    const { kind, value } = state.filter;
    const norm = String(value).toLowerCase();
    list = list.filter((p) => {
      if (kind === 'camera') {
        return (
          (p.cameraId && p.cameraId.toLowerCase() === norm) ||
          `${p.make} ${p.model}`.toLowerCase().includes(norm)
        );
      }
      if (kind === 'lens') {
        return (
          (p.lensSlug && p.lensSlug.toLowerCase() === norm) ||
          (p.lensModel && p.lensModel.toLowerCase() === norm)
        );
      }
      if (kind === 'recipe') {
        return (
          (p.recipeTitle && p.recipeTitle.toLowerCase() === norm) ||
          (p.recipeLabel && p.recipeLabel.toLowerCase() === norm)
        );
      }
      if (kind === 'film') {
        return (
          (p.film && p.film.toLowerCase() === norm) ||
          (p.filmLabel && p.filmLabel.toLowerCase() === norm)
        );
      }
      if (kind === 'focal') {
        return (
          (p.focalLengthFormatted && p.focalLengthFormatted.toLowerCase() === norm) ||
          `${Math.round(p.focalLength || 0)}mm` === norm
        );
      }
      if (kind === 'tag') {
        return (p.tags || []).some((t) => t.toLowerCase() === norm);
      }
      return true;
    });
  }

  if (state.sortBy === 'oldest') {
    list.sort((a, b) => new Date(a.takenAt || 0) - new Date(b.takenAt || 0));
  } else if (state.sortBy === 'color') {
    list.sort((a, b) => (a.colorData?.ai?.h || 0) - (b.colorData?.ai?.h || 0));
  } else {
    list.sort((a, b) => new Date(b.takenAt || 0) - new Date(a.takenAt || 0));
  }

  return list;
}

function applyTheme(themeName) {
  const normalized =
    themeName === 'dark'
      ? 'obsidian-dark'
      : themeName === 'light'
        ? 'gallery-light'
        : themeName;
  state.theme = THEMES.includes(normalized) ? normalized : 'gallery-light';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('sb_theme', state.theme);

  const info = THEME_LABELS[state.theme];
  const iconEl = document.getElementById('cornerThemeIcon');
  const textEl = document.getElementById('cornerThemeText');
  const lbIconEl = document.getElementById('lbThemeIcon');
  const lbTextEl = document.getElementById('lbThemeText');
  const footerLbl = document.getElementById('footerThemeLabel');
  if (iconEl) iconEl.textContent = info.icon;
  if (textEl) textEl.textContent = info.text;
  if (lbIconEl) lbIconEl.textContent = info.icon;
  if (lbTextEl) lbTextEl.textContent = info.text;
  if (footerLbl) footerLbl.textContent = info.text;
}

function cycleTheme() {
  const next = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];
  applyTheme(next);
  playProAperture();
}

function updateToolLabels() {
  const lblGuide = document.getElementById('lblGuideMode');
  const lblLoupe = document.getElementById('lblLoupeMode');
  const lbGuide = document.getElementById('lbBtnGuide');
  const lbLoupe = document.getElementById('lbBtnLoupe');

  if (lblGuide) lblGuide.textContent = state.guideMode.toUpperCase();
  if (lblLoupe) lblLoupe.textContent = state.loupeEnabled ? '2.5× ON' : 'OFF';

  if (lbGuide) {
    lbGuide.textContent = `Guides: ${state.guideMode.toUpperCase()}`;
    lbGuide.classList.toggle('is-active', state.guideMode !== 'off');
  }
  if (lbLoupe) {
    lbLoupe.textContent = `Loupe: ${state.loupeEnabled ? 'ON' : 'OFF'}`;
    lbLoupe.classList.toggle('is-active', state.loupeEnabled);
  }
}

function applyProMode(enabled) {
  state.proMode = Boolean(enabled);
  document.documentElement.setAttribute('data-mode', state.proMode ? 'pro' : 'raw');
  localStorage.setItem('sb_pro_mode', String(state.proMode));

  const proToolbar = document.getElementById('proToolbar');
  if (proToolbar) proToolbar.hidden = !state.proMode;

  const modeBtn = document.getElementById('btnModeToggle');
  const modeTxt = document.getElementById('cornerModeText');
  const lbModeBtn = document.getElementById('lbBtnMode');
  const lbModeTxt = document.getElementById('lbModeText');
  if (modeTxt) modeTxt.textContent = state.proMode ? 'PRO' : 'RAW';
  if (modeBtn) modeBtn.classList.toggle('is-pro', state.proMode);
  if (lbModeTxt) lbModeTxt.textContent = state.proMode ? 'PRO' : 'RAW';
  if (lbModeBtn) lbModeBtn.classList.toggle('is-pro', state.proMode);

  document.querySelectorAll('.pv-exif-plate').forEach((plate) => {
    plate.classList.toggle('is-pro', state.proMode);
  });

  if (!state.proMode) {
    state.guideMode = 'off';
    state.loupeEnabled = false;
    state.stageControllers.forEach(({ compCtrl, loupeCtrl }) => {
      compCtrl?.setMode('off');
      loupeCtrl?.setEnabled(false);
    });
    lbOverlayCtrl?.setMode('off');
    lbLoupeCtrl?.setEnabled(false);
  }
  updateToolLabels();
}

function setFilter(kind, value, label, pushUrl = true) {
  if (!kind || !value) {
    state.filter = null;
    if (pushUrl) history.pushState({}, '', state.view === 'grid' ? '/grid' : '/');
  } else {
    state.filter = { kind, value, label: label || String(value).toUpperCase() };
    if (state.view === 'library') state.view = 'full';
    if (pushUrl) {
      const slug = encodeURIComponent(String(value).toLowerCase().replace(/\s+/g, '-'));
      const prefix =
        kind === 'camera' ? '/shot-on' :
        kind === 'lens' ? '/lens' :
        kind === 'recipe' ? '/recipe' :
        kind === 'film' ? '/film' :
        kind === 'focal' ? '/focal' : '/tag';
      history.pushState({}, '', `${prefix}/${slug}`);
    }
  }
  playProAperture();
  renderActiveView();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function setView(viewName, pushUrl = true) {
  state.view = ['full', 'grid', 'library'].includes(viewName) ? viewName : 'full';
  if (pushUrl) {
    const path = state.view === 'grid' ? '/grid' : state.view === 'library' ? '/library' : '/';
    history.pushState({}, '', path);
  }
  playProAperture();
  renderActiveView();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderFilterBanner(filteredList) {
  const banner = document.getElementById('activeFilterBanner');
  if (!banner) return;
  if (!state.filter) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  document.getElementById('filterKindLabel').textContent = state.filter.kind.toUpperCase();
  document.getElementById('filterValueLabel').textContent = state.filter.label;
  document.getElementById('filterCountLabel').textContent = `× ${filteredList.length}`;
}

function updateTopNavButtons() {
  document.getElementById('btnViewFull')?.classList.toggle('is-active', state.view === 'full');
  document.getElementById('btnViewGrid')?.classList.toggle('is-active', state.view === 'grid');
  document.getElementById('btnViewLibrary')?.classList.toggle('is-active', state.view === 'library');
  const sortDot = document.getElementById('sortActiveDot');
  if (sortDot) sortDot.hidden = state.sortBy === 'newest';
}

/**
 * Fallback Canvas generator only if user is completely offline & uncached
 */
function createOfflineFallbackDataUrl(photo) {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 600;
  const ctx = c.getContext('2d');
  const pal = photo.palette || ['#C88A4B', '#7B4E34', '#D7B66E', '#EDE8D8', '#3B423E'];
  const grad = ctx.createLinearGradient(0, 0, 900, 600);
  grad.addColorStop(0, pal[0] || '#2b303a');
  grad.addColorStop(0.55, pal[1] || '#525b66');
  grad.addColorStop(1, pal[4] || '#14171c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 900, 600);
  return c.toDataURL('image/jpeg', 0.85);
}

/**
 * 1. Render Full View (/) — 1:1 Alternating Odd/Even Floating Canvas + Unlabeled EXIF Sidebar
 */
function renderFullView(photos) {
  const container = document.getElementById('viewFull');
  if (!container) return;
  container.innerHTML = '';
  state.stageControllers = [];

  photos.forEach((photo, idx) => {
    const isEven = idx % 2 === 1;
    const metaSide = isEven ? 'left' : 'right';

    const rowOuter = document.createElement('div');
    rowOuter.className = 'sb-large-row-outer';
    rowOuter.setAttribute('data-photo-large', 'true');

    const blurSrc = photo.blurData || '';
    const imgSrc = photo.url || photo.imageUrl;

    rowOuter.innerHTML = `
      <div class="sb-large-row ${isEven ? 'is-even' : 'is-odd'}">
        <div class="sb-large-photo-col">
          <div class="sb-large-aspect-stage">
            <div class="sb-large-inner-box" data-stage-box>
              <div class="sb-photo-media-wrap" data-media-wrap>
                ${blurSrc ? `<img class="sb-blur-placeholder" src="${blurSrc}" alt="" aria-hidden="true" />` : ''}
                <img
                  class="sb-main-photo-img"
                  data-main-photo
                  src="${imgSrc}"
                  alt="${(photo.semanticDescription || photo.title || '').replace(/"/g, '&quot;')}"
                  loading="${idx < 3 ? 'eager' : 'lazy'}"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="sb-large-meta-col">
          <div class="sb-large-meta-inner" data-meta-slot></div>
        </div>
      </div>
    `;

    container.appendChild(rowOuter);

    const mediaWrap = rowOuter.querySelector('[data-media-wrap]');
    const mainImg = rowOuter.querySelector('[data-main-photo]');
    const metaSlot = rowOuter.querySelector('[data-meta-slot]');

    if (mainImg && mediaWrap) {
      const markLoaded = () => mediaWrap.classList.add('is-loaded');
      if (mainImg.complete && mainImg.naturalWidth > 0) {
        markLoaded();
      } else {
        mainImg.addEventListener('load', markLoaded, { once: true });
        mainImg.addEventListener('error', () => {
          if (photo.blurData) {
            mainImg.src = photo.blurData;
          } else {
            mainImg.src = createOfflineFallbackDataUrl(photo);
          }
          markLoaded();
        }, { once: true });
      }

      mainImg.addEventListener('click', () => {
        if (!state.loupeEnabled) openLightbox(idx);
      });

      const compCtrl = createCompositionOverlay(mediaWrap, { mode: state.guideMode });
      const loupeCtrl = createOpticalLoupe(mediaWrap, mainImg, { enabled: state.loupeEnabled });
      state.stageControllers.push({ compCtrl, loupeCtrl });
    }

    if (metaSlot) {
      const recipeObj = photo.recipeTitle ? getFilmRecipeById(photo.recipeTitle) : null;
      createExifPlate(metaSlot, photo, {
        metaSide,
        recipe: recipeObj,
        proMode: state.proMode,
        onOpenPhoto: () => openLightbox(idx),
        onZoom: () => openLightbox(idx),
        onShare: (p) => {
          const shareUrl = `${window.location.origin}/p/${p.slug || p.id}`;
          if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => {});
          showToast(`Copied link: /p/${p.slug || p.id}`);
        },
        onFilterCamera: (camId, p) => setFilter('camera', camId, p.cameraMakeModel || `${p.make} ${p.model}`),
        onFilterLens: (lensSlug, p) => setFilter('lens', lensSlug, p.lensModel),
        onFilterRecipe: (recSlug, p) => setFilter('recipe', recSlug, p.recipeLabel || recSlug),
        onFilterFilm: (filmSlug, p) => setFilter('film', filmSlug, p.filmLabel || filmSlug),
        onFilterFocal: (focalStr) => setFilter('focal', focalStr, `FOCAL ${focalStr}`),
        onCopyHex: (hex) => showToast(`Copied swatch ${hex}`)
      });
    }
  });
}

/**
 * 2. Render Grid View (/grid) — Borderless 4-Column Square-Cell Adaptive Matrix
 */
function renderGridView(photos) {
  const container = document.getElementById('viewGrid');
  if (!container) return;

  container.innerHTML = `
    <div class="sb-grid-matrix" data-photo-grid="true">
      ${photos
        .map((photo, idx) => {
          const ar = photo.aspectRatio || 1.5;
          const src = photo.url || photo.imageUrl || photo.blurData;
          return `
            <div class="sb-grid-cell">
              <div class="sb-grid-thumb-box" style="--photo-ar:${ar}" data-grid-idx="${idx}" title="${(photo.title || '').replace(/"/g, '&quot;')}">
                <img
                  class="sb-grid-thumb-img"
                  src="${src}"
                  alt="${(photo.semanticDescription || photo.title || '').replace(/"/g, '&quot;')}"
                  loading="${idx < 12 ? 'eager' : 'lazy'}"
                  decoding="async"
                />
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  container.querySelectorAll('[data-grid-idx]').forEach((box) => {
    const img = box.querySelector('img');
    const idx = Number(box.getAttribute('data-grid-idx'));
    const photo = photos[idx];
    if (img && photo) {
      img.addEventListener('error', () => {
        img.src = photo.blurData || createOfflineFallbackDataUrl(photo);
      }, { once: true });
    }
    box.addEventListener('click', () => openLightbox(idx));
  });
}

/**
 * Helper to build a 3D OKLCH Folder Card html for /library
 */
function buildLibraryFolderHtml(kind, value, label, matchingPhotos) {
  const count = matchingPhotos.length;
  const firstAi = matchingPhotos[0]?.colorData?.ai || { l: 0.72, c: 0.12, h: 61 };
  const h = Number(firstAi.h || 61).toFixed(2);
  const c = Math.min(0.08, Math.max(0.03, Number(firstAi.c || 0.06))).toFixed(3);
  const thumbs = [0, 1, 2, 3].map((i) => {
    const p = matchingPhotos[i % matchingPhotos.length];
    return p?.url || p?.blurData || '';
  });

  return `
    <button
      type="button"
      class="sb-folder-item"
      data-lib-kind="${kind}"
      data-lib-val="${String(value).replace(/"/g, '&quot;')}"
      data-lib-label="${String(label).replace(/"/g, '&quot;')}"
    >
      <div class="sb-folder-stage">
        <svg class="sb-folder-back-svg" viewBox="0 0 143 93" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M9.5 0.5H32.49A9 9 0 0 1 38.86 3.14L40.64 4.91A9 9 0 0 0 47 7.55H133.5A9 9 0 0 1 142.5 16.55V83.5A9 9 0 0 1 133.5 92.5H9.5A9 9 0 0 1 0.5 83.5V9.5A9 9 0 0 1 9.5 0.5Z"
            style="fill:oklch(var(--sb-folder-l-fill) ${c} ${h});stroke:oklch(var(--sb-folder-l-stroke) ${c} ${h})"
            stroke-width="1"
          />
        </svg>
        ${thumbs
          .map(
            (src, idx) => `
          <div class="sb-folder-peek sb-folder-peek-${idx}">
            <img src="${src}" alt="" loading="lazy" />
          </div>
        `
          )
          .join('')}
        <div
          class="sb-folder-front"
          style="background:oklch(var(--sb-folder-l-fill) ${c} ${h});border:1px solid oklch(var(--sb-folder-l-stroke) ${c} ${h})"
        >
          ${thumbs
            .map(
              (src) => `
            <div class="sb-folder-front-cell">
              <img src="${src}" alt="" loading="lazy" />
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      <div class="sb-folder-badge-row">
        <span class="sb-folder-pill">${label}</span>
        <span class="sb-folder-count">× ${count}</span>
      </div>
    </button>
  `;
}

/**
 * 3. Render Library View (/library) — Centered Archive & Interactive 3D OKLCH Folders
 */
function renderLibraryView() {
  const container = document.getElementById('viewLibrary');
  if (!container) return;

  const all = state.photos;
  const avatarPhoto = all[0] || {};

  // Group by Cameras, Lenses, Recipes, Films, Focal Lengths, Tags
  const groupBy = (keyFn, labelFn) => {
    const map = new Map();
    for (const p of all) {
      const keys = keyFn(p);
      const arr = Array.isArray(keys) ? keys : keys ? [keys] : [];
      for (const k of arr) {
        if (!k) continue;
        if (!map.has(k)) map.set(k, { value: k, label: labelFn(k, p), items: [] });
        map.get(k).items.push(p);
      }
    }
    return [...map.values()].sort((a, b) => b.items.length - a.items.length);
  };

  const cameraGroups = groupBy((p) => p.cameraId, (_, p) => `${p.make} ${p.model}`);
  const lensGroups = groupBy((p) => p.lensSlug, (_, p) => p.lensModel || 'Prime Lens');
  const recipeGroups = groupBy((p) => p.recipeTitle, (_, p) => p.recipeLabel || p.recipeTitle);
  const filmGroups = groupBy((p) => p.film, (_, p) => p.filmLabel || p.film);
  const focalGroups = groupBy((p) => p.focalLengthFormatted, (k) => k);
  const tagGroups = groupBy((p) => p.tags || [], (k) => `#${k}`);

  const topCamera = cameraGroups[0]?.label || 'FUJIFILM X-T5';
  const topLens = lensGroups[0]?.label || 'XF35mmF1.4 R';
  const topRecipe = recipeGroups[0]?.label || 'Classic Cuban';
  const topFilm = filmGroups[0]?.label || 'CLASSIC NEG.';
  const oldestDate = [...all]
    .map((p) => (p.takenAt || '2025-10-18').slice(0, 10))
    .sort()[0] || '2025-10-18';

  container.innerHTML = `
    <div class="sb-lib-profile-row">
      <span class="sb-lib-avatar">
        <img src="${avatarPhoto.url || avatarPhoto.blurData || ''}" alt="Sam Becker Photos" />
      </span>
      <div class="sb-lib-profile-meta">
        <div>
          <div class="sb-lib-profile-title">Sam Becker Photos</div>
          <div class="sb-lib-profile-sub">Made with exif-photo-blog</div>
        </div>
        <div class="sb-lib-updated">Synced with photos.sambecker.com</div>
      </div>
    </div>

    <div class="sb-lib-bio">
      Still lifes, everyday details, landscapes, street scenes, and nature.<br/><br/>
      Mostly Fujifilm X-T5 with prime lenses (35mm + 90mm), and the occasional iPhone shot.<br/><br/>
      Photos straight-out-of-camera.
    </div>

    <div class="sb-lib-stats-grid">
      <div class="sb-lib-stat-card">
        <div class="sb-lib-stat-label">Photo Count</div>
        <div class="sb-lib-stat-val">${String(all.length).padStart(4, '0')}</div>
      </div>
      <div class="sb-lib-stat-card">
        <div class="sb-lib-stat-label">First Photo</div>
        <div class="sb-lib-stat-val">${oldestDate}</div>
      </div>
      <div class="sb-lib-stat-card">
        <div class="sb-lib-stat-label">Top Camera</div>
        <div class="sb-lib-stat-val sb-lib-stat-link" data-stat-filter="camera" data-stat-val="${cameraGroups[0]?.value || ''}" data-stat-label="${topCamera}">${topCamera}</div>
      </div>
      <div class="sb-lib-stat-card">
        <div class="sb-lib-stat-label">Top Lens</div>
        <div class="sb-lib-stat-val sb-lib-stat-link" data-stat-filter="lens" data-stat-val="${lensGroups[0]?.value || ''}" data-stat-label="${topLens}">${topLens}</div>
      </div>
      <div class="sb-lib-stat-card">
        <div class="sb-lib-stat-label">Top Recipe</div>
        <div class="sb-lib-stat-val sb-lib-stat-link" data-stat-filter="recipe" data-stat-val="${recipeGroups[0]?.value || ''}" data-stat-label="${topRecipe}">${topRecipe}</div>
      </div>
      <div class="sb-lib-stat-card">
        <div class="sb-lib-stat-label">Top Film</div>
        <div class="sb-lib-stat-val sb-lib-stat-link" data-stat-filter="film" data-stat-val="${filmGroups[0]?.value || ''}" data-stat-label="${topFilm}">${topFilm}</div>
      </div>
      <div class="sb-lib-stat-card">
        <div class="sb-lib-stat-label">Popular Tag</div>
        <div class="sb-lib-stat-val sb-lib-stat-link" data-stat-filter="tag" data-stat-val="${tagGroups[0]?.value || 'nature'}" data-stat-label="${tagGroups[0]?.label || '#nature'}">${tagGroups[0]?.label || '#nature'}</div>
      </div>
    </div>

    <div class="sb-lib-section">
      <div class="sb-lib-sec-header">Cameras</div>
      <div class="sb-lib-folder-grid">
        ${cameraGroups.map((g) => buildLibraryFolderHtml('camera', g.value, g.label, g.items)).join('')}
      </div>
    </div>

    <div class="sb-lib-section">
      <div class="sb-lib-sec-header">Lenses</div>
      <div class="sb-lib-folder-grid">
        ${lensGroups.map((g) => buildLibraryFolderHtml('lens', g.value, g.label, g.items)).join('')}
      </div>
    </div>

    <div class="sb-lib-section">
      <div class="sb-lib-sec-header">Fujifilm Recipes</div>
      <div class="sb-lib-folder-grid">
        ${recipeGroups.map((g) => buildLibraryFolderHtml('recipe', g.value, g.label, g.items)).join('')}
      </div>
    </div>

    <div class="sb-lib-section">
      <div class="sb-lib-sec-header">Film Simulations</div>
      <div class="sb-lib-folder-grid">
        ${filmGroups.map((g) => buildLibraryFolderHtml('film', g.value, g.label, g.items)).join('')}
      </div>
    </div>

    <div class="sb-lib-section">
      <div class="sb-lib-sec-header">Focal Lengths</div>
      <div class="sb-lib-folder-grid">
        ${focalGroups.map((g) => buildLibraryFolderHtml('focal', g.value, g.label, g.items)).join('')}
      </div>
    </div>

    <div class="sb-lib-section">
      <div class="sb-lib-sec-header">Tags</div>
      <div class="sb-lib-folder-grid">
        ${tagGroups.map((g) => buildLibraryFolderHtml('tag', g.value, g.label, g.items)).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('[data-lib-kind]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFilter(
        btn.getAttribute('data-lib-kind'),
        btn.getAttribute('data-lib-val'),
        btn.getAttribute('data-lib-label')
      );
    });
  });

  container.querySelectorAll('[data-stat-filter]').forEach((el) => {
    el.addEventListener('click', () => {
      setFilter(
        el.getAttribute('data-stat-filter'),
        el.getAttribute('data-stat-val'),
        el.getAttribute('data-stat-label')
      );
    });
  });
}

function renderActiveView() {
  const fullEl = document.getElementById('viewFull');
  const gridEl = document.getElementById('viewGrid');
  const libEl = document.getElementById('viewLibrary');

  const filtered = getFilteredAndSortedPhotos();
  renderFilterBanner(filtered);
  updateTopNavButtons();

  if (state.view === 'library') {
    fullEl.hidden = true;
    gridEl.hidden = true;
    libEl.hidden = false;
    renderLibraryView();
  } else if (state.view === 'grid') {
    fullEl.hidden = true;
    gridEl.hidden = false;
    libEl.hidden = true;
    renderGridView(filtered);
  } else {
    fullEl.hidden = false;
    gridEl.hidden = true;
    libEl.hidden = true;
    renderFullView(filtered);
  }
}

/**
 * Lightbox Controller
 */
function openLightbox(index) {
  const list = getFilteredAndSortedPhotos();
  if (!list.length) return;
  if (state.lightboxIndex < 0 && !window.location.pathname.startsWith('/p/')) {
    state.returnUrl = window.location.pathname;
  }
  state.lightboxIndex = (index + list.length) % list.length;
  const photo = list[state.lightboxIndex];

  const modal = document.getElementById('lightboxModal');
  const img = document.getElementById('lbImage');
  const counter = document.getElementById('lbCounter');
  const metaPlate = document.getElementById('lbMetaPlate');
  const stage = document.getElementById('lbStage');

  if (!modal || !img || !metaPlate) return;
  modal.hidden = false;
  history.replaceState({}, '', `/p/${photo.slug || photo.id}`);
  playProShutter();

  img.src = photo.url || photo.imageUrl || photo.blurData;
  img.alt = photo.title || '';
  if (counter) {
    counter.textContent = `${String(state.lightboxIndex + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
  }

  const recipeObj = photo.recipeTitle ? getFilmRecipeById(photo.recipeTitle) : null;
  createExifPlate(metaPlate, photo, {
    metaSide: 'right',
    recipe: recipeObj,
    proMode: state.proMode,
    recipeExpanded: false,
    onShare: (p) => {
      const shareUrl = `${window.location.origin}/p/${p.slug || p.id}`;
      if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => {});
      showToast(`Copied link: /p/${p.slug || p.id}`);
    },
    onCopyHex: (hex) => showToast(`Copied swatch ${hex}`),
    onFilterCamera: (camId, p) => {
      closeLightbox();
      setFilter('camera', camId, p.cameraMakeModel);
    },
    onFilterLens: (lensSlug, p) => {
      closeLightbox();
      setFilter('lens', lensSlug, p.lensModel);
    },
    onFilterRecipe: (recSlug, p) => {
      closeLightbox();
      setFilter('recipe', recSlug, p.recipeLabel || recSlug);
    },
    onFilterFilm: (filmSlug, p) => {
      closeLightbox();
      setFilter('film', filmSlug, p.filmLabel || filmSlug);
    },
    onFilterFocal: (focalStr) => {
      closeLightbox();
      setFilter('focal', focalStr, `FOCAL ${focalStr}`);
    }
  });

  if (stage) {
    if (!lbOverlayCtrl) lbOverlayCtrl = createCompositionOverlay(stage, { mode: state.guideMode });
    else lbOverlayCtrl.setMode(state.guideMode);
    if (!lbLoupeCtrl) lbLoupeCtrl = createOpticalLoupe(stage, img, { enabled: state.loupeEnabled });
    else lbLoupeCtrl.setEnabled(state.loupeEnabled);
  }
  updateToolLabels();
}

function closeLightbox() {
  const modal = document.getElementById('lightboxModal');
  if (modal) modal.hidden = true;
  state.lightboxIndex = -1;
  const fallbackUrl = state.view === 'grid' ? '/grid' : state.view === 'library' ? '/library' : '/';
  history.replaceState({}, '', state.returnUrl || fallbackUrl);
}

/**
 * Command Palette (⌘K) Setup
 */
function buildCommandItems() {
  const items = [
    { label: 'View: Full Feed (/)', meta: 'V', section: 'VIEWS & ACTIONS', category: 'NAVIGATION', action: () => setView('full') },
    { label: 'View: Grid Matrix (/grid)', meta: 'V', section: 'VIEWS & ACTIONS', category: 'NAVIGATION', action: () => setView('grid') },
    { label: 'View: Archive Library (/library)', meta: 'V', section: 'VIEWS & ACTIONS', category: 'NAVIGATION', action: () => setView('library') },
    { label: 'Clear Active Filter', meta: 'ALL', section: 'VIEWS & ACTIONS', category: 'FILTER', action: () => setFilter(null, null) },
    { label: 'Toggle Theme (Light / Dark / Warm)', meta: 'T', section: 'VIEWS & ACTIONS', category: 'APPEARANCE', action: () => cycleTheme() },
    { label: 'Toggle RAW 1:1 / PRO Darkroom Mode', meta: 'P', section: 'VIEWS & ACTIONS', category: 'TELEMETRY', action: () => applyProMode(!state.proMode) }
  ];

  for (const c of CAMERAS) {
    items.push({
      label: `Camera: ${c.fullName}`,
      meta: c.lens,
      section: 'CAMERAS',
      category: 'CAMERA',
      action: () => setFilter('camera', c.id, c.fullName)
    });
  }

  for (const r of FILM_RECIPES) {
    items.push({
      label: `Recipe: ${r.name}`,
      meta: `${r.baseSimulation} · ${r.wbLabel}`,
      section: 'FUJIFILM RECIPES',
      category: 'FUJIFILM RECIPE',
      action: () => setFilter('recipe', r.id, r.name)
    });
  }

  for (const p of state.photos) {
    items.push({
      label: p.title,
      thumb: p.blurData || p.url,
      meta: `${p.make} ${p.model} · ${p.focalLengthFormatted} ${p.fNumberFormatted} · ${p.filmLabel || ''}`,
      section: 'PHOTOS',
      category: `PHOTO #${String(p.index).padStart(2, '0')}`,
      keywords: [
        ...(p.tags || []),
        p.semanticDescription,
        p.caption,
        p.lensModel,
        p.recipeLabel,
        p.filmLabel,
        p.takenAtNaiveFormatted
      ].filter(Boolean).join(' '),
      action: () => {
        const list = getFilteredAndSortedPhotos();
        const idx = list.findIndex((x) => x.id === p.id);
        openLightbox(idx >= 0 ? idx : 0);
      }
    });
  }

  return items;
}

/**
 * Parse initial browser URL into view / filter state
 */
function syncRouteFromPathname() {
  const p = window.location.pathname;
  if (p === '/grid') {
    state.view = 'grid';
  } else if (p === '/library') {
    state.view = 'library';
  } else if (p.startsWith('/p/')) {
    const slug = decodeURIComponent(p.slice(3));
    state.view = 'full';
    setTimeout(() => {
      const list = getFilteredAndSortedPhotos();
      const idx = list.findIndex((item) => item.id === slug || item.slug === slug);
      if (idx >= 0) openLightbox(idx);
    }, 60);
  } else if (p.startsWith('/shot-on/') || p.startsWith('/camera/')) {
    const val = decodeURIComponent(p.split('/').slice(2).join('-'));
    state.filter = { kind: 'camera', value: val, label: val.toUpperCase() };
  } else if (p.startsWith('/lens/')) {
    const val = decodeURIComponent(p.split('/').pop());
    state.filter = { kind: 'lens', value: val, label: val.toUpperCase() };
  } else if (p.startsWith('/recipe/')) {
    const val = decodeURIComponent(p.split('/').pop());
    state.filter = { kind: 'recipe', value: val, label: val.replace(/-/g, ' ').toUpperCase() };
  } else if (p.startsWith('/film/')) {
    const val = decodeURIComponent(p.split('/').pop());
    state.filter = { kind: 'film', value: val, label: val.toUpperCase() };
  } else if (p.startsWith('/focal/')) {
    const val = decodeURIComponent(p.split('/').pop());
    state.filter = { kind: 'focal', value: val, label: `FOCAL ${val.toUpperCase()}` };
  } else if (p.startsWith('/tag/')) {
    const val = decodeURIComponent(p.split('/').pop());
    state.filter = { kind: 'tag', value: val, label: `#${val.toUpperCase()}` };
  } else {
    state.view = 'full';
  }
}

/**
 * Local Drag-and-Drop JPEG Ingest Setup
 */
function initIngestWorkflow() {
  const modal = document.getElementById('ingestModal');
  const openBtn = document.getElementById('btnOpenIngest');
  const closeBtn = document.getElementById('btnCloseIngest');
  const fileInput = document.getElementById('ingestFileInput');
  const dropzone = document.getElementById('ingestDropzone');
  const previewWrap = document.getElementById('ingestPreview');
  const prevImg = document.getElementById('ingestPrevImg');
  const titleInput = document.getElementById('ingestTitleInput');
  const exifReadout = document.getElementById('ingestExifReadout');
  const submitBtn = document.getElementById('btnSubmitIngest');

  async function handleFile(file) {
    if (!file) return;
    const arrayBuf = await file.arrayBuffer();
    const exif = parseExif(arrayBuf);
    const dataUrl = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });

    prevImg.src = dataUrl;
    await new Promise((r) => {
      prevImg.onload = r;
      prevImg.onerror = r;
    });

    const { palette, exposureStats } = extractColorPalette(prevImg, 5);
    const cleanTitle = file.name.replace(/\.(jpe?g|png|webp)$/i, '').replace(/[-_]+/g, ' ').toUpperCase();
    titleInput.value = cleanTitle;
    exifReadout.textContent = `${exif.camera} · ${exif.lens} · ${exif.focalLength} (${exif.focalLength35mm} eq) · ${exif.aperture} · ${exif.shutterSpeed} · ${exif.iso}`;
    previewWrap.hidden = false;

    state.pendingIngest = {
      filename: file.name,
      dataUrl,
      exif,
      palette,
      exposureStats,
      width: prevImg.naturalWidth || 1200,
      height: prevImg.naturalHeight || 800,
      aspectRatio: Number(((prevImg.naturalWidth || 1200) / (prevImg.naturalHeight || 800)).toFixed(4))
    };
  }

  openBtn?.addEventListener('click', () => {
    modal.hidden = false;
  });
  closeBtn?.addEventListener('click', () => {
    modal.hidden = true;
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });
  fileInput?.addEventListener('change', (e) => handleFile(e.target.files?.[0]));

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  submitBtn?.addEventListener('click', async () => {
    if (!state.pendingIngest) return;
    const recipeSlug = document.getElementById('ingestRecipeSelect')?.value || 'classic-cuban';
    const tagsRaw = document.getElementById('ingestTagsInput')?.value || 'ingested, local';
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      const resp = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...state.pendingIngest,
          title: titleInput.value.trim() || 'INGESTED FRAME',
          recipeTitle: recipeSlug,
          recipeLabel: recipeSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          tags
        })
      });
      const res = await resp.json();
      if (res.ok && res.photo) {
        state.photos.unshift(res.photo);
        cmdPalette?.setItems(buildCommandItems());
        modal.hidden = true;
        previewWrap.hidden = true;
        state.pendingIngest = null;
        playProShutter();
        renderActiveView();
        showToast(`Ingested "${res.photo.title}" into Local Vault`);
      }
    } catch (err) {
      showToast(`Ingest error: ${err.message}`);
    }
  });
}

async function loadPersistedUserPhotos() {
  try {
    const resp = await fetch('/api/user-photos');
    if (!resp.ok) return;
    const data = await resp.json();
    if (Array.isArray(data.items) && data.items.length) {
      state.photos = [...data.items, ...CURATED_PHOTOS];
      cmdPalette?.setItems(buildCommandItems());
      renderActiveView();
    }
  } catch (_) {}
}

function cycleGuideMode() {
  const modes = ['off', 'thirds', 'phi', 'diagonals', 'center'];
  state.guideMode = modes[(modes.indexOf(state.guideMode) + 1) % modes.length];
  state.stageControllers.forEach(({ compCtrl }) => compCtrl?.setMode(state.guideMode));
  lbOverlayCtrl?.setMode(state.guideMode);
  updateToolLabels();
  playProAperture();
}

function toggleLoupeMode() {
  state.loupeEnabled = !state.loupeEnabled;
  state.stageControllers.forEach(({ loupeCtrl }) => loupeCtrl?.setEnabled(state.loupeEnabled));
  lbLoupeCtrl?.setEnabled(state.loupeEnabled);
  updateToolLabels();
  playProAperture();
}

function initEventListeners() {
  // Sticky Header scroll border
  const stickyHeader = document.getElementById('stickyHeader');
  window.addEventListener(
    'scroll',
    () => {
      if (stickyHeader) {
        stickyHeader.classList.toggle('is-scrolled', window.scrollY > 8);
      }
    },
    { passive: true }
  );

  // Top Nav links
  document.getElementById('navHomeLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    state.filter = null;
    setView('full');
  });
  document.getElementById('btnViewFull')?.addEventListener('click', (e) => {
    e.preventDefault();
    setView('full');
  });
  document.getElementById('btnViewGrid')?.addEventListener('click', (e) => {
    e.preventDefault();
    setView('grid');
  });
  document.getElementById('btnViewLibrary')?.addEventListener('click', (e) => {
    e.preventDefault();
    setView('library');
  });

  // Sort Popover
  const sortBtn = document.getElementById('btnSortMenu');
  const sortPopover = document.getElementById('sortPopover');
  sortBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    sortPopover.hidden = !sortPopover.hidden;
  });
  document.addEventListener('click', () => {
    if (sortPopover) sortPopover.hidden = true;
  });
  sortPopover?.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-sort]');
    if (!opt) return;
    state.sortBy = opt.getAttribute('data-sort');
    sortPopover.querySelectorAll('.sb-sort-option').forEach((btn) => {
      const active = btn.getAttribute('data-sort') === state.sortBy;
      btn.classList.toggle('is-active', active);
      btn.querySelector('.sb-sort-check').textContent = active ? '✓' : '';
    });
    sortPopover.hidden = true;
    playProAperture();
    renderActiveView();
  });

  // Clear Filter
  document.getElementById('btnClearFilter')?.addEventListener('click', () => setFilter(null, null));

  // Search / Command Palette
  cmdPalette = createCommandPalette(buildCommandItems(), (item) => {
    if (item && typeof item.action === 'function') item.action();
  });
  document.getElementById('btnSearchCmd')?.addEventListener('click', () => cmdPalette.open());

  // Theme & RAW/PRO Topbar Controls
  document.getElementById('btnThemeCycle')?.addEventListener('click', cycleTheme);
  document.getElementById('footerThemeBtn')?.addEventListener('click', cycleTheme);
  document.getElementById('btnModeToggle')?.addEventListener('click', () => {
    applyProMode(!state.proMode);
    playProAperture();
    showToast(state.proMode ? 'PRO Darkroom Telemetry Enabled' : 'RAW 1:1 Sam Becker View');
  });

  // PRO Workbench Controls
  document.getElementById('btnGuideCycle')?.addEventListener('click', cycleGuideMode);
  document.getElementById('btnLoupeToggle')?.addEventListener('click', toggleLoupeMode);

  document.getElementById('btnAudioToggle')?.addEventListener('click', () => {
    const next = !shutterAudio.isEnabled();
    shutterAudio.setEnabled(next);
    document.getElementById('lblAudioMode').textContent = next ? 'ON' : 'MUTE';
  });

  // Lightbox Controls & Backdrop Click-to-Close
  const lbModal = document.getElementById('lightboxModal');
  lbModal?.addEventListener('click', (e) => {
    if (
      e.target === lbModal ||
      e.target.id === 'lbBody' ||
      e.target.id === 'lbStage'
    ) {
      closeLightbox();
    }
  });
  document.getElementById('lbBtnClose')?.addEventListener('click', closeLightbox);
  document.getElementById('lbBtnPrev')?.addEventListener('click', () => openLightbox(state.lightboxIndex - 1));
  document.getElementById('lbBtnNext')?.addEventListener('click', () => openLightbox(state.lightboxIndex + 1));
  document.getElementById('lbBtnGuide')?.addEventListener('click', cycleGuideMode);
  document.getElementById('lbBtnLoupe')?.addEventListener('click', toggleLoupeMode);
  document.getElementById('lbBtnTheme')?.addEventListener('click', cycleTheme);
  document.getElementById('lbBtnMode')?.addEventListener('click', () => {
    applyProMode(!state.proMode);
    playProAperture();
    showToast(state.proMode ? 'PRO Darkroom Telemetry Enabled' : 'RAW 1:1 Sam Becker View');
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      cmdPalette?.toggle();
      return;
    }

    if (state.lightboxIndex >= 0) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'j') openLightbox(state.lightboxIndex + 1);
      else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'k') openLightbox(state.lightboxIndex - 1);
      else if (e.key.toLowerCase() === 'g') cycleGuideMode();
      else if (e.key.toLowerCase() === 'l') toggleLoupeMode();
      else if (e.key.toLowerCase() === 't') cycleTheme();
      else if (e.key.toLowerCase() === 'p') {
        applyProMode(!state.proMode);
        showToast(state.proMode ? 'PRO Darkroom Telemetry Enabled' : 'RAW 1:1 Sam Becker View');
      }
      return;
    }

    if (e.key.toLowerCase() === 't') {
      cycleTheme();
    } else if (e.key.toLowerCase() === 'p') {
      applyProMode(!state.proMode);
      showToast(state.proMode ? 'PRO Darkroom Telemetry Enabled' : 'RAW 1:1 Sam Becker View');
    } else if (e.key.toLowerCase() === 'v') {
      setView(state.view === 'full' ? 'grid' : state.view === 'grid' ? 'library' : 'full');
    } else if (e.key.toLowerCase() === 'g') {
      cycleGuideMode();
      showToast(`Composition Guide: ${state.guideMode.toUpperCase()}`);
    } else if (e.key.toLowerCase() === 'l') {
      toggleLoupeMode();
      showToast(`Optical Loupe: ${state.loupeEnabled ? 'ON (Hover Photo)' : 'OFF'}`);
    }
  });

  window.addEventListener('popstate', () => {
    syncRouteFromPathname();
    renderActiveView();
  });
}

// Boot Application
applyTheme(state.theme);
syncRouteFromPathname();
initEventListeners();
initIngestWorkflow();
applyProMode(state.proMode);
renderActiveView();
loadPersistedUserPhotos();

/* --- Decon-Web Parent Stage Bridge (Progressive Back / Shortcuts / Top-Left Wake) --- */
if (window.parent && window.parent !== window) {
  const notifyStageBack = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    window.parent.postMessage({ type: 'decon:stage-back' }, '*');
  };

  const handleProgressiveBack = (e, isEscape = false) => {
    // 1. 若全屏灯箱打开，优先关闭灯箱，绝不直接退出子站
    if (!document.getElementById('lightboxModal')?.hidden || state.lightboxIndex >= 0) {
      if (!isEscape) {
        e.preventDefault();
        e.stopPropagation();
        closeLightbox();
      }
      return;
    }
    // 2. 若上传弹窗打开，优先关闭上传弹窗
    const ingestModal = document.getElementById('ingestModal');
    if (ingestModal && !ingestModal.hidden) {
      e.preventDefault();
      e.stopPropagation();
      ingestModal.hidden = true;
      return;
    }
    // 3. 若命令面板打开，优先关闭命令面板
    const cmdBackdrop = document.querySelector('.pv-cmd-backdrop.is-open');
    if (cmdBackdrop) {
      if (!isEscape) {
        e.preventDefault();
        e.stopPropagation();
        cmdPalette?.close?.();
      }
      return;
    }
    // 4. 若当前有筛选条件且按下的是返回快捷键/鼠标侧键，先清除筛选
    if (!isEscape && state.filter !== null) {
      e.preventDefault();
      e.stopPropagation();
      setFilter(null, null);
      return;
    }
    // 5. 无任何内部弹窗时，调用 notifyStageBack 返回总站
    notifyStageBack(e);
  };

  // 1. 捕获键盘返回宏：Escape / BrowserBack / Alt+ArrowLeft / 非输入框 Backspace
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable);
    if (e.key === 'Escape') {
      handleProgressiveBack(e, true);
    } else if (
      e.key === 'BrowserBack' ||
      (e.altKey && e.key === 'ArrowLeft') ||
      (!isInput && e.key === 'Backspace')
    ) {
      handleProgressiveBack(e, false);
    }
  }, true);

  // 2. 捕获鼠标侧键返回（Mouse Button 4 / XButton1: e.button === 3）
  const onMouseBackBtn = (e) => {
    if (e.button === 3) {
      handleProgressiveBack(e, false);
    }
  };
  window.addEventListener('mouseup', onMouseBackBtn, true);
  window.addEventListener('auxclick', onMouseBackBtn, true);

  // 3. 同步左上角指针靠近状态给父窗口（双重保障唤醒左上角 Logo）
  let lastTopLeftState = false;
  window.addEventListener('pointermove', (e) => {
    const inTopLeft = e.clientX <= 260 && e.clientY <= 105;
    if (inTopLeft !== lastTopLeftState) {
      lastTopLeftState = inTopLeft;
      window.parent.postMessage({ type: 'decon:stage-top-left', active: inTopLeft }, '*');
    }
  }, { passive: true });
}
