# `decon-web` // Master Exhibition Portal (`portal/`)

> **Dual-Page Architecture: `http://127.0.0.1:6050/` (`labs.lusion.co` 4-Specimen Exhibition + 100vw×100vh Fullscreen Stage) + `http://127.0.0.1:6050/lab` (Standalone 30-Primitive Cross-Site Arsenal)**
> Local Museum Server Ports: **`6050`**, **`6080`**, and **`6000`**

---

## 🏛️ Dual-Page Architecture

1. **`http://127.0.0.1:6050/` — Pure `labs.lusion.co` 4-Specimen Exhibition (`portal/index.html` + `portal/app.js`)**:
   - **100% Pure Gallery Aesthetic**: Default `#FFFFFF` pure gallery white (`data-theme="light"`) and `#000000` obsidian black (`data-theme="dark"`), powered by authentic `Aeonik` + `IBMPlexMono-Medium` typography, 8° slanted 3-color parallelogram curtain wipes (`TransitionCover`), and the interactive `Lucy` mascot capsule logo (`LUSION : LABS`).
   - **4 Flagship Deconstructed Websites (`EXP 001` – `EXP 004`)**:
     - `EXP 001 · True JPEG (:6060)` — Live `TrueJpegUI.dotType` repulsion wordmark + `TrueJpegUI.createGlobe` + `TrueJpegUI.winFrame`.
     - `EXP 002 · musicForProgramming(); (:6061)` — Live `MfpUI.createSpectrum` 32-band analyzer + `_.-+:*^~'` wave + `MfpUI.createAsciiBar`.
     - `EXP 003 · Sam Becker Photos (:6062)` — Interactive 3D fan-out `oklch()` folder + `createExifPlate`.
     - `EXP 004 · Igloo Inc (:6063)` — Live WebGL2 `createCryoCubeWebGL` 3D SDF raymarched monolith + `createPolarReticleHud`.
   - **`grid` & `list` Views**: Asymmetric 24-column `grid` view and 12-column `list` chronicle view with real-time floating canvas preview.
   - **100% Full-Viewport Live Stage (`#fullscreen-stage`)**:
     - Clicking any specimen card triggers the 8° `TransitionCover`, **pauses all 4 homepage gallery engines (`0%` background CPU/GPU overhead)**, and mounts a `100vw × 100vh` borderless live `<iframe id="stage-iframe">`.
     - Top-left floating frosted glass capsule HUD bar (`.stage-hud-bar`) provides `← BACK (ESC)`, `1:1 LIVE SITE` / `SITE /LAB` viewport switching, `ⓘ R&D DOSSIER` popover (with formulas and direct `/lab#sb-XX` module chips), `OPEN :606X ↗`, and `HIDE HUD` collapse mode.

2. **`http://127.0.0.1:6050/lab` — Standalone 30-Primitive Cross-Site Component Arsenal (`portal/lab.html` + `portal/lab.js`)**:
   - Houses the **30-Primitive Quick-Jump Index Strip** (`#primitive-index-strip`), category filters (`ALL 16`, `WEBGL2 & 3D`, `CANVAS & PHYSICS`, `WEB AUDIO`, `PHOTO & EXIF`), and all **16 Live Interactive Bento Sandboxes (`SB-01` – `SB-16`)**.
   - Equipped with a true `IntersectionObserver` viewport sleep scheduler (`.pause()` / `.resume()` / `.stop()` / `.start()`) and zero-`ctx.filter` hardware-accelerated 3D cylindrical DoF typography for locked 60/120fps scrolling.

---

## 🔌 Server Routes (`portal/server.js`)

| Method & Path | Description |
| :--- | :--- |
| `GET /`, `/index.html`, `/cards`, `/list` | Serves `portal/index.html` (Main 4-Specimen Exhibition Portal). |
| `GET /lab`, `/lab/`, `/lab.html` | Serves `portal/lab.html` (Standalone 30-Primitive Component Arsenal). |
| `GET /shared-ui/*` | Maps directly to `/shared-ui/*.js` ES6 modules. |
| `GET /api/status` | Concurrently probes `127.0.0.1:6060`–`6063` liveness & response latency (`ms`). |
| `POST /api/wake` | Spawns detached background server processes for any sleeping specimen ports (`01`–`04` or `all`). |
