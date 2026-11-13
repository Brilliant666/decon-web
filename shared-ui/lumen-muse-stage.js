/**
 * shared-ui/lumen-muse-stage.js
 * Specimen #05: LUMEN MUSE (潜影缪斯 · Optics LM-05 · 85mm f/1.2)
 * Zero-Dependency Hand-Written WebGL2 PBR, 2048x2048 PCF Soft Shadows,
 * Thin-Film Iridescent Optics, Optical Crystal Morph, 52.8k-Vertex 3D Maiden Muse Relief,
 * 16,384 Latent Diffusion Tensor Particles & Multi-Pass HDR Super-LumiNova Bloom.
 *
 * SPDX-License-Identifier: MIT
 */

import {
  LUMEN_MAT,
  LUMEN_LAYER_META,
  MUSE_PRESETS,
  IRIS_PIVOT_RADIUS,
  HAMMER_PIVOTS,
  buildMechanicalGeometry,
  buildProceduralMuseCore,
  buildImageMuseCore,
  buildLatentParticleBuffers
} from './lumen-muse-geometry.js';

export const DIRECTOR_SHOTS = Object.freeze([
  Object.freeze({
    index: 0,
    id: 'obscura',
    code: 'SHOT 01',
    start: 0.0,
    end: 5.0,
    title: 'LUMEN MUSE · Optics LM-05',
    subtitle: 'Real-Time WebGL2 PBR · 85mm f/1.2 Latent Optical Developer'
  }),
  Object.freeze({
    index: 1,
    id: 'explode',
    code: 'SHOT 02',
    start: 5.0,
    end: 11.0,
    title: 'Mid-Air 8-Layer Optical Architecture',
    subtitle: 'Aspheric Thin-Film Lens · 9-Blade Iris · Full Optical Crystal Case'
  }),
  Object.freeze({
    index: 2,
    id: 'macro',
    code: 'SHOT 03',
    start: 11.0,
    end: 17.0,
    title: '0.10x Macro · Iris & Latent Denoising',
    subtitle: '52,800-Vertex 3D Maiden Muse Relief · Gaussian Stardust Convergence'
  }),
  Object.freeze({
    index: 3,
    id: 'lume',
    code: 'SHOT 04',
    start: 17.0,
    end: 24.0,
    title: 'Darkroom Lume & D5 / F#5 Crystal Chimes',
    subtitle: 'Super-LumiNova #8CD2FF / #F59E0B · 48kHz Dual-Hammer Repeater'
  })
]);

const LMS_DURATION = 24.0;
const lmsClamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lmsSmooth = (a, b, x) => {
  const t = lmsClamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lmsEaseInOutQuart = (x) => {
  const t = lmsClamp(x, 0, 1);
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) * 0.5;
};
const lmsEaseOutBack = (x) => {
  const t = lmsClamp(x, 0, 1);
  const c1 = 1.15;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/* ============================================================================
   1. PRE-ALLOCATED 4x4 MATRIX MATH (ZERO PER-FRAME ALLOCATION)
   ============================================================================ */

function lmsMat4Identity(out) {
  out.fill(0);
  out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
}

function lmsMat4Perspective(out, fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy * 0.5);
  const nf = 1.0 / (near - far);
  out.fill(0);
  out[0] = f / Math.max(0.1, aspect);
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
}

function lmsMat4Ortho(out, left, right, bottom, top, near, far) {
  const lr = 1 / (left - right);
  const bt = 1 / (bottom - top);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = -2 * lr;
  out[5] = -2 * bt;
  out[10] = 2 * nf;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
}

function lmsMat4LookAt(out, ex, ey, ez, tx, ty, tz, ux, uy, uz) {
  let zx = ex - tx, zy = ey - ty, zz = ez - tz;
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len; zy /= len; zz /= len;

  let xx = uy * zz - uz * zy;
  let xy = uz * zx - ux * zz;
  let xz = ux * zy - uy * zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len; xy /= len; xz /= len;

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * ex + xy * ey + xz * ez);
  out[13] = -(yx * ex + yy * ey + yz * ez);
  out[14] = -(zx * ex + zy * ey + zz * ez);
  out[15] = 1;
}

function lmsMat4Mul(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const b0 = b[i], b1 = b[i + 1], b2 = b[i + 2], b3 = b[i + 3];
    out[i] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[i + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[i + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[i + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  }
}

function lmsMat4EulerZXY(out, rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  out[0] = cy * cz - sx * sy * sz;
  out[1] = cy * sz + sx * sy * cz;
  out[2] = -cx * sy;
  out[3] = 0;
  out[4] = -cx * sz;
  out[5] = cx * cz;
  out[6] = sx;
  out[7] = 0;
  out[8] = sy * cz + sx * cy * sz;
  out[9] = sy * sz - sx * cy * cz;
  out[10] = cx * cy;
  out[11] = 0;
  out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
}

/* ============================================================================
   2. WEBGL2 GLSL ES 3.00 SHADERS (SHADOW, GGX PBR, MUSE SSS, LATENT, HDR BLOOM)
   ============================================================================ */

function lmsCompileProgram(gl, vsSrc, fsSrc) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSrc);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(vs);
    gl.deleteShader(vs);
    throw new Error(`LumenMuse VS Error: ${info}`);
  }
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSrc);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    throw new Error(`LumenMuse FS Error: ${info}`);
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`LumenMuse Link Error: ${info}`);
  }
  return prog;
}

const LMS_ARTICULATE_CHUNK = `
uniform float uLayerOffsets[8];
uniform float uIrisAngle;
uniform float uIrisPivotR;
uniform float uFocusAngle;
uniform float uDrumAngle;
uniform vec2 uGearPivots[3];
uniform vec2 uHammerAngles;
uniform vec2 uHammerPivotD5;
uniform vec2 uHammerPivotFS5;
uniform mat4 uModel;

vec2 rot2d(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

void articulateVertex(in vec3 inPos, in vec3 inNrm, in vec4 inMeta, out vec3 localPos, out vec3 worldPos, out vec3 worldNrm) {
  vec3 p = inPos;
  vec3 n = inNrm;
  int layerIdx = clamp(int(floor(inMeta.x + 0.5)), 0, 7);
  int aux = int(floor(inMeta.z + 0.5));

  if (aux >= 1 && aux <= 9) {
    float bAng = float(aux - 1) * 0.6981317008;
    vec2 piv = vec2(cos(bAng), sin(bAng)) * uIrisPivotR;
    p.xy = piv + rot2d(p.xy - piv, uIrisAngle);
    n.xy = rot2d(n.xy, uIrisAngle);
  } else if (aux == 10) {
    p.xy = rot2d(p.xy, uFocusAngle);
    n.xy = rot2d(n.xy, uFocusAngle);
  } else if (aux >= 11 && aux <= 13) {
    int gIdx = aux - 11;
    float ratio = (gIdx == 1) ? -1.85 : ((gIdx == 2) ? 2.45 : 1.0);
    vec2 gp = uGearPivots[gIdx];
    p.xy = gp + rot2d(p.xy - gp, uDrumAngle * ratio);
    n.xy = rot2d(n.xy, uDrumAngle * ratio);
  } else if (aux == 20) {
    p.xy = uHammerPivotD5 + rot2d(p.xy - uHammerPivotD5, uHammerAngles.x);
    n.xy = rot2d(n.xy, uHammerAngles.x);
  } else if (aux == 21) {
    p.xy = uHammerPivotFS5 + rot2d(p.xy - uHammerPivotFS5, uHammerAngles.y);
    n.xy = rot2d(n.xy, uHammerAngles.y);
  }

  localPos = p;
  p.z += uLayerOffsets[layerIdx];
  worldPos = (uModel * vec4(p, 1.0)).xyz;
  worldNrm = normalize(mat3(uModel) * n);
}
`;

const LMS_QUAD_VS = `#version 300 es
layout(location = 0) in vec2 aQuadPos;
out vec2 vUv;
void main() {
  vUv = aQuadPos * 0.5 + 0.5;
  gl_Position = vec4(aQuadPos, 0.999, 1.0);
}`;

const LMS_BACKDROP_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uDarkroom;
void main() {
  vec2 p = vUv - vec2(0.5, 0.52);
  p.x *= uRes.x / max(1.0, uRes.y);
  float r2 = dot(p, p);
  vec3 studioCenter = vec3(0.115, 0.098, 0.092);
  vec3 studioEdge = vec3(0.024, 0.020, 0.020);
  vec3 studioCol = mix(studioCenter, studioEdge, smoothstep(0.0, 0.88, r2));

  vec3 nightCenter = vec3(0.016, 0.024, 0.046);
  vec3 nightEdge = vec3(0.003, 0.004, 0.009);
  vec3 nightCol = mix(nightCenter, nightEdge, smoothstep(0.0, 0.78, r2));

  fragColor = vec4(mix(studioCol, nightCol, uDarkroom), 1.0);
}`;

const LMS_SHADOW_VS = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 3) in vec4 aMeta;
uniform mat4 uLightVP;
uniform float uIsMuse;
uniform float uMuseZOffset;
${LMS_ARTICULATE_CHUNK}
flat out int vMatId;
void main() {
  if (uIsMuse > 0.5) {
    vMatId = 99;
    vec3 p = aPosition + vec3(0.0, 0.0, uMuseZOffset);
    vec3 wp = (uModel * vec4(p, 1.0)).xyz;
    gl_Position = uLightVP * vec4(wp, 1.0);
  } else {
    vec3 lp, wp, wn;
    articulateVertex(aPosition, aNormal, aMeta, lp, wp, wn);
    vMatId = int(floor(aMeta.y + 0.5));
    gl_Position = uLightVP * vec4(wp, 1.0);
  }
}`;

const LMS_SHADOW_FS = `#version 300 es
precision mediump float;
flat in int vMatId;
uniform float uCrystalMix;
void main() {
  // Allow studio key light to transmit through the 85mm front lens, prism & full crystal case
  if (vMatId == 1 || vMatId == 4) discard;
  if ((vMatId == 0 || vMatId == 9) && uCrystalMix > 0.55) discard;
}`;

const LMS_MECH_VS = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
layout(location = 3) in vec4 aMeta;
uniform mat4 uVP;
uniform mat4 uLightVP;
${LMS_ARTICULATE_CHUNK}
out vec3 vLocalPos;
out vec3 vWorldPos;
out vec3 vWorldNrm;
out vec2 vUv;
out vec4 vShadowCoord;
flat out int vMatId;
out float vLumeWeight;
void main() {
  vec3 lp, wp, wn;
  articulateVertex(aPosition, aNormal, aMeta, lp, wp, wn);
  vLocalPos = lp;
  vWorldPos = wp;
  vWorldNrm = wn;
  vUv = aUv;
  vMatId = int(floor(aMeta.y + 0.5));
  vLumeWeight = aMeta.w;
  vShadowCoord = uLightVP * vec4(wp + wn * 0.0055, 1.0);
  gl_Position = uVP * vec4(wp, 1.0);
}`;

const LMS_MECH_FS = `#version 300 es
precision highp float;
in vec3 vLocalPos;
in vec3 vWorldPos;
in vec3 vWorldNrm;
in vec2 vUv;
in vec4 vShadowCoord;
flat in int vMatId;
in float vLumeWeight;
out vec4 fragColor;

uniform highp sampler2DShadow uShadowMap;
uniform vec3 uCamPos;
uniform vec3 uLightDir;
uniform vec3 uCaseMix; // x: titanium, y: crystal, z: carbon
uniform float uDarkroom;
uniform float uTime;
uniform float uChimeGlow;
uniform int uPassMode; // 0 = opaque, 1 = transparent optical glass & crystal

#define PI 3.14159265359

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float cellNoise(vec2 p, out vec2 cellId) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float minD = 8.0;
  vec2 best = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(hash21(i + g), hash21(i + g + 17.3));
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < minD) {
        minD = d;
        best = i + g;
      }
    }
  }
  cellId = best;
  return sqrt(minD);
}

float samplePCFShadow(vec4 sc) {
  vec3 proj = sc.xyz / max(0.0001, sc.w);
  proj = proj * 0.5 + 0.5;
  if (proj.x <= 0.01 || proj.x >= 0.99 || proj.y <= 0.01 || proj.y >= 0.99 || proj.z >= 0.998) {
    return 1.0;
  }
  float angle = hash21(gl_FragCoord.xy) * 6.2831853;
  float ca = cos(angle), sa = sin(angle);
  mat2 rot = mat2(ca, -sa, sa, ca);
  vec2 texel = vec2(1.0 / 2048.0) * 1.65;
  const vec2 disk[9] = vec2[9](
    vec2(0.0, 0.0),
    vec2(-0.70, -0.45), vec2(0.68, -0.52),
    vec2(-0.52, 0.72),  vec2(0.74, 0.48),
    vec2(-0.92, 0.12),  vec2(0.94, -0.08),
    vec2(0.08, -0.95),  vec2(-0.10, 0.94)
  );
  float sum = 0.0;
  for (int i = 0; i < 9; i++) {
    vec2 ofs = (rot * disk[i]) * texel;
    sum += texture(uShadowMap, vec3(proj.xy + ofs, proj.z - 0.0018));
  }
  return sum / 9.0;
}

vec3 sampleStudioEnv(vec3 R, float rough, float darkroom) {
  float blur = mix(0.035, 0.62, rough * rough);
  vec3 keyDir = normalize(vec3(-0.56, 0.64, 0.52));
  vec3 rimDir = normalize(vec3(0.76, 0.26, 0.59));
  vec3 fillDir = normalize(vec3(-0.08, -0.82, 0.56));

  float keyBox = smoothstep(0.68 - blur, 0.96, dot(R, keyDir));
  float rimBox = smoothstep(0.72 - blur, 0.97, dot(R, rimDir));
  float fillBox = smoothstep(0.42 - blur, 0.92, dot(R, fillDir));

  vec3 baseSky = mix(vec3(0.06, 0.055, 0.055), vec3(0.18, 0.16, 0.15), clamp(R.y * 0.5 + 0.5, 0.0, 1.0));
  vec3 studio = baseSky
    + vec3(2.55, 2.34, 2.12) * keyBox
    + vec3(1.45, 1.68, 2.05) * rimBox
    + vec3(0.52, 0.43, 0.36) * fillBox;

  vec3 darkEnv = vec3(0.012, 0.020, 0.038)
    + vec3(0.14, 0.22, 0.36) * rimBox
    + vec3(0.09, 0.14, 0.24) * keyBox;

  return mix(studio, darkEnv, darkroom * 0.92);
}

vec3 thinFilmIridescence(float cosTheta, float dNm) {
  float opd = 2.0 * 1.38 * dNm * max(0.15, cosTheta);
  vec3 lambdas = vec3(635.0, 532.0, 462.0);
  vec3 phase = cos(2.0 * PI * opd / lambdas) * 0.5 + 0.5;
  return mix(vec3(0.85, 0.28, 0.95), vec3(0.18, 0.95, 0.72), phase.g) * (0.55 + 0.75 * phase);
}

vec3 sampleLensSoftboxes(vec3 R, float darkroom) {
  vec3 keyDir = normalize(vec3(-0.52, 0.68, 0.52));
  vec3 rimDir = normalize(vec3(0.74, 0.36, -0.56));
  vec3 fillDir = normalize(vec3(-0.12, -0.78, 0.61));

  // Crisp studio softbox specular arcs with zero diffuse sky haze across optical center
  float keyArc = pow(smoothstep(0.74, 0.985, dot(R, keyDir)), 1.6);
  float rimArc = pow(smoothstep(0.78, 0.99, dot(R, rimDir)), 1.6);
  float fillArc = pow(smoothstep(0.84, 0.992, dot(R, fillDir)), 1.8);

  vec3 studioBoxes = vec3(2.85, 2.62, 2.38) * keyArc
    + vec3(1.65, 1.92, 2.35) * rimArc
    + vec3(0.65, 0.56, 0.48) * fillArc;

  vec3 darkBoxes = vec3(0.20, 0.34, 0.56) * rimArc
    + vec3(0.14, 0.24, 0.42) * keyArc;

  return mix(studioBoxes, darkBoxes, darkroom * 0.90);
}

float ggxD(float NdotH, float rough) {
  float a = rough * rough;
  float a2 = a * a;
  float d = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
  return a2 / max(0.0001, PI * d * d);
}

void main() {
  float crystalMix = uCaseMix.y;
  bool isCaseOrGrip = (vMatId == 0 || vMatId == 9);
  bool isGlassElem = (vMatId == 1 || vMatId == 4 || (isCaseOrGrip && crystalMix > 0.12));

  if (uPassMode == 0 && isGlassElem) discard;
  if (uPassMode == 1 && !isGlassElem) discard;

  vec3 N = normalize(vWorldNrm);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCamPos - vWorldPos);
  float NdotV = max(0.001, dot(N, V));

  // Optical Glass & Full Crystal Pass (Premultiplied HDR Specular + Transmission)
  if (uPassMode == 1) {
    // Render front-facing surfaces only for AR-coated optical elements so closed 3D
    // lens/prism meshes never stack multi-pass haze over the Maiden Muse portrait.
    if ((vMatId == 1 || vMatId == 4) && !gl_FrontFacing) discard;

    vec3 R = reflect(-V, N);
    float graz = pow(1.0 - NdotV, 2.5);
    float camDist = length(uCamPos);
    float rAperture = length(vLocalPos.xy);
    // Smoothly fade front glass/prism veil during SHOT 03 0.10x Macro Dive (dist < 2.2)
    float macroClear = smoothstep(1.30, 2.22, camDist);
    float centerMacroFade = mix(mix(0.04, 0.52, smoothstep(0.34, 0.52, rAperture)), 1.0, macroClear);

    if (vMatId == 1) {
      // Layer 01: Leica/Zeiss Multi-Coated 85mm f/1.2 Aspheric Optics
      // Ultra-clear normal incidence (alpha ~0.04) + grazing magenta/emerald/amber AR arcs
      vec3 coat = thinFilmIridescence(NdotV, 320.0 + rAperture * 95.0);
      vec3 boxSpec = sampleLensSoftboxes(R, uDarkroom);
      float edgeBevel = smoothstep(0.40, 0.56, rAperture);
      float alpha = clamp((0.036 + 0.28 * graz + 0.08 * edgeBevel) * centerMacroFade, 0.004, 0.42);
      vec3 spec = boxSpec * coat * (0.28 + 1.25 * graz) * mix(0.22, 1.0, macroClear)
        + coat * (0.16 * graz + 0.10 * edgeBevel * graz) * (1.0 - 0.65 * uDarkroom) * centerMacroFade;
      vec3 tint = vec3(0.012, 0.018, 0.028) * alpha;
      fragColor = vec4(tint + spec, alpha);
      return;
    }

    if (vMatId == 4) {
      // Layer 04: Polar Dichroic Beam-Splitter Prism & Doublet (AR-Coated Center Clarity)
      vec3 prismSpec = thinFilmIridescence(NdotV, 435.0 + vLocalPos.z * 210.0);
      vec3 boxSpec = sampleLensSoftboxes(R, uDarkroom);
      float rimBand = smoothstep(0.32, 0.46, rAperture);
      float alpha = clamp((0.032 + 0.30 * graz + 0.09 * rimBand) * centerMacroFade, 0.004, 0.46);
      vec3 col = vec3(0.015, 0.032, 0.052) * alpha
        + (boxSpec * prismSpec * (0.30 + 1.15 * graz) + prismSpec * 0.18 * graz * (1.0 - 0.60 * uDarkroom)) * centerMacroFade;
      fragColor = vec4(col, alpha);
      return;
    }

    // Full Optical Crystal Chassis Morph (IOR 1.52 Schlick Fresnel + Dispersion Rim)
    vec3 envR = sampleStudioEnv(reflect(-V, normalize(N + vec3(0.015, 0.0, 0.0))), 0.05, uDarkroom);
    vec3 envB = sampleStudioEnv(reflect(-V, normalize(N - vec3(0.015, 0.0, 0.0))), 0.05, uDarkroom);
    vec3 envG = sampleStudioEnv(R, 0.05, uDarkroom);
    vec3 dispEnv = vec3(envR.r, envG.g, envB.b);
    float edgeRim = pow(1.0 - NdotV, 3.2);
    float alpha = clamp((0.14 + 0.56 * edgeRim) * crystalMix, 0.05, 0.74);
    vec3 iceTint = mix(vec3(0.76, 0.86, 0.98), vec3(0.45, 0.72, 1.0), uDarkroom) * alpha * 0.42;
    vec3 rimGlow = dispEnv * (0.18 + 1.25 * edgeRim) + vec3(0.62, 0.80, 1.0) * edgeRim * 0.42 * (1.0 - uDarkroom * 0.5);
    fragColor = vec4((iceTint + rimGlow) * crystalMix, alpha);
    return;
  }

  // Opaque Cook-Torrance GGX PBR Pass
  vec3 albedo = vec3(0.84, 0.74, 0.65);
  float metal = 0.92;
  float rough = 0.24;
  float clearcoat = 0.0;
  vec3 emissive = vec3(0.0);

  if (vMatId == 0) {
    // Brushed Champagne Titanium <-> Marbled Forged Carbon
    float radAngle = atan(vLocalPos.y, vLocalPos.x);
    float brush = sin(radAngle * 180.0 + length(vLocalPos.xy) * 45.0) * 0.5 + 0.5;
    vec3 tiCol = vec3(0.88, 0.76, 0.67) * (0.95 + 0.07 * brush);
    float tiRough = 0.20 + 0.07 * brush;

    vec2 cId;
    float cDist = cellNoise(vLocalPos.xy * 11.5 + vLocalPos.z * 7.0, cId);
    float flake = hash21(cId);
    vec3 cbCol = mix(vec3(0.038, 0.040, 0.046), vec3(0.145, 0.152, 0.168), flake);
    N = normalize(N + vec3(flake - 0.5, hash21(cId + 9.1) - 0.5, 0.0) * 0.22 * uCaseMix.z);

    float carb = clamp(uCaseMix.z / max(0.001, uCaseMix.x + uCaseMix.z), 0.0, 1.0);
    albedo = mix(tiCol, cbCol, carb);
    metal = mix(0.94, 0.38, carb);
    rough = mix(tiRough, 0.26 + 0.16 * cDist, carb);
    clearcoat = carb * 0.85;
  } else if (vMatId == 2) {
    // Satin Black Anodized Barrel
    float grain = hash21(floor(vLocalPos.xy * 420.0));
    albedo = vec3(0.068, 0.072, 0.084) * (0.94 + 0.12 * grain);
    metal = 0.68;
    rough = 0.40;
  } else if (vMatId == 3) {
    // 9 Curved Iris Blades
    float arc = sin(length(vLocalPos.xy) * 140.0) * 0.5 + 0.5;
    albedo = vec3(0.135, 0.142, 0.162) * (0.92 + 0.14 * arc);
    metal = 0.86;
    rough = 0.27;
  } else if (vMatId == 5) {
    // 18k Warm Optical Brass & Acoustic Drum
    albedo = vec3(0.93, 0.73, 0.40);
    metal = 0.95;
    rough = 0.21;
  } else if (vMatId == 6) {
    // Rhodium Steel with Cotes de Geneve Waves & Perlage
    float stripe = sin(vLocalPos.y * 46.0 + sin(vLocalPos.x * 4.0) * 0.35);
    vec2 perlCell = fract(vLocalPos.xy * 18.0) - 0.5;
    float perl = sin(length(perlCell) * 38.0);
    N = normalize(N + vec3(0.0, stripe * 0.085, perl * 0.04));
    albedo = vec3(0.79, 0.81, 0.85) * (0.93 + 0.09 * stripe);
    metal = 0.93;
    rough = 0.22 + 0.05 * abs(stripe);
  } else if (vMatId == 7) {
    // Thermal Flame-Blued Screws
    albedo = vec3(0.08, 0.30, 0.88);
    metal = 0.92;
    rough = 0.14;
  } else if (vMatId == 8) {
    // Synthetic Corundum Ruby Bearings
    albedo = vec3(0.88, 0.05, 0.20);
    metal = 0.15;
    rough = 0.08;
    emissive += vec3(0.62, 0.03, 0.14) * (0.35 + 0.65 * pow(1.0 - NdotV, 2.0));
  } else if (vMatId == 9) {
    // Obsidian Pebbled Grip Leather
    vec2 lId;
    float peb = cellNoise(vLocalPos.xy * 55.0 + vLocalPos.z * 35.0, lId);
    albedo = vec3(0.048, 0.048, 0.055) * (1.08 - 0.32 * peb);
    metal = 0.06;
    rough = 0.68;
  } else if (vMatId == 10) {
    // Super-LumiNova Inlay Pigment
    albedo = vec3(0.76, 0.92, 0.89);
    metal = 0.08;
    rough = 0.32;
  }

  // Super-LumiNova Emission (Polar Ice #8CD2FF -> Emerald #1BEB9E -> Warm Amber #F59E0B)
  float lumeAmt = max(vLumeWeight, (vMatId == 10) ? 1.0 : 0.0);
  if (lumeAmt > 0.01) {
    float warmNode = step(0.55, fract(atan(vLocalPos.y, vLocalPos.x) * 1.43 + vLocalPos.z * 2.1));
    vec3 lumeCyan = mix(vec3(0.55, 0.82, 1.0), vec3(0.11, 0.92, 0.62), 0.35 + 0.25 * sin(uTime * 1.4));
    vec3 lumeAmber = vec3(0.96, 0.62, 0.05);
    vec3 lumeCol = mix(lumeCyan, lumeAmber, warmNode * (0.28 + 0.55 * uChimeGlow));
    float darkBoost = mix(0.10, 1.95 + 0.65 * uChimeGlow, uDarkroom);
    emissive += lumeCol * lumeAmt * darkBoost;
  }

  vec3 L = normalize(uLightDir);
  vec3 H = normalize(V + L);
  float NdotL = max(0.0, dot(N, L));
  float NdotH = max(0.0, dot(N, H));
  float VdotH = max(0.0, dot(V, H));

  float shadow = mix(0.22, 1.0, samplePCFShadow(vShadowCoord));
  float studioScale = mix(1.0, 0.06, uDarkroom);

  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);
  float D = ggxD(NdotH, rough);
  float k = (rough + 1.0) * (rough + 1.0) * 0.125;
  float G = (NdotV / (NdotV * (1.0 - k) + k)) * (NdotL / (NdotL * (1.0 - k) + k));
  vec3 specDirect = (D * F * G) / max(0.001, 4.0 * NdotV * max(0.001, NdotL));

  vec3 kd = (1.0 - F) * (1.0 - metal);
  vec3 directLight = (kd * albedo / PI + specDirect) * vec3(2.45, 2.28, 2.10) * NdotL * shadow * studioScale;

  // Analytical 3-Softbox IBL
  vec3 R = reflect(-V, N);
  vec3 F_ibl = F0 + (max(vec3(1.0 - rough), F0) - F0) * pow(1.0 - NdotV, 5.0);
  vec3 envSpec = sampleStudioEnv(R, rough, uDarkroom) * F_ibl * mix(0.55, 1.0, shadow);
  vec3 envDiff = sampleStudioEnv(N, 0.92, uDarkroom) * albedo * (1.0 - metal) * 0.42;

  if (clearcoat > 0.01) {
    float ccD = ggxD(NdotH, 0.09);
    float ccF = 0.04 + 0.96 * pow(1.0 - VdotH, 5.0);
    envSpec += sampleStudioEnv(R, 0.08, uDarkroom) * ccF * clearcoat * 0.65;
    directLight += vec3(ccD * ccF * 0.25) * NdotL * shadow * clearcoat * studioScale;
  }

  // Subtle internal chamber illumination during Darkroom Lume while keeping Forged Carbon deep obsidian
  if (uDarkroom > 0.02) {
    float coreDist = length(vLocalPos - vec3(0.0, 0.0, -0.25));
    float bounce = 1.0 / (1.0 + coreDist * coreDist * 5.2);
    envDiff += vec3(0.14, 0.36, 0.58) * bounce * uDarkroom * 0.18 * albedo;
  }

  fragColor = vec4(directLight + envSpec + envDiff + emissive, 1.0);
}`;

const LMS_MUSE_VS = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec4 aColor;
layout(location = 3) in vec2 aUv;
uniform mat4 uVP;
uniform mat4 uModel;
uniform mat4 uLightVP;
uniform float uMuseZOffset;
out vec3 vLocalPos;
out vec3 vWorldPos;
out vec3 vWorldNrm;
out vec4 vColor;
out vec2 vUv;
out vec4 vShadowCoord;
void main() {
  vec3 p = aPosition + vec3(0.0, 0.0, uMuseZOffset);
  vec3 wp = (uModel * vec4(p, 1.0)).xyz;
  vec3 wn = normalize(mat3(uModel) * aNormal);
  vLocalPos = aPosition;
  vWorldPos = wp;
  vWorldNrm = wn;
  vColor = aColor;
  vUv = aUv;
  vShadowCoord = uLightVP * vec4(wp + wn * 0.006, 1.0);
  gl_Position = uVP * vec4(wp, 1.0);
}`;

const LMS_MUSE_FS = `#version 300 es
precision highp float;
in vec3 vLocalPos;
in vec3 vWorldPos;
in vec3 vWorldNrm;
in vec4 vColor;
in vec2 vUv;
in vec4 vShadowCoord;
out vec4 fragColor;

uniform highp sampler2DShadow uShadowMap;
uniform vec3 uCamPos;
uniform vec3 uLightDir;
uniform float uDarkroom;
uniform float uDenoise;
uniform float uTime;

void main() {
  vec3 N = normalize(vWorldNrm);
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 L = normalize(uLightDir);
  vec3 H = normalize(V + L);

  vec3 proj = vShadowCoord.xyz / max(0.0001, vShadowCoord.w) * 0.5 + 0.5;
  float sh = 1.0;
  if (proj.x > 0.02 && proj.x < 0.98 && proj.y > 0.02 && proj.y < 0.98 && proj.z < 0.998) {
    sh = texture(uShadowMap, vec3(proj.xy, proj.z - 0.0022));
  }
  float softSh = mix(0.50, 1.0, sh);

  // High-contrast gallery portrait lighting with alabaster subsurface wrap
  float ndl = max(0.0, dot(N, L));
  float ndlWrap = clamp((dot(N, L) + 0.34) / 1.34, 0.0, 1.0);
  vec3 sssTint = vec3(1.02, 0.96, 0.94);
  float rim = pow(1.0 - max(0.0, dot(N, V)), 3.0);
  float spec = pow(max(0.0, dot(N, H)), 52.0) * (0.16 + 0.34 * vColor.a);

  vec3 baseCol = vColor.rgb;
  // Latent denoising emergence: deep atmospheric tone sharpening into 100% pure portrait contrast
  baseCol = mix(baseCol * 0.52 + vec3(0.08, 0.15, 0.24), baseCol, smoothstep(0.05, 0.72, uDenoise));

  float studioScale = mix(1.0, 0.18, uDarkroom);
  vec3 lit = baseCol * sssTint * (0.20 + 0.88 * mix(ndl, ndlWrap, 0.54) * softSh) * studioScale;
  lit += vec3(1.06, 1.01, 0.97) * spec * softSh * studioScale;
  lit += vec3(0.52, 0.74, 1.0) * rim * mix(0.15, 0.26, uDarkroom);

  // Jewel-like Nocturnal Super-LumiNova Catchlights & Starlight Maiden Glow (~58% controlled exposure)
  float lumeMask = clamp(vColor.a, 0.0, 1.0);
  float sharpLume = pow(lumeMask, 1.35);
  vec3 lumeGlow = mix(vec3(0.55, 0.82, 1.0), vec3(0.96, 0.62, 0.08), smoothstep(0.65, 0.96, lumeMask));
  float pulse = 0.94 + 0.06 * sin(uTime * 2.1 + vLocalPos.y * 8.0);
  // Preserve dark eyes, eyelashes & hair contours while illuminating sculpted facial relief
  vec3 darkPortraitLift = baseCol * vec3(0.44, 0.70, 0.96) * (0.22 + 0.44 * ndlWrap) * uDarkroom;
  vec3 starlightLume = lumeGlow * (sharpLume * mix(0.04, 0.86, uDarkroom) + rim * uDarkroom * 0.26) * pulse;
  lit += darkPortraitLift + starlightLume;

  // Smooth highlight shoulder in Darkroom Lume so portrait center never clips to flat white
  float peak = max(lit.r, max(lit.g, lit.b));
  if (peak > 0.92) {
    float clampedPeak = 0.92 + (peak - 0.92) / (1.0 + (peak - 0.92) * 1.45);
    lit *= clampedPeak / peak;
  }

  // Cameo medallion edge feathering into focal mount ring
  float rad = length(vLocalPos.xy) / 0.45;
  lit *= 1.0 - smoothstep(0.88, 1.03, rad) * 0.55;

  fragColor = vec4(lit, 1.0);
}`;

const LMS_PARTICLE_VS = `#version 300 es
layout(location = 0) in vec4 aSeed;
layout(location = 1) in vec3 aTargetPos;
layout(location = 2) in vec4 aPColor;
uniform mat4 uVP;
uniform mat4 uModel;
uniform float uTime;
uniform float uDenoise;
uniform float uDarkroom;
uniform float uWaveguideZ;
uniform float uMuseZOffset;
uniform float uDpr;
out vec4 vCol;
void main() {
  bool isBokeh = aSeed.w > 0.88;
  float phase = aSeed.x * 6.2831853 + uTime * (0.45 + aSeed.y * 0.55);
  float vortexR = 0.10 + 0.42 * sqrt(aSeed.z);
  vec3 noisyPos = vec3(
    cos(phase) * vortexR,
    sin(phase * 1.07) * vortexR,
    mix(uWaveguideZ, -0.30 + uMuseZOffset, aSeed.y) + sin(phase * 2.0) * 0.08
  );

  vec3 target = aTargetPos + vec3(0.0, 0.0, uMuseZOffset + 0.008);
  float condense = isBokeh ? 0.18 * uDenoise : smoothstep(0.0, 1.0, clamp((uDenoise - aSeed.w * 0.22) / 0.78, 0.0, 1.0));
  vec3 p = mix(noisyPos, target, condense);
  vec3 wp = (uModel * vec4(p, 1.0)).xyz;
  gl_Position = uVP * vec4(wp, 1.0);

  float dist = max(0.35, gl_Position.w);
  float basePt = isBokeh ? (11.0 + 16.0 * aSeed.z) : mix(4.6, 1.55, condense);
  gl_PointSize = clamp(basePt * uDpr * (2.4 / dist), 1.0, 42.0);

  vec3 palA = vec3(0.55, 0.82, 1.0);  // #8CD2FF
  vec3 palB = vec3(0.11, 0.92, 0.62); // #1BEB9E
  vec3 palC = vec3(0.96, 0.62, 0.04); // #F59E0B
  vec3 tint = aSeed.x < 0.5 ? mix(palA, palB, aSeed.x * 2.0) : mix(palB, palC, (aSeed.x - 0.5) * 2.0);
  vec3 col = mix(aPColor.rgb, tint, isBokeh ? 0.88 : (0.42 + 0.42 * uDarkroom));

  // Dissolve condensed additive stardust cleanly into the 52,800-vertex Muse surface
  // so swirling latent particles shine during emergence without veiling or blowing out her face
  float sparkKeep = step(0.93, fract(aSeed.x * 37.0 + aSeed.z * 17.0));
  float settledVis = sparkKeep * (0.032 + 0.052 * uDarkroom);
  float swirlVis = 0.62 * (1.0 - smoothstep(0.60, 0.97, condense));
  float vis = isBokeh
    ? (0.09 + 0.14 * uDarkroom)
    : max(swirlVis, settledVis);
  vCol = vec4(col * (0.96 + 0.42 * uDarkroom), vis);
}`;

const LMS_PARTICLE_FS = `#version 300 es
precision mediump float;
in vec4 vCol;
out vec4 fragColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  if (r2 > 1.0) discard;
  float falloff = exp(-r2 * 3.2) * (1.0 - r2);
  float a = falloff * vCol.a;
  fragColor = vec4(vCol.rgb * a, a * 0.25);
}`;

const LMS_BLOOM_BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uDir;
uniform float uThreshold;

vec3 tapSample(vec2 uv) {
  vec3 c = texture(uTex, uv).rgb;
  if (uThreshold > 0.0) {
    float lum = max(c.r, max(c.g, c.b));
    float knee = smoothstep(uThreshold * 0.65, uThreshold * 1.35, lum);
    return c * knee;
  }
  return c;
}

void main() {
  const float w[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec3 sum = tapSample(vUv) * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 ofs = uDir * float(i) * 1.35;
    sum += tapSample(vUv + ofs) * w[i];
    sum += tapSample(vUv - ofs) * w[i];
  }
  fragColor = vec4(sum, 1.0);
}`;

const LMS_COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSceneTex;
uniform sampler2D uBloomTex;
uniform float uDarkroom;

vec3 acesToneMap(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec2 cc = vUv - 0.5;
  float dist2 = dot(cc, cc);
  vec2 shift = cc * dist2 * 0.0045;
  vec3 hdr;
  hdr.r = texture(uSceneTex, clamp(vUv + shift, 0.001, 0.999)).r;
  hdr.g = texture(uSceneTex, vUv).g;
  hdr.b = texture(uSceneTex, clamp(vUv - shift, 0.001, 0.999)).b;

  vec3 bloom = texture(uBloomTex, vUv).rgb;
  hdr += bloom * mix(0.24, 0.46, uDarkroom);

  // Warm cinema studio vignette
  hdr *= 1.0 - smoothstep(0.18, 0.92, dist2) * 0.34;

  vec3 ldr = pow(acesToneMap(hdr * 1.06), vec3(1.0 / 2.2));
  float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  fragColor = vec4(clamp(ldr + dither, 0.0, 1.0), 1.0);
}`;

/* ============================================================================
   3. GEOMETRY CALIBRATION HELPERS (IRIS SIGN & GEAR/HAMMER PIVOTS)
   ============================================================================ */

function lmsResolvePresetUrl(presetId) {
  if (MUSE_PRESETS) {
    if (MUSE_PRESETS[presetId] && MUSE_PRESETS[presetId].imageUrl) {
      return MUSE_PRESETS[presetId].imageUrl;
    }
    if (Array.isArray(MUSE_PRESETS)) {
      for (let i = 0; i < MUSE_PRESETS.length; i++) {
        const p = MUSE_PRESETS[i];
        if (p && p.id === presetId) return p.imageUrl || null;
      }
    }
  }
  if (presetId === 'ccd') return '/api/muse-portrait?id=ccd';
  if (presetId === 'anime') return '/api/muse-portrait?id=anime';
  return null;
}

function lmsCalibrateMechanicalKinematics(mech) {
  const pos = mech.positions;
  const meta = mech.meta;
  const n = mech.vertexCount || 0;
  const pivR = typeof IRIS_PIVOT_RADIUS === 'number' ? IRIS_PIVOT_RADIUS : 0.5;

  let b1SumX = 0, b1SumY = 0, b1Count = 0;
  const gSumX = [0, 0, 0], gSumY = [0, 0, 0], gCnt = [0, 0, 0];
  let h0SumX = 0, h0SumY = 0, h0Cnt = 0;
  let h1SumX = 0, h1SumY = 0, h1Cnt = 0;

  for (let i = 0; i < n; i++) {
    const aux = Math.round(meta[i * 4 + 2]);
    const px = pos[i * 3];
    const py = pos[i * 3 + 1];
    if (aux === 1) {
      b1SumX += px; b1SumY += py; b1Count++;
    } else if (aux >= 11 && aux <= 13) {
      const gi = aux - 11;
      gSumX[gi] += px; gSumY[gi] += py; gCnt[gi]++;
    } else if (aux === 20) {
      h0SumX += px; h0SumY += py; h0Cnt++;
    } else if (aux === 21) {
      h1SumX += px; h1SumY += py; h1Cnt++;
    }
  }

  // Determine whether +theta or -theta swings blade #1 inward toward (0,0)
  let irisCloseSign = 1;
  if (b1Count > 0) {
    const cx = b1SumX / b1Count - pivR;
    const cy = b1SumY / b1Count;
    const testA = 0.25;
    const posR = Math.hypot(pivR + cx * Math.cos(testA) - cy * Math.sin(testA), cx * Math.sin(testA) + cy * Math.cos(testA));
    const negR = Math.hypot(pivR + cx * Math.cos(-testA) - cy * Math.sin(-testA), cx * Math.sin(-testA) + cy * Math.cos(-testA));
    irisCloseSign = posR < negR ? 1 : -1;
  }

  const gearPivots = new Float32Array(6);

  const pD5 = HAMMER_PIVOTS && HAMMER_PIVOTS.D5 ? HAMMER_PIVOTS.D5 : [0.38, -0.32, -0.5];
  const pFS5 = HAMMER_PIVOTS && (HAMMER_PIVOTS.FS5 || HAMMER_PIVOTS['F#5'])
    ? (HAMMER_PIVOTS.FS5 || HAMMER_PIVOTS['F#5'])
    : [-0.38, -0.32, -0.5];

  const calcHammerSign = (sumX, sumY, cnt, px, py) => {
    if (cnt === 0) return 1;
    const dx = sumX / cnt - px;
    const dy = sumY / cnt - py;
    const a = 0.15;
    const rPos = Math.hypot(px + dx * Math.cos(a) - dy * Math.sin(a), py + dx * Math.sin(a) + dy * Math.cos(a));
    const rNeg = Math.hypot(px + dx * Math.cos(-a) - dy * Math.sin(-a), py + dx * Math.sin(-a) + dy * Math.cos(-a));
    return rPos < rNeg ? 1 : -1;
  };

  return {
    irisCloseSign,
    irisPivotR: pivR,
    gearPivots,
    hammerPivotD5: [Number(pD5[0]) || 0, Number(pD5[1]) || 0],
    hammerPivotFS5: [Number(pFS5[0]) || 0, Number(pFS5[1]) || 0],
    hammerSignD5: calcHammerSign(h0SumX, h0SumY, h0Cnt, pD5[0], pD5[1]),
    hammerSignFS5: calcHammerSign(h1SumX, h1SumY, h1Cnt, pFS5[0], pFS5[1])
  };
}

/* ============================================================================
   4. MAIN FACTORY: createLumenMuseStage(canvas, options = {})
   ============================================================================ */

export function createLumenMuseStage(canvas, options = {}) {
  if (!canvas) {
    throw new Error('createLumenMuseStage requires a valid <canvas> element');
  }

  const embedCard = Boolean(options.embedCard);
  const detailMode = embedCard ? 'card' : 'high';
  let musePreset = embedCard ? 'starlight' : String(options.musePreset || 'ccd').toLowerCase();
  if (musePreset !== 'ccd' && musePreset !== 'anime' && musePreset !== 'starlight') {
    musePreset = 'ccd';
  }
  let caseMaterial = String(options.caseMaterial || 'titanium').toLowerCase();
  if (caseMaterial !== 'titanium' && caseMaterial !== 'crystal' && caseMaterial !== 'carbon') {
    caseMaterial = 'titanium';
  }
  let directorActive = options.autoPlay !== undefined ? Boolean(options.autoPlay) : !embedCard;

  const onShotChange = typeof options.onShotChange === 'function' ? options.onShotChange : null;
  const onShutter = typeof options.onShutter === 'function' ? options.onShutter : null;
  const onTick = typeof options.onTick === 'function' ? options.onTick : null;
  const onChimeTrigger = typeof options.onChimeTrigger === 'function' ? options.onChimeTrigger : null;
  const onReady = typeof options.onReady === 'function' ? options.onReady : null;

  // Build initial 170,000+ triangle CAD + Procedural Maiden Muse + Latent Particles
  const mechData = buildMechanicalGeometry({ detail: detailMode });
  let museData = buildProceduralMuseCore(musePreset, { detail: detailMode });
  const particleCount = embedCard ? 4096 : 16384;
  let particleData = buildLatentParticleBuffers(particleCount, museData);
  const kin = lmsCalibrateMechanicalKinematics(mechData);

  const layerDeltaZ = new Float32Array(8);
  for (let i = 0; i < 8; i++) {
    const m = Array.isArray(LUMEN_LAYER_META) && LUMEN_LAYER_META[i] ? LUMEN_LAYER_META[i] : null;
    layerDeltaZ[i] = m ? (Number(m.zExplode) || 0) - (Number(m.zBase) || 0) : (3.5 - i) * 0.25;
  }

  // Pre-allocated state snapshot (zero per-frame GC churn)
  const stateOut = {
    fps: 60,
    triangleCount: (mechData.triangleCount || 0) + (museData.triangleCount || 0),
    shotIndex: 0,
    shotId: DIRECTOR_SHOTS[0].id,
    shotCode: DIRECTOR_SHOTS[0].code,
    shotTitle: DIRECTOR_SHOTS[0].title,
    shotSubtitle: DIRECTOR_SHOTS[0].subtitle,
    elapsed: 0,
    duration: LMS_DURATION,
    timeScale: 1.0,
    explode: embedCard ? 0.34 : 0.0,
    caseMaterial,
    musePreset,
    darkroomLume: false,
    macroSlowMo: false,
    fStop: 1.2
  };

  // Pre-allocated matrices & uniform buffers
  const projMat = new Float32Array(16);
  const viewMat = new Float32Array(16);
  const vpMat = new Float32Array(16);
  const modelMat = new Float32Array(16);
  const lightProjMat = new Float32Array(16);
  const lightViewMat = new Float32Array(16);
  const lightVpMat = new Float32Array(16);
  const layerOffsets = new Float32Array(8);
  const caseMixVec = new Float32Array([1, 0, 0]);
  const targetCaseMix = new Float32Array([1, 0, 0]);

  function syncTargetCaseMix(matName) {
    targetCaseMix[0] = matName === 'titanium' ? 1 : 0;
    targetCaseMix[1] = matName === 'crystal' ? 1 : 0;
    targetCaseMix[2] = matName === 'carbon' ? 1 : 0;
  }
  syncTargetCaseMix(caseMaterial);
  caseMixVec.set(targetCaseMix);

  let targetExplode = stateOut.explode;
  let targetDarkroom = 0;
  let smoothDarkroom = 0;
  let targetAperture = 0.06; // 0 = f/1.2, 1 = f/16
  let smoothAperture = 0.06;
  let shutterSnap = 0;
  let denoiseProgress = 1.0;

  let userAzimuth = embedCard ? -0.46 : -0.25;
  let userElevation = embedCard ? 0.22 : 0.14;
  let userDistance = embedCard ? 3.82 : 3.92;
  let camAzimuth = userAzimuth;
  let camElevation = userElevation;
  let camDistance = userDistance;
  let camFovDeg = 34.0;
  let camTargetY = -0.02;
  let camTargetZ = 0.0;
  let bodyRollX = 0, bodyRollY = 0, bodyRollZ = 0;

  let ptrX = 0, ptrY = 0, smoothPtrX = 0, smoothPtrY = 0;
  let simTime = 0;
  let focusWheelAngle = 0;
  let drumAngle = 0;
  let hammerAngleD5 = 0, hammerVelD5 = 0;
  let hammerAngleFS5 = 0, hammerVelFS5 = 0;
  let chimeGlow = 0;

  let lastNotifiedShot = -1;
  let shutterFiredInRun = false;
  let chimeFiredInRun = false;
  let tickAccum = 0;
  let fallbackChimeIdx = 0;
  const fallbackChimeTimes = [17.55, 18.10, 18.85, 19.40, 20.15, 20.70, 21.35, 21.90];

  let cssW = 640, cssH = 400, dpr = 1, bufW = 640, bufH = 400, fboW = 0, fboH = 0;
  let paused = false, destroyed = false, readyFired = false, rafId = 0, lastFrameMs = 0, smoothFps = 60;

  // Initialize WebGL2 (with 2D fallback only for headless Node/CI environments)
  let gl = null;
  try {
    gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: embedCard ? 'low-power' : 'high-performance',
      preserveDrawingBuffer: false
    });
  } catch (_) {
    gl = null;
  }
  const ctx2d = !gl ? (() => { try { return canvas.getContext('2d'); } catch (_) { return null; } })() : null;

  let backdropProg = null, shadowProg = null, mechProg = null, museProg = null;
  let particleProg = null, bloomProg = null, compositeProg = null;
  let quadVao = null, quadVbo = null;
  let mechVao = null, mechPosVbo = null, mechNrmVbo = null, mechUvVbo = null, mechMetaVbo = null, mechIbo = null;
  let museVao = null, musePosVbo = null, museNrmVbo = null, museColVbo = null, museUvVbo = null, museIbo = null;
  let particleVao = null, pSeedVbo = null, pTargetVbo = null, pColVbo = null;

  const shadowSize = embedCard ? 1024 : 2048;
  let shadowFbo = null, shadowDepthTex = null;
  let sceneFbo = null, sceneColorTex = null, sceneDepthRb = null;
  let bloomFboA = null, bloomTexA = null, bloomFboB = null, bloomTexB = null;
  let useFloatHdr = false;

  let uBg = null, uSh = null, uMc = null, uMu = null, uPt = null, uBl = null, uCp = null;
  const mechIndexType = gl && !(mechData.indices instanceof Uint32Array) ? gl.UNSIGNED_SHORT : 0x1405;
  let museIndexType = gl && !(museData.indices instanceof Uint32Array) ? gl.UNSIGNED_SHORT : 0x1405;
  const mechIndexCount = mechData.indices ? mechData.indices.length : 0;
  let museIndexCount = museData.indices ? museData.indices.length : 0;

  if (gl) {
    useFloatHdr = Boolean(gl.getExtension('EXT_color_buffer_float'));

    backdropProg = lmsCompileProgram(gl, LMS_QUAD_VS, LMS_BACKDROP_FS);
    shadowProg = lmsCompileProgram(gl, LMS_SHADOW_VS, LMS_SHADOW_FS);
    mechProg = lmsCompileProgram(gl, LMS_MECH_VS, LMS_MECH_FS);
    museProg = lmsCompileProgram(gl, LMS_MUSE_VS, LMS_MUSE_FS);
    particleProg = lmsCompileProgram(gl, LMS_PARTICLE_VS, LMS_PARTICLE_FS);
    bloomProg = lmsCompileProgram(gl, LMS_QUAD_VS, LMS_BLOOM_BLUR_FS);
    compositeProg = lmsCompileProgram(gl, LMS_QUAD_VS, LMS_COMPOSITE_FS);

    const getArticLocs = (p) => ({
      uLayerOffsets: gl.getUniformLocation(p, 'uLayerOffsets'),
      uIrisAngle: gl.getUniformLocation(p, 'uIrisAngle'),
      uIrisPivotR: gl.getUniformLocation(p, 'uIrisPivotR'),
      uFocusAngle: gl.getUniformLocation(p, 'uFocusAngle'),
      uDrumAngle: gl.getUniformLocation(p, 'uDrumAngle'),
      uGearPivots: gl.getUniformLocation(p, 'uGearPivots'),
      uHammerAngles: gl.getUniformLocation(p, 'uHammerAngles'),
      uHammerPivotD5: gl.getUniformLocation(p, 'uHammerPivotD5'),
      uHammerPivotFS5: gl.getUniformLocation(p, 'uHammerPivotFS5'),
      uModel: gl.getUniformLocation(p, 'uModel')
    });

    uBg = {
      uRes: gl.getUniformLocation(backdropProg, 'uRes'),
      uDarkroom: gl.getUniformLocation(backdropProg, 'uDarkroom')
    };
    uSh = {
      ...getArticLocs(shadowProg),
      uLightVP: gl.getUniformLocation(shadowProg, 'uLightVP'),
      uIsMuse: gl.getUniformLocation(shadowProg, 'uIsMuse'),
      uMuseZOffset: gl.getUniformLocation(shadowProg, 'uMuseZOffset'),
      uCrystalMix: gl.getUniformLocation(shadowProg, 'uCrystalMix')
    };
    uMc = {
      ...getArticLocs(mechProg),
      uVP: gl.getUniformLocation(mechProg, 'uVP'),
      uLightVP: gl.getUniformLocation(mechProg, 'uLightVP'),
      uShadowMap: gl.getUniformLocation(mechProg, 'uShadowMap'),
      uCamPos: gl.getUniformLocation(mechProg, 'uCamPos'),
      uLightDir: gl.getUniformLocation(mechProg, 'uLightDir'),
      uCaseMix: gl.getUniformLocation(mechProg, 'uCaseMix'),
      uDarkroom: gl.getUniformLocation(mechProg, 'uDarkroom'),
      uTime: gl.getUniformLocation(mechProg, 'uTime'),
      uChimeGlow: gl.getUniformLocation(mechProg, 'uChimeGlow'),
      uPassMode: gl.getUniformLocation(mechProg, 'uPassMode')
    };
    uMu = {
      uVP: gl.getUniformLocation(museProg, 'uVP'),
      uModel: gl.getUniformLocation(museProg, 'uModel'),
      uLightVP: gl.getUniformLocation(museProg, 'uLightVP'),
      uMuseZOffset: gl.getUniformLocation(museProg, 'uMuseZOffset'),
      uShadowMap: gl.getUniformLocation(museProg, 'uShadowMap'),
      uCamPos: gl.getUniformLocation(museProg, 'uCamPos'),
      uLightDir: gl.getUniformLocation(museProg, 'uLightDir'),
      uDarkroom: gl.getUniformLocation(museProg, 'uDarkroom'),
      uDenoise: gl.getUniformLocation(museProg, 'uDenoise'),
      uTime: gl.getUniformLocation(museProg, 'uTime')
    };
    uPt = {
      uVP: gl.getUniformLocation(particleProg, 'uVP'),
      uModel: gl.getUniformLocation(particleProg, 'uModel'),
      uTime: gl.getUniformLocation(particleProg, 'uTime'),
      uDenoise: gl.getUniformLocation(particleProg, 'uDenoise'),
      uDarkroom: gl.getUniformLocation(particleProg, 'uDarkroom'),
      uWaveguideZ: gl.getUniformLocation(particleProg, 'uWaveguideZ'),
      uMuseZOffset: gl.getUniformLocation(particleProg, 'uMuseZOffset'),
      uDpr: gl.getUniformLocation(particleProg, 'uDpr')
    };
    uBl = {
      uTex: gl.getUniformLocation(bloomProg, 'uTex'),
      uDir: gl.getUniformLocation(bloomProg, 'uDir'),
      uThreshold: gl.getUniformLocation(bloomProg, 'uThreshold')
    };
    uCp = {
      uSceneTex: gl.getUniformLocation(compositeProg, 'uSceneTex'),
      uBloomTex: gl.getUniformLocation(compositeProg, 'uBloomTex'),
      uDarkroom: gl.getUniformLocation(compositeProg, 'uDarkroom')
    };

    // Screen Quad VAO
    quadVao = gl.createVertexArray();
    quadVbo = gl.createBuffer();
    gl.bindVertexArray(quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Mechanical CAD VAO (locations 0..3)
    mechVao = gl.createVertexArray();
    gl.bindVertexArray(mechVao);
    const makeBuf = (arr, loc, size, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) => {
      const b = gl.createBuffer();
      gl.bindBuffer(target, b);
      gl.bufferData(target, arr, usage);
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      }
      return b;
    };
    mechPosVbo = makeBuf(mechData.positions, 0, 3);
    mechNrmVbo = makeBuf(mechData.normals, 1, 3);
    mechUvVbo = makeBuf(mechData.uvs, 2, 2);
    mechMetaVbo = makeBuf(mechData.meta, 3, 4);
    mechIbo = makeBuf(mechData.indices, -1, 0, gl.ELEMENT_ARRAY_BUFFER);

    // Maiden Muse Core VAO (locations 0..3)
    museVao = gl.createVertexArray();
    gl.bindVertexArray(museVao);
    musePosVbo = makeBuf(museData.positions, 0, 3, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    museNrmVbo = makeBuf(museData.normals, 1, 3, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    museColVbo = makeBuf(museData.colors, 2, 4, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    museUvVbo = makeBuf(museData.uvs, 3, 2, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    museIbo = makeBuf(museData.indices, -1, 0, gl.ELEMENT_ARRAY_BUFFER, gl.DYNAMIC_DRAW);

    // Latent Tensor Particles VAO (locations 0..2)
    particleVao = gl.createVertexArray();
    gl.bindVertexArray(particleVao);
    pSeedVbo = makeBuf(particleData.seeds, 0, 4, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    pTargetVbo = makeBuf(particleData.targetPos, 1, 3, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    pColVbo = makeBuf(particleData.colors, 2, 4, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);

    gl.bindVertexArray(null);

    // 2048x2048 Hardware PCF Shadow Map FBO
    shadowDepthTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shadowDepthTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, shadowSize, shadowSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

    shadowFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowDepthTex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function ensurePostProcessFbos(w, h) {
    if (!gl || (w === fboW && h === fboH && sceneFbo)) return;
    fboW = w;
    fboH = h;
    const bw = Math.max(2, w >> 1);
    const bh = Math.max(2, h >> 1);

    const allocColorTex = (tw, th, tryFloat) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      if (tryFloat) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, tw, th, 0, gl.RGBA, gl.HALF_FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };

    const cleanupTargets = () => {
      if (sceneColorTex) gl.deleteTexture(sceneColorTex);
      if (sceneDepthRb) gl.deleteRenderbuffer(sceneDepthRb);
      if (sceneFbo) gl.deleteFramebuffer(sceneFbo);
      if (bloomTexA) gl.deleteTexture(bloomTexA);
      if (bloomFboA) gl.deleteFramebuffer(bloomFboA);
      if (bloomTexB) gl.deleteTexture(bloomTexB);
      if (bloomFboB) gl.deleteFramebuffer(bloomFboB);
    };
    cleanupTargets();

    const buildSet = (floatMode) => {
      sceneColorTex = allocColorTex(w, h, floatMode);
      sceneDepthRb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, sceneDepthRb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      sceneFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneColorTex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, sceneDepthRb);
      const okScene = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

      bloomTexA = allocColorTex(bw, bh, floatMode);
      bloomFboA = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFboA);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomTexA, 0);
      const okA = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

      bloomTexB = allocColorTex(bw, bh, floatMode);
      bloomFboB = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFboB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomTexB, 0);
      const okB = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return okScene && okA && okB;
    };

    if (!buildSet(useFloatHdr) && useFloatHdr) {
      useFloatHdr = false;
      cleanupTargets();
      buildSet(false);
    }
  }

  function uploadMuseAndParticleBuffers(nextMuse) {
    museData = nextMuse;
    particleData = buildLatentParticleBuffers(particleCount, museData);
    stateOut.triangleCount = (mechData.triangleCount || 0) + (museData.triangleCount || 0);
    museIndexCount = museData.indices ? museData.indices.length : 0;
    museIndexType = gl && !(museData.indices instanceof Uint32Array) ? gl.UNSIGNED_SHORT : 0x1405;
    if (!gl) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, musePosVbo);
    gl.bufferData(gl.ARRAY_BUFFER, museData.positions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, museNrmVbo);
    gl.bufferData(gl.ARRAY_BUFFER, museData.normals, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, museColVbo);
    gl.bufferData(gl.ARRAY_BUFFER, museData.colors, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, museUvVbo);
    gl.bufferData(gl.ARRAY_BUFFER, museData.uvs, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, museIbo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, museData.indices, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, pSeedVbo);
    gl.bufferData(gl.ARRAY_BUFFER, particleData.seeds, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, pTargetVbo);
    gl.bufferData(gl.ARRAY_BUFFER, particleData.targetPos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, pColVbo);
    gl.bufferData(gl.ARRAY_BUFFER, particleData.colors, gl.DYNAMIC_DRAW);
  }

  // Async Image Muse Core upgrade cache (skipped in ?embed=card fast path)
  const loadedMuseCache = Object.create(null);
  let activeMuseRequestSeq = 0;

  function requestMuseImageUpgrade(presetId) {
    if (embedCard || typeof Image === 'undefined') return;
    const url = lmsResolvePresetUrl(presetId);
    if (!url) return;
    if (loadedMuseCache[presetId]) {
      uploadMuseAndParticleBuffers(loadedMuseCache[presetId]);
      return;
    }
    const reqId = ++activeMuseRequestSeq;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (destroyed) return;
      try {
        const built = buildImageMuseCore(img, presetId, { detail: detailMode });
        if (built && built.positions) {
          loadedMuseCache[presetId] = built;
          if (reqId === activeMuseRequestSeq && musePreset === presetId) {
            uploadMuseAndParticleBuffers(built);
          }
        }
      } catch (_) {}
    };
    img.onerror = () => {};
    img.src = url;
  }

  if (!embedCard && (musePreset === 'ccd' || musePreset === 'anime')) {
    requestMuseImageUpgrade(musePreset);
  }

  function resize() {
    if (destroyed) return;
    const maxDpr = embedCard ? 1 : 2;
    const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    dpr = Math.min(maxDpr, Math.max(1, rawDpr));
    cssW = Math.max(1, canvas.clientWidth || canvas.width || 640);
    cssH = Math.max(1, canvas.clientHeight || canvas.height || 400);
    const nw = Math.max(2, Math.round(cssW * dpr));
    const nh = Math.max(2, Math.round(cssH * dpr));
    if (canvas.width !== nw || canvas.height !== nh || bufW !== nw || bufH !== nh) {
      bufW = nw;
      bufH = nh;
      canvas.width = bufW;
      canvas.height = bufH;
    }
    ensurePostProcessFbos(bufW, bufH);
  }

  function applyShotMetadata(idx) {
    const s = DIRECTOR_SHOTS[idx] || DIRECTOR_SHOTS[0];
    stateOut.shotIndex = s.index;
    stateOut.shotId = s.id;
    stateOut.shotCode = s.code;
    stateOut.shotTitle = s.title;
    stateOut.shotSubtitle = s.subtitle;
    if (lastNotifiedShot !== s.index) {
      lastNotifiedShot = s.index;
      if (onShotChange) onShotChange(s, s.index, stateOut);
    }
  }

  function updateDirectorAndPhysics(dt) {
    smoothPtrX += (ptrX - smoothPtrX) * Math.min(1, dt * 8.0);
    smoothPtrY += (ptrY - smoothPtrY) * Math.min(1, dt * 8.0);

    if (directorActive) {
      stateOut.elapsed = Math.min(LMS_DURATION, stateOut.elapsed + dt);
      const t = stateOut.elapsed;

      if (t < 5.0) {
        // SHOT 01 (0.0-5.0s): Latent Camera Obscura — Hero 3/4 Studio Framing (~14% Velvet Margin)
        applyShotMetadata(0);
        const p = t / 5.0;
        stateOut.timeScale = 1.0;
        stateOut.macroSlowMo = false;
        stateOut.explode = 0.0;
        stateOut.caseMaterial = 'titanium';
        syncTargetCaseMix('titanium');
        targetDarkroom = 0.0;
        stateOut.darkroomLume = false;
        denoiseProgress = 1.0;
        targetAperture = 0.07 + 0.05 * Math.sin(p * Math.PI * 2.0);

        camAzimuth = -0.25 + Math.sin(p * Math.PI * 2.0) * 0.095 + smoothPtrX * 0.10;
        camElevation = 0.14 + Math.sin(p * Math.PI * 2.0) * 0.045 - smoothPtrY * 0.08;
        camDistance = 3.92;
        camFovDeg = 34.0;
        camTargetY = -0.02;
        camTargetZ = 0.0;
        bodyRollX = 0.0; bodyRollY = 0.0; bodyRollZ = Math.sin(p * Math.PI) * 0.035;
      } else if (t < 11.0) {
        // SHOT 02 (5.0-11.0s): 8-Layer Spatial Deconstruction + 9.0s Full Crystal Morph
        if (!shutterFiredInRun) {
          shutterFiredInRun = true;
          shutterSnap = 1.0;
          if (onShutter) onShutter(stateOut);
        }
        applyShotMetadata(1);
        const p = (t - 5.0) / 6.0;
        stateOut.timeScale = 1.0;
        stateOut.macroSlowMo = false;
        targetDarkroom = 0.0;
        stateOut.darkroomLume = false;

        // Axial explosion envelope: opens 5.3-7.6s, holds, converges 9.5-11.0s
        const openK = lmsEaseInOutQuart(lmsClamp((t - 5.25) / 2.25, 0, 1));
        const closeK = 1.0 - lmsEaseInOutQuart(lmsClamp((t - 9.45) / 1.48, 0, 1));
        stateOut.explode = openK * closeK;

        // At t = 9.0s, morph smoothly into Full Optical Crystal!
        const crystalMorph = lmsSmooth(8.55, 9.15, t);
        caseMixVec[0] = 1.0 - crystalMorph;
        caseMixVec[1] = crystalMorph;
        caseMixVec[2] = 0.0;
        stateOut.caseMaterial = crystalMorph > 0.5 ? 'crystal' : 'titanium';
        syncTargetCaseMix(stateOut.caseMaterial);

        const orbitArc = Math.sin(lmsClamp(p, 0, 1) * Math.PI);
        camAzimuth = -0.25 - 0.44 * orbitArc + smoothPtrX * 0.08;
        camElevation = 0.14 + 0.15 * orbitArc - smoothPtrY * 0.06;
        camDistance = 3.92 + 0.52 * orbitArc;
        camFovDeg = 34.0;
        camTargetY = -0.02 * (1.0 - orbitArc);
        camTargetZ = 0.0;
        bodyRollZ = -0.22 * orbitArc;
        denoiseProgress = 1.0 - 0.55 * openK * closeK;
        targetAperture = 0.14 + 0.22 * orbitArc;
      } else if (t < 17.0) {
        // SHOT 03 (11.0-17.0s): 0.10x Macro Dive · Iris & Latent Stardust Convergence
        applyShotMetadata(2);
        const p = (t - 11.0) / 6.0;
        const diveIn = lmsEaseInOutQuart(lmsClamp(p / 0.22, 0, 1));
        const pullOut = 1.0 - lmsEaseInOutQuart(lmsClamp((p - 0.84) / 0.16, 0, 1));
        const macroEnv = diveIn * pullOut;

        stateOut.timeScale = 0.10;
        stateOut.macroSlowMo = true;
        stateOut.explode = 0.08 * macroEnv;
        stateOut.caseMaterial = 'crystal';
        syncTargetCaseMix('crystal');
        targetDarkroom = 0.0;
        stateOut.darkroomLume = false;

        denoiseProgress = 0.12 + 0.88 * lmsSmooth(0.06, 0.88, p);
        targetAperture = 0.04 + 0.34 * Math.sin(p * Math.PI);

        camAzimuth = -0.25 * (1.0 - macroEnv) + Math.sin(p * Math.PI * 2.0) * 0.06 * macroEnv + smoothPtrX * 0.06;
        camElevation = 0.14 * (1.0 - macroEnv) + (0.02 + Math.cos(p * Math.PI) * 0.03) * macroEnv;
        camDistance = 3.92 - 2.66 * macroEnv; // Dives smoothly to 1.26 macro (full front-lens AR clear)
        camFovDeg = 34.0 - 10.0 * macroEnv;    // Narrow telephoto macro FOV
        camTargetY = -0.02 * (1.0 - macroEnv) + 0.02 * macroEnv;
        camTargetZ = -0.18 * macroEnv;
        bodyRollZ = 0.0;
      } else if (t < 23.0) {
        // SHOT 04 (17.0-23.0s): Darkroom Lume & D5 / F#5 Crystal Chimes + Forged Carbon Hero Framing
        applyShotMetadata(3);
        const p = (t - 17.0) / 6.0;
        stateOut.timeScale = 1.0;
        stateOut.macroSlowMo = false;
        stateOut.explode = 0.12 * Math.sin(p * Math.PI);
        stateOut.caseMaterial = 'carbon';
        syncTargetCaseMix('carbon');
        targetDarkroom = 1.0;
        stateOut.darkroomLume = true;
        denoiseProgress = 1.0;
        targetAperture = 0.10;

        if (t >= 17.5 && !chimeFiredInRun) {
          chimeFiredInRun = true;
          if (onChimeTrigger) onChimeTrigger(stateOut);
        }
        while (fallbackChimeIdx < fallbackChimeTimes.length && t >= fallbackChimeTimes[fallbackChimeIdx]) {
          const isD5 = fallbackChimeIdx % 2 === 0;
          if (isD5 && Math.abs(hammerVelD5) < 0.5) hammerVelD5 = 4.2;
          if (!isD5 && Math.abs(hammerVelFS5) < 0.5) hammerVelFS5 = 4.2;
          chimeGlow = Math.min(1.2, chimeGlow + 0.45);
          fallbackChimeIdx++;
        }

        camAzimuth = -0.25 + 0.11 * Math.sin(p * Math.PI) + smoothPtrX * 0.09;
        camElevation = 0.14 + 0.04 * Math.sin(p * Math.PI * 2.0) - smoothPtrY * 0.07;
        camDistance = 3.90;
        camFovDeg = 34.0;
        camTargetY = -0.02;
        camTargetZ = 0.0;
        bodyRollZ = 0.0;
      } else {
        // 23.0-24.0s -> Smoothly restore Champagne Titanium 3/4 Hero Studio & unlock interactive orbit
        const p = lmsClamp(t - 23.0, 0, 1);
        stateOut.timeScale = 1.0;
        stateOut.macroSlowMo = false;
        stateOut.explode = 0.0;
        stateOut.caseMaterial = 'titanium';
        syncTargetCaseMix('titanium');
        targetDarkroom = 0.0;
        stateOut.darkroomLume = false;
        denoiseProgress = 1.0;
        camAzimuth = camAzimuth + (-0.25 - camAzimuth) * (0.18 + 0.82 * p);
        camElevation = 0.14;
        camDistance = 3.92;
        camTargetY = -0.02;
        camFovDeg = 34.0;
        if (t >= LMS_DURATION) {
          directorActive = false;
          targetExplode = 0.0;
          userAzimuth = -0.25;
          userElevation = 0.14;
          userDistance = 3.92;
        }
      }
    } else if (embedCard) {
      // ?embed=card 60fps 3/4 semi-exploded crystal/iridescent orbit + pointer parallax
      simTime += dt;
      const w1 = Math.sin(simTime * 0.65);
      const w2 = Math.cos(simTime * 0.48);
      stateOut.explode = 0.34 + 0.08 * w1;
      const cWave = 0.5 + 0.5 * Math.sin(simTime * 0.38);
      caseMixVec[0] = 1.0 - cWave * 0.65;
      caseMixVec[1] = cWave * 0.65;
      caseMixVec[2] = 0.0;
      camAzimuth = -0.44 + 0.15 * w2 + smoothPtrX * 0.34;
      camElevation = 0.20 + 0.06 * w1 - smoothPtrY * 0.22;
      camDistance = 3.82;
      camTargetY = -0.02;
      camFovDeg = 34.0;
      bodyRollZ = -0.09 + smoothPtrX * 0.05;
      denoiseProgress = 0.88 + 0.10 * w1;
    } else {
      // Free Interactive Studio / Macro / Darkroom Exploration
      const damp = Math.min(1, dt * 7.5);
      stateOut.timeScale = stateOut.macroSlowMo ? 0.10 : 1.0;
      stateOut.explode += (targetExplode - stateOut.explode) * damp;
      denoiseProgress = Math.min(1.0, denoiseProgress + dt * (stateOut.macroSlowMo ? 0.35 : 0.75));

      const goalDist = stateOut.macroSlowMo ? Math.min(userDistance, 1.32) : userDistance;
      const goalFov = stateOut.macroSlowMo ? 24.5 : 34.0;
      const goalZ = stateOut.macroSlowMo ? -0.16 : 0.0;
      const goalY = stateOut.macroSlowMo ? 0.02 : -0.02;

      camAzimuth += (userAzimuth + smoothPtrX * 0.12 - camAzimuth) * damp;
      camElevation += (userElevation - smoothPtrY * 0.10 - camElevation) * damp;
      camDistance += (goalDist - camDistance) * damp;
      camFovDeg += (goalFov - camFovDeg) * damp;
      camTargetZ += (goalZ - camTargetZ) * damp;
      camTargetY += (goalY - camTargetY) * damp;
      bodyRollZ += (0 - bodyRollZ) * damp;
    }

    // Smooth material, darkroom, shutter & spring-hammer integration
    if (!embedCard && !(directorActive && stateOut.elapsed >= 8.5 && stateOut.elapsed < 11.0)) {
      const mRate = Math.min(1, dt * 5.2);
      caseMixVec[0] += (targetCaseMix[0] - caseMixVec[0]) * mRate;
      caseMixVec[1] += (targetCaseMix[1] - caseMixVec[1]) * mRate;
      caseMixVec[2] += (targetCaseMix[2] - caseMixVec[2]) * mRate;
    }
    smoothDarkroom += (targetDarkroom - smoothDarkroom) * Math.min(1, dt * 4.2);
    if (shutterSnap > 0) shutterSnap = Math.max(0, shutterSnap - dt * 7.5);
    const effAperture = lmsClamp(targetAperture + Math.sin(shutterSnap * Math.PI) * 0.88, 0, 1);
    smoothAperture += (effAperture - smoothAperture) * Math.min(1, dt * 11.0);
    stateOut.fStop = Number((1.2 * Math.pow(16 / 1.2, smoothAperture)).toFixed(1));

    const scaledDt = dt * stateOut.timeScale;
    if (!embedCard) simTime += scaledDt;
    focusWheelAngle += scaledDt * 0.24 * Math.cos(simTime * 0.7);
    drumAngle += scaledDt * (stateOut.darkroomLume ? 0.55 : 0.32);

    // Damped harmonic spring physics for D5 & F#5 chime hammers
    hammerVelD5 += (-180.0 * hammerAngleD5 - 14.0 * hammerVelD5) * dt;
    hammerAngleD5 += hammerVelD5 * dt;
    hammerVelFS5 += (-180.0 * hammerAngleFS5 - 14.0 * hammerVelFS5) * dt;
    hammerAngleFS5 += hammerVelFS5 * dt;
    chimeGlow = Math.max(0, chimeGlow - dt * 1.4);

    // Optional focus/iris detent tick callback (6 Hz at 1.0x -> 0.6 Hz at 0.10x)
    if (onTick && !embedCard) {
      tickAccum += scaledDt;
      if (tickAccum >= 0.166) {
        tickAccum %= 0.166;
        onTick(stateOut.timeScale, stateOut);
      }
    }

    // Staggered spring axial offsets per layer 0..7
    const exp = stateOut.explode;
    for (let i = 0; i < 8; i++) {
      const distFromMid = Math.abs(i - 3.5) / 3.5;
      const localK = exp > 0.001 ? lmsEaseOutBack(lmsClamp(exp * (1.08 - distFromMid * 0.08), 0, 1)) : 0;
      layerOffsets[i] = layerDeltaZ[i] * localK;
    }

    // Build camera, model & 2048x2048 shadow matrices
    const aspect = bufW / Math.max(1, bufH);
    const fovRad = (camFovDeg * Math.PI) / 180;
    const fitBoost = aspect < 1.0 ? 1.0 / Math.max(0.52, aspect * 0.92) : 1.0;
    const dist = camDistance * fitBoost;

    const ex = Math.sin(camAzimuth) * Math.cos(camElevation) * dist;
    const ey = Math.sin(camElevation) * dist + camTargetY;
    const ez = Math.cos(camAzimuth) * Math.cos(camElevation) * dist + camTargetZ;

    lmsMat4Perspective(projMat, fovRad, aspect, 0.12, 18.0);
    lmsMat4LookAt(viewMat, ex, ey, ez, 0, camTargetY, camTargetZ, 0, 1, 0);
    lmsMat4Mul(vpMat, projMat, viewMat);
    lmsMat4EulerZXY(modelMat, bodyRollX, bodyRollY, bodyRollZ);

    const lx = -2.6, ly = 3.2, lz = 4.5;
    const orthoR = 1.55 + exp * 1.35;
    lmsMat4Ortho(lightProjMat, -orthoR, orthoR, -orthoR, orthoR, 1.2, 11.5);
    lmsMat4LookAt(lightViewMat, lx, ly, lz, 0, 0, 0, 0, 1, 0);
    lmsMat4Mul(lightVpMat, lightProjMat, lightViewMat);
  }

  const camWorldPos = new Float32Array(3);
  const keyLightDir = new Float32Array([-0.427, 0.525, 0.736]);

  function bindArticulationUniforms(locs) {
    gl.uniform1fv(locs.uLayerOffsets, layerOffsets);
    gl.uniform1f(locs.uIrisAngle, smoothAperture * 0.50 * kin.irisCloseSign);
    gl.uniform1f(locs.uIrisPivotR, kin.irisPivotR);
    gl.uniform1f(locs.uFocusAngle, focusWheelAngle);
    gl.uniform1f(locs.uDrumAngle, drumAngle);
    gl.uniform2fv(locs.uGearPivots, kin.gearPivots);
    gl.uniform2f(
      locs.uHammerAngles,
      hammerAngleD5 * kin.hammerSignD5,
      hammerAngleFS5 * kin.hammerSignFS5
    );
    gl.uniform2f(locs.uHammerPivotD5, kin.hammerPivotD5[0], kin.hammerPivotD5[1]);
    gl.uniform2f(locs.uHammerPivotFS5, kin.hammerPivotFS5[0], kin.hammerPivotFS5[1]);
    gl.uniformMatrix4fv(locs.uModel, false, modelMat);
  }

  function renderWebGL() {
    // Extract camera position from viewMat inverse translation
    camWorldPos[0] = -(viewMat[0] * viewMat[12] + viewMat[1] * viewMat[13] + viewMat[2] * viewMat[14]);
    camWorldPos[1] = -(viewMat[4] * viewMat[12] + viewMat[5] * viewMat[13] + viewMat[6] * viewMat[14]);
    camWorldPos[2] = -(viewMat[8] * viewMat[12] + viewMat[9] * viewMat[13] + viewMat[10] * viewMat[14]);

    // Pass 1: 2048x2048 Depth Shadow Map
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.viewport(0, 0, shadowSize, shadowSize);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.8, 3.5);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shadowProg);
    bindArticulationUniforms(uSh);
    gl.uniformMatrix4fv(uSh.uLightVP, false, lightVpMat);
    gl.uniform1f(uSh.uCrystalMix, caseMixVec[1]);
    gl.uniform1f(uSh.uMuseZOffset, layerOffsets[5]);

    gl.uniform1f(uSh.uIsMuse, 0.0);
    gl.bindVertexArray(mechVao);
    gl.drawElements(gl.TRIANGLES, mechIndexCount, mechIndexType, 0);

    gl.uniform1f(uSh.uIsMuse, 1.0);
    gl.bindVertexArray(museVao);
    gl.drawElements(gl.TRIANGLES, museIndexCount, museIndexType, 0);
    gl.disable(gl.POLYGON_OFFSET_FILL);

    // Pass 2: HDR Studio Scene FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo);
    gl.viewport(0, 0, bufW, bufH);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // 2.0: Studio Velvet / Nocturnal Darkroom Backdrop
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(backdropProg);
    gl.uniform2f(uBg.uRes, bufW, bufH);
    gl.uniform1f(uBg.uDarkroom, smoothDarkroom);
    gl.bindVertexArray(quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);

    // Bind Shadow Map on Texture Unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shadowDepthTex);

    // 2.1: 52,800-Vertex 3D Maiden Muse Relief Core
    gl.useProgram(museProg);
    gl.uniformMatrix4fv(uMu.uVP, false, vpMat);
    gl.uniformMatrix4fv(uMu.uModel, false, modelMat);
    gl.uniformMatrix4fv(uMu.uLightVP, false, lightVpMat);
    gl.uniform1f(uMu.uMuseZOffset, layerOffsets[5]);
    gl.uniform1i(uMu.uShadowMap, 0);
    gl.uniform3fv(uMu.uCamPos, camWorldPos);
    gl.uniform3fv(uMu.uLightDir, keyLightDir);
    gl.uniform1f(uMu.uDarkroom, smoothDarkroom);
    gl.uniform1f(uMu.uDenoise, denoiseProgress);
    gl.uniform1f(uMu.uTime, simTime);
    gl.bindVertexArray(museVao);
    gl.drawElements(gl.TRIANGLES, museIndexCount, museIndexType, 0);

    // 2.2: Opaque Mechanical CAD Pass (Cook-Torrance GGX + Micro-Detail)
    gl.useProgram(mechProg);
    bindArticulationUniforms(uMc);
    gl.uniformMatrix4fv(uMc.uVP, false, vpMat);
    gl.uniformMatrix4fv(uMc.uLightVP, false, lightVpMat);
    gl.uniform1i(uMc.uShadowMap, 0);
    gl.uniform3fv(uMc.uCamPos, camWorldPos);
    gl.uniform3fv(uMc.uLightDir, keyLightDir);
    gl.uniform3fv(uMc.uCaseMix, caseMixVec);
    gl.uniform1f(uMc.uDarkroom, smoothDarkroom);
    gl.uniform1f(uMc.uTime, simTime);
    gl.uniform1f(uMc.uChimeGlow, chimeGlow);
    gl.uniform1i(uMc.uPassMode, 0);
    gl.bindVertexArray(mechVao);
    gl.drawElements(gl.TRIANGLES, mechIndexCount, mechIndexType, 0);

    // 2.3: 16,384 Latent Diffusion Tensor Particles & Optical Bokeh
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(particleProg);
    gl.uniformMatrix4fv(uPt.uVP, false, vpMat);
    gl.uniformMatrix4fv(uPt.uModel, false, modelMat);
    gl.uniform1f(uPt.uTime, simTime);
    gl.uniform1f(uPt.uDenoise, denoiseProgress);
    gl.uniform1f(uPt.uDarkroom, smoothDarkroom);
    gl.uniform1f(uPt.uWaveguideZ, -0.13 + layerOffsets[4]);
    gl.uniform1f(uPt.uMuseZOffset, layerOffsets[5]);
    gl.uniform1f(uPt.uDpr, dpr);
    gl.bindVertexArray(particleVao);
    gl.drawArrays(gl.POINTS, 0, particleData.count);

    // 2.4: Optical Glass (85mm Thin-Film Lens, Dichroic Prism & Two-Sided Full Crystal)
    gl.useProgram(mechProg);
    gl.uniform1i(uMc.uPassMode, 1);
    gl.bindVertexArray(mechVao);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);
    gl.drawElements(gl.TRIANGLES, mechIndexCount, mechIndexType, 0);
    gl.cullFace(gl.BACK);
    gl.drawElements(gl.TRIANGLES, mechIndexCount, mechIndexType, 0);
    gl.disable(gl.CULL_FACE);

    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(true);

    // Pass 3: Multi-Pass Separable HDR Gaussian Bloom
    const bw = Math.max(2, bufW >> 1);
    const bh = Math.max(2, bufH >> 1);
    gl.viewport(0, 0, bw, bh);
    gl.useProgram(bloomProg);
    gl.bindVertexArray(quadVao);

    // Bright-pass + Horizontal blur
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFboA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneColorTex);
    gl.uniform1i(uBl.uTex, 0);
    gl.uniform2f(uBl.uDir, 1.0 / bw, 0.0);
    gl.uniform1f(uBl.uThreshold, 1.04 - 0.22 * smoothDarkroom);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Vertical blur
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFboB);
    gl.bindTexture(gl.TEXTURE_2D, bloomTexA);
    gl.uniform2f(uBl.uDir, 0.0, 1.0 / bh);
    gl.uniform1f(uBl.uThreshold, -1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Wide atmospheric halo pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFboA);
    gl.bindTexture(gl.TEXTURE_2D, bloomTexB);
    gl.uniform2f(uBl.uDir, 2.4 / bw, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFboB);
    gl.bindTexture(gl.TEXTURE_2D, bloomTexA);
    gl.uniform2f(uBl.uDir, 0.0, 2.4 / bh);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Final ACES Composite to Default Framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, bufW, bufH);
    gl.useProgram(compositeProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneColorTex);
    gl.uniform1i(uCp.uSceneTex, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloomTexB);
    gl.uniform1i(uCp.uBloomTex, 1);
    gl.uniform1f(uCp.uDarkroom, smoothDarkroom);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
  }

  function renderFallback2D() {
    if (!ctx2d) return;
    ctx2d.save();
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.fillStyle = stateOut.darkroomLume ? '#050811' : '#1c1817';
    ctx2d.fillRect(0, 0, cssW, cssH);
    const r = Math.min(cssW, cssH) * 0.34;
    ctx2d.strokeStyle = stateOut.darkroomLume ? '#8cd2ff' : '#DEC2AB';
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    ctx2d.arc(cssW * 0.5, cssH * 0.5, r, 0, Math.PI * 2);
    ctx2d.stroke();
    ctx2d.restore();
  }

  function stepFrame(now) {
    if (destroyed || paused) {
      rafId = 0;
      return;
    }
    resize();

    const dtRaw = lastFrameMs > 0 ? (now - lastFrameMs) * 0.001 : 1 / 60;
    lastFrameMs = now;
    const dt = lmsClamp(dtRaw, 0.001, 0.08);
    if (dtRaw > 0.002 && dtRaw < 0.25) {
      smoothFps += (1 / dtRaw - smoothFps) * 0.12;
      stateOut.fps = Math.min(144, Math.max(15, smoothFps));
    }

    updateDirectorAndPhysics(dt);
    if (gl) {
      renderWebGL();
    } else {
      renderFallback2D();
    }

    if (!readyFired) {
      readyFired = true;
      if (onReady) {
        if (typeof queueMicrotask === 'function') {
          queueMicrotask(() => { if (!destroyed) onReady(stateOut); });
        } else {
          setTimeout(() => { if (!destroyed) onReady(stateOut); }, 0);
        }
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(stepFrame);
    }
  }

  // Interactive Pointer Drag Orbit & Wheel Macro Zoom
  let dragging = false, lastX = 0, lastY = 0;

  function onPointerDown(e) {
    if (embedCard || e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    if (directorActive) {
      directorActive = false;
      targetExplode = stateOut.explode;
      userAzimuth = camAzimuth;
      userElevation = camElevation;
      userDistance = camDistance;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onPointerMove(e) {
    if (embedCard) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      ptrX = lmsClamp(((e.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      ptrY = lmsClamp(((e.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
    }
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    userAzimuth = lmsClamp(userAzimuth - dx * 0.0065, -2.2, 2.2);
    userElevation = lmsClamp(userElevation + dy * 0.0055, -0.95, 1.05);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  function onWheel(e) {
    if (embedCard) return;
    e.preventDefault();
    if (directorActive) {
      directorActive = false;
      targetExplode = stateOut.explode;
      userAzimuth = camAzimuth;
      userElevation = camElevation;
      userDistance = camDistance;
    }
    userDistance = lmsClamp(userDistance + e.deltaY * 0.0018, 1.18, 5.6);
  }

  if (!embedCard && typeof canvas.addEventListener === 'function') {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove, { passive: true });
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
  }

  // Paint Frame 1 immediately
  const bootNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
  resize();
  if (directorActive) applyShotMetadata(0);
  stepFrame(bootNow);

  return {
    playDirectorCut() {
      if (destroyed) return;
      stateOut.elapsed = 0;
      stateOut.timeScale = 1.0;
      stateOut.explode = 0;
      stateOut.caseMaterial = 'titanium';
      stateOut.darkroomLume = false;
      stateOut.macroSlowMo = false;
      targetExplode = 0;
      targetDarkroom = 0;
      syncTargetCaseMix('titanium');
      directorActive = true;
      lastNotifiedShot = -1;
      shutterFiredInRun = false;
      chimeFiredInRun = false;
      fallbackChimeIdx = 0;
      applyShotMetadata(0);
      lastFrameMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (paused) {
        paused = false;
        if (!rafId && typeof requestAnimationFrame === 'function') {
          rafId = requestAnimationFrame(stepFrame);
        }
      }
    },
    setExplode(v) {
      const next = lmsClamp(Number(v) || 0, 0, 1);
      if (directorActive) {
        directorActive = false;
        userAzimuth = Math.abs(camAzimuth) < 0.12 ? -0.58 : camAzimuth;
        userElevation = Math.abs(camElevation) < 0.08 ? 0.24 : camElevation;
        userDistance = Math.max(camDistance, 3.92);
      }
      targetExplode = next;
    },
    setMusePreset(presetId) {
      const raw = String(presetId || 'ccd').toLowerCase();
      const next = raw === '02' || raw === 'anime'
        ? 'anime'
        : raw === '03' || raw === 'starlight'
          ? 'starlight'
          : 'ccd';
      if (next === musePreset) return;
      musePreset = next;
      stateOut.musePreset = next;
      denoiseProgress = 0.22;
      const proc = buildProceduralMuseCore(next, { detail: detailMode });
      uploadMuseAndParticleBuffers(proc);
      if (!embedCard && (next === 'ccd' || next === 'anime')) {
        requestMuseImageUpgrade(next);
      }
    },
    setCaseMaterial(mat) {
      const raw = String(mat || 'titanium').toLowerCase();
      const next = raw === 'crystal' ? 'crystal' : raw === 'carbon' ? 'carbon' : 'titanium';
      if (directorActive) {
        directorActive = false;
        targetExplode = stateOut.explode;
        userAzimuth = camAzimuth;
        userElevation = camElevation;
        userDistance = camDistance;
      }
      caseMaterial = next;
      stateOut.caseMaterial = next;
      syncTargetCaseMix(next);
    },
    setDarkroomLume(flag) {
      const next = typeof flag === 'boolean' ? flag : !stateOut.darkroomLume;
      if (directorActive) {
        directorActive = false;
        targetExplode = stateOut.explode;
        userAzimuth = camAzimuth;
        userElevation = camElevation;
        userDistance = camDistance;
      }
      stateOut.darkroomLume = next;
      targetDarkroom = next ? 1.0 : 0.0;
    },
    setMacroSlowMo(flag) {
      const next = typeof flag === 'boolean' ? flag : !stateOut.macroSlowMo;
      if (directorActive) {
        directorActive = false;
        targetExplode = stateOut.explode;
        userAzimuth = camAzimuth;
        userElevation = camElevation;
        userDistance = camDistance;
      }
      stateOut.macroSlowMo = next;
      stateOut.timeScale = next ? 0.10 : 1.0;
      if (next) denoiseProgress = 0.18;
    },
    setAperture(val) {
      const num = Number(val);
      if (Number.isNaN(num)) return;
      if (num > 1.05) {
        targetAperture = lmsClamp(Math.log2(lmsClamp(num, 1.2, 16.0) / 1.2) / Math.log2(16.0 / 1.2), 0, 1);
      } else {
        targetAperture = lmsClamp(num, 0, 1);
      }
    },
    pulseChimeHammer(note = 'D5') {
      const key = String(note || 'D5').toUpperCase();
      if (key === 'FS5' || key === 'F#5') {
        hammerVelFS5 = 4.6;
      } else {
        hammerVelD5 = 4.6;
      }
      chimeGlow = Math.min(1.3, chimeGlow + 0.55);
    },
    setPointer(nx, ny) {
      const rx = Number(nx);
      const ry = Number(ny);
      if (!Number.isNaN(rx)) {
        ptrX = rx < 0 || rx > 1 ? lmsClamp(rx, -1, 1) : (lmsClamp(rx, 0, 1) - 0.5) * 2;
      }
      if (!Number.isNaN(ry)) {
        ptrY = ry < 0 || ry > 1 ? lmsClamp(ry, -1, 1) : (lmsClamp(ry, 0, 1) - 0.5) * 2;
      }
    },
    pause() {
      // Preserve WebGL2 context, shadow map, FBOs & VBOs for 0ms return
      paused = true;
      if (rafId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      lastFrameMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (!rafId && typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(stepFrame);
      }
    },
    resize,
    getState() {
      return stateOut;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      paused = true;
      if (rafId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (!embedCard && typeof canvas.removeEventListener === 'function') {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
      }
      if (gl) {
        const bufs = [quadVbo, mechPosVbo, mechNrmVbo, mechUvVbo, mechMetaVbo, mechIbo, musePosVbo, museNrmVbo, museColVbo, museUvVbo, museIbo, pSeedVbo, pTargetVbo, pColVbo];
        for (let i = 0; i < bufs.length; i++) if (bufs[i]) gl.deleteBuffer(bufs[i]);
        const vaos = [quadVao, mechVao, museVao, particleVao];
        for (let i = 0; i < vaos.length; i++) if (vaos[i]) gl.deleteVertexArray(vaos[i]);
        const texs = [shadowDepthTex, sceneColorTex, bloomTexA, bloomTexB];
        for (let i = 0; i < texs.length; i++) if (texs[i]) gl.deleteTexture(texs[i]);
        if (sceneDepthRb) gl.deleteRenderbuffer(sceneDepthRb);
        const fbos = [shadowFbo, sceneFbo, bloomFboA, bloomFboB];
        for (let i = 0; i < fbos.length; i++) if (fbos[i]) gl.deleteFramebuffer(fbos[i]);
        const progs = [backdropProg, shadowProg, mechProg, museProg, particleProg, bloomProg, compositeProg];
        for (let i = 0; i < progs.length; i++) if (progs[i]) gl.deleteProgram(progs[i]);
      }
    }
  };
}

export default {
  DIRECTOR_SHOTS,
  createLumenMuseStage
};
