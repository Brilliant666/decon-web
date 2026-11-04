# Changelog

All notable deconstruction milestones and architectural changes in `decon-web`.

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
