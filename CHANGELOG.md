# Changelog

All notable deconstruction milestones and architectural changes in `decon-web`.

## [2026-11-06] — v1.1: Full-Stack Security Hardening, Atomic Cache, Igloo Scene-01 Fast Path & 0ms Stage Return

### Security, Protocol & Atomic Persistence (`shared/static-server.js` & 5 Node Servers)
- **Shared Server Security Foundation ([`shared/static-server.js`](./shared/static-server.js))**: Consolidated common security, caching, and static hosting primitives across `portal/server.js` and `sites/01..04/server.js`:
  - **Malformed URL Crash Prevention (`safeDecodePath`)**: Safely wraps `decodeURIComponent` and rejects control characters or malformed percent-encoding (e.g., `/%E0%A4%A` returns `400 Bad Request` without crashing Node processes).
  - **Strict Directory Traversal Protection (`isPathInsideRoot`)**: Replaced naive `.startsWith()` checks with `path.relative()` boundary validation and explicit `..` / backslash guards (`403 Forbidden`).
  - **Loopback CORS Whitelist & Local JSON POST Guard (`getCorsOrigin`, `verifyLocalJsonPost`)**: Removed wildcard `Access-Control-Allow-Origin: *` headers in favor of strict loopback origin matching (`127.0.0.1` / `localhost`), and hardened `POST /api/wake` (`:6050`) and `POST /api/ingest` (`:6062`) against cross-origin `text/plain` CSRF (`415 Unsupported Media Type` / `403 Forbidden`).
  - **Stored XSS & Binary Upload Hardening (`03-sambecker-photos` & `shared-ui/photo-vault-ui.js`)**: Added server-side JPEG/PNG/WebP magic-byte verification, `MAX_USER_PHOTOS = 100` cap, metadata sanitization, and dynamic `index` calculation on `POST /api/ingest`, paired with front-end `escapeHtml` and `sanitizeImageSrc` across `createExifPlate`, `createFilmRecipeCard`, `createCommandPalette`, and gallery views.
  - **Atomic Disk Writes & Deduped Upstream Fetching (`writeFileAtomicSync`, `fetchUpstreamBuffer`)**: All upstream proxy caches (`01-truejpeg`, `02-musicforprogramming`, `03-sambecker-photos`, `04-igloo-inc`) and `sync_images.js` now write to `.tmp` files and atomically `fs.renameSync` to destination with 15s timeouts and redirect caps, eliminating half-written corrupted files on disk.
  - **RFC 9110 Standard HTTP `Range` (`206` / `416`) & Child Process Lifecycle**: Implemented full suffix (`bytes=-500`) and interval byte-range parsing with `416 Range Not Satisfiable` guards, removed unsafe port `6000` from Portal, and registered `SIGINT` / `SIGTERM` / `exit` cleanup for spawned specimen servers.
- **Single Source of Truth for `shared-ui/`**: Removed 4 stale duplicate component copies inside `sites/01..04/` (reducing redundant code by `5,600+` lines); all specimen apps and `/lab` workbenches now import exclusively from `/shared-ui/*.js`.
- **Compliance & Licensing**: Removed third-party Cloudflare Beacon telemetry from `sites/01-truejpeg/legal.html`, replaced external `labs.lusion.co` font hotlinks in `portal/styles.css` with local font matching and cached `.woff2`, and added root [`LICENSE`](./LICENSE) (MIT + non-commercial attribution notice), [`package.json`](./package.json), [`scripts/smoke-test.js`](./scripts/smoke-test.js) (39 automated assertions), and GitHub Actions CI ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)).

### Performance & Instant Stage Transitions (`portal/` & `04-igloo-inc`)
- **Card #04 (`?embed=card`) Scene-01 Only Fast Path**: Patched `App3D-d68cb154.js` (idempotently persisted by `sites/04-igloo-inc/server.js`) and `pro-hud.js` so `?embed=card` only initializes Scene 01 (`igloo: F3`) at `DPR = 1`, skipping `cubes`, `entry`, `detailScene`, 3D project text meshes, 13 `.ogg` audio downloads, and hidden PRO HUD DOM/loops—cutting ~85% of background card initialization overhead while preserving 100% of the live 3D Igloo intro animation and full 4-scene experience in fullscreen stage.
- **Zero-Flash Stage Switch & `0ms` Homepage Return**: Replaced the full-screen 2× DPR `#transition-cover` parallelogram wipe with a zero-canvas instant trigger and preserved `Card #04`'s WebGL2 context via `pauseGalleryEngines({ unmountWebGL: false })`, achieving `0ms` zero-reload restoration when clicking the top-left Lucy logo to return home.

---

## [2026-11-05] — v1.0: Master Exhibition Portal (`:6050`) & 16-Sandbox Shared-UI Component Lab

### Master Exhibition Portal (`portal/`)
- **Unified `grid | list | lab` SPA (`http://127.0.0.1:6050/`)**: Built the Lusion Labs-inspired Master Exhibition Portal hosting all 4 specimen reconstructions with automatic background process wake-up (`POST /api/wake`), live port health & latency telemetry (`GET /api/status`), and an embedded `100vw × 100vh` Fullscreen Stage (`#fullscreen-stage`) with progressive Escape / Mouse Back / top-left Lucy mascot return.
- **Diagonal Asymmetric Gallery (`grid`) & 2× Retina Procedural Preview (`list`)**: Designed a 24-column staggered diagonal card layout with live interactive engines (`Card #01` True JPEG halftone/dot-matrix, `Card #02` MFP dual-column IDE & spectrum, `Card #03` Sam Becker 3D fan stack, `Card #04` live `:6063/?embed=card` 3D WebGL stage) and a 2× Retina floating preview canvas in `list` view featuring real-time 3D procedural cryo-dome rendering for `Igloo Inc`.
- **120fps Pure-GPU 3-State Slot-Roller Header & Horizon Lock**: Upgraded `#header` to a zero-DOM-rewrite 3-state slot-roller (`PLAY GROUND` ↔ `CHRONICLE` ↔ `COMPONENT LAB`) with `scrollbar-gutter: stable` and unified `1800px` container geometry (`CLS = 0.00px`).
- **30-Primitive × 16-Sandbox Shared-UI Component Lab (`/lab`)**: Assembled 16 interactive Bento sandboxes (`SB-01` through `SB-16`) showcasing all 30 extracted primitives from `/shared-ui/*.js`, complete with live parameter controls, category filtering, ESM code copy drawers, `ETag` `304` V8 bytecode caching, and `requestIdleCallback` time-sliced warmup.

---

## [2026-11-04] — Specimen #04: Igloo Inc (`sites/04-igloo-inc`)

### Architecture & 100% Native WebGL2 3D Mirror Layer
- **Isolated Site Archive (`sites/04-igloo-inc/`)**: Added Specimen #04 (`https://www.igloo.inc/` by Lusion) strictly inside `sites/04-igloo-inc/` and `shared-ui/igloo-ui.js` (served directly via `/shared-ui/igloo-ui.js` as the single source of truth), with zero modifications to `sites/01-truejpeg/`, `sites/02-musicforprogramming/`, `sites/03-sambecker-photos/`, or their shared UI kits.
- **Transparent Upstream Proxy & Disk Cache Server (`server.js`, port `6063`)**: Supports `/shared-ui/*` cross-directory routing, `/lab` & `/lab.html` component lab routing, `/portfolio/*` SPA routing, and `/assets/*` local disk cache hosting with `inFlightProxy`-deduplicated HTTPS fallback to `https://www.igloo.inc/assets/*`, exact binary MIME mapping (`.wasm` → `application/wasm`, `.ktx2` → `image/ktx2`, `.drc` / `.exr` → `application/octet-stream`, `.ogg` → `audio/ogg` with HTTP `Range` support, `.woff2` → `font/woff2`), and automatic patching of `index-2e130bc1.js` (`"https://www.igloo.inc/"` → `"/"`).
- **One-Command 3D Asset Pre-Sync (`sync_assets.js`)**: Pre-fetches and caches all **108 upstream WebGL2 3D assets (`18.25 MB`)** into `sites/04-igloo-inc/assets/` (ignored by `.gitignore`), covering `index-2e130bc1.js`, `App3D-d68cb154.js`, 4 Web Workers (`audioworker`, `msdfworker`, `bitmapworker`, `exrworker`), Draco & Basis Universal WASM decoders, 20 `.drc` 3D meshes, 46 `.ktx2` / `.exr` / `.png` textures & 3D VDB volumetric clouds, MSDF 3D font atlases, and 18 spatial `.ogg` audio tracks.

### Features & Enhancements (`04-igloo-inc`)
- **Pure Zero-DOM `RAW` Mode & Stealth Keyboard Summon (`pro-hud.js` & `styles.css`, `CLS = 0.00px`)**:
  - **100% Pure `RAW` Default**: Renders zero visible external buttons or capsule bars in `RAW` mode and strictly locks `data-igloo-optics="CRYO-STD"` (`filter: none !important`), preserving an untouched 1:1 `igloo.inc` canvas.
  - **Stealth Keyboard Summon (`P` / `Esc` / `L` / `T` / `G`)**: Press `P` to summon/dismiss the `PRO` Polar Telemetry HUD overlay (`Esc` exits immediately back to pure `RAW` mode and resets optical filters to `CRYO-STD`; `L` opens `/lab` in a new tab). Optical filter cycling (`T`: `CRYO-STD` / `POLAR-NIGHT` / `THERMAL-IR` / `WIREFRAME-XRAY`) and polar rangefinder grid toggling (`G`) operate exclusively in `PRO` mode.
  - **Non-Intrusive WebGL2 Pipeline Probe & 3 Telemetry Organs**: Wraps `HTMLCanvasElement.prototype.getContext` to read live GPU FPS/frame time, draw calls, triangle counts, and `class f3` shader uniforms (`uProgress`, `uProgressVel`, `uDetailProgress`), driving the **Polar Telemetry Reticle & Depth Gauge**, **WebGL2 & Frost-Cut Shader Telemetry Drawer** (with 4-chapter smooth wheel pulse quick-jump and synthetic wind/shard audio controls), and **Cryo-Specimen Metadata Inspector**.
- **Zero-Dependency UI & Shader Kit Extraction (`shared-ui/igloo-ui.js` & `lab.html`)**:
  - Extracted 6 standalone zero-dependency modules (`createFrostCutShader`, `createCryoCubeWebGL`, `createAsciiWaveLoader`, `createPolarReticleHud`, `createBlurTextCylinder`, `createCryoAudioEngine`) plus `ASCII_WAVE_FRAMES_100`, `IGLOO_PORTFOLIO_DATA`, and `IGLOO_ASSET_INDEX` (all 44 indexed asset paths verified `200 OK`) with a 2×2 interactive WebGL2 shader & audio workbench in [`lab.html`](./sites/04-igloo-inc/lab.html).

---

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
- **UI Kit Extraction (`shared-ui/photo-vault-ui.js` & `lab.html`)**: Extracted zero-dependency ES6 modules (`createExifPlate`, `createFilmRecipeCard`, `parseExif`, `extractColorPalette`, `createCompositionOverlay`, `createOpticalLoupe`, `createCommandPalette`, `createShutterAudio`, `escapeHtml`, `sanitizeImageSrc`) into [`shared-ui/photo-vault-ui.js`](./shared-ui/photo-vault-ui.js) (served directly via `/shared-ui/photo-vault-ui.js` as the single source of truth) with a 2×2 interactive workbench in [`lab.html`](./sites/03-sambecker-photos/lab.html).

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
- **UI Kit Extraction (`shared-ui/mfp-ui.js` & `lab.html`)**: Extracted `createAsciiBar`, `createSpectrum`, `createAmbientPad`, `createFlowTimer`, `scrambleText`, and `createSoundEngine` into [`shared-ui/mfp-ui.js`](./shared-ui/mfp-ui.js) (served directly via `/shared-ui/mfp-ui.js` as the single source of truth) with a 2×2 interactive playground and 1,380-track searchable vault in [`lab.html`](./sites/02-musicforprogramming/lab.html).

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
- **UI Kit Extraction**: Extracted standalone [`shared-ui/truejpeg-ui.js`](./shared-ui/truejpeg-ui.js) (served directly via `/shared-ui/truejpeg-ui.js`, including `dotType`, `winFrame`, `renderHalftone`, `createWipe`, `scramble`, `createGlobe`, `attachLoupe`, `analyzeImage`, `drawDotHistogram`, `createSoundEngine`) and 2×2 interactive playground [`lab.html`](./sites/01-truejpeg/lab.html).
