# Specimen #04 · Igloo Inc (`igloo.inc` by Lusion)

> **100% Native Lusion WebGL2 3D Polar Monolith Mirror (`http://127.0.0.1:6063/`) + Non-Intrusive `RAW / PRO` Cryo-Telemetry HUD + Zero-Dependency GLSL Shader & Web Audio Component Library (`shared-ui/igloo-ui.js`)**

---

## 1. Quick Start

```bash
# 1. Pre-sync all 108 upstream Draco (.drc), Basis (.ktx2), EXR, Font & Spatial Audio (.ogg) assets
node sites/04-igloo-inc/sync_assets.js

# 2. Launch the Specimen #04 mirror & transparent proxy server on port 6063
node sites/04-igloo-inc/server.js
```

- **Main 1:1 WebGL2 3D Experience + `RAW / PRO` HUD**: `http://127.0.0.1:6063/`
- **2×2 Interactive Shader & Cryo Component Lab**: `http://127.0.0.1:6063/lab`
- **Cross-Site Zero-Dependency ESM Module**: `http://127.0.0.1:6063/shared-ui/igloo-ui.js`

---

## 2. Deconstructed Architecture (`App3D-d68cb154.js`)

| Subsystem | Upstream Implementation | Local Mirror & Extraction |
| :--- | :--- | :--- |
| **Diagonal Frost-Cut Transition** | `class f3` (`CA_ITERATIONS = 5`, `scroll-datatexture.ktx2`, `frost-datatexture.ktx2`, `blue-8-128-rgb.ktx2`) | Native in `/` + standalone WebGL2 GLSL port in `createFrostCutShader()` |
| **Batched Arctic Igloo Monolith** | `class F3` (`igloo.drc`, `igloo_cage.drc`, `igloo_outline.drc`, `igloo_scene.ktx2` LUT) | Full Draco & KTX2 mirror in `assets/` |
| **Cryo-Specimen Cubes (`0°C` / `-3°C`)** | `class aF` (`cubes/cube3.drc`, `pudgy.drc`, `cubes/cube1.drc`, `overpass_logo.drc`, `shattered_ring.drc`) | Full 3D mirror in `/` + 3D SDF Raymarched sandbox in `createCryoCubeWebGL()` |
| **3D VDB Volumetric Chamber** | `class UF` (`volumes/peachesbody_64.ktx2`, `x_64.ktx2`, `medium_32.ktx2`) | Full 3D texture mirror + Specimen Inspector |
| **100-Frame ASCII Wave Loader** | `index-2e130bc1.js` `@keyframes head` (`---===+++=` -> `===+++===-`) | 1:1 extracted in `createAsciiWaveLoader()` |
| **18-Track Spatial Audio Engine** | `audioworker-036a09db.js` + 18 `.ogg` stems | Cached in `assets/audio/` + pure Web Audio synth in `createCryoAudioEngine()` |
