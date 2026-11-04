/**
 * shared-ui/igloo-ui.js
 * Specimen #04: Igloo Inc (https://www.igloo.inc/ by Lusion)
 * Zero-Dependency WebGL2 GLSL Shaders, 3D SDF Cryo-Cube Raymarcher,
 * 100-Frame ASCII Wave Loader, Polar Telemetry Reticle HUD,
 * 3D DoF Blur-Text Cylinder & Web Audio Cryo Synthesizer.
 *
 * Exports (ESM + window.IglooUI):
 *   1. createFrostCutShader(canvas, options)
 *   2. createCryoCubeWebGL(canvas, options)
 *   3. createAsciiWaveLoader(el, options)
 *   4. createPolarReticleHud(containerEl, options)
 *   5. createBlurTextCylinder(canvas, options)
 *   6. createCryoAudioEngine(options)
 *   + ASCII_WAVE_FRAMES_100, IGLOO_PORTFOLIO_DATA, IGLOO_ASSET_INDEX
 */

// ============================================================================
// 0. AUTHENTIC EXTRACTED CONSTANTS & PORTFOLIO / ASSET ARCHIVE
// ============================================================================

export const ASCII_WAVE_FRAMES_100 = [
  '---===+++=', '----===+++', '-----===++', '------===+', '=------===',
  '==------==', '+==------=', '++==------', '=++==-----', '==++==----',
  '-==++==---', '--==++==--', '=--==++==-', '==--==++==', '+==--==++=',
  '=+==--==++', '==+==--==+', '-==+==--==', '--==+==--=', '---==+==--',
  '=---==+==-', '==---==+==', '===---==+=', '+===---==+', '++===---==',
  '+++===---=', '=+++===---', '==+++===--', '===+++===-', '-===+++===',
  '--===+++==', '---===+++=', '----===+++', '=----===++', '+=----===+',
  '=+=----===', '-=+=----==', '--=+=----=', '---=+=----', '----=+=---',
  '=----=+=--', '==----=+=-', '===----=+=', '+===----=+', '++===----=',
  '+++===----', '=+++===---', '==+++===--', '===+++===-', '-===+++===',
  '--===+++==', '---===+++=', '----===+++', '-----===++', '------===+',
  '=------===', '==------==', '+==------=', '++==------', '=++==-----',
  '==++==----', '-==++==---', '--==++==--', '=--==++==-', '==--==++==',
  '+==--==++=', '=+==--==++', '==+==--==+', '-==+==--==', '--==+==--=',
  '---==+==--', '=---==+==-', '==---==+==', '===---==+=', '+===---==+',
  '++===---==', '+++===---=', '=+++===---', '==+++===--', '===+++===-',
  '-===+++===', '--===+++==', '---===+++=', '----===+++', '=----===++',
  '+=----===+', '=+=----===', '-=+=----==', '--=+=----=', '---=+=----',
  '----=+=---', '=----=+=--', '==----=+=-', '===----=+=', '+===----=+',
  '++===----=', '+++===----', '=+++===---', '==+++===--', '===+++===-',
  '===+++===-'
];

export const IGLOO_PORTFOLIO_DATA = {
  manifesto: {
    title: '////// Manifesto',
    text: 'Our mission is to build the next generation of consumer brands at the intersection of Community, AI, and crypto.',
    copyright: '// Copyright © 2026',
    rights: 'Igloo, Inc. All Rights Reserved.'
  },
  specimens: [
    {
      id: 'igloo-monolith',
      code: 'SECTOR_00 // IGLOO MONOLITH',
      title: 'IGLOO_EXTERIOR // ARCTIC DOME',
      hash: 'igloo-exterior',
      date: '2024.05.07',
      temp: -18,
      altitude: '+32.0m',
      drcMeshes: ['igloo.drc (217.6 KB)', 'igloo/igloo_cage.drc (5.6 KB)', 'igloo/igloo_outline.drc (19.9 KB)', 'ground.drc (18.4 KB)', 'mountain.drc (11.6 KB)', 'intro_particles.drc (2.0 KB)'],
      ktx2Maps: ['igloo/igloo_scene.ktx2 (LUT)', 'igloo/igloo_color.ktx2', 'igloo/igloo_exploded_color.ktx2', 'igloo/ground_glow.ktx2', 'wind_noise.ktx2', 'numbers-datatexture.ktx2'],
      shaderClass: 'class F3 (IglooExteriorScene) + class f3 (FrostCutComposite)',
      summary: 'Batched Draco igloo blocks with spring-damper hover displacement, tetrahedral LUT grading, procedural wind snow drift, and MSDF floating coordinate numerals.'
    },
    {
      id: 'pudgy-penguins',
      code: 'PORTFOLIO_CO_01 // PUDGY PENGUINS',
      title: 'PORTFOLIO_CO_01 Pudgy Penguins',
      hash: 'pudgy-penguins',
      date: '01.02.2020',
      temp: 0,
      altitude: '-12.0m',
      obj: 'cube3',
      innerobject: 'pudgy',
      drcMeshes: ['cubes/cube3.drc (39.4 KB)', 'cubes/pudgy.drc (29.9 KB)', 'shattered_ring.drc (39.7 KB)', 'shattered_ring2.drc (42.5 KB)', 'blurrytext_cylinder.drc (5.4 KB)', 'smoke_trail.drc (4.0 KB)'],
      ktx2Maps: ['cubes/cube3_normal.ktx2 (1.1 MB)', 'cubes/cube3_roughness.ktx2', 'cubes/pudgy_color.ktx2', 'frost-datatexture.ktx2', 'caustics.ktx2', 'cubes_env.exr (HDRI)'],
      shaderClass: 'class aF (CryoCubeScene) + Subsurface Caustics & IOR 1.31 Refraction',
      summary: 'Pudgy Penguins, founded in 2021 and acquired by Igloo Inc. in 2022, transforms Web3 IP into a brand-and-participant model across global physical and onchain experiences.'
    },
    {
      id: 'overpass',
      code: 'PORTFOLIO_CO_02 // OVERPASS',
      title: 'PORTFOLIO_CO_02 Overpass',
      hash: 'overpass',
      date: '06.01.2023',
      temp: -3,
      altitude: '-28.5m',
      obj: 'cube1',
      innerobject: 'overpass_logo',
      drcMeshes: ['cubes/cube1.drc (27.4 KB)', 'cubes/overpass_logo.drc (14.2 KB)', 'cubes/background_shapes.drc', 'floor.drc (39.8 KB)', 'ceilingsmoke.drc (13.4 KB)'],
      ktx2Maps: ['cubes/cube1_normal.ktx2 (1.05 MB)', 'cubes/cube1_roughness.ktx2', 'cubes/overpass_logo_color.ktx2', 'overpass_logo_dark_color.ktx2', 'cubes/dot_pattern.ktx2', 'bokeh.ktx2'],
      shaderClass: 'class aF (CryoCubeScene) + class JF (InteriorCausticsVault)',
      summary: 'OverpassIP pioneers onchain intellectual property licensing, empowering NFT holders and consumer brands to forge dynamic licensing partnerships.'
    },
    {
      id: 'manifesto-vdb',
      code: 'SECTOR_03 // VDB VOLUME CHAMBER',
      title: 'ENTRY_CHAMBER // 3D VDB VOLUMES',
      hash: 'manifesto-links',
      date: '2026.11.04',
      temp: -42,
      altitude: '-48.0m',
      drcMeshes: ['floor.drc (39.8 KB)', 'ceilingsmoke.drc (13.4 KB)', 'blurrytext.drc (1.2 KB)'],
      ktx2Maps: ['volumes/peachesbody_64.ktx2 (817 KB 3D VDB)', 'volumes/x_64.ktx2 (311 KB 3D VDB)', 'volumes/medium_32.ktx2 (44 KB 3D VDB)', 'clouds_noise.ktx2', 'noises/blue-8-128-rgb.ktx2'],
      shaderClass: 'class UF (EntryVolumeScene) + 3D Texture Raymarching VDB Holograms',
      summary: 'Subterranean ice floor with raymarched 3D VDB volumetric particle clouds morphing between LinkedIn (peachesbody_64), X/Twitter (x_64), and Medium (medium_32).'
    }
  ]
};

export const IGLOO_ASSET_INDEX = [
  { cat: 'BUNDLE', name: 'assets/index-2e130bc1.js', size: '16.1 KB', role: 'Svelte Entry + 100-Frame ASCII Loader' },
  { cat: 'BUNDLE', name: 'assets/App3D-d68cb154.js', size: '1,451.5 KB', role: 'Lusion Custom WebGL2 Engine + Three.js + GLSL Shaders' },
  { cat: 'WORKER', name: 'assets/audioworker-036a09db.js', size: '113.6 KB', role: 'Off-Thread OGG Vorbis Audio Decoder Worker' },
  { cat: 'WORKER', name: 'assets/msdfworker-ac346fa7.js', size: '3.1 KB', role: 'MSDF 3D Text Glyph Layout & Kerning Worker' },
  { cat: 'WORKER', name: 'assets/bitmapworker-046527f8.js', size: '2.9 KB', role: 'ImageBitmap Async Texture Upload Worker' },
  { cat: 'WORKER', name: 'assets/exrworker-41cbee65.js', size: '81.5 KB', role: 'HDR OpenEXR Environment Map Decoder Worker' },
  { cat: 'WASM', name: 'assets/libs/draco/draco_decoder.wasm', size: '279.2 KB', role: 'Google Draco 3D Mesh Decompression WASM' },
  { cat: 'WASM', name: 'assets/libs/basis/basis_transcoder.wasm', size: '461.8 KB', role: 'Basis Universal KTX2 GPU Texture Transcoder WASM' },
  { cat: 'DRC', name: 'assets/geometries/igloo.drc', size: '217.6 KB', role: 'Batched Igloo Ice-Block Dome Geometry' },
  { cat: 'DRC', name: 'assets/geometries/igloo/igloo_cage.drc', size: '5.6 KB', role: 'Structural Wireframe Cage Overlay Mesh' },
  { cat: 'DRC', name: 'assets/geometries/igloo/igloo_outline.drc', size: '19.9 KB', role: 'Igloo Silhouette Edge Highlight Mesh' },
  { cat: 'DRC', name: 'assets/geometries/ground.drc', size: '18.4 KB', role: 'Arctic Tundra Terrain Mesh' },
  { cat: 'DRC', name: 'assets/geometries/mountain.drc', size: '11.6 KB', role: 'Horizon Polar Mountain Ridge Mesh' },
  { cat: 'DRC', name: 'assets/geometries/cubes/cube3.drc', size: '39.4 KB', role: 'Cryo-Specimen 01 Beveled Ice Cube Mesh' },
  { cat: 'DRC', name: 'assets/geometries/cubes/pudgy.drc', size: '29.9 KB', role: 'Encased Pudgy Penguin Inner Specimen Mesh' },
  { cat: 'DRC', name: 'assets/geometries/cubes/cube1.drc', size: '27.4 KB', role: 'Cryo-Specimen 02 Beveled Ice Cube Mesh' },
  { cat: 'DRC', name: 'assets/geometries/cubes/overpass_logo.drc', size: '14.2 KB', role: 'Encased Overpass Emblem Inner Specimen Mesh' },
  { cat: 'DRC', name: 'assets/geometries/shattered_ring.drc', size: '39.7 KB', role: 'Orbital Shattered Ice Ring Lattice #1' },
  { cat: 'DRC', name: 'assets/geometries/shattered_ring2.drc', size: '42.5 KB', role: 'Orbital Shattered Ice Ring Lattice #2' },
  { cat: 'DRC', name: 'assets/geometries/blurrytext_cylinder.drc', size: '5.4 KB', role: '3D Cylindrical DoF Typography Mesh' },
  { cat: 'DRC', name: 'assets/geometries/floor.drc', size: '39.8 KB', role: 'Subterranean Cavern Reflective Ice Floor' },
  { cat: 'KTX2', name: 'assets/images/scroll-datatexture.ktx2', size: '1,256.3 KB', role: 'R/G/B Multi-Channel Diagonal Frost-Cut Displacement Map' },
  { cat: 'KTX2', name: 'assets/images/frost-datatexture.ktx2', size: '131.6 KB', role: 'Crystalline Ice Normal & Detail Transition Map' },
  { cat: 'KTX2', name: 'assets/images/wind_noise.ktx2', size: '17.7 KB', role: 'Polar Surface Wind Snow Drift Noise Texture' },
  { cat: 'KTX2', name: 'assets/images/smoke_datatexture.ktx2', size: '3.7 KB', role: 'Volumetric Frost & Smoke Advection Data Texture' },
  { cat: 'KTX2', name: 'assets/images/noises/blue-8-128-rgb.ktx2', size: '49.2 KB', role: '128×128 RGB Blue Noise Dithering Texture' },
  { cat: 'KTX2', name: 'assets/images/cubes/cube3_normal.ktx2', size: '1,107.8 KB', role: 'Cryo Cube 01 High-Res Surface Normal Map' },
  { cat: 'KTX2', name: 'assets/images/cubes/cube1_normal.ktx2', size: '1,051.9 KB', role: 'Cryo Cube 02 High-Res Surface Normal Map' },
  { cat: 'KTX2', name: 'assets/images/igloo/igloo_exploded_color.ktx2', size: '822.5 KB', role: 'Igloo Exploded Block Albedo & Subsurface Bake' },
  { cat: 'KTX2', name: 'assets/images/volumes/peachesbody_64.ktx2', size: '817.0 KB', role: '64³ 3D VDB Volumetric Texture (Pudgy/LinkedIn)' },
  { cat: 'KTX2', name: 'assets/images/volumes/x_64.ktx2', size: '311.0 KB', role: '64³ 3D VDB Volumetric Texture (X Emblem)' },
  { cat: 'KTX2', name: 'assets/images/volumes/medium_32.ktx2', size: '44.3 KB', role: '32³ 3D VDB Volumetric Texture (Medium Emblem)' },
  { cat: 'KTX2', name: 'assets/images/caustics.ktx2', size: '2.4 KB', role: 'Refractive Ice Caustics Projection Map' },
  { cat: 'EXR', name: 'assets/images/cubes_env.exr', size: '253.1 KB', role: '32-Bit HDR Equirectangular Cryo Reflection Probe' },
  { cat: 'EXR', name: 'assets/images/igloo/mountain_env.exr', size: '253.1 KB', role: '32-Bit HDR Polar Horizon Environment Map' },
  { cat: 'FONT', name: 'assets/fonts/IBMPlexMono-Medium-datatexture.ktx2', size: '107.7 KB', role: 'MSDF 3D Font Distance Field Texture Atlas' },
  { cat: 'AUDIO', name: 'assets/audio/music-highq.ogg', size: '1,491.8 KB', role: 'Ambient Arctic Synth Score (Loop)' },
  { cat: 'AUDIO', name: 'assets/audio/room.ogg', size: '595.4 KB', role: 'Sub-Zero Cryo Cavern Resonance Drone' },
  { cat: 'AUDIO', name: 'assets/audio/wind.ogg', size: '559.5 KB', role: 'Surface Polar Blizzard Wind Loop' },
  { cat: 'AUDIO', name: 'assets/audio/shard.ogg', size: '21.2 KB', role: 'Crystalline Ice Shard Fracture Transient' },
  { cat: 'AUDIO', name: 'assets/audio/enter-project.ogg', size: '21.1 KB', role: 'Sub-Bass Cryo Cube Dive Resonance' },
  { cat: 'AUDIO', name: 'assets/audio/beeps.ogg', size: '9.5 KB', role: 'High-Frequency Telemetry Reticle Pulse Beep #1' },
  { cat: 'AUDIO', name: 'assets/audio/beeps2.ogg', size: '10.0 KB', role: 'High-Frequency Telemetry Reticle Pulse Beep #2' },
  { cat: 'AUDIO', name: 'assets/audio/beeps3.ogg', size: '9.9 KB', role: 'High-Frequency Telemetry Reticle Pulse Beep #3' }
];

// ============================================================================
// INTERNAL WEBGL2 HELPER UTILITIES
// ============================================================================

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`GLSL Compile Error: ${info}`);
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`GLSL Link Error: ${info}`);
  }
  return prog;
}

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function valueNoise2D(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm2D(x, y, octaves = 4) {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise2D(x * freq, y * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return val;
}

// ============================================================================
// 1. createFrostCutShader(canvas, options = {})
//    1:1 WebGL2 GLSL replica of Lusion's `class f3` Diagonal Frost-Cut &
//    5-Iteration Chromatic Aberration Transition Shader
// ============================================================================

export function createFrostCutShader(canvas, options = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) {
    throw new Error('WebGL2 not available on canvas for createFrostCutShader');
  }

  let progress = typeof options.initialProgress === 'number' ? options.initialProgress : 0.46;
  let targetProgress = progress;
  let velocity = typeof options.initialVelocity === 'number' ? options.initialVelocity : 0.35;
  let chromaticStrength = typeof options.chromaticStrength === 'number' ? options.chromaticStrength : 1.0;
  let frostDensity = typeof options.frostDensity === 'number' ? options.frostDensity : 1.0;
  let detailProgress = typeof options.detailProgress === 'number' ? options.detailProgress : 0.0;
  let destroyed = false;
  let rafId = null;

  const vsSource = `#version 300 es
    in vec2 aPosition;
    out vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  // Exact GLSL port of class f3 + d3 (CA_ITERATIONS = 5) from App3D-d68cb154.js
  const fsSource = `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 fragColor;

    uniform sampler2D tScene1;
    uniform sampler2D tScene2;
    uniform sampler2D tScroll;
    uniform sampler2D tFrost;
    uniform sampler2D tBlue;

    uniform vec2 uResolution;
    uniform vec2 uBlueOffset;
    uniform float uProgress;
    uniform float uProgressVel;
    uniform float uChromaticStrength;
    uniform float uFrostDensity;
    uniform float uDetailProgress;
    uniform float uTime;

    #define PI 3.141592653589793
    #define HALF_PI 1.5707963267948966
    #define CA_ITERATIONS 5

    float cubicIn(float t) { return t * t * t; }
    float cubicOut(float t) { float f = t - 1.0; return f * f * f + 1.0; }
    float quadraticIn(float t) { return t * t; }
    float quadraticOut(float t) { return -t * (t - 2.0); }
    float quinticOut(float t) { return 1.0 - pow(1.0 - t, 5.0); }

    #define power1In(t) quadraticIn(t)
    #define power2In(t) cubicIn(t)
    #define power2Out(t) cubicOut(t)
    #define power4Out(t) quinticOut(t)

    float _linstep(float begin, float end, float t) {
      return clamp((t - begin) / (end - begin), 0.0, 1.0);
    }

    float fit(float value, float low1, float high1, float low2, float high2) {
      return clamp(low2 + (value - low1) * (high2 - low2) / (high1 - low1), min(low2, high2), max(low2, high2));
    }

    float falloff(float _input, float start, float end, float margin, float progress) {
      float m = margin * sign(end - start);
      float p = mix(start - m, end, progress);
      return _linstep(p + m, p, _input);
    }

    vec4 getNoise(sampler2D tex, vec2 fragCoord, vec2 offset) {
      float invSize = 1.0 / float(textureSize(tex, 0).x);
      return texture(tex, fragCoord * invSize + offset);
    }

    float ca_linterp(float t) {
      return clamp(1.0 - abs(2.0 * t - 1.0), 0.0, 1.0);
    }

    float ca_remap(float t, float a, float b) {
      return clamp((t - a) / (b - a), 0.0, 1.0);
    }

    vec2 ca_barrelDistortion(vec2 coord, float amt) {
      vec2 cc = coord - 0.5;
      float dist = dot(cc, cc);
      return coord + cc * dist * amt;
    }

    vec4 ca_spectrum_offset(float t) {
      vec4 ret;
      float lo = step(t, 0.5);
      float hi = 1.0 - lo;
      float w = ca_linterp(ca_remap(t, 1.0 / 6.0, 5.0 / 6.0));
      ret = vec4(lo, 1.0, hi, 1.0) * vec4(1.0 - w, w, 1.0 - w, 1.0);
      return pow(max(ret, vec4(0.0)), vec4(1.0 / 2.2));
    }

    const float RECI_ITER = 1.0 / float(CA_ITERATIONS);

    vec4 chromatic_aberration(sampler2D tex, vec2 uv, float maxdistort, float bendAmount) {
      vec4 sumcol = vec4(0.0);
      vec4 sumw = vec4(0.0);
      for (int i = 0; i < CA_ITERATIONS; ++i) {
        float t = float(i) * RECI_ITER;
        vec4 w = ca_spectrum_offset(t);
        sumw += w;
        vec2 sampleUv = clamp(ca_barrelDistortion(uv, bendAmount * maxdistort * t), 0.002, 0.998);
        sumcol += w * texture(tex, sampleUv);
      }
      return sumcol / sumw;
    }

    void main() {
      float aspect = uResolution.x / max(uResolution.y, 1.0);
      vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
      vec3 color = vec3(0.0);

      if (uProgress > 0.0001 && uProgress < 0.9999) {
        vec2 uvTex = uv - 0.5;
        uvTex.x *= aspect;
        uvTex += 0.5;

        vec3 scrollTex = texture(tScroll, uvTex * uFrostDensity).rgb;
        vec3 frostTex = texture(tFrost, uvTex * (1.8 * uFrostDensity) + vec2(uTime * 0.01, -uTime * 0.008)).rgb;

        // Exact class f3 slope displacement & diagonal inclination math
        float slopeDisp = ((scrollTex.b * 0.75 + frostTex.r * 0.25) * 2.0 - 1.0) * 0.4 * uFrostDensity;
        float velBoost = 1.0 + uProgressVel * 0.65;
        float slope = -0.2 * aspect * velBoost * step(0.0, uProgress);
        float inclination = mix(1.0 - uv.x + slopeDisp, uv.x + slopeDisp, step(slope, 0.0));
        float incProgress = fit(uProgress, 0.0, 1.0, 0.0, 1.0 + abs(slope));

        // Chromatic aberration falloff band
        float cutDiagonalBlur = falloff(uv.y + inclination * abs(slope), 0.0, 1.0, 2.0, incProgress);

        // Tech displacement band
        float cutDiagonalDisplacement = falloff(uv.y + inclination * abs(slope), 0.0, 1.0, 0.9, incProgress);
        float cutDisp = falloff(scrollTex.g, 0.0, 1.0, 1.0, cutDiagonalDisplacement);

        // Sharp crystalline ice cut
        float cutDiagonal = falloff(uv.y + inclination * abs(slope), 0.0, 1.0, 0.2, incProgress);
        float cut = falloff(scrollTex.r, 0.0, 1.0, 2.0, cutDiagonal);

        const float parallaxY = 0.36;
        float displacement = 0.032 * uFrostDensity;

        // Blue noise seam dithering
        vec4 noise = getNoise(tBlue, gl_FragCoord.xy, uBlueOffset);

        vec3 scene1 = vec3(0.0);
        vec3 scene2 = vec3(0.0);
        float edgeMod = smoothstep(1.0, 0.55, abs(uv.x * 2.0 - 1.0)) * smoothstep(1.0, 0.55, abs(uv.y * 2.0 - 1.0));
        float modulator = (12.0 * edgeMod + 4.5 * uChromaticStrength) * uChromaticStrength * (0.7 + 0.6 * uProgressVel);

        vec2 frostRefract = (frostTex.rg * 2.0 - 1.0) * 0.018 * uFrostDensity * sin(cut * PI);

        if (cut < 1.0) {
          vec2 uv1 = uv - vec2(0.0, parallaxY * power2In(uProgress) + displacement * cutDisp) + frostRefract;
          scene1 = chromatic_aberration(tScene1, uv1, modulator, cutDiagonalBlur * (0.65 + 0.55 * noise.r)).rgb;
        }
        if (cut > 0.0) {
          vec2 uv2 = uv + vec2(0.0, parallaxY * power2In(1.0 - uProgress) + displacement * (1.0 - cutDisp)) - frostRefract;
          scene2 = chromatic_aberration(tScene2, uv2, modulator, (1.0 - cutDiagonalBlur) * (0.65 + 0.55 * noise.g)).rgb;
        }

        // Crystalline specular highlight along the frost cut boundary
        float seamHighlight = pow(max(0.0, 1.0 - abs(cut * 2.0 - 1.0)), 4.0);
        vec3 iceGleam = vec3(0.72, 0.89, 1.0) * seamHighlight * (0.35 + 0.45 * frostTex.b) * uFrostDensity;

        color = clamp(mix(scene1, scene2, cut) + iceGleam, vec3(0.0), vec3(1.0));
      } else if (uProgress <= 0.0001) {
        color = texture(tScene1, uv).rgb;
      } else {
        color = texture(tScene2, uv).rgb;
      }

      fragColor = vec4(color, 1.0);
    }
  `;

  const program = createProgram(gl, vsSource, fsSource);
  const quadVbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const posLoc = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Generate procedural textures matching scroll-datatexture.ktx2, frost-datatexture.ktx2, blue-8-128-rgb.ktx2
  function createDataTexture(w, h, generator, repeat = true) {
    const data = new Uint8Array(w * h * 4);
    generator(data, w, h);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    return tex;
  }

  // tScroll: R = crystalline shard mask, G = tech horizontal strip displacement, B = diagonal slope modulation
  const tScroll = createDataTexture(256, 256, (data, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        const ny = y / h;
        const r = fbm2D(nx * 9.0 + ny * 3.5, ny * 9.0 - nx * 2.0, 4);
        const QuantizedG = Math.floor(ny * 28.0) / 28.0;
        const g = valueNoise2D(nx * 6.0, QuantizedG * 32.0);
        const b = fbm2D(nx * 4.5, ny * 4.5, 3);
        const idx = (y * w + x) * 4;
        data[idx] = Math.min(255, Math.max(0, Math.floor(r * 255)));
        data[idx + 1] = Math.min(255, Math.max(0, Math.floor(g * 255)));
        data[idx + 2] = Math.min(255, Math.max(0, Math.floor(b * 255)));
        data[idx + 3] = 255;
      }
    }
  });

  // tFrost: high-frequency crystalline Voronoi + facet normal pattern
  const tFrost = createDataTexture(256, 256, (data, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x / w) * 14.0;
        const ny = (y / h) * 14.0;
        const n1 = fbm2D(nx, ny, 5);
        const n2 = fbm2D(nx + 5.2, ny + 1.3, 5);
        const ridge = 1.0 - Math.abs(n1 * 2.0 - 1.0);
        const idx = (y * w + x) * 4;
        data[idx] = Math.floor(n1 * 255);
        data[idx + 1] = Math.floor(n2 * 255);
        data[idx + 2] = Math.floor(Math.pow(ridge, 2.0) * 255);
        data[idx + 3] = 255;
      }
    }
  });

  // tBlue: 128x128 high-frequency blue-noise approximation
  const tBlue = createDataTexture(128, 128, (data, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        data[idx] = Math.floor(hash2(x * 1.37, y * 2.91) * 255);
        data[idx + 1] = Math.floor(hash2(x * 3.11 + 19, y * 1.73 + 47) * 255);
        data[idx + 2] = Math.floor(hash2(x * 2.41 + 73, y * 3.53 + 11) * 255);
        data[idx + 3] = 255;
      }
    }
  });

  // Render high-detail Scene 1 (Arctic Igloo Monolith) & Scene 2 (Subterranean Cryo Cube Vault) onto offscreen 2D canvases
  function buildSceneTexture(sceneIndex) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 640;
    const ctx = c.getContext('2d');

    if (sceneIndex === 1) {
      // SCENE 01: IGloo Exterior (#A0A5B1 Arctic Overcast Slate + Monolith Igloo Dome + HUD Numerals)
      const grad = ctx.createLinearGradient(0, 0, 0, c.height);
      grad.addColorStop(0, '#8D93A0');
      grad.addColorStop(0.54, '#A8AEBA');
      grad.addColorStop(0.56, '#7C828F');
      grad.addColorStop(1, '#585E6A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, c.width, c.height);

      // Distant mountain ridge
      ctx.fillStyle = '#6E7482';
      ctx.beginPath();
      ctx.moveTo(0, 355);
      ctx.lineTo(140, 305);
      ctx.lineTo(290, 338);
      ctx.lineTo(460, 285);
      ctx.lineTo(680, 340);
      ctx.lineTo(840, 295);
      ctx.lineTo(1024, 348);
      ctx.lineTo(1024, 365);
      ctx.lineTo(0, 365);
      ctx.closePath();
      ctx.fill();

      // Ground snow glow under igloo
      const glow = ctx.createRadialGradient(512, 395, 20, 512, 395, 290);
      glow.addColorStop(0, 'rgba(235, 245, 255, 0.72)');
      glow.addColorStop(0.5, 'rgba(185, 202, 225, 0.28)');
      glow.addColorStop(1, 'rgba(120, 130, 148, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(150, 240, 724, 300);

      // Igloo Dome Blocks (Batched Ice Bricks)
      ctx.save();
      ctx.translate(512, 380);
      const domeGrad = ctx.createRadialGradient(-45, -75, 15, 0, -20, 175);
      domeGrad.addColorStop(0, '#F6FAFF');
      domeGrad.addColorStop(0.55, '#C4CEDE');
      domeGrad.addColorStop(1, '#757E8F');
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 158, Math.PI, 0, false);
      ctx.ellipse(0, 0, 158, 28, 0, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();

      // Igloo wireframe cage lines (igloo_cage.drc)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.lineWidth = 1.4;
      for (let ring = 1; ring <= 5; ring++) {
        const ry = -ring * 27;
        const rx = Math.sqrt(Math.max(0, 158 * 158 - ry * ry));
        ctx.beginPath();
        ctx.ellipse(0, ry, rx, rx * 0.16, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let a = -5; a <= 5; a++) {
        const ang = (a / 6) * (Math.PI * 0.48);
        ctx.beginPath();
        ctx.moveTo(Math.sin(ang) * 158, 12);
        ctx.quadraticCurveTo(Math.sin(ang) * 110, -110, 0, -158);
        ctx.stroke();
      }

      // Entrance tunnel arch
      ctx.fillStyle = '#3B4250';
      ctx.strokeStyle = '#E6F0FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-78, 8, 42, Math.PI, 0, false);
      ctx.lineTo(-36, 22);
      ctx.lineTo(-120, 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Technical HUD markers in Scene 1
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 28px monospace';
      ctx.fillText('IGLOO', 56, 72);
      ctx.font = '13px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('////// MANIFESTO', 660, 130);
      ctx.fillText('COMMUNITY // AI // CRYPTO', 660, 152);
      ctx.fillText('SURFACE ALT: +32.0m // TEMP: -18°C', 56, 588);
      ctx.fillText('SCENE_01: IGLOO_EXTERIOR [tScene1]', 660, 588);
    } else {
      // SCENE 02: Subterranean Cryo Cube Vault (#0D1015 Deep Polar Vault + Glowing Cryo Cube + Shattered Rings)
      const grad = ctx.createRadialGradient(512, 320, 30, 512, 320, 580);
      grad.addColorStop(0, '#1B283B');
      grad.addColorStop(0.55, '#0F1520');
      grad.addColorStop(1, '#070A0F');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, c.width, c.height);

      // Dot pattern matrix background (cubes/dot_pattern.ktx2)
      ctx.fillStyle = 'rgba(136, 192, 255, 0.14)';
      for (let y = 24; y < c.height; y += 24) {
        for (let x = 24; x < c.width; x += 24) {
          ctx.fillRect(x, y, 2, 2);
        }
      }

      // Orbital shattered rings (shattered_ring.drc)
      ctx.save();
      ctx.translate(512, 335);
      for (let r = 0; r < 3; r++) {
        ctx.strokeStyle = `rgba(120, 200, 255, ${0.32 - r * 0.08})`;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([18, 10, 6, 12]);
        ctx.beginPath();
        ctx.ellipse(0, r * 48 - 20, 250 + r * 35, 62 + r * 10, -0.08 * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Translucent Beveled Cryo Cube (cubes/cube3.drc)
      const cubeGrad = ctx.createLinearGradient(-115, -115, 115, 115);
      cubeGrad.addColorStop(0, 'rgba(195, 235, 255, 0.85)');
      cubeGrad.addColorStop(0.45, 'rgba(72, 148, 215, 0.55)');
      cubeGrad.addColorStop(1, 'rgba(24, 62, 110, 0.82)');
      ctx.fillStyle = cubeGrad;
      ctx.strokeStyle = '#B8E6FF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -135);
      ctx.lineTo(128, -68);
      ctx.lineTo(128, 72);
      ctx.lineTo(0, 140);
      ctx.lineTo(-128, 72);
      ctx.lineTo(-128, -68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner glowing artifact silhouette (pudgy.drc)
      const innerGlow = ctx.createRadialGradient(0, 5, 6, 0, 5, 78);
      innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      innerGlow.addColorStop(0.4, 'rgba(110, 215, 255, 0.75)');
      innerGlow.addColorStop(1, 'rgba(30, 110, 200, 0)');
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(0, 5, 76, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Technical HUD markers in Scene 2
      ctx.fillStyle = '#CFE9FF';
      ctx.font = '600 16px monospace';
      ctx.fillText('PORTFOLIO_CO_01 // PUDGY PENGUINS', 56, 72);
      ctx.font = '13px monospace';
      ctx.fillStyle = 'rgba(185, 224, 255, 0.82)';
      ctx.fillText('D 01.02.2020 // TEMP: 0°C // IOR: 1.31', 56, 98);
      ctx.fillText('CRYO VAULT ALT: -12.0m // SHATTERED_RING_LATTICE', 56, 588);
      ctx.fillText('SCENE_02: CRYO_CUBES [tScene2]', 690, 588);
    }

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  const tScene1 = buildSceneTexture(1);
  const tScene2 = buildSceneTexture(2);

  const uniforms = {
    tScene1: gl.getUniformLocation(program, 'tScene1'),
    tScene2: gl.getUniformLocation(program, 'tScene2'),
    tScroll: gl.getUniformLocation(program, 'tScroll'),
    tFrost: gl.getUniformLocation(program, 'tFrost'),
    tBlue: gl.getUniformLocation(program, 'tBlue'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uBlueOffset: gl.getUniformLocation(program, 'uBlueOffset'),
    uProgress: gl.getUniformLocation(program, 'uProgress'),
    uProgressVel: gl.getUniformLocation(program, 'uProgressVel'),
    uChromaticStrength: gl.getUniformLocation(program, 'uChromaticStrength'),
    uFrostDensity: gl.getUniformLocation(program, 'uFrostDensity'),
    uDetailProgress: gl.getUniformLocation(program, 'uDetailProgress'),
    uTime: gl.getUniformLocation(program, 'uTime')
  };

  // Interactive pointer/wheel scrubbing on the canvas
  let isDragging = false;
  let lastY = 0;

  function onPointerDown(e) {
    isDragging = true;
    lastY = e.clientY;
  }
  function onPointerMove(e) {
    if (!isDragging) return;
    const dy = (lastY - e.clientY) / Math.max(canvas.clientHeight, 200);
    lastY = e.clientY;
    targetProgress = Math.max(0, Math.min(1, targetProgress + dy * 1.15));
    velocity = Math.min(1, velocity + Math.abs(dy) * 3.2);
    if (typeof options.onProgressChange === 'function') {
      options.onProgressChange(targetProgress, velocity);
    }
  }
  function onPointerUp() {
    isDragging = false;
  }
  function onWheel(e) {
    if (options.enableWheel === false) return;
    e.preventDefault();
    const delta = e.deltaY * 0.00075;
    targetProgress = Math.max(0, Math.min(1, targetProgress + delta));
    velocity = Math.min(1, velocity + Math.abs(delta) * 2.5);
    if (typeof options.onProgressChange === 'function') {
      options.onProgressChange(targetProgress, velocity);
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const startTime = performance.now();

  function renderFrame(now) {
    if (destroyed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor((canvas.clientWidth || canvas.width || 640) * dpr));
    const h = Math.max(1, Math.floor((canvas.clientHeight || canvas.height || 380) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const prev = progress;
    progress += (targetProgress - progress) * 0.14;
    const frameDelta = Math.abs(progress - prev);
    velocity = Math.min(1.0, Math.max(velocity * 0.94, frameDelta * 18.0));

    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tScene1);
    gl.uniform1i(uniforms.tScene1, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tScene2);
    gl.uniform1i(uniforms.tScene2, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tScroll);
    gl.uniform1i(uniforms.tScroll, 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, tFrost);
    gl.uniform1i(uniforms.tFrost, 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, tBlue);
    gl.uniform1i(uniforms.tBlue, 4);

    const elapsed = (now - startTime) * 0.001;
    gl.uniform2f(uniforms.uResolution, w, h);
    gl.uniform2f(uniforms.uBlueOffset, (elapsed * 1.73) % 1.0, (elapsed * 2.39) % 1.0);
    gl.uniform1f(uniforms.uProgress, progress);
    gl.uniform1f(uniforms.uProgressVel, velocity);
    gl.uniform1f(uniforms.uChromaticStrength, chromaticStrength);
    gl.uniform1f(uniforms.uFrostDensity, frostDensity);
    gl.uniform1f(uniforms.uDetailProgress, detailProgress);
    gl.uniform1f(uniforms.uTime, elapsed);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    rafId = requestAnimationFrame(renderFrame);
  }

  rafId = requestAnimationFrame(renderFrame);

  return {
    setProgress(val) {
      targetProgress = Math.max(0, Math.min(1, Number(val) || 0));
      velocity = Math.min(1, velocity + Math.abs(targetProgress - progress) * 1.8);
    },
    setVelocity(val) {
      velocity = Math.max(0, Math.min(1, Number(val) || 0));
    },
    setChromaticStrength(val) {
      chromaticStrength = Math.max(0, Math.min(2.5, Number(val) || 0));
    },
    setFrostDensity(val) {
      frostDensity = Math.max(0.1, Math.min(2.5, Number(val) || 1));
    },
    getState() {
      return {
        progress,
        targetProgress,
        velocity,
        chromaticStrength,
        frostDensity
      };
    },
    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    }
  };
}

// ============================================================================
// 2. createCryoCubeWebGL(canvas, options = {})
//    Pure WebGL2 GLSL SDF Raymarched 3D Frozen Monolith Cube with
//    Subsurface Scattering, IOR 1.31 Refraction, Shattered Ice Ring &
//    Switchable Inner Relics (01: Pudgy 0°C / 02: Overpass -3°C / 03: Igloo -15°C)
// ============================================================================

export function createCryoCubeWebGL(canvas, options = {}) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!gl) {
    throw new Error('WebGL2 not available on canvas for createCryoCubeWebGL');
  }

  let specimenId = options.specimen || 0; // 0: Pudgy (0°C), 1: Overpass (-3°C), 2: Igloo (-15°C)
  let ior = typeof options.ior === 'number' ? options.ior : 1.31;
  let frostThickness = typeof options.frostThickness === 'number' ? options.frostThickness : 0.42;
  let explodeProgress = typeof options.explodeProgress === 'number' ? options.explodeProgress : 0.0;
  let targetExplode = explodeProgress;
  let coreTemp = typeof options.coreTemp === 'number' ? options.coreTemp : 0;

  let rotX = 0.32;
  let rotY = -0.58;
  let targetRotX = rotX;
  let targetRotY = rotY;
  let zoom = 3.55;
  let destroyed = false;
  let rafId = null;

  const vsSource = `#version 300 es
    in vec2 aPosition;
    out vec2 vUv;
    void main() {
      vUv = aPosition;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fsSource = `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 fragColor;

    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uRotation;
    uniform float uZoom;
    uniform float uIOR;
    uniform float uFrost;
    uniform float uExplode;
    uniform int uSpecimen;

    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    float hash31(vec3 p) {
      p = fract(p * 0.1031);
      p += dot(p, p.yzx + 33.33);
      return fract((p.x + p.y) * p.z);
    }

    float noise3D(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
            mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
            mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
        f.z
      );
    }

    float sdRoundBox(vec3 p, vec3 b, float r) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
    }

    float sdTorus(vec3 p, vec2 t) {
      vec2 q = vec2(length(p.xz) - t.x, p.y);
      return length(q) - t.y;
    }

    float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
      vec3 pa = p - a, ba = b - a;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      return length(pa - ba * h) - r;
    }

    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }

    // Outer Cryo-Cube SDF with optional Voronoi/lattice fracture explosion
    float mapIceCube(vec3 p) {
      vec3 q = p;
      if (uExplode > 0.001) {
        vec3 cell = sign(q);
        q -= cell * uExplode * 0.28;
      }
      float dBox = sdRoundBox(q, vec3(0.86), 0.11);
      float frostBump = (noise3D(q * 6.5) - 0.5) * 0.045 * uFrost;
      if (uExplode > 0.001) {
        float seam = min(abs(p.x), min(abs(p.y), abs(p.z)));
        dBox = max(dBox, (uExplode * 0.09) - seam);
      }
      return dBox + frostBump;
    }

    // Orbital Shattered Ice Ring (shattered_ring.drc)
    float mapShatteredRing(vec3 p) {
      vec3 rp = p;
      rp.yz *= rot(0.18);
      rp.xz *= rot(uTime * 0.28);
      float angle = atan(rp.z, rp.x);
      float sector = floor((angle + 3.14159) / 0.52359);
      float jitter = sin(sector * 13.7 + uTime * 0.9) * (0.06 + uExplode * 0.25);
      rp.y += jitter;
      float ringRadius = 1.62 + sin(sector * 7.3) * 0.08 + uExplode * 0.22;
      float dRing = sdTorus(rp, vec2(ringRadius, 0.045));
      float gap = sin(angle * 12.0 + sector) - 0.35;
      return max(dRing, -gap * 0.04);
    }

    // Switchable Inner Specimen SDF (0: Pudgy Penguin, 1: Overpass Emblem, 2: Igloo Dome)
    float mapInnerSpecimen(vec3 p) {
      vec3 sp = p;
      sp.xz *= rot(uTime * 0.45);
      if (uSpecimen == 0) {
        // 01: Pudgy Penguin Monolith (0°C)
        float body = length((sp - vec3(0.0, -0.14, 0.0)) * vec3(1.0, 0.85, 1.05)) - 0.42;
        float head = length(sp - vec3(0.0, 0.26, 0.0)) - 0.31;
        float goggles = sdRoundBox(sp - vec3(0.0, 0.31, 0.25), vec3(0.22, 0.075, 0.08), 0.03);
        float beak = length((sp - vec3(0.0, 0.19, 0.31)) * vec3(1.2, 1.6, 0.9)) - 0.11;
        float flipperL = sdCapsule(sp, vec3(-0.36, 0.02, 0.0), vec3(-0.48, -0.26, 0.05), 0.075);
        float flipperR = sdCapsule(sp, vec3(0.36, 0.02, 0.0), vec3(0.48, -0.26, 0.05), 0.075);
        float penguin = smin(body, head, 0.08);
        penguin = min(penguin, min(goggles, beak));
        penguin = smin(penguin, min(flipperL, flipperR), 0.04);
        return penguin;
      } else if (uSpecimen == 1) {
        // 02: Overpass Interlocking Geometric Emblem (-3°C)
        vec3 p1 = sp;
        p1.xy *= rot(0.785398);
        float r1 = sdTorus(p1, vec2(0.38, 0.085));
        vec3 p2 = sp;
        p2.yz *= rot(1.570796);
        p2.xy *= rot(-0.785398);
        float r2 = sdTorus(p2, vec2(0.38, 0.085));
        float core = sdRoundBox(sp, vec3(0.16), 0.03);
        return min(min(r1, r2), core);
      } else {
        // 03: Igloo Dome Wireframe Monolith (-15°C)
        vec3 ip = sp - vec3(0.0, -0.18, 0.0);
        float sphere = length(ip) - 0.52;
        float hollow = length(ip) - 0.42;
        float dome = max(sphere, -hollow);
        dome = max(dome, -ip.y);
        float tunnel = sdRoundBox(ip - vec3(0.0, 0.12, 0.42), vec3(0.16, 0.14, 0.18), 0.03);
        float base = sdRoundBox(ip - vec3(0.0, -0.02, 0.0), vec3(0.56, 0.03, 0.56), 0.01);
        return min(min(dome, tunnel), base);
      }
    }

    vec3 calcIceNormal(vec3 p) {
      vec2 e = vec2(0.0025, -0.0025);
      return normalize(
        e.xyy * mapIceCube(p + e.xyy) +
        e.yyx * mapIceCube(p + e.yyx) +
        e.yxy * mapIceCube(p + e.yxy) +
        e.xxx * mapIceCube(p + e.xxx)
      );
    }

    vec3 calcInnerNormal(vec3 p) {
      vec2 e = vec2(0.0025, -0.0025);
      return normalize(
        e.xyy * mapInnerSpecimen(p + e.xyy) +
        e.yyx * mapInnerSpecimen(p + e.yyx) +
        e.yxy * mapInnerSpecimen(p + e.yxy) +
        e.xxx * mapInnerSpecimen(p + e.xxx)
      );
    }

    void main() {
      vec2 uv = (vUv * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0));
      vec3 ro = vec3(0.0, 0.0, uZoom);
      vec3 rd = normalize(vec3(uv, -1.85));

      ro.yz *= rot(uRotation.x);
      rd.yz *= rot(uRotation.x);
      ro.xz *= rot(uRotation.y);
      rd.xz *= rot(uRotation.y);

      // Polar darkroom background with subtle volumetric glow
      vec3 bgCol = mix(vec3(0.04, 0.06, 0.09), vec3(0.11, 0.16, 0.24), clamp(1.0 - length(uv) * 0.55, 0.0, 1.0));
      vec3 col = bgCol;

      vec3 lightDir = normalize(vec3(0.65, 0.85, 0.55));
      vec3 backLight = normalize(vec3(-0.7, -0.4, -0.6));

      // Raymarch outer ice cube & shattered ring
      float t = 0.0;
      int hitType = 0; // 0: none, 1: ice cube, 2: shattered ring
      for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        float dIce = mapIceCube(p);
        float dRing = mapShatteredRing(p);
        float d = min(dIce, dRing);
        if (d < 0.002) {
          hitType = (dIce <= dRing) ? 1 : 2;
          break;
        }
        t += d * 0.85;
        if (t > 8.0) break;
      }

      if (hitType == 2) {
        vec3 p = ro + rd * t;
        vec3 n = normalize(p);
        float diff = max(dot(n, lightDir), 0.0);
        float fres = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
        col = vec3(0.52, 0.76, 0.96) * (0.35 + 0.65 * diff) + vec3(0.85, 0.95, 1.0) * fres * 0.7;
      } else if (hitType == 1) {
        vec3 pEnter = ro + rd * t;
        vec3 nEnter = calcIceNormal(pEnter);

        // Perturb normal with procedural crystalline Voronoi micro-facets
        vec3 frostGrad = vec3(
          noise3D(pEnter * 18.0 + vec3(0.1, 0.0, 0.0)) - noise3D(pEnter * 18.0 - vec3(0.1, 0.0, 0.0)),
          noise3D(pEnter * 18.0 + vec3(0.0, 0.1, 0.0)) - noise3D(pEnter * 18.0 - vec3(0.0, 0.1, 0.0)),
          noise3D(pEnter * 18.0 + vec3(0.0, 0.0, 0.1)) - noise3D(pEnter * 18.0 - vec3(0.0, 0.0, 0.1))
        );
        nEnter = normalize(nEnter + frostGrad * (0.48 * uFrost));

        float fresnel = pow(1.0 - max(dot(-rd, nEnter), 0.0), 3.6);
        float spec = pow(max(dot(reflect(-lightDir, nEnter), -rd), 0.0), 36.0);

        // Refract ray into the ice block using real IOR (default 1.31 for ice)
        float eta = 1.0 / max(uIOR, 1.001);
        vec3 rdInR = refract(rd, nEnter, eta * 0.985);
        vec3 rdInG = refract(rd, nEnter, eta);
        vec3 rdInB = refract(rd, nEnter, eta * 1.015);
        if (length(rdInG) < 0.001) rdInG = reflect(rd, nEnter);

        // Raymarch inside the cryo cube for the inner artifact + subsurface scattering
        float tIn = 0.04;
        bool hitInner = false;
        vec3 pInner = pEnter;
        float opticalDepth = 0.0;

        for (int j = 0; j < 44; j++) {
          pInner = pEnter + rdInG * tIn;
          float dSpec = mapInnerSpecimen(pInner);
          if (dSpec < 0.003) {
            hitInner = true;
            break;
          }
          opticalDepth += 0.025;
          tIn += max(dSpec * 0.75, 0.022);
          if (tIn > 2.2) break;
        }

        // Subsurface scattering ice body color
        vec3 iceVolumeCol = mix(vec3(0.42, 0.72, 0.95), vec3(0.12, 0.28, 0.48), clamp(opticalDepth * (0.7 + uFrost), 0.0, 1.0));
        float sss = pow(max(0.0, dot(rd, -lightDir)), 2.5) * 0.45 + 0.25;
        vec3 interiorCol = iceVolumeCol * sss;

        if (hitInner) {
          vec3 nIn = calcInnerNormal(pInner);
          float inDiff = max(dot(nIn, lightDir), 0.0);
          float inRim = pow(1.0 - max(dot(-rdInG, nIn), 0.0), 2.5);
          vec3 baseRelicCol = (uSpecimen == 0)
            ? mix(vec3(0.85, 0.94, 1.0), vec3(1.0, 0.58, 0.22), step(0.24, pInner.z))
            : (uSpecimen == 1)
              ? vec3(0.45, 0.88, 1.0)
              : vec3(0.78, 0.92, 1.0);

          vec3 relicShaded = baseRelicCol * (0.35 + 0.75 * inDiff) + vec3(0.65, 0.92, 1.0) * inRim * 0.85;
          // Beer-Lambert ice attenuation & frost scattering
          float transmittance = exp(-tIn * (0.65 + uFrost * 1.45));
          interiorCol = mix(iceVolumeCol * 0.85, relicShaded, transmittance);
        }

        // Chromatic dispersion edge tint
        vec3 caTint = vec3(
          0.5 + 0.5 * dot(rdInR, lightDir),
          0.5 + 0.5 * dot(rdInG, lightDir),
          0.5 + 0.5 * dot(rdInB, lightDir)
        );
        interiorCol = mix(interiorCol, interiorCol * caTint * 1.25, 0.35);

        // Combine refracted interior, Fresnel reflection, and sharp ice specular
        vec3 skyReflect = mix(vec3(0.28, 0.42, 0.58), vec3(0.82, 0.93, 1.0), fresnel);
        col = mix(interiorCol, skyReflect, clamp(fresnel * 0.72 + uFrost * 0.18, 0.0, 0.88));
        col += vec3(0.92, 0.97, 1.0) * spec * (1.1 - uFrost * 0.4);
        col += vec3(0.35, 0.75, 1.0) * max(dot(nEnter, backLight), 0.0) * 0.22;
      }

      // Floating cryo-dust particles
      for (int k = 0; k < 10; k++) {
        float fk = float(k);
        vec2 pPos = vec2(
          sin(fk * 4.13 + uTime * 0.31) * 0.85,
          cos(fk * 2.71 + uTime * 0.23) * 0.65
        );
        float dP = length(uv - pPos);
        col += vec3(0.55, 0.82, 1.0) * smoothstep(0.018, 0.0, dP) * 0.45;
      }

      fragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(0.92)), 1.0);
    }
  `;

  const program = createProgram(gl, vsSource, fsSource);
  const quadVbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const posLoc = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uTime: gl.getUniformLocation(program, 'uTime'),
    uRotation: gl.getUniformLocation(program, 'uRotation'),
    uZoom: gl.getUniformLocation(program, 'uZoom'),
    uIOR: gl.getUniformLocation(program, 'uIOR'),
    uFrost: gl.getUniformLocation(program, 'uFrost'),
    uExplode: gl.getUniformLocation(program, 'uExplode'),
    uSpecimen: gl.getUniformLocation(program, 'uSpecimen')
  };

  let dragging = false;
  let prevX = 0;
  let prevY = 0;

  function onPointerDown(e) {
    dragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    prevX = e.clientX;
    prevY = e.clientY;
    targetRotY += dx * 0.009;
    targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX + dy * 0.009));
  }
  function onPointerUp() {
    dragging = false;
  }
  function onWheel(e) {
    if (options.enableZoom === false) return;
    e.preventDefault();
    zoom = Math.max(2.3, Math.min(5.2, zoom + e.deltaY * 0.002));
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const startTime = performance.now();

  function renderFrame(now) {
    if (destroyed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor((canvas.clientWidth || canvas.width || 640) * dpr));
    const h = Math.max(1, Math.floor((canvas.clientHeight || canvas.height || 380) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    if (!dragging) {
      targetRotY += 0.0035;
    }
    rotX += (targetRotX - rotX) * 0.12;
    rotY += (targetRotY - rotY) * 0.12;
    explodeProgress += (targetExplode - explodeProgress) * 0.12;

    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform2f(uniforms.uResolution, w, h);
    gl.uniform1f(uniforms.uTime, (now - startTime) * 0.001);
    gl.uniform2f(uniforms.uRotation, rotX, rotY);
    gl.uniform1f(uniforms.uZoom, zoom);
    gl.uniform1f(uniforms.uIOR, ior);
    gl.uniform1f(uniforms.uFrost, frostThickness);
    gl.uniform1f(uniforms.uExplode, explodeProgress);
    gl.uniform1i(uniforms.uSpecimen, specimenId);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    rafId = requestAnimationFrame(renderFrame);
  }

  rafId = requestAnimationFrame(renderFrame);

  return {
    setSpecimen(idOrIndex) {
      if (idOrIndex === 'pudgy' || idOrIndex === 0 || idOrIndex === '0') {
        specimenId = 0;
        coreTemp = 0;
      } else if (idOrIndex === 'overpass' || idOrIndex === 1 || idOrIndex === '1') {
        specimenId = 1;
        coreTemp = -3;
      } else {
        specimenId = 2;
        coreTemp = -15;
      }
    },
    setIOR(val) {
      ior = Math.max(1.0, Math.min(1.65, Number(val) || 1.31));
    },
    setFrostThickness(val) {
      frostThickness = Math.max(0.0, Math.min(1.0, Number(val) || 0.42));
    },
    setExplode(val) {
      targetExplode = Math.max(0.0, Math.min(1.0, Number(val) || 0));
    },
    triggerExplode() {
      targetExplode = targetExplode > 0.35 ? 0.0 : 0.85;
      return targetExplode;
    },
    setCoreTemp(tempC) {
      coreTemp = Number(tempC) || 0;
    },
    getState() {
      return { specimenId, ior, frostThickness, explodeProgress: targetExplode, coreTemp };
    },
    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    }
  };
}

// ============================================================================
// 3. createAsciiWaveLoader(el, options = {})
//    1:1 Replica of index-2e130bc1.js 100-Frame ASCII Pulse Loader &
//    Scramble Decoder (////// Manifesto / ??????????????? -> Click to explore)
// ============================================================================

export function createAsciiWaveLoader(el, options = {}) {
  if (!el) throw new Error('Target element required for createAsciiWaveLoader');

  let frameIndex = 0;
  let speed = typeof options.speed === 'number' ? options.speed : 1.0;
  let paused = false;
  let scrambleTimer = null;

  const wrapper = document.createElement('div');
  wrapper.className = 'igloo-ascii-loader-widget';
  wrapper.style.cssText = [
    'font-family: "IBMPlexMono-Medium", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    'display: flex',
    'flex-direction: column',
    'gap: 8px',
    'color: #FFFFFF',
    'user-select: none'
  ].join(';');

  const waveRow = document.createElement('div');
  waveRow.style.cssText = 'display:flex;align-items:center;gap:12px;';

  const waveGlyphs = document.createElement('span');
  waveGlyphs.className = 'igloo-ascii-wave-glyphs';
  waveGlyphs.style.cssText =
    'font-size:16px;font-weight:700;letter-spacing:0.08em;color:#FFFFFF;text-shadow:0 0 6px rgba(255,255,255,0.45);min-width:128px;display:inline-block;';
  waveGlyphs.textContent = ASCII_WAVE_FRAMES_100[0];

  const frameTag = document.createElement('span');
  frameTag.style.cssText = 'font-size:11px;color:#A0A5B1;letter-spacing:0.06em;';
  frameTag.textContent = 'FRAME 000/100';

  waveRow.appendChild(waveGlyphs);
  waveRow.appendChild(frameTag);

  const decodeRow = document.createElement('div');
  decodeRow.className = 'igloo-ascii-decode-line';
  decodeRow.style.cssText = 'font-size:12px;color:#CFE9FF;letter-spacing:0.08em;min-height:18px;';
  decodeRow.textContent = options.initialText || '////// MANIFESTO :: CLICK TO EXPLORE';

  wrapper.appendChild(waveRow);
  wrapper.appendChild(decodeRow);
  el.innerHTML = '';
  el.appendChild(wrapper);

  const intervalId = setInterval(() => {
    if (paused) return;
    frameIndex = (frameIndex + 1) % ASCII_WAVE_FRAMES_100.length;
    waveGlyphs.textContent = ASCII_WAVE_FRAMES_100[frameIndex];
    frameTag.textContent = `FRAME ${String(frameIndex).padStart(3, '0')}/100`;
  }, Math.max(16, Math.round(50 / speed)));

  const SCRAMBLE_CHARS = '////????===+++---0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_#';

  function scrambleText(targetText, durationMs = 620) {
    if (scrambleTimer) clearInterval(scrambleTimer);
    const finalStr = String(targetText || '');
    const steps = Math.max(8, Math.floor(durationMs / 30));
    let step = 0;

    scrambleTimer = setInterval(() => {
      step++;
      const ratio = step / steps;
      const lockedCount = Math.floor(ratio * finalStr.length);
      let out = '';
      for (let i = 0; i < finalStr.length; i++) {
        if (finalStr[i] === ' ') {
          out += ' ';
        } else if (i < lockedCount) {
          out += finalStr[i];
        } else {
          out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      decodeRow.textContent = out;
      if (step >= steps) {
        clearInterval(scrambleTimer);
        scrambleTimer = null;
        decodeRow.textContent = finalStr;
      }
    }, 30);
  }

  return {
    setFrame(idx) {
      frameIndex = Math.max(0, Math.min(ASCII_WAVE_FRAMES_100.length - 1, Math.floor(Number(idx) || 0)));
      waveGlyphs.textContent = ASCII_WAVE_FRAMES_100[frameIndex];
      frameTag.textContent = `FRAME ${String(frameIndex).padStart(3, '0')}/100`;
    },
    setSpeed(mult) {
      speed = Math.max(0.2, Math.min(5.0, Number(mult) || 1.0));
    },
    scrambleText,
    pause() {
      paused = true;
    },
    play() {
      paused = false;
    },
    getFrames() {
      return ASCII_WAVE_FRAMES_100.slice();
    },
    destroy() {
      clearInterval(intervalId);
      if (scrambleTimer) clearInterval(scrambleTimer);
    }
  };
}

// ============================================================================
// 4. createPolarReticleHud(containerEl, options = {})
//    Lusion Industrial Monospace Telemetry HUD: Corner Reticles,
//    Real-Time AZM / ELV Bearing Tracker & Vertical Altitude / Cryo Temp Scale
// ============================================================================

export function createPolarReticleHud(containerEl, options = {}) {
  if (!containerEl) throw new Error('Container element required for createPolarReticleHud');

  let depthProgress = typeof options.depthProgress === 'number' ? options.depthProgress : 0.0;
  let gridVisible = options.gridVisible !== false;

  const hudRoot = document.createElement('div');
  hudRoot.className = 'igloo-polar-reticle-hud';
  hudRoot.style.cssText = [
    'position: absolute',
    'inset: 0',
    'pointer-events: none',
    'overflow: hidden',
    'font-family: "IBMPlexMono-Medium", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    'color: rgba(235, 245, 255, 0.86)',
    'font-size: 11px',
    'letter-spacing: 0.08em',
    'z-index: 12'
  ].join(';');

  hudRoot.innerHTML = `
    <svg class="igloo-reticle-svg" viewBox="0 0 1000 600" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.42;">
      <!-- Corner Crosshairs -->
      <path d="M 18 42 L 18 18 L 42 18 M 958 18 L 982 18 L 982 42 M 18 558 L 18 582 L 42 582 M 958 582 L 982 582 L 982 558"
            fill="none" stroke="rgba(220,238,255,0.85)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
      <!-- Golden-Ratio & Polar Rangefinder Grid -->
      <g class="igloo-reticle-grid-lines" stroke="rgba(195,225,255,0.22)" stroke-width="1" fill="none">
        <line x1="382" y1="0" x2="382" y2="600" stroke-dasharray="4 6" vector-effect="non-scaling-stroke"/>
        <line x1="618" y1="0" x2="618" y2="600" stroke-dasharray="4 6" vector-effect="non-scaling-stroke"/>
        <line x1="0" y1="300" x2="1000" y2="300" stroke-dasharray="3 8" vector-effect="non-scaling-stroke"/>
        <circle cx="500" cy="300" r="145" stroke-dasharray="6 6" vector-effect="non-scaling-stroke"/>
        <circle cx="500" cy="300" r="24" vector-effect="non-scaling-stroke"/>
      </g>
    </svg>
    <div class="igloo-reticle-top-left" style="position:absolute;top:14px;left:20px;display:flex;gap:14px;align-items:center;">
      <span class="igloo-azm-elv">AZM: 142.8° // ELV: -14.2°</span>
      <span class="igloo-fov-tag" style="opacity:0.68;">FOV: 45.0° // IOR: 1.31</span>
    </div>
    <div class="igloo-reticle-bottom-left" style="position:absolute;bottom:14px;left:20px;display:flex;flex-direction:column;gap:3px;">
      <span class="igloo-alt-readout" style="color:#FFFFFF;font-weight:600;">ALT: +32.0m [SURFACE: IGLOO MONOLITH]</span>
      <span class="igloo-temp-readout" style="color:#9CD6FF;">CRYO CORE TEMP: -18.0°C // DRACO_MESH_OK</span>
    </div>
    <div class="igloo-depth-ladder" style="position:absolute;top:52px;bottom:52px;right:18px;width:136px;border-right:1px solid rgba(215,235,255,0.35);padding-right:10px;display:flex;flex-direction:column;justify-content:space-between;text-align:right;font-size:10px;">
      <div>+32.0m // -18°C ─</div>
      <div>+08.0m // -09°C ─</div>
      <div>-12.0m // &nbsp;0°C ─</div>
      <div>-28.5m // -3°C ─</div>
      <div>-48.0m // -42°C ─</div>
      <div class="igloo-depth-marker" style="position:absolute;right:-4px;top:0%;transform:translateY(-50%);color:#FFFFFF;background:rgba(13,16,21,0.86);border:1px solid rgba(165,216,255,0.75);padding:1px 6px;font-size:10px;white-space:nowrap;">
        ◄ +32.0m
      </div>
    </div>
  `;

  containerEl.appendChild(hudRoot);

  const gridEl = hudRoot.querySelector('.igloo-reticle-grid-lines');
  const azmEl = hudRoot.querySelector('.igloo-azm-elv');
  const altEl = hudRoot.querySelector('.igloo-alt-readout');
  const tempEl = hudRoot.querySelector('.igloo-temp-readout');
  const markerEl = hudRoot.querySelector('.igloo-depth-marker');

  function updateDepthUI(prog) {
    depthProgress = Math.max(0, Math.min(1, Number(prog) || 0));
    const altMeters = (32.0 - depthProgress * 80.0).toFixed(1);
    const sign = Number(altMeters) >= 0 ? '+' : '';
    let stageLabel = 'SURFACE: IGLOO MONOLITH';
    let tempVal = '-18.0°C';

    if (depthProgress >= 0.22 && depthProgress < 0.54) {
      stageLabel = 'CRYO VAULT: PORTFOLIO_CO_01 PUDGY 0°C';
      tempVal = '0.0°C';
    } else if (depthProgress >= 0.54 && depthProgress < 0.82) {
      stageLabel = 'CRYO VAULT: PORTFOLIO_CO_02 OVERPASS -3°C';
      tempVal = '-3.0°C';
    } else if (depthProgress >= 0.82) {
      stageLabel = 'VDB VOLUME CHAMBER: MANIFESTO & LINKS';
      tempVal = '-42.0°C';
    }

    altEl.textContent = `ALT: ${sign}${altMeters}m [${stageLabel}]`;
    tempEl.textContent = `CRYO CORE TEMP: ${tempVal} // DEPTH: ${(depthProgress * 100).toFixed(0)}%`;
    markerEl.style.top = `${(depthProgress * 100).toFixed(1)}%`;
    markerEl.textContent = `◄ ${sign}${altMeters}m (${tempVal})`;
  }

  function onPointerMove(e) {
    const rect = containerEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const azm = (nx * 360).toFixed(1);
    const elv = ((0.5 - ny) * 90).toFixed(1);
    azmEl.textContent = `AZM: ${azm}° // ELV: ${Number(elv) >= 0 ? '+' : ''}${elv}°`;
  }

  window.addEventListener('pointermove', onPointerMove);
  updateDepthUI(depthProgress);
  if (!gridVisible && gridEl) gridEl.style.display = 'none';

  return {
    setDepthProgress: updateDepthUI,
    setGridVisible(vis) {
      gridVisible = Boolean(vis);
      if (gridEl) gridEl.style.display = gridVisible ? '' : 'none';
    },
    toggleGrid() {
      gridVisible = !gridVisible;
      if (gridEl) gridEl.style.display = gridVisible ? '' : 'none';
      return gridVisible;
    },
    setSectionLabel(label, tempStr) {
      if (label) altEl.textContent = label;
      if (tempStr) tempEl.textContent = tempStr;
    },
    destroy() {
      window.removeEventListener('pointermove', onPointerMove);
      if (hudRoot.parentNode) hudRoot.parentNode.removeChild(hudRoot);
    }
  };
}

// ============================================================================
// 5. createBlurTextCylinder(canvas, options = {})
//    3D Cylindrical DoF Blur Typography (`blurrytext_cylinder.drc`) +
//    Dot Pattern Matrix (`cubes/dot_pattern.ktx2`)
// ============================================================================

export function createBlurTextCylinder(canvas, options = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context required for createBlurTextCylinder');

  let textRing =
    options.text ||
    'IGLOO INC // PORTFOLIO_CO_01 // PUDGY PENGUINS 0°C // PORTFOLIO_CO_02 // OVERPASS -3°C // ';
  let speed = typeof options.speed === 'number' ? options.speed : 0.65;
  let maxBlur = typeof options.blurRadius === 'number' ? options.blurRadius : 6.5;
  let depthProgress = typeof options.depthProgress === 'number' ? options.depthProgress : 0.35;
  let tilt = typeof options.tilt === 'number' ? options.tilt : -0.16;
  let angleOffset = 0;
  let destroyed = false;
  let rafId = null;

  const rings = [
    { yOffset: -78, radiusFactor: 0.38, dir: 1.0, scale: 0.92 },
    { yOffset: 0, radiusFactor: 0.42, dir: -0.82, scale: 1.08 },
    { yOffset: 78, radiusFactor: 0.38, dir: 0.65, scale: 0.92 }
  ];

  let lastTime = performance.now();

  function render(now) {
    if (destroyed) return;
    const dt = Math.min(0.05, (now - lastTime) * 0.001);
    lastTime = now;
    angleOffset += dt * speed;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor((canvas.clientWidth || canvas.width || 600) * dpr));
    const h = Math.max(1, Math.floor((canvas.clientHeight || canvas.height || 360) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    const cw = w / dpr;
    const ch = h / dpr;

    // Dark cryo chamber gradient
    const bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, '#0B0F17');
    bg.addColorStop(0.5, '#121A27');
    bg.addColorStop(1, '#090C12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);

    // cubes/dot_pattern.ktx2 background matrix
    ctx.fillStyle = 'rgba(155, 200, 245, 0.14)';
    const dotStep = 22;
    const shiftY = ((depthProgress * 180) % dotStep + dotStep) % dotStep;
    for (let y = shiftY; y < ch; y += dotStep) {
      for (let x = 16; x < cw; x += dotStep) {
        ctx.fillRect(x, y, 1.6, 1.6);
      }
    }

    const chars = textRing.split('');
    const charStep = (Math.PI * 2) / Math.max(chars.length, 1);

    // Collect 3D cylinder glyphs and depth-sort back-to-front
    const glyphs = [];
    for (let rIdx = 0; rIdx < rings.length; rIdx++) {
      const ring = rings[rIdx];
      const rx = cw * ring.radiusFactor;
      const ry = rx * 0.26;
      const baseCy = ch * 0.5 + ring.yOffset + (0.5 - depthProgress) * 36;

      for (let i = 0; i < chars.length; i++) {
        const chStr = chars[i];
        if (chStr === ' ') continue;
        const theta = i * charStep + angleOffset * ring.dir;
        const x3d = Math.sin(theta) * rx;
        const z3d = Math.cos(theta); // -1 (back) to +1 (front)
        const y3d = baseCy + z3d * ry * Math.sin(tilt) + x3d * Math.sin(tilt * 0.45);
        glyphs.push({
          ch: chStr,
          x: cw * 0.5 + x3d,
          y: y3d,
          z: z3d,
          scaleX: Math.max(0.18, Math.abs(Math.cos(theta * 0.85))),
          ringScale: ring.scale
        });
      }
    }

    glyphs.sort((a, b) => a.z - b.z);

    for (let i = 0; i < glyphs.length; i++) {
      const g = glyphs[i];
      // Depth-of-field blur is minimal at front focal plane (z ~ 0.85) and higher towards back (z < 0)
      const defocus = Math.abs(0.85 - g.z) * 0.55;
      const blurPx = Math.max(0, defocus * maxBlur);
      const alpha = Math.max(0.1, Math.min(0.96, 0.25 + (g.z + 1.0) * 0.36));
      const fontSize = Math.round(17 * g.ringScale * (0.78 + (g.z + 1.0) * 0.22));

      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.scale(g.scaleX, 1);
      ctx.filter = blurPx > 0.35 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
      ctx.font = `600 ${fontSize}px "IBMPlexMono-Medium", "IBM Plex Mono", monospace`;
      ctx.fillStyle = g.z > 0.4 ? `rgba(235, 246, 255, ${alpha.toFixed(2)})` : `rgba(138, 174, 214, ${alpha.toFixed(2)})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.ch, 0, 0);
      ctx.restore();
    }

    ctx.restore();
    rafId = requestAnimationFrame(render);
  }

  rafId = requestAnimationFrame(render);

  return {
    setSpeed(val) {
      speed = Number(val) || 0;
    },
    setBlurRadius(val) {
      maxBlur = Math.max(0, Math.min(18, Number(val) || 0));
    },
    setText(str) {
      if (str && String(str).trim().length > 0) {
        textRing = String(str).toUpperCase() + ' // ';
      }
    },
    setDepthProgress(val) {
      depthProgress = Math.max(0, Math.min(1, Number(val) || 0));
    },
    setTilt(val) {
      tilt = Number(val) || 0;
    },
    getState() {
      return { speed, maxBlur, depthProgress, textRing };
    },
    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
    }
  };
}

// ============================================================================
// 6. createCryoAudioEngine()
//    Zero-Dependency Pure Web Audio API Arctic Wind, Ice Shard Fracture,
//    Sub-Zero Cube Dive & High-Frequency Telemetry Beep Synthesizer
// ============================================================================

export function createCryoAudioEngine() {
  let ctx = null;
  let analyser = null;
  let windNodes = null;
  let windActive = false;

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      analyser.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  // 1. High-frequency minimal telemetry pulse beep (beeps.ogg / beeps2.ogg / beeps3.ogg)
  function playBeep(variant = 1) {
    const ac = ensureContext();
    const now = ac.currentTime;
    const freqs = variant === 1 ? [2480, 3120] : variant === 2 ? [1960, 2940, 3920] : [3320, 2640];

    freqs.forEach((f, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      const t0 = now + idx * 0.042;
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 1.04, t0 + 0.038);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);

      osc.connect(gain);
      gain.connect(analyser);
      osc.start(t0);
      osc.stop(t0 + 0.06);
    });
  }

  // 2. Crystalline ice shard fracture resonance (shard.ogg / click-project.ogg)
  function playShard() {
    const ac = ensureContext();
    const now = ac.currentTime;
    const partials = [1840, 2790, 4180, 5620, 7450];

    partials.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      const start = now + i * 0.011;
      const dur = 0.22 + (partials.length - i) * 0.06;

      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, start + dur);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.09 / (1 + i * 0.35), start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(analyser);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  }

  // 3. Sub-zero cryo vault dive resonance (enter-project.ogg)
  function playEnterCube() {
    const ac = ensureContext();
    const now = ac.currentTime;

    const sub = ac.createOscillator();
    const subGain = ac.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(145, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.65);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.24, now + 0.04);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

    sub.connect(subGain);
    subGain.connect(analyser);
    sub.start(now);
    sub.stop(now + 0.75);

    // Shimmer harmonic overtone
    const shimmer = ac.createOscillator();
    const shimGain = ac.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(880, now);
    shimmer.frequency.exponentialRampToValueAtTime(440, now + 0.55);
    shimGain.gain.setValueAtTime(0.0001, now);
    shimGain.gain.linearRampToValueAtTime(0.06, now + 0.05);
    shimGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
    shimmer.connect(shimGain);
    shimGain.connect(analyser);
    shimmer.start(now);
    shimmer.stop(now + 0.6);
  }

  // 4. Pink-noise + Dual BiquadFilter LFO Arctic Wind & Cryo Room Drone (wind.ogg + room.ogg)
  function toggleArcticWind(forceState) {
    const nextState = typeof forceState === 'boolean' ? forceState : !windActive;
    if (nextState === windActive) return windActive;

    const ac = ensureContext();
    if (!nextState && windNodes) {
      const now = ac.currentTime;
      windNodes.masterGain.gain.cancelScheduledValues(now);
      windNodes.masterGain.gain.setValueAtTime(windNodes.masterGain.gain.value, now);
      windNodes.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      const toStop = windNodes;
      windNodes = null;
      windActive = false;
      setTimeout(() => {
        try {
          toStop.noiseSrc.stop();
          toStop.lfo.stop();
          toStop.chimeOsc.stop();
        } catch (_) {}
      }, 400);
      return false;
    }

    // Create 4-second pink noise buffer
    const bufSize = ac.sampleRate * 4;
    const buffer = ac.createBuffer(1, bufSize, ac.sampleRate);
    const out = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const noiseSrc = ac.createBufferSource();
    noiseSrc.buffer = buffer;
    noiseSrc.loop = true;

    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 3.8;

    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.14;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // Ethereal high-altitude ice harmonic drone
    const chimeOsc = ac.createOscillator();
    const chimeGain = ac.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.value = 528;
    chimeGain.gain.value = 0.025;
    chimeOsc.connect(chimeGain);

    const masterGain = ac.createGain();
    masterGain.gain.setValueAtTime(0.0001, ac.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.32, ac.currentTime + 0.6);

    noiseSrc.connect(filter);
    filter.connect(masterGain);
    chimeGain.connect(masterGain);
    masterGain.connect(analyser);

    noiseSrc.start();
    lfo.start();
    chimeOsc.start();

    windNodes = { noiseSrc, filter, lfo, chimeOsc, masterGain };
    windActive = true;
    return true;
  }

  function getAnalyserData(targetArray) {
    if (!analyser) return null;
    const arr = targetArray || new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(arr);
    return arr;
  }

  return {
    playBeep,
    playShard,
    playEnterCube,
    toggleArcticWind,
    isWindActive() {
      return windActive;
    },
    getAnalyserData
  };
}

// ============================================================================
// GLOBAL UMD / ESM BRIDGE
// ============================================================================

const IglooUI = {
  ASCII_WAVE_FRAMES_100,
  IGLOO_PORTFOLIO_DATA,
  IGLOO_ASSET_INDEX,
  createFrostCutShader,
  createCryoCubeWebGL,
  createAsciiWaveLoader,
  createPolarReticleHud,
  createBlurTextCylinder,
  createCryoAudioEngine
};

if (typeof window !== 'undefined') {
  window.IglooUI = IglooUI;
}

export default IglooUI;
