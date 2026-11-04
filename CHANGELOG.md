# Changelog

All notable deconstruction milestones and architectural changes in `decon-web`.

## [2026-11-04] — Specimen #03: Sam Becker Photos (`sites/03-sambecker-photos`)

### Architecture & Real Data Layer
- **Isolated Site Archive (`sites/03-sambecker-photos/`)**: Added Specimen #03 strictly inside `sites/03-sambecker-photos/` and `shared-ui/photo-vault-ui.js` with zero modifications to `sites/01-truejpeg/` or `sites/02-musicforprogramming/`.
- **Local Mirror, Upstream Blob Proxy & Ingest Server (`server.js`, port `6062`)**: Supports `/shared-ui/*` cross-directory static routing, `/photos/*` local archive hosting with transparent upstream fallback to `wpz47wrhgzc7qaub.public.blob.vercel-storage.com`, `GET /api/user-photos`, `POST /api/ingest` local drag-and-drop photo persistence to `photos/user/`, and clean SPA routes (`/`, `/grid`, `/library`, `/lab`, `/p/:slug`, `/shot-on/:id`, `/lens/:id`, `/recipe/:id`, `/film/:id`, `/focal/:id`, `/tag/:tag`).
- **Real 36-Work Photography Catalog & Binary EXIF Scanner (`catalog.js` & `sync_photos.js`)**:
  - Synced **36 real photographs** from `photos.sambecker.com` (`sambecker/exif-photo-blog`) with embedded binary EXIF `blurData` progressive placeholders, AI visual descriptions (`semanticDescription`), `FUJIFILM X-T5` (`XF35mmF1.4 R` / `XF90mmF2 R LM WR`) & `Apple iPhone 17 Pro` capture telemetry, `oklch` perceptual color palettes (`colorData`), and 4 authentic Fujifilm in-camera recipes (`Classic Cuban`, `ACROS + R CUSTOM`, `KODAK PORTRA 400 V2`, `Classic Negative`).
  - Added `sync_photos.js` CLI tool to sync upstream RSC metadata, sanitize Next.js `"$undefined"` tokens, pre-cache real JPEGs into `photos/` (ignored by Git), and parse local binary `0xFFE1` APP1 EXIF headers.

### Features & Enhancements (`03-sambecker-photos`)
- **1:1 Visual Architecture (`/`, `/grid`, `/library`, `/p/:slug`)**:
  - **`Full (/)` Alternating Borderless Canvas**: `Instrument Serif` uppercase titles + `IBM Plex Mono` unlabeled EXIF sidebar, odd/even row horizontal alternation (`lg:flex-row-reverse` on even rows), signature `3px` `oklch` perceptual color strip (`70px` primary + 5×`6px` sub-colors), and floating dark frosted `[+]` Fujifilm recipe popover (with Highlight/Shadow S-curve, WB shift grid, and one-click copy).
  - **`Grid (/grid)` & `Library (/library)` 3D `oklch` Folders**: Borderless 4-column adaptive grid matrix and centered archive library featuring interactive 3D `oklch`-tinted folders that fan out 4 preview thumbnails on hover.
  - **Theme-Adaptive Lightbox (`/p/:slug`) & 3 Gallery Themes (`T`)**: Seamless switching across `GALLERY LIGHT` (`#ffffff`), `OBSIDIAN DARK` (`#000000`), and `WARM CONTACT` (`#f5f2eb`) on both the main gallery and fullscreen photo detail view.
- **Zero Layout Shift (`CLS = 0`) & `RAW / PRO` Darkroom Suite (`P`)**:
  - Locked geometric dimensions on topbar controls (`#btnThemeCycle`, `#btnModeToggle`) and `scrollbar-gutter: stable` on `html`, plus out-of-flow floating `#proToolbar` HUD and `.pv-pro-drawer` without full-DOM re-renders (`0.00px` horizontal/vertical layout shift).
  - Unlocks 64-Bin Luma/RGB histogram + 5 copyable HEX swatches, `2.5×–4.5×` wheel-zoom optical loupe (`L`, `getBoundingClientRect` object-contain coordinate mapping), 5-mode SVG composition guides (`G`), local JPEG drag-and-drop binary EXIF ingest (`POST /api/ingest`), procedural Web Audio leaf-shutter & aperture clicks (strictly silent in `RAW` mode), and `⌘K` Command Palette with `28×20px` micro-thumbnails and `semanticDescription` AI semantic search.
- **UI Kit Extraction (`shared-ui/photo-vault-ui.js` & `lab.html`)**: Extracted 8 zero-dependency ES6 modules (`createExifPlate`, `createFilmRecipeCard`, `parseExif`, `extractColorPalette`, `createCompositionOverlay`, `createOpticalLoupe`, `createCommandPalette`, `createShutterAudio`) into [`shared-ui/photo-vault-ui.js`](./shared-ui/photo-vault-ui.js) (byte-for-byte mirrored at `sites/03-sambecker-photos/photo-vault-ui.js`) with a 2×2 interactive workbench in [`lab.html`](./sites/03-sambecker-photos/lab.html).

---

## [2026-11-04] — Specimen #02: `musicForProgramming();` (`sites/02-musicforprogramming`)

### Architecture & Data Layer
- **Isolated Site Archive (`sites/02-musicforprogramming/`)**: Added Specimen #02 strictly inside `sites/02-musicforprogramming/` with zero modifications to `sites/01-truejpeg/`.
- **Local Mirror & Audio/RSS Proxy (`server.js`)**: Local port `6061` server supporting `/shared-ui/` cross-directory routing, `/api/rss` feed proxy, and `/api/audio` HTTP `Range` + CORS streaming proxy.
- **Complete 79-Episode Database (`episodes.js` & `sync_rss.js`)**: Parsed all **79 episodes** (`01: Datassette` through `79: Corticyte`, totaling **1,380 tracks** and **96h 25m 11s** of mixes), including episode metadata, file sizes, direct MP3 URLs, full tracklists, curator links, and special anniversary notes (`62: Our Grey Lives`).

### Features & Enhancements (`02-musicforprogramming`)
- **1:1 Responsive IDE Layout**: Replicated the 3-column monospace IDE interface (`IBM Plex Mono`), syntax-highlighted `musicFor()` pseudo-code manifesto, 4-row `_.-•:*^º'` ASCII wave equalizer, 32-character scrolling marquee, and cipher text scramble (`—~±§|[].+$^@*()•x%!?#`) on episode and view transitions.
- **Interactive ASCII Player Controls**: Clickable and pointer-draggable pure ASCII progress bar (`[||||||||||||..................] 14:20 / 58:00`) and volume bar (`[Vol: ||||||||--] 80%`) with tactile Web Audio detent clicks, plus episode index filtering and ascending/descending sort.
- **Procedural Ambient Drone Synthesizer (`createAmbientPad` / `[Synth Mode]`)**: Built-in zero-asset Web Audio synthesizer with 6 consonant chord voicings (`Dmaj9`, `F#m11`, `Cmaj9#11`, `Em9`, `Asus2/F`, `Bbmaj9`), slow LFO low-pass filter sweep, and generative bell overtones for instant offline/fallback playback and live spectrum drive.
- **`RAW / PRO` Hardware Switch (`P`) & 4 Editor Themes (`T`)**:
  - Defaults to `RAW` (pure 1:1 original look); switching to `PRO` unlocks the **32-Band Real-Time ASCII (`▁▂▃▄▅▆▇█`) / LED Dot-Matrix Spectrum Analyzer**, **Code-Comment Pomodoro Flow Timer (`/* FLOW_TIMER: 25:00 */`)** with two-tone harmonic overtone chime, and **Full Geek Keyboard Shortcuts** (`Space`, `←/→`, `↑/↓`, `R`, `S`, `T`, `P`).
  - Cycle through `MFP Dark`, `Gruvbox`, `Solarized`, and `Paper Light` themes via `T`.
- **UI Kit Extraction (`shared-ui/mfp-ui.js` & `lab.html`)**: Extracted `createAsciiBar`, `createSpectrum`, `createAmbientPad`, `createFlowTimer`, `scrambleText`, and `createSoundEngine` into [`shared-ui/mfp-ui.js`](./shared-ui/mfp-ui.js) (and site copy) with a 2×2 interactive playground and 1,380-track searchable vault in [`lab.html`](./sites/02-musicforprogramming/lab.html).

---

## [2026-11-04] — Specimen #01: True JPEG (`sites/01-truejpeg`)

### Architecture
- **Multi-Site Repo Structure (`main`)**: Encapsulated all site-specific code inside [`sites/01-truejpeg/`](./sites/01-truejpeg/) and reusable zero-dependency components inside [`shared-ui/`](./shared-ui/), keeping the repository root strictly for global docs.
- **Standalone Snapshot (`truejpeg` branch)**: Preserved a single-site root-level snapshot on the `truejpeg` branch.
- **Hybrid Media Proxy (`server.js`)**: Local port `6060` static server with on-demand upstream fallback for `/images/` & `/prompts/` (777 local assets, `104.28 MB`, ignored by Git).

### Features & Enhancements (`01-truejpeg`)
- **1:1 Deconstruction & Sync**: Replicated full Canvas dot-matrix physics (`dotType`), `OffscreenCanvas` Web Worker halftone reveal (`halftoneLater`), 3D dot globe, character scramble, and synced all **154 works** (`#001`–`#275`) into [`prompts.json`](./sites/01-truejpeg/prompts.json) and [`PROMPTS_CATALOG.md`](./sites/01-truejpeg/PROMPTS_CATALOG.md).
- **`RAW / PRO` Hardware Switch (`P`)**: Non-intrusive LED toggle defaulting to `RAW` (pure 1:1 original look) and unlocking Darkroom Pro tools in `PRO` mode:
  - **Optical Loupe**: Press-and-hold `1.5×–6.0×` wheel-zoom darkroom loupe with 64-dot bezel and reticle in Viewer.
  - **Exposure & Color Gene Lab**: Foldable `40×10` dot-matrix RGB/Luma histogram and 5-chip copyable HEX palette underneath `Show prompt`.
  - **Contact Sheet (`3`)**: High-density darkroom proof-sheet grid with film-strip perforation ticks.
  - **Web Audio Tactile Sound Engine (`createSoundEngine`)**: Procedural zero-asset Web Audio synthesis (`tick`, `switch`, `shutter`, `copy`) active exclusively in `PRO` mode, plus a two-layer darkroom ambient soundscape (`ambient`) showcased in `lab.html`.
- **`INK / PAPER` Theme (`T`)**: Honeycomb dot-wave transition between `#111110` darkroom ink and `#f4f3ee` museum warm paper, while keeping the Viewer in pure darkroom mode with warm tonal matting shadows.
- **UI Kit Extraction**: Extracted standalone [`shared-ui/truejpeg-ui.js`](./shared-ui/truejpeg-ui.js) (including `dotType`, `winFrame`, `renderHalftone`, `createWipe`, `scramble`, `createGlobe`, `attachLoupe`, `analyzeImage`, `drawDotHistogram`, `createSoundEngine`) and 2×2 interactive playground [`lab.html`](./sites/01-truejpeg/lab.html).
