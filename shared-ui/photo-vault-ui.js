/**
 * shared-ui/photo-vault-ui.js
 *
 * Reusable Zero-Dependency ES6 Component Library for Specimen #03 (photos.sambecker.com)
 *
 * Exported API (8 modules):
 *   1. createExifPlate(el, photo, options)
 *   2. createFilmRecipeCard(el, recipe, options)
 *   3. parseExif(arrayBuffer)
 *   4. extractColorPalette(imgOrCanvas, count)
 *   5. createCompositionOverlay(stageEl, options)
 *   6. createOpticalLoupe(stageEl, imgSource, options)
 *   7. createCommandPalette(items, onSelect, options)
 *   8. createShutterAudio()
 */

let stylesInjected = false;
let globalRecipeCloseBound = false;

function injectVaultStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'photo-vault-ui-styles';
  style.textContent = `
    .pv-exif-plate {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.84375rem;
      line-height: 1.25rem;
      color: var(--sb-text-main, #111111);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
      width: 100%;
      min-width: 0;
      position: relative;
      user-select: none;
    }
    @media (min-width: 768px) {
      .pv-exif-plate.pv-side-left {
        align-items: flex-end;
        text-align: right;
      }
      .pv-exif-plate.pv-side-left .pv-gear-stack,
      .pv-exif-plate.pv-side-left .pv-sub-stack {
        align-items: flex-end;
      }
      .pv-exif-plate.pv-side-left .pv-exposure-line {
        justify-content: flex-end;
      }
      .pv-exif-plate.pv-side-left .pv-action-row {
        justify-content: flex-end;
        transform: translate(2.5px, 0.5px);
      }
    }
    .pv-title-wrap {
      margin-bottom: 0.375rem;
    }
    @media (min-width: 768px) {
      .pv-title-wrap {
        margin-bottom: 1.25rem;
      }
    }
    .pv-photo-title {
      font-family: 'Instrument Serif', Georgia, serif;
      font-size: 1.25rem;
      line-height: 1.2;
      font-weight: 400;
      text-transform: uppercase;
      color: var(--sb-text-main, #111111);
      text-decoration: none;
      transition: opacity 0.15s ease, color 0.15s ease;
      cursor: pointer;
      letter-spacing: 0.01em;
    }
    @media (min-width: 640px) {
      .pv-photo-title {
        font-size: 1.5rem;
      }
    }
    .pv-photo-title:hover {
      opacity: 0.72;
    }
    .pv-gear-stack,
    .pv-sub-stack {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      min-width: 0;
      gap: 0.2rem;
    }
    .pv-sub-stack {
      position: relative;
      margin-top: 0.2rem;
    }
    .pv-meta-row {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      max-width: 100%;
      color: var(--sb-text-medium, #6a7282);
      text-decoration: none;
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      cursor: pointer;
      transition: color 0.15s ease;
    }
    .pv-meta-row:hover {
      color: var(--sb-text-main, #111111);
    }
    .pv-meta-icon {
      width: 14px;
      height: 15px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--sb-text-dim, #99a1af);
      flex-shrink: 0;
      transform: translateY(0.5px);
    }
    .pv-meta-icon-film {
      width: 28px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--sb-text-dim, #99a1af);
      flex-shrink: 0;
    }
    .pv-meta-text {
      text-transform: uppercase;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-decoration-line: none;
      text-decoration-style: dotted;
      text-underline-offset: 4px;
      text-decoration-color: var(--sb-dotted-color, #d1d5dc);
    }
    .pv-meta-row:hover .pv-meta-text {
      text-decoration-line: underline;
    }
    .pv-recipe-line {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      max-width: 100%;
    }
    .pv-recipe-plus-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: none;
      background: var(--sb-bg-dim, #f3f4f6);
      color: var(--sb-text-medium, #6a7282);
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: background 0.15s ease, color 0.15s ease, transform 0.2s ease;
    }
    .pv-recipe-plus-btn:hover {
      background: var(--sb-bg-extra-dim, #e5e7eb);
      color: var(--sb-text-main, #111111);
    }
    .pv-recipe-plus-btn.is-open {
      background: var(--sb-text-main, #111111);
      color: var(--sb-bg-main, #ffffff);
    }
    .pv-recipe-plus-btn.is-open svg {
      transform: rotate(45deg);
    }
    /* Floating Recipe Popover Slot (Never pushes EXIF flow down!) */
    .pv-recipe-pop-slot {
      position: absolute;
      top: calc(100% + 6px);
      z-index: 50;
    }
    .pv-recipe-pop-slot.pv-pop-right {
      left: 0;
    }
    .pv-recipe-pop-slot.pv-pop-left {
      left: 0;
    }
    @media (min-width: 768px) {
      .pv-recipe-pop-slot.pv-pop-left {
        left: auto;
        right: 0;
      }
    }
    .pv-exposure-list {
      list-style: none;
      margin: 0.15rem 0;
      padding: 0;
      color: var(--sb-text-medium, #6a7282);
    }
    .pv-exposure-line {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      line-height: 1.35;
    }
    .pv-focal-btn {
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      color: inherit;
      cursor: pointer;
      text-decoration-style: dotted;
      text-underline-offset: 3px;
      position: relative;
    }
    .pv-focal-btn:hover {
      color: var(--sb-text-main, #111111);
      text-decoration-line: underline;
    }
    .pv-focal-35eq {
      font-size: 0.72rem;
      color: var(--sb-text-dim, #99a1af);
      margin-left: 0.2rem;
    }
    .pv-timestamp-pill {
      display: inline-block;
      font-size: 0.78rem;
      text-transform: uppercase;
      white-space: nowrap;
      color: var(--sb-text-dim, #99a1af);
      margin-top: 0.1rem;
      letter-spacing: 0.01em;
    }
    .pv-oklch-wrap {
      display: inline-flex;
      align-items: center;
      height: 1.6rem;
    }
    .pv-oklch-strip {
      display: inline-flex;
      height: 3px;
      overflow: hidden;
      border-radius: 0.5px;
    }
    .pv-oklch-main {
      width: 70px;
      height: 100%;
      flex-shrink: 0;
    }
    .pv-oklch-sub {
      width: 6px;
      height: 100%;
      flex-shrink: 0;
    }
    .pv-action-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      transform: translate(-2.5px, 0.5px);
      margin-top: 0.1rem;
    }
    .pv-action-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--sb-text-medium, #6a7282);
      cursor: pointer;
      transition: color 0.15s ease;
    }
    .pv-action-icon-btn:hover {
      color: var(--sb-text-main, #111111);
    }

    /* Frosted Dark Fujifilm Recipe Popup Card (1:1 sambecker/exif-photo-blog) */
    .pv-recipe-popover {
      width: 276px;
      max-width: 90vw;
      background: rgba(12, 13, 16, 0.90);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: #f3f4f6;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.72rem;
      line-height: 1.35;
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.42);
      text-align: left;
    }
    .pv-recipe-pop-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem;
      padding-bottom: 0.45rem;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }
    .pv-recipe-pop-title {
      font-weight: 700;
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pv-recipe-pop-badges {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      flex-shrink: 0;
    }
    .pv-recipe-pop-sim {
      font-size: 0.62rem;
      padding: 0.1rem 0.34rem;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.12);
      color: #e5e7eb;
      text-transform: uppercase;
    }
    .pv-recipe-copy-btn {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.6rem;
      padding: 0.1rem 0.36rem;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(255, 255, 255, 0.08);
      color: #f9fafb;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .pv-recipe-copy-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .pv-recipe-pop-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.35rem;
      margin-bottom: 0.45rem;
    }
    .pv-recipe-pop-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.35rem;
      margin-bottom: 0.45rem;
    }
    .pv-recipe-cell {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 4px;
      padding: 0.25rem 0.4rem;
      display: flex;
      flex-direction: column;
    }
    .pv-recipe-cell-k {
      font-size: 0.58rem;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pv-recipe-cell-v {
      font-size: 0.7rem;
      color: #f9fafb;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pv-recipe-visual-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem;
      margin-top: 0.45rem;
      padding-top: 0.45rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .pv-recipe-vis-box {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      padding: 0.3rem;
    }
    .pv-recipe-vis-label {
      font-size: 0.55rem;
      color: #9ca3af;
      text-transform: uppercase;
      margin-bottom: 0.2rem;
      display: flex;
      justify-content: space-between;
    }

    /* PRO Mode Telemetry Drawer (Floating out-of-flow so CLS = 0) */
    .pv-pro-drawer {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 200px;
      padding: 0.45rem 0.55rem;
      border: 1px dashed var(--sb-border-color, rgba(150, 150, 150, 0.28));
      border-radius: 0.4rem;
      background: color-mix(in srgb, var(--sb-bg-main, #ffffff) 92%, transparent);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      text-align: left;
      z-index: 25;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateY(-4px);
      transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s;
    }
    @media (min-width: 768px) {
      .pv-exif-plate.pv-side-left .pv-pro-drawer {
        left: auto;
        right: 0;
      }
    }
    html[data-mode="pro"] .pv-pro-drawer,
    .pv-exif-plate.is-pro .pv-pro-drawer {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translateY(0);
    }
    .pv-pro-label {
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--sb-text-dim, #99a1af);
      margin-bottom: 0.25rem;
      display: flex;
      justify-content: space-between;
    }
    .pv-pro-hist {
      width: 100%;
      height: 36px;
      display: block;
      background: var(--sb-bg-dim, rgba(128,128,128,0.08));
      border-radius: 3px;
      margin-bottom: 0.35rem;
    }
    .pv-pro-swatches {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 3px;
    }
    .pv-pro-swatch {
      height: 16px;
      border-radius: 2px;
      border: 1px solid rgba(128,128,128,0.25);
      cursor: pointer;
      padding: 0;
      transition: transform 0.12s ease;
    }
    .pv-pro-swatch:hover {
      transform: translateY(-1px);
    }

    /* Optical Loupe */
    .pv-optical-loupe {
      position: absolute;
      width: 176px;
      height: 176px;
      border-radius: 50%;
      border: 1.5px solid rgba(255, 255, 255, 0.85);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), inset 0 0 12px rgba(0, 0, 0, 0.35);
      pointer-events: none;
      z-index: 35;
      overflow: hidden;
      display: none;
      transform: translate(-50%, -50%);
      background: #000;
    }
    .pv-optical-loupe.is-visible {
      display: block;
    }
    .pv-loupe-hud {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.78);
      color: #f3f4f6;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 99px;
      white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* Composition Overlay */
    .pv-comp-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 22;
    }

    /* Command Palette (⌘K) */
    .pv-cmd-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 9999;
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding-top: 11vh;
    }
    .pv-cmd-backdrop.is-open {
      display: flex;
    }
    .pv-cmd-modal {
      width: min(600px, 92vw);
      background: var(--sb-bg-main, #ffffff);
      color: var(--sb-text-main, #111111);
      border: 1px solid var(--sb-border-color, #e5e7eb);
      border-radius: 0.5rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      font-family: 'IBM Plex Mono', monospace;
    }
    .pv-cmd-input-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--sb-border-color, #e5e7eb);
    }
    .pv-cmd-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--sb-text-main, #111111);
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.875rem;
    }
    .pv-cmd-list {
      max-height: 380px;
      overflow-y: auto;
      padding: 0.4rem;
    }
    .pv-cmd-section {
      padding: 0.45rem 0.65rem 0.2rem;
      font-size: 0.66rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--sb-text-dim, #99a1af);
    }
    .pv-cmd-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.45rem 0.65rem;
      border-radius: 0.35rem;
      cursor: pointer;
      font-size: 0.8125rem;
    }
    .pv-cmd-item-left {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-width: 0;
    }
    .pv-cmd-thumb {
      width: 28px;
      height: 20px;
      border-radius: 2px;
      object-fit: cover;
      flex-shrink: 0;
      background: var(--sb-bg-dim, #f3f4f6);
    }
    .pv-cmd-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pv-cmd-item.is-active,
    .pv-cmd-item:hover {
      background: var(--sb-bg-dim, #f3f4f6);
    }
    .pv-cmd-item-sub {
      font-size: 0.72rem;
      color: var(--sb-text-dim, #99a1af);
      white-space: nowrap;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);

  if (!globalRecipeCloseBound) {
    globalRecipeCloseBound = true;
    document.addEventListener('click', (e) => {
      if (e.target.closest('.pv-recipe-line')) return;
      document.querySelectorAll('.pv-recipe-pop-slot').forEach((slot) => {
        slot.hidden = true;
      });
      document.querySelectorAll('.pv-recipe-plus-btn.is-open').forEach((btn) => {
        btn.classList.remove('is-open');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.pv-recipe-pop-slot').forEach((slot) => {
          slot.hidden = true;
        });
        document.querySelectorAll('.pv-recipe-plus-btn.is-open').forEach((btn) => {
          btn.classList.remove('is-open');
        });
      }
    });
  }
}

const SVG_ICONS = {
  camera: `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="15" width="15"><path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2"></path><path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"></path></svg>`,
  lens: `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="14" width="14"><path d="M9.85802 19.71L12 16H5.07026C6.10692 17.7921 7.8188 19.1447 9.85802 19.71ZM4.25204 14H8.5359L5.07103 7.99867C4.38987 9.17566 4 10.5423 4 12C4 12.6906 4.08751 13.3608 4.25204 14ZM6.39496 6.29179L8.5359 10L12 4C9.8171 4 7.8384 4.87429 6.39496 6.29179ZM14.142 4.28998L12 8H18.9297C17.8931 6.20791 16.1812 4.85529 14.142 4.28998ZM19.748 10H15.4641L18.929 16.0013C19.6101 14.8243 20 13.4577 20 12C20 11.3094 19.9125 10.6392 19.748 10ZM17.605 17.7082L15.4641 14L12 20C14.1829 20 16.1616 19.1257 17.605 17.7082ZM12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM13.1547 10H10.8453L9.6906 12L10.8453 14H13.1547L14.3094 12L13.1547 10Z"></path></svg>`,
  recipe: `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="16" width="16"><path d="M9.615 20h-2.615a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8"></path><path d="M14 19l2 2l4 -4"></path><path d="M9 8h4"></path><path d="M9 12h2"></path></svg>`,
  plus: `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="10" width="10"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"></path></svg>`,
  filmCanister: `<svg width="28" height="16" viewBox="0 0 28 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.25 3.49999L2 3.49999C1.86193 3.49999 1.75 3.61192 1.75 3.74999V5.24998C1.75 5.38806 1.86193 5.49998 2 5.49998H3.00001C3.13808 5.49998 3.25001 5.61191 3.25001 5.74999L3.25 12.25C3.25 12.3881 3.13807 12.5 3 12.5H2C1.86193 12.5 1.75 12.6119 1.75 12.75V14.25C1.75 14.3881 1.86193 14.5 2 14.5H14.25C14.3881 14.5 14.5 14.3881 14.5 14.25V12.75C14.5 12.6119 14.3881 12.5 14.25 12.5H13.25C13.1119 12.5 13 12.3881 13 12.25L13 5.75C13 5.61193 13.112 5.5 13.25 5.5H14.25C14.3881 5.5 14.5 5.38807 14.5 5.25V3.74999C14.5 3.61192 14.3881 3.49999 14.25 3.49999L11 3.49999C10.8619 3.49998 10.75 3.38806 10.75 3.24999V1.74998C10.75 1.61191 10.6381 1.49998 10.5 1.49998H5.75C5.61193 1.49998 5.5 1.61191 5.5 1.74998V3.24999C5.5 3.38806 5.38807 3.49998 5.25 3.49999ZM6.75351 7.30125L7.27051 8.6055L9.33851 13H11.1715V4.7985H9.59701V9.1225L9.69101 10.4972H9.50301L8.98601 9.193L6.91801 4.7985H5.08501V13H6.65951V8.676L6.56551 7.30125H6.75351Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M25.75 7.25V4.25C25.75 4.11193 25.6403 4 25.5023 4H16.2473C16.1092 4 15.9998 4.11194 15.9998 4.25001L16 7.25001C16 7.38808 16.1119 7.5 16.25 7.5H25.5C25.6381 7.5 25.75 7.38807 25.75 7.25ZM18.75 5H17V6.5H18.75V5ZM20 5H21.75V6.5H20V5ZM24.75 5H23V6.5H24.75V5Z" fill="currentColor"></path><path d="M21.0165 14.596C20.6379 14.596 20.2965 14.5373 19.9925 14.42C19.6885 14.2973 19.4299 14.1187 19.2165 13.884C19.0032 13.644 18.8379 13.348 18.7205 12.996C18.6032 12.6387 18.5445 12.2227 18.5445 11.748C18.5445 11.2787 18.6032 10.8627 18.7205 10.5C18.8379 10.132 19.0032 9.82533 19.2165 9.58C19.4299 9.32933 19.6885 9.14 19.9925 9.012C20.2965 8.884 20.6379 8.82 21.0165 8.82C21.5339 8.82 21.9605 8.92667 22.2965 9.14C22.6325 9.348 22.9019 9.67867 23.1045 10.132L22.0565 10.676C21.9819 10.4413 21.8645 10.2547 21.7045 10.116C21.5499 9.972 21.3205 9.9 21.0165 9.9C20.6592 9.9 20.3712 10.0173 20.1525 10.252C19.9392 10.4813 19.8325 10.8173 19.8325 11.26V12.156C19.8325 12.5987 19.9392 12.9373 20.1525 13.172C20.3712 13.4013 20.6592 13.516 21.0165 13.516C21.3152 13.516 21.5525 13.436 21.7285 13.276C21.9099 13.1107 22.0432 12.9133 22.1285 12.684L23.1205 13.26C22.9125 13.6867 22.6379 14.0173 22.2965 14.252C21.9605 14.4813 21.5339 14.596 21.0165 14.596Z" fill="currentColor"></path></svg>`,
  zoomIn: `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="15" width="15"><path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"></path><path d="M3 16.2V21m0 0h4.8M3 21l6-6"></path><path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"></path><path d="M3 7.8V3m0 0h4.8M3 3l6 6"></path></svg>`,
  share: `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="16" width="16"><path d="M15 8h.01"></path><path d="M12 21h-6a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v7"></path><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l3 3"></path><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0"></path><path d="M16 22l5 -5"></path><path d="M21 21.5v-4.5h-4.5"></path></svg>`
};

function fmtSigned(n) {
  const v = Number(n) || 0;
  return v > 0 ? `+${v}` : `${v}`;
}

/**
 * 1. createExifPlate(el, photo, options = {})
 * Renders the 1:1 unlabeled Sam Becker EXIF sidebar:
 *   - Instrument Serif uppercase title
 *   - Camera / Lens / Recipe icon stack with `[+]` floating frosted popup toggle
 *   - Two-line inline unlabeled exposure parameters (`35mm ƒ/1.4` / `1/4700s ISO500`)
 *   - Film simulation canister icon + uppercase label
 *   - Timestamp pill (`18 OCT 2026 12:33PM`)
 *   - Signature `3px` ultra-thin `oklch` Color Strip (`70px` main + 5 × `6px` sub-colors)
 *   - Bottom micro action buttons (`Zoom In` & `Share Photo`)
 */
export function createExifPlate(el, photo, options = {}) {
  injectVaultStyles();
  if (!el || !photo) return null;

  const side = options.metaSide || photo.metaSide || 'right';
  const cameraText = photo.cameraMakeModel || photo.camera || `${photo.make || 'FUJIFILM'} ${photo.model || 'X-T5'}`;
  const lensText = photo.lensModel || photo.lens || '';
  const focalText = photo.focalLengthFormatted || photo.focalLength || '35mm';
  const focal35Text = photo.focalLengthIn35MmFormatFormatted || photo.focalLength35mm || '53mm';
  const fNumberText = photo.fNumberFormatted || (photo.aperture ? photo.aperture.replace(/^f\//i, 'ƒ/') : 'ƒ/1.4');
  const shutterText = photo.exposureTimeFormatted || photo.shutterSpeed || '1/1000s';
  const isoText = photo.isoFormatted || (photo.iso ? String(photo.iso).replace(/\s+/g, '') : 'ISO125');
  const filmText = photo.filmLabel || (photo.film && photo.film !== '$undefined' ? photo.film.toUpperCase() : '');
  const recipeTitle = (photo.recipeLabel && photo.recipeLabel !== '$undefined' ? photo.recipeLabel : '') || (options.recipe && options.recipe.name) || '';
  const validRecipeData = photo.recipeData && photo.recipeData !== '$undefined' && typeof photo.recipeData === 'object' ? photo.recipeData : null;
  const hasRecipe = Boolean(recipeTitle || validRecipeData || options.recipe);
  const evText = photo.exposureCompensationFormatted && photo.exposureCompensationFormatted !== '$undefined' ? photo.exposureCompensationFormatted : '0 EV';
  const dateText = photo.takenAtNaiveFormatted || photo.date || '18 OCT 2026';

  const colorData = photo.colorData || {
    ai: { l: 0.722, c: 0.155, h: 61.153 },
    colors: [
      { l: 0.472, c: 0.148, h: 40.178 },
      { l: 0.821, c: 0.137, h: 75.757 },
      { l: 0.981, c: 0.063, h: 104.596 },
      { l: 0.661, c: 0.031, h: 65.535 },
      { l: 0.463, c: 0.024, h: 119.481 }
    ]
  };
  const aiColor = colorData.ai || { l: 0.72, c: 0.14, h: 60 };
  const subColors = (colorData.colors || []).slice(0, 5);

  let show35Eq = false;
  let recipeOpen = Boolean(options.recipeExpanded);

  el.innerHTML = `
    <div class="pv-exif-plate ${side === 'left' ? 'pv-side-left' : 'pv-side-right'}${options.proMode ? ' is-pro' : ''}">
      <div class="pv-title-wrap">
        <a href="/p/${photo.slug || photo.id}" class="pv-photo-title" data-action="title">${photo.title || 'UNTITLED'}</a>
      </div>

      <div class="pv-gear-stack">
        <button type="button" class="pv-meta-row" data-action="camera" title="Filter by ${cameraText}">
          <span class="pv-meta-icon">${SVG_ICONS.camera}</span>
          <span class="pv-meta-text">${cameraText}</span>
        </button>

        ${lensText ? `
        <button type="button" class="pv-meta-row" data-action="lens" title="Filter by ${lensText}">
          <span class="pv-meta-icon">${SVG_ICONS.lens}</span>
          <span class="pv-meta-text">${lensText}</span>
        </button>
        ` : ''}

        ${hasRecipe ? `
        <div class="pv-recipe-line">
          <button type="button" class="pv-meta-row" data-action="recipe-filter" title="Filter by recipe ${recipeTitle}">
            <span class="pv-meta-icon">${SVG_ICONS.recipe}</span>
            <span class="pv-meta-text">${recipeTitle}</span>
          </button>
          <button type="button" class="pv-recipe-plus-btn ${recipeOpen ? 'is-open' : ''}" data-action="recipe-toggle" aria-label="Show Fujifilm Recipe Details" title="Toggle Fujifilm Film Recipe Card">
            ${SVG_ICONS.plus}
          </button>
          <div class="pv-recipe-pop-slot ${side === 'left' ? 'pv-pop-left' : 'pv-pop-right'}" ${recipeOpen ? '' : 'hidden'}></div>
        </div>
        ` : ''}
      </div>

      <div class="pv-sub-stack">
        <ul class="pv-exposure-list">
          <li class="pv-exposure-line">
            <button type="button" class="pv-focal-btn" data-action="focal" title="35mm Equivalent: ${focal35Text} (Click to filter)">
              <span data-focal-text>${focalText}</span><span class="pv-focal-35eq" data-focal-eq style="display:none">(${focal35Text} eq)</span>
            </button>
            <span>${fNumberText}</span>
          </li>
          <li class="pv-exposure-line">
            <span>${shutterText}</span>
            <span>${isoText}</span>
          </li>
        </ul>

        ${filmText ? `
        <button type="button" class="pv-meta-row" data-action="film" title="Filter by film simulation ${filmText}">
          <span class="pv-meta-icon-film">${SVG_ICONS.filmCanister}</span>
          <span class="pv-meta-text">${filmText}</span>
        </button>
        ` : ''}

        <span class="pv-timestamp-pill">${dateText}</span>

        <div class="pv-oklch-wrap" title="OKLCH Perceptual Color Strip">
          <div class="pv-oklch-strip">
            <div class="pv-oklch-main" style="background-color:oklch(${aiColor.l} ${aiColor.c} ${aiColor.h})" title="Primary OKLCH(${aiColor.l}, ${aiColor.c}, ${aiColor.h})"></div>
            ${subColors.map((c, idx) => `<div class="pv-oklch-sub" style="background-color:oklch(${c.l} ${c.c} ${c.h})" title="Color ${idx + 1}: OKLCH(${c.l}, ${c.c}, ${c.h})"></div>`).join('')}
          </div>
        </div>

        <div class="pv-action-row">
          <button type="button" class="pv-action-icon-btn" data-action="zoom" aria-label="Zoom In" title="Open Fullscreen Lightbox">
            ${SVG_ICONS.zoomIn}
          </button>
          <button type="button" class="pv-action-icon-btn" data-action="share" aria-label="Share Photo" title="Copy Direct Photo Link">
            ${SVG_ICONS.share}
          </button>
        </div>

        <div class="pv-pro-drawer">
          <div class="pv-pro-label">
            <span>64-BIN LUMA/RGB</span>
            <span>${focal35Text} EQ · ${evText}</span>
          </div>
          <canvas class="pv-pro-hist" width="180" height="36"></canvas>
          <div class="pv-pro-swatches">
            ${(photo.palette || ['#C88A4B', '#7B4E34', '#D7B66E', '#EDE8D8', '#3B423E']).slice(0, 5).map((hex) => `
              <button type="button" class="pv-pro-swatch" style="background:${hex}" data-hex="${hex}" title="Copy ${hex}"></button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  const plateRoot = el.querySelector('.pv-exif-plate');
  const popSlot = el.querySelector('.pv-recipe-pop-slot');
  if (popSlot && hasRecipe && recipeOpen) {
    createFilmRecipeCard(popSlot, options.recipe || photo, { compact: true });
  }

  // Show 35mm equivalent on hover over focal length
  const focalBtn = el.querySelector('[data-action="focal"]');
  const focalEqSpan = el.querySelector('[data-focal-eq]');
  if (focalBtn && focalEqSpan) {
    focalBtn.addEventListener('mouseenter', () => {
      focalEqSpan.style.display = 'inline';
    });
    focalBtn.addEventListener('mouseleave', () => {
      if (!show35Eq) focalEqSpan.style.display = 'none';
    });
  }

  // Draw 64-bin histogram if in PRO mode
  const histCanvas = el.querySelector('.pv-pro-hist');
  if (histCanvas) {
    drawSyntheticHistogram(histCanvas, photo);
  }

  // Bind click listener to the newly created inner .pv-exif-plate node (never accumulates on `el`)
  if (plateRoot) {
    plateRoot.addEventListener('click', (e) => {
      const titleEl = e.target.closest('[data-action="title"]');
      if (titleEl) {
        e.preventDefault();
        if (options.onOpenPhoto) options.onOpenPhoto(photo);
        else if (options.onZoom) options.onZoom(photo);
        return;
      }

      const camBtn = e.target.closest('[data-action="camera"]');
      if (camBtn) {
        if (options.onFilterCamera) options.onFilterCamera(photo.cameraId || cameraText, photo);
        return;
      }

      const lensBtn = e.target.closest('[data-action="lens"]');
      if (lensBtn) {
        if (options.onFilterLens) options.onFilterLens(photo.lensSlug || lensText, photo);
        return;
      }

      const recFilterBtn = e.target.closest('[data-action="recipe-filter"]');
      if (recFilterBtn) {
        if (options.onFilterRecipe) options.onFilterRecipe(photo.recipeTitle || recipeTitle, photo);
        else if (options.onFilterFilm) options.onFilterFilm(photo.recipeTitle || photo.film, photo);
        return;
      }

      const recToggleBtn = e.target.closest('[data-action="recipe-toggle"]');
      if (recToggleBtn && popSlot) {
        e.stopPropagation();
        const willOpen = popSlot.hidden;
        // Close any other open recipe popovers on the page
        document.querySelectorAll('.pv-recipe-pop-slot').forEach((other) => {
          if (other !== popSlot) other.hidden = true;
        });
        document.querySelectorAll('.pv-recipe-plus-btn.is-open').forEach((otherBtn) => {
          if (otherBtn !== recToggleBtn) otherBtn.classList.remove('is-open');
        });

        recipeOpen = willOpen;
        recToggleBtn.classList.toggle('is-open', recipeOpen);
        popSlot.hidden = !recipeOpen;
        if (recipeOpen && !popSlot.hasChildNodes()) {
          createFilmRecipeCard(popSlot, options.recipe || photo, { compact: true });
        }
        if (options.onToggleRecipe) options.onToggleRecipe(photo, recipeOpen);
        return;
      }

      const focalClick = e.target.closest('[data-action="focal"]');
      if (focalClick) {
        show35Eq = !show35Eq;
        if (focalEqSpan) focalEqSpan.style.display = show35Eq ? 'inline' : 'none';
        if (options.onFilterFocal) options.onFilterFocal(focalText, photo);
        return;
      }

      const filmBtn = e.target.closest('[data-action="film"]');
      if (filmBtn) {
        if (options.onFilterFilm) options.onFilterFilm(photo.film || filmText, photo);
        return;
      }

      const zoomBtn = e.target.closest('[data-action="zoom"]');
      if (zoomBtn) {
        if (options.onZoom) options.onZoom(photo);
        return;
      }

      const shareBtn = e.target.closest('[data-action="share"]');
      if (shareBtn) {
        if (options.onShare) {
          options.onShare(photo);
        } else if (navigator.clipboard) {
          const shareUrl = `${window.location.origin}/p/${photo.slug || photo.id}`;
          navigator.clipboard.writeText(shareUrl).catch(() => {});
        }
        return;
      }

      const swatchBtn = e.target.closest('.pv-pro-swatch');
      if (swatchBtn) {
        const hex = swatchBtn.getAttribute('data-hex');
        if (hex && navigator.clipboard) {
          navigator.clipboard.writeText(hex).catch(() => {});
        }
        if (options.onCopyHex) options.onCopyHex(hex);
      }
    });
  }

  return {
    updatePhoto(nextPhoto) {
      createExifPlate(el, nextPhoto, options);
    },
    setProMode(enabled) {
      if (plateRoot) plateRoot.classList.toggle('is-pro', Boolean(enabled));
    }
  };
}

function drawSyntheticHistogram(canvas, photo) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const lMean = photo.colorData?.ai?.l || 0.62;
  const seed = String(photo.id || 'seed').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bins = 64;
  const barW = w / bins;

  for (let i = 0; i < bins; i++) {
    const xNorm = i / bins;
    const dist = Math.abs(xNorm - lMean);
    const wave = Math.sin(i * 0.35 + seed) * 0.18 + Math.cos(i * 0.19 - seed) * 0.12;
    const val = Math.max(0.06, Math.min(0.96, Math.exp(-dist * dist * 7.5) * 0.82 + wave));
    const bh = val * (h - 4);
    ctx.fillStyle = 'rgba(153, 161, 175, 0.55)';
    ctx.fillRect(i * barW, h - bh, Math.max(1, barW - 0.6), bh);
  }
}

/**
 * 2. createFilmRecipeCard(el, recipeOrPhoto, options = {})
 * Renders the translucent dark Fujifilm Film Simulation Recipe popup card
 * with full X-Trans parameters + Tone S-Curve SVG, WB Shift Coordinate Grid, and [Copy Recipe] button.
 */
export function createFilmRecipeCard(el, recipeOrPhoto, options = {}) {
  injectVaultStyles();
  if (!el || !recipeOrPhoto) return null;

  const rd = recipeOrPhoto.recipeData || {};
  const title = (
    recipeOrPhoto.recipeLabel ||
    recipeOrPhoto.name ||
    recipeOrPhoto.recipeTitle ||
    'CLASSIC CUBAN'
  ).toUpperCase();
  const sim = (
    recipeOrPhoto.filmLabel ||
    recipeOrPhoto.baseSimulation ||
    recipeOrPhoto.film ||
    'CLASSIC NEG.'
  ).toUpperCase();

  const dr = recipeOrPhoto.dynamicRange || `DR${rd.dynamicRange?.development || 400}`;
  const iso = recipeOrPhoto.isoFormatted || 'AUTO ISO';
  const wbR = rd.whiteBalance?.red ?? recipeOrPhoto.wbShift?.r ?? 4;
  const wbB = rd.whiteBalance?.blue ?? recipeOrPhoto.wbShift?.b ?? -5;
  const wbType = (rd.whiteBalance?.type || recipeOrPhoto.wb || 'AUTO').toUpperCase();
  const wbStr = `${wbType} R${fmtSigned(wbR)} / B${fmtSigned(wbB)}`;

  const highlight = rd.highlight ?? recipeOrPhoto.highlight ?? -2;
  const shadow = rd.shadow ?? recipeOrPhoto.shadow ?? 1;
  const color = rd.color ?? recipeOrPhoto.color ?? 4;
  const sharpness = rd.sharpness ?? recipeOrPhoto.sharpness ?? 0;
  const clarity = rd.clarity ?? recipeOrPhoto.clarity ?? -4;
  const nr = rd.highISONoiseReduction ?? recipeOrPhoto.nr ?? -4;
  const grain = rd.grainEffect
    ? `${rd.grainEffect.roughness}/${rd.grainEffect.size}`.toUpperCase()
    : (recipeOrPhoto.grain || 'STRONG/LARGE').toUpperCase();
  const cce = (rd.colorChromeEffect || recipeOrPhoto.colorChrome || 'STRONG').toUpperCase();
  const ccfx = (rd.colorChromeFXBlue || recipeOrPhoto.colorChromeBlue || 'STRONG').toUpperCase();

  // Compute SVG S-curve control points from shadow & highlight
  const sY = Math.max(48, Math.min(86, 68 + Number(shadow) * 4.5));
  const hY = Math.max(8, Math.min(44, 24 - Number(highlight) * 4.5));

  // Compute WB Shift dot inside 64x64 grid (-9..+9)
  const wbDotX = Math.max(6, Math.min(58, 32 + (Number(wbR) / 9) * 26));
  const wbDotY = Math.max(6, Math.min(58, 32 - (Number(wbB) / 9) * 26));

  el.innerHTML = `
    <div class="pv-recipe-popover">
      <div class="pv-recipe-pop-header">
        <span class="pv-recipe-pop-title" title="${title}">${title}</span>
        <div class="pv-recipe-pop-badges">
          <span class="pv-recipe-pop-sim">${sim}</span>
          <button type="button" class="pv-recipe-copy-btn" data-copy-recipe title="Copy Fujifilm Recipe Settings">Copy Recipe</button>
        </div>
      </div>

      <div class="pv-recipe-pop-grid">
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">Dynamic Range</span>
          <span class="pv-recipe-cell-v">${dr} · ${iso}</span>
        </div>
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">White Balance</span>
          <span class="pv-recipe-cell-v">${wbStr}</span>
        </div>
      </div>

      <div class="pv-recipe-pop-grid-3">
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">Highlight</span>
          <span class="pv-recipe-cell-v">${fmtSigned(highlight)}</span>
        </div>
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">Shadow</span>
          <span class="pv-recipe-cell-v">${fmtSigned(shadow)}</span>
        </div>
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">Color</span>
          <span class="pv-recipe-cell-v">${fmtSigned(color)}</span>
        </div>
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">Sharpness</span>
          <span class="pv-recipe-cell-v">${fmtSigned(sharpness)}</span>
        </div>
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">Clarity</span>
          <span class="pv-recipe-cell-v">${fmtSigned(clarity)}</span>
        </div>
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">High ISO NR</span>
          <span class="pv-recipe-cell-v">${fmtSigned(nr)}</span>
        </div>
      </div>

      <div class="pv-recipe-pop-grid-3" style="margin-bottom:0">
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">Grain</span>
          <span class="pv-recipe-cell-v">${grain}</span>
        </div>
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">Chrome Effect</span>
          <span class="pv-recipe-cell-v">${cce}</span>
        </div>
        <div class="pv-recipe-cell">
          <span class="pv-recipe-cell-k">Chrome Blue</span>
          <span class="pv-recipe-cell-v">${ccfx}</span>
        </div>
      </div>

      <div class="pv-recipe-visual-row">
        <div class="pv-recipe-vis-box">
          <div class="pv-recipe-vis-label">
            <span>TONE CURVE</span>
            <span>H${fmtSigned(highlight)} S${fmtSigned(shadow)}</span>
          </div>
          <svg viewBox="0 0 92 92" width="100%" height="62">
            <line x1="0" y1="46" x2="92" y2="46" stroke="rgba(255,255,255,0.1)" stroke-dasharray="2 2"/>
            <line x1="46" y1="0" x2="46" y2="92" stroke="rgba(255,255,255,0.1)" stroke-dasharray="2 2"/>
            <line x1="8" y1="84" x2="84" y2="8" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
            <path d="M 8 84 C 28 ${sY}, 64 ${hY}, 84 8" fill="none" stroke="#f59e0b" stroke-width="2"/>
            <circle cx="28" cy="${sY}" r="2.5" fill="#f59e0b"/>
            <circle cx="64" cy="${hY}" r="2.5" fill="#f59e0b"/>
          </svg>
        </div>

        <div class="pv-recipe-vis-box">
          <div class="pv-recipe-vis-label">
            <span>WB SHIFT</span>
            <span>R${fmtSigned(wbR)} B${fmtSigned(wbB)}</span>
          </div>
          <svg viewBox="0 0 64 64" width="100%" height="62">
            <line x1="0" y1="32" x2="64" y2="32" stroke="rgba(255,255,255,0.2)"/>
            <line x1="32" y1="0" x2="32" y2="64" stroke="rgba(255,255,255,0.2)"/>
            <rect x="6" y="6" width="52" height="52" fill="none" stroke="rgba(255,255,255,0.1)"/>
            <circle cx="${wbDotX}" cy="${wbDotY}" r="3.5" fill="#38bdf8" stroke="#fff" stroke-width="1"/>
          </svg>
        </div>
      </div>
    </div>
  `;

  const copyBtn = el.querySelector('[data-copy-recipe]');
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = [
        `Recipe: ${title} (${sim})`,
        `Dynamic Range: ${dr}`,
        `White Balance: ${wbStr}`,
        `Highlight: ${fmtSigned(highlight)} | Shadow: ${fmtSigned(shadow)}`,
        `Color: ${fmtSigned(color)} | Sharpness: ${fmtSigned(sharpness)} | Clarity: ${fmtSigned(clarity)}`,
        `High ISO NR: ${fmtSigned(nr)} | Grain: ${grain}`,
        `Color Chrome: ${cce} | Color Chrome FX Blue: ${ccfx}`
      ].join('\n');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Recipe';
      }, 1500);
    });
  }

  return {
    updateRecipe(next) {
      createFilmRecipeCard(el, next, options);
    }
  };
}

/**
 * 3. parseExif(arrayBuffer)
 * Pure frontend binary JPEG TIFF/IFD0/SubIFD EXIF header parser.
 */
export function parseExif(arrayBuffer) {
  const fallback = {
    make: 'FUJIFILM',
    model: 'X-T5',
    camera: 'FUJIFILM X-T5',
    lens: 'XF35mmF1.4 R',
    focalLength: '35mm',
    focalLength35mm: '53mm',
    aperture: 'ƒ/1.4',
    shutterSpeed: '1/1000s',
    iso: 'ISO125',
    ev: '0 EV',
    date: new Date().toISOString().slice(0, 10),
    hasExif: false
  };

  if (!arrayBuffer || arrayBuffer.byteLength < 16) return fallback;
  const view = new DataView(arrayBuffer);
  if (view.getUint16(0, false) !== 0xffd8) return fallback;

  let offset = 2;
  const len = view.byteLength;

  while (offset + 4 <= len) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffda || marker === 0xffd9) break;
    const segLen = view.getUint16(offset, false);
    if (segLen < 2 || offset + segLen > len) break;

    if (marker === 0xffe1 && segLen >= 10) {
      const exifHdr =
        String.fromCharCode(view.getUint8(offset + 2)) +
        String.fromCharCode(view.getUint8(offset + 3)) +
        String.fromCharCode(view.getUint8(offset + 4)) +
        String.fromCharCode(view.getUint8(offset + 5));
      if (exifHdr === 'Exif') {
        const tiffStart = offset + 8;
        const littleEndian = view.getUint16(tiffStart, false) === 0x4949;
        const getU16 = (o) => view.getUint16(o, littleEndian);
        const getU32 = (o) => view.getUint32(o, littleEndian);
        const getS32 = (o) => view.getInt32(o, littleEndian);

        const readString = (strOff, count) => {
          let s = '';
          const max = Math.min(len, strOff + count);
          for (let i = strOff; i < max; i++) {
            const code = view.getUint8(i);
            if (code === 0) break;
            s += String.fromCharCode(code);
          }
          return s.trim();
        };

        const readRational = (rOff, signed = false) => {
          if (rOff + 8 > len) return 0;
          const num = signed ? getS32(rOff) : getU32(rOff);
          const den = signed ? getS32(rOff + 4) : getU32(rOff + 4);
          return den === 0 ? 0 : num / den;
        };

        const parsed = { ...fallback, hasExif: true };
        let exifIfdOffset = 0;

        const parseIfd = (ifdOff) => {
          if (ifdOff + 2 > len) return;
          const count = getU16(ifdOff);
          for (let i = 0; i < count; i++) {
            const entryOff = ifdOff + 2 + i * 12;
            if (entryOff + 12 > len) break;
            const tag = getU16(entryOff);
            const type = getU16(entryOff + 2);
            const numValues = getU32(entryOff + 4);
            const valFieldOff = entryOff + 8;

            const byteSize = (type === 1 || type === 2 || type === 7 ? 1 : type === 3 ? 2 : type === 4 || type === 9 ? 4 : 8) * numValues;
            const actualValOff = byteSize <= 4 ? valFieldOff : tiffStart + getU32(valFieldOff);

            if (tag === 0x010f && type === 2) parsed.make = readString(actualValOff, numValues) || parsed.make;
            else if (tag === 0x0110 && type === 2) parsed.model = readString(actualValOff, numValues) || parsed.model;
            else if ((tag === 0x0132 || tag === 0x9003) && type === 2) {
              const rawDate = readString(actualValOff, numValues);
              if (rawDate) parsed.date = rawDate.slice(0, 10).replace(/:/g, '-');
            } else if (tag === 0x8769) {
              exifIfdOffset = tiffStart + getU32(valFieldOff);
            } else if (tag === 0x829a && type === 5) {
              const exp = readRational(actualValOff, false);
              if (exp > 0) {
                parsed.shutterSpeed = exp >= 1 ? `${exp.toFixed(1)}s` : `1/${Math.round(1 / exp)}s`;
              }
            } else if (tag === 0x829d && type === 5) {
              const fn = readRational(actualValOff, false);
              if (fn > 0) parsed.aperture = `ƒ/${Number(fn.toFixed(1))}`;
            } else if (tag === 0x8827) {
              const isoVal = type === 3 ? getU16(valFieldOff) : getU32(valFieldOff);
              if (isoVal > 0) parsed.iso = `ISO${isoVal}`;
            } else if (tag === 0x9204 && type === 10) {
              const evVal = readRational(actualValOff, true);
              parsed.ev = `${evVal > 0 ? '+' : ''}${Number(evVal.toFixed(2))} EV`;
            } else if (tag === 0x920a && type === 5) {
              const fl = readRational(actualValOff, false);
              if (fl > 0) {
                parsed.focalLength = `${Math.round(fl)}mm`;
                parsed.focalLength35mm = `${Math.round(fl * 1.5)}mm`;
              }
            } else if (tag === 0xa405) {
              const fl35 = type === 3 ? getU16(valFieldOff) : getU32(valFieldOff);
              if (fl35 > 0) parsed.focalLength35mm = `${fl35}mm`;
            } else if (tag === 0xa434 && type === 2) {
              parsed.lens = readString(actualValOff, numValues) || parsed.lens;
            }
          }
        };

        const firstIfd = tiffStart + getU32(tiffStart + 4);
        parseIfd(firstIfd);
        if (exifIfdOffset > 0 && exifIfdOffset < len) {
          parseIfd(exifIfdOffset);
        }
        parsed.camera = `${parsed.make} ${parsed.model}`.trim();
        return parsed;
      }
    }
    offset += segLen;
  }

  return fallback;
}

/**
 * 4. extractColorPalette(imgOrCanvas, count = 5)
 * Extracts dominant perceptual swatches + exposure tonal profile via Canvas pixel sampling.
 */
export function extractColorPalette(imgOrCanvas, count = 5) {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 48;
  const ctx = c.getContext('2d');
  if (!ctx || !imgOrCanvas) {
    return {
      palette: ['#C88A4B', '#7B4E34', '#D7B66E', '#EDE8D8', '#3B423E'].slice(0, count),
      exposureStats: { profile: 'BALANCED TONAL', shadowsPct: 28, midtonesPct: 54, highlightsPct: 18 }
    };
  }

  try {
    ctx.drawImage(imgOrCanvas, 0, 0, 48, 48);
    const data = ctx.getImageData(0, 0, 48, 48).data;
    const buckets = Array.from({ length: count }, () => ({ r: 0, g: 0, b: 0, n: 0 }));
    let shadows = 0;
    let midtones = 0;
    let highlights = 0;
    const totalPixels = (data.length / 4) || 1;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (luma < 64) shadows++;
      else if (luma > 192) highlights++;
      else midtones++;

      const bIdx = Math.min(count - 1, Math.floor((luma / 256) * count));
      buckets[bIdx].r += r;
      buckets[bIdx].g += g;
      buckets[bIdx].b += b;
      buckets[bIdx].n++;
    }

    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    const palette = buckets.map((bk, idx) => {
      if (bk.n === 0) return ['#1f242b', '#46525e', '#7f786d', '#c59258', '#ece6da'][idx % 5];
      return `#${toHex(bk.r / bk.n)}${toHex(bk.g / bk.n)}${toHex(bk.b / bk.n)}`.toUpperCase();
    });

    const shadowsPct = Math.round((shadows / totalPixels) * 100);
    const highlightsPct = Math.round((highlights / totalPixels) * 100);
    const midtonesPct = Math.max(0, 100 - shadowsPct - highlightsPct);
    const profile =
      shadowsPct > 52 ? 'LOW-KEY CHIAROSCURO' : highlightsPct > 45 ? 'HIGH-KEY LUMINOUS' : 'BALANCED LATITUDE';

    return {
      palette,
      exposureStats: { profile, shadowsPct, midtonesPct, highlightsPct }
    };
  } catch (_) {
    return {
      palette: ['#C88A4B', '#7B4E34', '#D7B66E', '#EDE8D8', '#3B423E'].slice(0, count),
      exposureStats: { profile: 'BALANCED LATITUDE', shadowsPct: 28, midtonesPct: 54, highlightsPct: 18 }
    };
  }
}

/**
 * 5. createCompositionOverlay(stageEl, options = {})
 * Renders SVG composition guides: 'off' -> 'thirds' -> 'phi' -> 'diagonals' -> 'center'.
 */
export function createCompositionOverlay(stageEl, options = {}) {
  injectVaultStyles();
  if (!stageEl) return null;

  const modes = ['off', 'thirds', 'phi', 'diagonals', 'center'];
  let currentMode = options.mode || 'off';

  let svg = stageEl.querySelector('.pv-comp-svg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'pv-comp-svg');
    svg.setAttribute('viewBox', '0 0 1000 667');
    svg.setAttribute('preserveAspectRatio', 'none');
    stageEl.appendChild(svg);
  }

  function render() {
    if (currentMode === 'off') {
      svg.innerHTML = '';
      svg.style.display = 'none';
      return;
    }
    svg.style.display = 'block';
    const stroke = 'rgba(245, 158, 11, 0.72)';

    if (currentMode === 'thirds') {
      svg.innerHTML = `
        <line x1="333.3" y1="0" x2="333.3" y2="667" stroke="${stroke}" stroke-width="1.2" stroke-dasharray="4 4"/>
        <line x1="666.7" y1="0" x2="666.7" y2="667" stroke="${stroke}" stroke-width="1.2" stroke-dasharray="4 4"/>
        <line x1="0" y1="222.3" x2="1000" y2="222.3" stroke="${stroke}" stroke-width="1.2" stroke-dasharray="4 4"/>
        <line x1="0" y1="444.7" x2="1000" y2="444.7" stroke="${stroke}" stroke-width="1.2" stroke-dasharray="4 4"/>
        <circle cx="333.3" cy="222.3" r="5" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <circle cx="666.7" cy="222.3" r="5" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <circle cx="333.3" cy="444.7" r="5" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <circle cx="666.7" cy="444.7" r="5" fill="none" stroke="${stroke}" stroke-width="1.5"/>
      `;
    } else if (currentMode === 'phi') {
      svg.innerHTML = `
        <line x1="382" y1="0" x2="382" y2="667" stroke="${stroke}" stroke-width="1.2"/>
        <line x1="618" y1="0" x2="618" y2="667" stroke="${stroke}" stroke-width="1.2"/>
        <line x1="0" y1="254.8" x2="1000" y2="254.8" stroke="${stroke}" stroke-width="1.2"/>
        <line x1="0" y1="412.2" x2="1000" y2="412.2" stroke="${stroke}" stroke-width="1.2"/>
        <path d="M 0 667 A 618 618 0 0 1 618 0 A 382 382 0 0 1 1000 382 A 236 236 0 0 1 764 667" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="6 3"/>
      `;
    } else if (currentMode === 'diagonals') {
      svg.innerHTML = `
        <line x1="0" y1="0" x2="1000" y2="667" stroke="${stroke}" stroke-width="1.2"/>
        <line x1="0" y1="667" x2="1000" y2="0" stroke="${stroke}" stroke-width="1.2"/>
        <line x1="0" y1="0" x2="667" y2="667" stroke="${stroke}" stroke-width="1" stroke-dasharray="4 4"/>
        <line x1="1000" y1="0" x2="333" y2="667" stroke="${stroke}" stroke-width="1" stroke-dasharray="4 4"/>
      `;
    } else if (currentMode === 'center') {
      svg.innerHTML = `
        <line x1="500" y1="0" x2="500" y2="667" stroke="${stroke}" stroke-width="1.2"/>
        <line x1="0" y1="333.5" x2="1000" y2="333.5" stroke="${stroke}" stroke-width="1.2"/>
        <circle cx="500" cy="333.5" r="90" fill="none" stroke="${stroke}" stroke-width="1.2" stroke-dasharray="5 3"/>
        <rect x="350" y="210" width="300" height="247" fill="none" stroke="${stroke}" stroke-width="1"/>
      `;
    }
  }

  render();

  return {
    setMode(mode) {
      if (modes.includes(mode)) {
        currentMode = mode;
        render();
      }
      return currentMode;
    },
    cycleMode() {
      const nextIdx = (modes.indexOf(currentMode) + 1) % modes.length;
      currentMode = modes[nextIdx];
      render();
      return currentMode;
    },
    getMode() {
      return currentMode;
    }
  };
}

/**
 * 6. createOpticalLoupe(stageEl, imgSource, options = {})
 * Renders a circular 2.5x–4x magnifying loupe over the photograph stage.
 * Uses the actual `source.getBoundingClientRect()` (and rendered object-contain box)
 * so crosshair and magnified pixels align 1:1 with the photograph.
 */
export function createOpticalLoupe(stageEl, imgSource, options = {}) {
  injectVaultStyles();
  if (!stageEl) return null;

  let enabled = Boolean(options.enabled);
  let zoom = options.zoom || 2.5;

  let loupeEl = stageEl.querySelector('.pv-optical-loupe');
  if (!loupeEl) {
    loupeEl = document.createElement('div');
    loupeEl.className = 'pv-optical-loupe';
    loupeEl.innerHTML = `
      <canvas width="176" height="176" style="width:100%;height:100%;display:block"></canvas>
      <div class="pv-loupe-hud">${zoom.toFixed(1)}× LOUPE</div>
    `;
    stageEl.appendChild(loupeEl);
  }

  const lCanvas = loupeEl.querySelector('canvas');
  const hud = loupeEl.querySelector('.pv-loupe-hud');
  const lCtx = lCanvas.getContext('2d');

  function updateFromEvent(e) {
    if (!enabled || !lCtx) return;
    const source = stageEl.querySelector('img[data-main-photo]') || imgSource;
    if (!source) return;

    const stageRect = stageEl.getBoundingClientRect();
    const elemRect = source.getBoundingClientRect();
    if (!elemRect.width || !elemRect.height) return;

    const sw = source.naturalWidth || source.width || elemRect.width;
    const sh = source.naturalHeight || source.height || elemRect.height;

    // Account for object-contain letterboxing inside source element if any
    const natRatio = sw / sh;
    const boxRatio = elemRect.width / elemRect.height;
    let drawW = elemRect.width;
    let drawH = elemRect.height;
    let offsetX = 0;
    let offsetY = 0;
    if (Math.abs(natRatio - boxRatio) > 0.01) {
      if (natRatio > boxRatio) {
        drawH = elemRect.width / natRatio;
        offsetY = (elemRect.height - drawH) / 2;
      } else {
        drawW = elemRect.height * natRatio;
        offsetX = (elemRect.width - drawW) / 2;
      }
    }

    const imgLeft = elemRect.left + offsetX;
    const imgTop = elemRect.top + offsetY;
    const normX = (e.clientX - imgLeft) / drawW;
    const normY = (e.clientY - imgTop) / drawH;

    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) {
      loupeEl.classList.remove('is-visible');
      return;
    }

    loupeEl.classList.add('is-visible');
    loupeEl.style.left = `${e.clientX - stageRect.left}px`;
    loupeEl.style.top = `${e.clientY - stageRect.top}px`;

    const sampleW = (176 / zoom) * (sw / drawW);
    const sampleH = (176 / zoom) * (sh / drawH);
    const sx = normX * sw - sampleW / 2;
    const sy = normY * sh - sampleH / 2;

    lCtx.clearRect(0, 0, 176, 176);
    try {
      lCtx.drawImage(source, sx, sy, sampleW, sampleH, 0, 0, 176, 176);
    } catch (_) {}

    // Reticle crosshair
    lCtx.strokeStyle = 'rgba(255,255,255,0.45)';
    lCtx.lineWidth = 1;
    lCtx.beginPath();
    lCtx.moveTo(88, 74);
    lCtx.lineTo(88, 102);
    lCtx.moveTo(74, 88);
    lCtx.lineTo(102, 88);
    lCtx.stroke();
  }

  stageEl.addEventListener('mousemove', updateFromEvent);
  stageEl.addEventListener('mouseleave', () => loupeEl.classList.remove('is-visible'));
  stageEl.addEventListener(
    'wheel',
    (e) => {
      if (!enabled) return;
      e.preventDefault();
      zoom = Math.max(2.0, Math.min(4.5, zoom + (e.deltaY < 0 ? 0.25 : -0.25)));
      if (hud) hud.textContent = `${zoom.toFixed(1)}× LOUPE`;
      updateFromEvent(e);
    },
    { passive: false }
  );

  return {
    setEnabled(val) {
      enabled = Boolean(val);
      if (!enabled) loupeEl.classList.remove('is-visible');
      return enabled;
    },
    toggle() {
      enabled = !enabled;
      if (!enabled) loupeEl.classList.remove('is-visible');
      return enabled;
    },
    isEnabled() {
      return enabled;
    }
  };
}

/**
 * 7. createCommandPalette(items, onSelect, options = {})
 * Renders the `⌘K` / `Ctrl+K` quick search modal across photos, cameras, lenses, recipes, films, and views.
 */
export function createCommandPalette(items = [], onSelect = () => {}, options = {}) {
  injectVaultStyles();
  if (typeof document === 'undefined') return null;

  let allItems = Array.isArray(items) ? items : [];
  let filtered = [...allItems];
  let activeIndex = 0;

  let backdrop = document.getElementById('pv-cmd-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'pv-cmd-backdrop';
    backdrop.className = 'pv-cmd-backdrop';
    document.body.appendChild(backdrop);
  }

  backdrop.innerHTML = `
    <div class="pv-cmd-modal" role="dialog" aria-modal="true" aria-label="Command Palette">
      <div class="pv-cmd-input-row">
        <span style="color:var(--sb-text-dim)">⌘K</span>
        <input type="text" class="pv-cmd-input" placeholder="${options.placeholder || 'Search photos, cameras, lenses, recipes, films...'}" autocomplete="off"/>
        <span style="font-size:0.7rem;color:var(--sb-text-dim)">ESC</span>
      </div>
      <div class="pv-cmd-list"></div>
    </div>
  `;

  const input = backdrop.querySelector('.pv-cmd-input');
  const listEl = backdrop.querySelector('.pv-cmd-list');

  function renderList() {
    if (!filtered.length) {
      listEl.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--sb-text-dim);font-size:0.8rem">No matching results</div>`;
      return;
    }
    const visible = filtered.slice(0, 48);
    let lastSection = '';
    const htmlParts = [];
    visible.forEach((item, idx) => {
      const sec = item.section || '';
      if (sec && sec !== lastSection) {
        lastSection = sec;
        htmlParts.push(`<div class="pv-cmd-section">${sec}</div>`);
      }
      htmlParts.push(`
        <div class="pv-cmd-item ${idx === activeIndex ? 'is-active' : ''}" data-idx="${idx}">
          <div class="pv-cmd-item-left">
            ${item.thumb ? `<img class="pv-cmd-thumb" src="${item.thumb}" alt="" loading="lazy" />` : ''}
            <span class="pv-cmd-label">${item.label || item.title}</span>
          </div>
          <span class="pv-cmd-item-sub">${item.meta || item.category || ''}</span>
        </div>
      `);
    });
    listEl.innerHTML = htmlParts.join('');
    const activeRow = listEl.querySelector('.pv-cmd-item.is-active');
    if (activeRow && typeof activeRow.scrollIntoView === 'function') {
      activeRow.scrollIntoView({ block: 'nearest' });
    }
  }

  function filterByQuery(q) {
    const query = (q || '').trim().toLowerCase();
    filtered = !query
      ? [...allItems]
      : allItems.filter((it) =>
          `${it.label || ''} ${it.meta || ''} ${it.category || ''} ${it.section || ''} ${it.keywords || ''}`.toLowerCase().includes(query)
        );
    activeIndex = 0;
    renderList();
  }

  function open() {
    backdrop.classList.add('is-open');
    input.value = '';
    filterByQuery('');
    setTimeout(() => input.focus(), 20);
  }

  function close() {
    backdrop.classList.remove('is-open');
  }

  input.addEventListener('input', () => filterByQuery(input.value));
  input.addEventListener('keydown', (e) => {
    const max = Math.min(filtered.length, 48);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (max > 0) activeIndex = (activeIndex + 1) % max;
      renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (max > 0) activeIndex = (activeIndex - 1 + max) % max;
      renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filtered[activeIndex];
      if (chosen) {
        close();
        onSelect(chosen);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  listEl.addEventListener('click', (e) => {
    const row = e.target.closest('.pv-cmd-item');
    if (!row) return;
    const idx = Number(row.getAttribute('data-idx'));
    const chosen = filtered[idx];
    if (chosen) {
      close();
      onSelect(chosen);
    }
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  return {
    open,
    close,
    toggle() {
      if (backdrop.classList.contains('is-open')) close();
      else open();
    },
    setItems(nextItems) {
      allItems = Array.isArray(nextItems) ? nextItems : [];
      filterByQuery(input.value);
    }
  };
}

/**
 * 8. createShutterAudio()
 * Pure Web Audio API leaf-shutter & aperture ring click synthesizer.
 */
export function createShutterAudio() {
  let ctx = null;
  let enabled = true;

  function ensureCtx() {
    if (!ctx && typeof window !== 'undefined') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function playShutter() {
    if (!enabled) return;
    const ac = ensureCtx();
    if (!ac) return;
    const now = ac.currentTime;

    // First blade curtain click
    const osc1 = ac.createOscillator();
    const gain1 = ac.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1100, now);
    osc1.frequency.exponentialRampToValueAtTime(180, now + 0.018);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.019);
    osc1.connect(gain1).connect(ac.destination);
    osc1.start(now);
    osc1.stop(now + 0.02);

    // Second blade return click
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(840, now + 0.028);
    osc2.frequency.exponentialRampToValueAtTime(140, now + 0.048);
    gain2.gain.setValueAtTime(0.09, now + 0.028);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc2.connect(gain2).connect(ac.destination);
    osc2.start(now + 0.028);
    osc2.stop(now + 0.052);
  }

  function playApertureClick() {
    if (!enabled) return;
    const ac = ensureCtx();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.012);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.013);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.015);
  }

  return {
    playShutter,
    playApertureClick,
    setEnabled(val) {
      enabled = Boolean(val);
      return enabled;
    },
    isEnabled() {
      return enabled;
    }
  };
}
