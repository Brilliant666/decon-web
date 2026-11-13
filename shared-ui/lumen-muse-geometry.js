/**
 * @license MIT
 * Copyright (c) 2026 Lumen Muse Contributors
 * SPDX-License-Identifier: MIT
 *
 * shared-ui/lumen-muse-geometry.js
 * Specimen #05: LUMEN MUSE (潜影缪斯 · Optics LM-05 · 85mm f/1.2)
 * Procedural 180,000+ Triangle Solid Optical & Mechanical CAD Generator
 * + 52,800-Vertex Dual-Mode 3D Maiden Cameo Relief & 16,384 Latent Particle Cloud.
 *
 * Zero dependencies · Pre-allocated TypedArrays · CCW outward winding guaranteed.
 */

const _lmg = (() => {
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ============================================================================
   1. MATERIAL IDS, 8-LAYER AXIAL METADATA, PIVOTS & MUSE PRESETS
   ============================================================================ */

const LUMEN_MAT = Object.freeze({
  CASE_METAL: 0,
  THINFILM_LENS: 1,
  DARK_ANODIZED: 2,
  IRIS_BLADE: 3,
  CRYSTAL_PRISM: 4,
  GOLD_BRASS: 5,
  GENEVE_STEEL: 6,
  BLUED_STEEL: 7,
  RUBY_JEWEL: 8,
  OBSIDIAN_LEATHER: 9,
  LUME_INLAY: 10,
});

const LUMEN_LAYER_META = Object.freeze([
  Object.freeze({
    index: 0,
    code: 'L01 // ASPHERIC HOOD',
    title: 'Aspheric 85mm f/1.2 Front Element & Petal Hood',
    zh: '非球面紫金增透镀膜前镜组 & 金属遮光罩',
    zBase: 0.64,
    zExplode: 1.76,
  }),
  Object.freeze({
    index: 1,
    code: 'L02 // HELICOID RING',
    title: 'Knurled Helicoid Focus Ring & DOF Scale',
    zh: '精密车削滚花对焦螺旋环',
    zBase: 0.44,
    zExplode: 1.24,
  }),
  Object.freeze({
    index: 2,
    code: 'L03 // 9-BLADE IRIS',
    title: '9-Blade Variable Mechanical Iris Diaphragm',
    zh: '9 叶片机械可变光学光圈',
    zBase: 0.24,
    zExplode: 0.74,
  }),
  Object.freeze({
    index: 3,
    code: 'L04 // DICHROIC PRISM',
    title: 'Dichroic Beam-Splitter Prism & Doublet',
    zh: '极地冰晶二向色分光棱镜 & 消色差双胶合镜组',
    zBase: 0.05,
    zExplode: 0.24,
  }),
  Object.freeze({
    index: 4,
    code: 'L05 // TENSOR WAVEGUIDE',
    title: 'Latent Denoising Tensor Waveguide Grid',
    zh: 'AIGC 潜空间去噪张量波导网',
    zBase: -0.13,
    zExplode: -0.24,
  }),
  Object.freeze({
    index: 5,
    code: 'L06 // MUSE CHAMBER',
    title: 'Silver-Halide Maiden Muse Focal Mount',
    zh: '3D 美少女缪斯显影腔固定环',
    zBase: -0.30,
    zExplode: -0.74,
  }),
  Object.freeze({
    index: 6,
    code: 'L07 // CHIME REPEATER',
    title: 'Harmonic Music-Box Drum & Dual D5/F#5 Hammers',
    zh: '环形声波谐振八音盒音鼓与双音锤机构',
    zBase: -0.50,
    zExplode: -1.24,
  }),
  Object.freeze({
    index: 7,
    code: 'L08 // CAMERA CHASSIS',
    title: 'Medium-Format Optical Chassis, Geneve Plate & Rubies',
    zh: '珍珠纹/日内瓦纹暗房金属机背与中画幅机身外壳',
    zBase: -0.72,
    zExplode: -1.74,
  }),
]);

const IRIS_PIVOT_RADIUS = 0.50;

const HAMMER_PIVOTS = Object.freeze({
  D5: Object.freeze([-0.58, -0.34, -0.50]),
  FS5: Object.freeze([0.58, -0.34, -0.50]),
});

const MUSE_PRESET_ITEMS = [
  Object.freeze({
    id: 'ccd',
    label: 'Muse 01 · CCD Realistic',
    zh: '写实冷调直闪少女',
    imageUrl: '/api/muse-portrait?id=ccd',
    crop: Object.freeze({ x: 0.14, y: 0.03, w: 0.72, h: 0.56 }),
  }),
  Object.freeze({
    id: 'anime',
    label: 'Muse 02 · Cel-Anime',
    zh: '二次元幻想少女',
    imageUrl: '/api/muse-portrait?id=anime',
    crop: Object.freeze({ x: 0.14, y: 0.02, w: 0.72, h: 0.58 }),
  }),
  Object.freeze({
    id: 'starlight',
    label: 'Muse 03 · Starlight Sculpture',
    zh: '纯星尘白玉少女雕像',
    imageUrl: null,
    crop: Object.freeze({ x: 0.14, y: 0.03, w: 0.72, h: 0.56 }),
  }),
];

const MUSE_PRESETS = (() => {
  const arr = [...MUSE_PRESET_ITEMS];
  const byId = Object.create(null);
  for (const item of MUSE_PRESET_ITEMS) {
    byId[item.id] = item;
    Object.defineProperty(arr, item.id, { value: item, enumerable: false });
  }
  Object.defineProperty(arr, 'byId', { value: Object.freeze(byId), enumerable: false });
  Object.defineProperty(arr, 'get', {
    value: (id) => byId[id] || byId.starlight,
    enumerable: false,
  });
  return Object.freeze(arr);
})();

/* ============================================================================
   2. PRE-ALLOCATED SOLID CAD GEOMETRY BUILDER (CCW Outward Normal Verified)
   ============================================================================ */

function createCadBuffer(maxVerts, maxTris) {
  let capV = maxVerts;
  let capI = maxTris * 3;
  let pos = new Float32Array(capV * 3);
  let nor = new Float32Array(capV * 3);
  let uvs = new Float32Array(capV * 2);
  let meta = new Float32Array(capV * 4);
  let idx = new Uint32Array(capI);
  let vCount = 0;
  let iCount = 0;

  function ensure(addV, addI) {
    if (vCount + addV > capV) {
      capV = Math.max(capV * 2, vCount + addV + 4096);
      const np = new Float32Array(capV * 3); np.set(pos); pos = np;
      const nn = new Float32Array(capV * 3); nn.set(nor); nor = nn;
      const nu = new Float32Array(capV * 2); nu.set(uvs); uvs = nu;
      const nm = new Float32Array(capV * 4); nm.set(meta); meta = nm;
    }
    if (iCount + addI > capI) {
      capI = Math.max(capI * 2, iCount + addI + 8192);
      const ni = new Uint32Array(capI); ni.set(idx); idx = ni;
    }
  }

  function vert(px, py, pz, nx, ny, nz, u, v, layerIdx, matId, auxId, lumeW) {
    const i3 = vCount * 3;
    const i2 = vCount * 2;
    const i4 = vCount * 4;
    const inv = 1 / (Math.hypot(nx, ny, nz) || 1);
    pos[i3] = px; pos[i3 + 1] = py; pos[i3 + 2] = pz;
    nor[i3] = nx * inv; nor[i3 + 1] = ny * inv; nor[i3 + 2] = nz * inv;
    uvs[i2] = u; uvs[i2 + 1] = v;
    meta[i4] = layerIdx; meta[i4 + 1] = matId; meta[i4 + 2] = auxId; meta[i4 + 3] = lumeW;
    return vCount++;
  }

  function tri(a, b, c) {
    const a3 = a * 3; const b3 = b * 3; const c3 = c * 3;
    const abx = pos[b3] - pos[a3];
    const aby = pos[b3 + 1] - pos[a3 + 1];
    const abz = pos[b3 + 2] - pos[a3 + 2];
    const acx = pos[c3] - pos[a3];
    const acy = pos[c3 + 1] - pos[a3 + 1];
    const acz = pos[c3 + 2] - pos[a3 + 2];
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    const dot = cx * nor[a3] + cy * nor[a3 + 1] + cz * nor[a3 + 2];
    idx[iCount++] = a;
    if (dot >= 0) {
      idx[iCount++] = b;
      idx[iCount++] = c;
    } else {
      idx[iCount++] = c;
      idx[iCount++] = b;
    }
  }

  function quad(a, b, c, d) {
    tri(a, b, c);
    tri(a, c, d);
  }

  // Revolve a closed 2D (r, z) polygon around center (ox, oy) with crisp split bevel normals
  function addLathe(profile, segs, layerIdx, matId, auxId = 0, lumeW = 0, ox = 0, oy = 0, petalAmp = 0) {
    const nP = profile.length;
    ensure(nP * 2 * (segs + 1), nP * segs * 6);
    for (let p = 0; p < nP; p++) {
      const [r0, z0] = profile[p];
      const [r1, z1] = profile[(p + 1) % nP];
      const dr = r1 - r0;
      const dz = z1 - z0;
      // Outward 2D normal for CCW profile in (r, z): (+dz, -dr) or verify via centroid
      let nr = dz;
      let nz = -dr;
      const len = Math.hypot(nr, nz) || 1;
      nr /= len; nz /= len;

      const baseV = vCount;
      for (let s = 0; s <= segs; s++) {
        const u = s / segs;
        const a = u * TAU;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const petal = petalAmp !== 0 ? petalAmp * Math.cos(2 * a) * smoothstep(0.55, 0.95, Math.max(z0, z1)) : 0;
        vert(ox + r0 * ca, oy + r0 * sa, z0 + petal * (z0 > 0.68 ? 1 : 0), nr * ca, nr * sa, nz, u, 0, layerIdx, matId, auxId, lumeW);
        vert(ox + r1 * ca, oy + r1 * sa, z1 + petal * (z1 > 0.68 ? 1 : 0), nr * ca, nr * sa, nz, u, 1, layerIdx, matId, auxId, lumeW);
      }
      for (let s = 0; s < segs; s++) {
        const k = baseV + s * 2;
        quad(k, k + 2, k + 3, k + 1);
      }
    }
  }

  // Helper: Chamfered annular ring with 8-point octagonal cross-section (crisp 45° bevels on all 4 corners!)
  function addChamferedRing(rIn, rOut, zMid, halfH, bev, segs, layerIdx, matId, auxId = 0, lumeW = 0, ox = 0, oy = 0, petalAmp = 0) {
    const b = Math.min(bev, (rOut - rIn) * 0.35, halfH * 0.42);
    const zB = zMid - halfH;
    const zT = zMid + halfH;
    // Ordered so (dz, -dr) points strictly outward from ring interior!
    const prof = [
      [rOut, zB + b],
      [rOut, zT - b],
      [rOut - b, zT],
      [rIn + b, zT],
      [rIn, zT - b],
      [rIn, zB + b],
      [rIn + b, zB],
      [rOut - b, zB],
    ];
    addLathe(prof, segs, layerIdx, matId, auxId, lumeW, ox, oy, petalAmp);
  }

  // Spherical meniscus / biconvex optical glass lens with smooth continuous surface normals
  function addOpticalLens(rMax, zMid, edgeHalfH, sagFront, sagBack, aSegs, rRings, layerIdx, matId, auxId = 0, lumeW = 0) {
    ensure((rRings + 1) * (aSegs + 1) * 2 + (aSegs + 1) * 2, rRings * aSegs * 12 + aSegs * 6);
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? 1 : -1;
      const sag = side === 0 ? sagFront : sagBack;
      const zEdge = zMid + sign * edgeHalfH;
      const base = vCount;
      for (let j = 0; j <= rRings; j++) {
        const t = j / rRings;
        const r = t * rMax;
        const dome = (1 - t * t) * sag;
        const z = zEdge + sign * dome;
        // z(r) = zEdge + sign * sag * (1 - (r/rMax)^2) => dz/dr = -sign * 2 * sag * r / rMax^2
        const dzdr = -sign * 2 * sag * r / (rMax * rMax || 1);
        const nrMag = -sign * dzdr;
        for (let i = 0; i <= aSegs; i++) {
          const u = i / aSegs;
          const a = u * TAU;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          vert(r * ca, r * sa, z, nrMag * ca, nrMag * sa, sign, 0.5 + 0.5 * t * ca, 0.5 + 0.5 * t * sa, layerIdx, matId, auxId, lumeW);
        }
      }
      const stride = aSegs + 1;
      for (let j = 0; j < rRings; j++) {
        for (let i = 0; i < aSegs; i++) {
          const k = base + j * stride + i;
          quad(k, k + 1, k + stride + 1, k + stride);
        }
      }
    }
    // Outer ground glass cylinder rim
    const rimBase = vCount;
    for (let i = 0; i <= aSegs; i++) {
      const u = i / aSegs;
      const a = u * TAU;
      const ca = Math.cos(a); const sa = Math.sin(a);
      vert(rMax * ca, rMax * sa, zMid - edgeHalfH, ca, sa, 0, u, 0, layerIdx, matId, auxId, lumeW);
      vert(rMax * ca, rMax * sa, zMid + edgeHalfH, ca, sa, 0, u, 1, layerIdx, matId, auxId, lumeW);
    }
    for (let i = 0; i < aSegs; i++) {
      const k = rimBase + i * 2;
      quad(k, k + 2, k + 3, k + 1);
    }
  }

  // Oriented 3D solid box with beveled top/side edges (10 quads = 20 tris per solid block)
  function addBevelBox(cx, cy, cz, hx, hy, hz, bev, rotZ, layerIdx, matId, auxId = 0, lumeW = 0) {
    ensure(40, 60);
    const c = Math.cos(rotZ);
    const s = Math.sin(rotZ);
    const b = Math.min(bev, hx * 0.35, hy * 0.35, hz * 0.4);
    const emitFace = (pts, nxL, nyL, nzL) => {
      const nx = nxL * c - nyL * s;
      const ny = nxL * s + nyL * c;
      const v0 = vCount;
      for (let k = 0; k < 4; k++) {
        const [lx, ly, lz] = pts[k];
        vert(cx + lx * c - ly * s, cy + lx * s + ly * c, cz + lz, nx, ny, nzL, k & 1, (k >> 1) & 1, layerIdx, matId, auxId, lumeW);
      }
      quad(v0, v0 + 1, v0 + 2, v0 + 3);
    };
    const ix = hx - b; const iy = hy - b; const iz = hz - b;
    // Top + Bottom
    emitFace([[-ix, -iy, hz], [ix, -iy, hz], [ix, iy, hz], [-ix, iy, hz]], 0, 0, 1);
    emitFace([[-hx, iy, -hz], [hx, iy, -hz], [hx, -iy, -hz], [-hx, -iy, -hz]], 0, 0, -1);
    // 4 Side walls
    emitFace([[hx, -iy, -hz], [hx, iy, -hz], [hx, iy, iz], [hx, -iy, iz]], 1, 0, 0);
    emitFace([[-hx, iy, -hz], [-hx, -iy, -hz], [-hx, -iy, iz], [-hx, iy, iz]], -1, 0, 0);
    emitFace([[-ix, hy, -hz], [ix, hy, -hz], [ix, hy, iz], [-ix, hy, iz]], 0, 1, 0);
    emitFace([[ix, -hy, -hz], [-ix, -hy, -hz], [-ix, -hy, iz], [ix, -hy, iz]], 0, -1, 0);
    // 4 Top 45-degree bevel strips (catch studio highlights!)
    emitFace([[ix, -iy, hz], [hx, -iy, iz], [hx, iy, iz], [ix, iy, hz]], 0.707, 0, 0.707);
    emitFace([[-ix, iy, hz], [-hx, iy, iz], [-hx, -iy, iz], [-ix, -iy, hz]], -0.707, 0, 0.707);
    emitFace([[-ix, iy, hz], [ix, iy, hz], [ix, hy, iz], [-ix, hy, iz]], 0, 0.707, 0.707);
    emitFace([[ix, -iy, hz], [-ix, -iy, hz], [-ix, -hy, iz], [ix, -hy, iz]], 0, -0.707, 0.707);
  }

  // Involute-trapezoid 3D spur gear / knurled toothed ring
  function addToothedGearRing(rInner, rRoot, rTip, zMid, halfH, teeth, layerIdx, matId, auxId = 0, lumeW = 0) {
    addChamferedRing(rInner, rRoot + 0.004, zMid, halfH, halfH * 0.22, Math.max(48, teeth), layerIdx, matId, auxId, lumeW);
    const step = TAU / teeth;
    const toothHalfW = rRoot * step * 0.27;
    const toothHalfLen = (rTip - rRoot) * 0.54;
    const rMid = (rRoot + rTip) * 0.5 - 0.002;
    for (let t = 0; t < teeth; t++) {
      const a = t * step;
      addBevelBox(
        Math.cos(a) * rMid,
        Math.sin(a) * rMid,
        zMid,
        toothHalfLen,
        toothHalfW,
        halfH * 0.92,
        toothHalfW * 0.28,
        a,
        layerIdx,
        matId,
        auxId,
        lumeW
      );
    }
  }

  // Curved 3D extruded arc blade (used for 9 iris blades, camera bridges & contoured grips)
  function addCurvedArcSolid(cx, cy, zMid, rIn, rOut, halfH, aStart, aEnd, arcSegs, layerIdx, matId, auxId = 0, lumeW = 0, taperTip = false) {
    ensure((arcSegs + 1) * 16, arcSegs * 30);
    const zT = zMid + halfH;
    const zB = zMid - halfH;
    for (let s = 0; s < arcSegs; s++) {
      const t0 = s / arcSegs;
      const t1 = (s + 1) / arcSegs;
      const a0 = aStart + (aEnd - aStart) * t0;
      const a1 = aStart + (aEnd - aStart) * t1;
      const tap0 = taperTip ? 1 - 0.55 * t0 * t0 : 1;
      const tap1 = taperTip ? 1 - 0.55 * t1 * t1 : 1;
      const rMid = (rIn + rOut) * 0.5;
      const hw0 = (rOut - rIn) * 0.5 * tap0;
      const hw1 = (rOut - rIn) * 0.5 * tap1;
      const ri0 = rMid - hw0; const ro0 = rMid + hw0;
      const ri1 = rMid - hw1; const ro1 = rMid + hw1;
      const c0 = Math.cos(a0); const s0 = Math.sin(a0);
      const c1 = Math.cos(a1); const s1 = Math.sin(a1);

      // Front (+Z), Back (-Z), Outer (+R), Inner (-R)
      const f = vCount;
      vert(cx + ri0 * c0, cy + ri0 * s0, zT, 0, 0, 1, t0, 0, layerIdx, matId, auxId, lumeW);
      vert(cx + ro0 * c0, cy + ro0 * s0, zT, 0, 0, 1, t0, 1, layerIdx, matId, auxId, lumeW);
      vert(cx + ro1 * c1, cy + ro1 * s1, zT, 0, 0, 1, t1, 1, layerIdx, matId, auxId, lumeW);
      vert(cx + ri1 * c1, cy + ri1 * s1, zT, 0, 0, 1, t1, 0, layerIdx, matId, auxId, lumeW);
      quad(f, f + 1, f + 2, f + 3);

      const b = vCount;
      vert(cx + ri0 * c0, cy + ri0 * s0, zB, 0, 0, -1, t0, 0, layerIdx, matId, auxId, lumeW);
      vert(cx + ri1 * c1, cy + ri1 * s1, zB, 0, 0, -1, t1, 0, layerIdx, matId, auxId, lumeW);
      vert(cx + ro1 * c1, cy + ro1 * s1, zB, 0, 0, -1, t1, 1, layerIdx, matId, auxId, lumeW);
      vert(cx + ro0 * c0, cy + ro0 * s0, zB, 0, 0, -1, t0, 1, layerIdx, matId, auxId, lumeW);
      quad(b, b + 1, b + 2, b + 3);

      const o = vCount;
      vert(cx + ro0 * c0, cy + ro0 * s0, zB, c0, s0, 0.18, t0, 0, layerIdx, matId, auxId, lumeW);
      vert(cx + ro1 * c1, cy + ro1 * s1, zB, c1, s1, 0.18, t1, 0, layerIdx, matId, auxId, lumeW);
      vert(cx + ro1 * c1, cy + ro1 * s1, zT, c1, s1, 0.18, t1, 1, layerIdx, matId, auxId, lumeW);
      vert(cx + ro0 * c0, cy + ro0 * s0, zT, c0, s0, 0.18, t0, 1, layerIdx, matId, auxId, lumeW);
      quad(o, o + 1, o + 2, o + 3);

      const inn = vCount;
      vert(cx + ri0 * c0, cy + ri0 * s0, zT, -c0, -s0, 0.18, t0, 1, layerIdx, matId, auxId, lumeW);
      vert(cx + ri1 * c1, cy + ri1 * s1, zT, -c1, -s1, 0.18, t1, 1, layerIdx, matId, auxId, lumeW);
      vert(cx + ri1 * c1, cy + ri1 * s1, zB, -c1, -s1, 0.18, t1, 0, layerIdx, matId, auxId, lumeW);
      vert(cx + ri0 * c0, cy + ri0 * s0, zB, -c0, -s0, 0.18, t0, 0, layerIdx, matId, auxId, lumeW);
      quad(inn, inn + 1, inn + 2, inn + 3);
    }
  }

  // Thermal-blued slotted screw head (two domed D-halves separated by recessed diametric slot)
  function addSlottedScrew(cx, cy, zBase, radius, height, slotAngle, segs, layerIdx, matId = LUMEN_MAT.BLUED_STEEL, auxId = 0) {
    addChamferedRing(0.001, radius, zBase + height * 0.35, height * 0.35, height * 0.14, segs, layerIdx, matId, auxId, 0, cx, cy);
    const off = radius * 0.34;
    for (let side = -1; side <= 1; side += 2) {
      const a = slotAngle + (side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
      addBevelBox(
        cx + Math.cos(a) * off,
        cy + Math.sin(a) * off,
        zBase + height * 0.78,
        radius * 0.78,
        radius * 0.24,
        height * 0.22,
        height * 0.09,
        slotAngle,
        layerIdx,
        matId,
        auxId,
        0
      );
    }
  }

  // Synthetic Ruby Jewel Bearing in Polished Golden Brass Chaton Collar
  function addRubyChaton(cx, cy, zBase, rOuter, height, segs, layerIdx, auxId = 0) {
    addChamferedRing(rOuter * 0.56, rOuter, zBase + height * 0.42, height * 0.42, height * 0.18, segs, layerIdx, LUMEN_MAT.GOLD_BRASS, auxId, 0, cx, cy);
    addChamferedRing(0.001, rOuter * 0.62, zBase + height * 0.66, height * 0.34, height * 0.18, segs, layerIdx, LUMEN_MAT.RUBY_JEWEL, auxId, 0.22, cx, cy);
  }

  function finish() {
    return {
      positions: pos.slice(0, vCount * 3),
      normals: nor.slice(0, vCount * 3),
      uvs: uvs.slice(0, vCount * 2),
      meta: meta.slice(0, vCount * 4),
      indices: idx.slice(0, iCount),
      vertexCount: vCount,
      triangleCount: (iCount / 3) | 0,
    };
  }

  return {
    addLathe,
    addChamferedRing,
    addOpticalLens,
    addBevelBox,
    addToothedGearRing,
    addCurvedArcSolid,
    addSlottedScrew,
    addRubyChaton,
    finish,
  };
}

/* ============================================================================
   3. 8-LAYER OPTICAL & MECHANICAL CAD GENERATOR (buildMechanicalGeometry)
   ============================================================================ */

function buildMechanicalGeometry(options = {}) {
  const isCard = options.detail === 'card';
  const segHi = isCard ? 64 : 128;
  const segMid = isCard ? 40 : 84;
  const segSmall = isCard ? 16 : 28;
  const cad = createCadBuffer(isCard ? 52000 : 124000, isCard ? 48000 : 112000);

  // --------------------------------------------------------------------------
  // LAYER 0 (z = +0.64): Aspheric 85mm f/1.2 Front Lens, Bezel & Petal Hood
  // --------------------------------------------------------------------------
  const z0 = LUMEN_LAYER_META[0].zBase;
  // Machined 4-lobe bayonet petal lens hood + anti-reflective inner baffles
  cad.addChamferedRing(0.68, 0.80, z0 + 0.07, 0.065, 0.014, segHi, 0, LUMEN_MAT.DARK_ANODIZED, 0, 0, 0, 0, 0.048);
  cad.addChamferedRing(0.60, 0.72, z0 + 0.01, 0.048, 0.012, segHi, 0, LUMEN_MAT.CASE_METAL);
  cad.addChamferedRing(0.56, 0.61, z0 + 0.025, 0.026, 0.007, segHi, 0, LUMEN_MAT.DARK_ANODIZED);
  // Thin luminous Super-LumiNova optical specification ring & 72 bezel engraving ticks
  cad.addChamferedRing(0.635, 0.652, z0 + 0.059, 0.004, 0.0015, segHi, 0, LUMEN_MAT.LUME_INLAY, 0, 0.92);
  const bezelTicks = isCard ? 36 : 72;
  for (let i = 0; i < bezelTicks; i++) {
    const a = (i / bezelTicks) * TAU;
    const isCardMark = i % (bezelTicks / 4) === 0;
    const isMajor = i % (bezelTicks / 12) === 0;
    const len = isCardMark ? 0.032 : isMajor ? 0.022 : 0.013;
    cad.addBevelBox(
      Math.cos(a) * 0.685,
      Math.sin(a) * 0.685,
      z0 + 0.058,
      len,
      isCardMark ? 0.008 : 0.004,
      0.005,
      0.0015,
      a,
      0,
      isCardMark ? LUMEN_MAT.LUME_INLAY : LUMEN_MAT.GOLD_BRASS,
      0,
      isCardMark ? 1.0 : 0
    );
  }
  // High-tessellation curved 85mm f/1.2 convex-meniscus front optical glass element
  cad.addOpticalLens(0.565, z0 - 0.01, 0.022, 0.088, -0.026, segHi, isCard ? 16 : 30, 0, LUMEN_MAT.THINFILM_LENS, 0, 0.08);

  // --------------------------------------------------------------------------
  // LAYER 1 (z = +0.44): Knurled Helicoid Focus Ring (auxId = 10) & DOF Collar
  // --------------------------------------------------------------------------
  const z1 = LUMEN_LAYER_META[1].zBase;
  const knurlCount = isCard ? 96 : 192;
  cad.addToothedGearRing(0.62, 0.755, 0.792, z1, 0.068, knurlCount, 1, LUMEN_MAT.DARK_ANODIZED, 10, 0);
  cad.addChamferedRing(0.58, 0.748, z1 + 0.056, 0.018, 0.006, segHi, 1, LUMEN_MAT.CASE_METAL, 10, 0);
  cad.addChamferedRing(0.58, 0.748, z1 - 0.056, 0.018, 0.006, segHi, 1, LUMEN_MAT.CASE_METAL, 10, 0);
  // Lume focus triangle marker at 12 o'clock + red ruby mount index at 3 o'clock + DOF scale bars
  cad.addBevelBox(0, 0.755, z1 + 0.065, 0.018, 0.026, 0.008, 0.0025, 0, 1, LUMEN_MAT.LUME_INLAY, 10, 1.0);
  cad.addRubyChaton(0.752, 0, z1 + 0.062, 0.022, 0.014, segSmall, 1, 10);
  const dofCount = isCard ? 24 : 48;
  for (let i = 0; i < dofCount; i++) {
    const a = (i / dofCount) * TAU;
    const lume = i % 6 === 0 ? 0.88 : 0;
    cad.addBevelBox(
      Math.cos(a) * 0.695,
      Math.sin(a) * 0.695,
      z1 + 0.072,
      i % 6 === 0 ? 0.022 : 0.012,
      0.004,
      0.004,
      0.001,
      a,
      1,
      lume > 0 ? LUMEN_MAT.LUME_INLAY : LUMEN_MAT.GOLD_BRASS,
      10,
      lume
    );
  }

  // --------------------------------------------------------------------------
  // LAYER 2 (z = +0.24): 9-Blade Variable Mechanical Iris (auxId = 1..9)
  // --------------------------------------------------------------------------
  const z2 = LUMEN_LAYER_META[2].zBase;
  cad.addChamferedRing(0.535, 0.665, z2 - 0.018, 0.022, 0.007, segMid, 2, LUMEN_MAT.DARK_ANODIZED);
  cad.addChamferedRing(0.492, 0.545, z2 + 0.016, 0.012, 0.004, segMid, 2, LUMEN_MAT.GOLD_BRASS);

  // 9 Curved Beveled Crescent Blades: hinged at (0.50*cos(a_i), 0.50*sin(a_i)), sweeping CCW
  // Positive CCW rotation around each blade's pivot swings the tip inward toward (0,0) (f/1.2 -> f/16)!
  const bladeArcSegs = isCard ? 16 : 30;
  for (let i = 0; i < 9; i++) {
    const aux = i + 1;
    const aPivot = (i * TAU) / 9;
    const px = Math.cos(aPivot) * IRIS_PIVOT_RADIUS;
    const py = Math.sin(aPivot) * IRIS_PIVOT_RADIUS;
    const zBlade = z2 + (i % 2 === 0 ? 0.003 : -0.003);

    // Build curved blade centered at (0,0) in open f/1.2 pose from aPivot to aPivot + 1.02 rad
    cad.addCurvedArcSolid(0, 0, zBlade, 0.432, 0.542, 0.0075, aPivot + 0.02, aPivot + 1.04, bladeArcSegs, 2, LUMEN_MAT.IRIS_BLADE, aux, 0, true);
    // Luminous Super-LumiNova inner aperture edge strip riding with each blade!
    cad.addCurvedArcSolid(0, 0, zBlade + 0.006, 0.428, 0.440, 0.0035, aPivot + 0.08, aPivot + 0.96, Math.max(8, bladeArcSegs >> 1), 2, LUMEN_MAT.LUME_INLAY, aux, 0.95, true);
    // Brass pivot pin & synthetic ruby bearing on each blade hinge
    cad.addRubyChaton(px, py, z2 + 0.012, 0.020, 0.014, segSmall, 2, aux);
  }

  // --------------------------------------------------------------------------
  // LAYER 3 (z = +0.05): Polar Ice Dichroic Beam-Splitter Prism & Doublet
  // --------------------------------------------------------------------------
  const z3 = LUMEN_LAYER_META[3].zBase;
  // Multi-faceted octagonal/dodecahedral crystal beam-splitter prism crown (12 crisp facets!)
  cad.addChamferedRing(0.36, 0.51, z3 + 0.018, 0.038, 0.016, 12, 3, LUMEN_MAT.CRYSTAL_PRISM, 0, 0.14);
  // Inner cemented achromatic doublet lens element (clear central optical path onto Muse!)
  cad.addOpticalLens(0.42, z3 - 0.016, 0.016, 0.044, 0.032, segMid, isCard ? 12 : 22, 3, LUMEN_MAT.CRYSTAL_PRISM, 0, 0.10);
  // Dark anodized suspension cage + 6 blued-steel retaining clips
  cad.addChamferedRing(0.505, 0.615, z3, 0.026, 0.008, segMid, 3, LUMEN_MAT.DARK_ANODIZED);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    cad.addBevelBox(Math.cos(a) * 0.54, Math.sin(a) * 0.54, z3 + 0.028, 0.042, 0.020, 0.010, 0.003, a, 3, LUMEN_MAT.GENEVE_STEEL);
    cad.addSlottedScrew(Math.cos(a) * 0.565, Math.sin(a) * 0.565, z3 + 0.034, 0.016, 0.012, a * 2.1, segSmall, 3, LUMEN_MAT.BLUED_STEEL);
  }

  // --------------------------------------------------------------------------
  // LAYER 4 (z = -0.13): AIGC Latent Denoising Tensor Waveguide Grid
  // --------------------------------------------------------------------------
  const z4 = LUMEN_LAYER_META[4].zBase;
  cad.addChamferedRing(0.452, 0.505, z4, 0.016, 0.005, segMid, 4, LUMEN_MAT.GOLD_BRASS);
  cad.addChamferedRing(0.555, 0.612, z4, 0.020, 0.006, segMid, 4, LUMEN_MAT.GOLD_BRASS);
  cad.addChamferedRing(0.495, 0.562, z4 - 0.008, 0.008, 0.003, 6, 4, LUMEN_MAT.DARK_ANODIZED);
  const vaneCount = isCard ? 24 : 48;
  for (let i = 0; i < vaneCount; i++) {
    const a = (i / vaneCount) * TAU;
    cad.addBevelBox(Math.cos(a) * 0.53, Math.sin(a) * 0.53, z4 + 0.008, 0.048, 0.0055, 0.008, 0.002, a, 4, LUMEN_MAT.GOLD_BRASS);
    if (i % 2 === 0) {
      cad.addBevelBox(Math.cos(a) * 0.468, Math.sin(a) * 0.468, z4 + 0.015, 0.011, 0.008, 0.006, 0.002, a, 4, LUMEN_MAT.LUME_INLAY, 0, 1.0);
    }
    if (i % 8 === 0) {
      cad.addRubyChaton(Math.cos(a) * 0.585, Math.sin(a) * 0.585, z4 + 0.016, 0.019, 0.012, segSmall, 4);
    }
  }

  // --------------------------------------------------------------------------
  // LAYER 5 (z = -0.30): Silver-Halide Maiden Muse Focal Cameo Mount Ring
  // --------------------------------------------------------------------------
  const z5 = LUMEN_LAYER_META[5].zBase;
  // Precision stepped medallion bezel framing the r = 0.45 3D Maiden Muse Core + thin backing dish
  cad.addChamferedRing(0.442, 0.515, z5 + 0.008, 0.024, 0.008, segHi, 5, LUMEN_MAT.GOLD_BRASS);
  cad.addChamferedRing(0.510, 0.605, z5 - 0.006, 0.022, 0.007, segMid, 5, LUMEN_MAT.CASE_METAL);
  cad.addChamferedRing(0.002, 0.455, z5 - 0.022, 0.012, 0.004, segMid, 5, LUMEN_MAT.DARK_ANODIZED);
  cad.addChamferedRing(0.446, 0.458, z5 + 0.031, 0.004, 0.0015, segHi, 5, LUMEN_MAT.LUME_INLAY, 0, 0.90);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    cad.addRubyChaton(Math.cos(a) * 0.556, Math.sin(a) * 0.556, z5 + 0.014, 0.022, 0.014, segSmall, 5);
    cad.addSlottedScrew(Math.cos(a + Math.PI / 8) * 0.556, Math.sin(a + Math.PI / 8) * 0.556, z5 + 0.014, 0.016, 0.012, a, segSmall, 5, LUMEN_MAT.BLUED_STEEL);
  }

  // --------------------------------------------------------------------------
  // LAYER 6 (z = -0.50): Coaxial Music-Box Drum (auxId=11), Spur Gears (12,13) & Dual Hammers (20,21)
  // --------------------------------------------------------------------------
  const z6 = LUMEN_LAYER_META[6].zBase;
  // Annular pinned brass music-box drum (auxId = 11, coaxial around Z so rotation is wobble-free!)
  cad.addChamferedRing(0.455, 0.535, z6, 0.036, 0.008, segMid, 6, LUMEN_MAT.GOLD_BRASS, 11, 0);
  const pinCount = isCard ? 36 : 72;
  for (let p = 0; p < pinCount; p++) {
    const a = (p * 2.399963) % TAU; // Golden-angle melodic pin distribution!
    const zOff = ((p % 5) - 2) * 0.011;
    cad.addBevelBox(Math.cos(a) * 0.544, Math.sin(a) * 0.544, z6 + zOff, 0.014, 0.0045, 0.0045, 0.0015, a, 6, LUMEN_MAT.GOLD_BRASS, 11, 0);
  }
  // Coaxial outer governor spur gear (auxId = 12) & inner escapement star wheel (auxId = 13)
  cad.addToothedGearRing(0.558, 0.598, 0.634, z6 - 0.016, 0.015, isCard ? 36 : 60, 6, LUMEN_MAT.GOLD_BRASS, 12, 0);
  cad.addToothedGearRing(0.385, 0.418, 0.446, z6 - 0.014, 0.014, isCard ? 24 : 40, 6, LUMEN_MAT.GENEVE_STEEL, 13, 0);

  // 18 Graduated Geneve-Steel Acoustic Comb Tines at top-arc + blued mounting bridge
  cad.addBevelBox(0, 0.655, z6 + 0.014, 0.24, 0.036, 0.018, 0.005, 0, 6, LUMEN_MAT.GENEVE_STEEL);
  cad.addSlottedScrew(-0.18, 0.655, z6 + 0.030, 0.018, 0.012, 0.4, segSmall, 6);
  cad.addSlottedScrew(0.18, 0.655, z6 + 0.030, 0.018, 0.012, -0.6, segSmall, 6);
  for (let t = 0; t < 18; t++) {
    const tx = -0.19 + (t / 17) * 0.38;
    const tineLen = 0.044 + (1 - t / 17) * 0.024;
    cad.addBevelBox(tx, 0.618 - tineLen * 0.5, z6 + 0.012, 0.0055, tineLen * 0.5, 0.006, 0.0015, 0, 6, LUMEN_MAT.GENEVE_STEEL);
  }

  // Twin Cathedral Wire Gongs curving around left (D5) & right (F#5) flanks
  cad.addCurvedArcSolid(0, 0, z6 + 0.018, 0.668, 0.684, 0.009, Math.PI * 0.62, Math.PI * 1.32, isCard ? 16 : 28, 6, LUMEN_MAT.GENEVE_STEEL, 0, 0);
  cad.addCurvedArcSolid(0, 0, z6 + 0.018, 0.668, 0.684, 0.009, -Math.PI * 0.32, Math.PI * 0.38, isCard ? 16 : 28, 6, LUMEN_MAT.GENEVE_STEEL, 0, 0);

  // Articulated Dual Chime Hammers: auxId = 20 (D5 left) & auxId = 21 (FS5 right)
  const buildHammer = (piv, sideSign, aux) => {
    const [px, py] = piv;
    cad.addRubyChaton(px, py, z6 + 0.018, 0.032, 0.020, segSmall, 6, aux);
    const armAngle = sideSign < 0 ? Math.PI * 0.56 : Math.PI * 0.44;
    const armLen = 0.21;
    const mx = px + Math.cos(armAngle) * armLen;
    const my = py + Math.sin(armAngle) * armLen;
    cad.addBevelBox(mx, my, z6 + 0.018, armLen, 0.014, 0.012, 0.004, armAngle, 6, LUMEN_MAT.GENEVE_STEEL, aux, 0);
    const hx = px + Math.cos(armAngle) * (armLen * 1.92);
    const hy = py + Math.sin(armAngle) * (armLen * 1.92);
    cad.addBevelBox(hx, hy, z6 + 0.020, 0.036, 0.052, 0.022, 0.006, armAngle, 6, LUMEN_MAT.GOLD_BRASS, aux, 0);
    cad.addBevelBox(hx + sideSign * 0.018, hy, z6 + 0.032, 0.018, 0.032, 0.008, 0.002, armAngle, 6, LUMEN_MAT.LUME_INLAY, aux, 1.0);
  };
  buildHammer(HAMMER_PIVOTS.D5, -1, 20);
  buildHammer(HAMMER_PIVOTS.FS5, +1, 21);

  // --------------------------------------------------------------------------
  // LAYER 7 (z = -0.72): Medium-Format Camera Body, Leather Grips, Geneve Plate & Rubies
  // --------------------------------------------------------------------------
  const z7 = LUMEN_LAYER_META[7].zBase;
  // Central lens-throat bayonet flange + stepped camera main housing (unmistakable horizontal medium-format camera!)
  cad.addChamferedRing(0.64, 0.84, z7 + 0.08, 0.075, 0.020, segHi, 7, LUMEN_MAT.CASE_METAL);
  cad.addBevelBox(0, -0.02, z7 - 0.04, 0.96, 0.62, 0.13, 0.038, 0, 7, LUMEN_MAT.CASE_METAL);
  // Top & Bottom precision machined Champagne Titanium baseplates
  cad.addBevelBox(0, 0.56, z7 - 0.03, 0.97, 0.075, 0.145, 0.022, 0, 7, LUMEN_MAT.CASE_METAL);
  cad.addBevelBox(0, -0.60, z7 - 0.03, 0.97, 0.070, 0.145, 0.022, 0, 7, LUMEN_MAT.CASE_METAL);
  // Top Optical Viewfinder / Pentaprism Hump + Cold-Shoe Accessory Rail
  cad.addBevelBox(0, 0.69, z7 - 0.02, 0.34, 0.095, 0.125, 0.032, 0, 7, LUMEN_MAT.CASE_METAL);
  cad.addBevelBox(0, 0.792, z7 - 0.02, 0.14, 0.014, 0.075, 0.004, 0, 7, LUMEN_MAT.GENEVE_STEEL);
  cad.addBevelBox(0, 0.70, z7 + 0.106, 0.18, 0.036, 0.006, 0.002, 0, 7, LUMEN_MAT.LUME_INLAY, 0, 0.85);
  // Top-right Knurled Shutter Speed Dial + Ruby-Crowned Shutter Release Button + Left ISO Dial
  cad.addChamferedRing(0.01, 0.125, z7 + 0.01, 0.052, 0.012, segSmall * 2, 7, LUMEN_MAT.CASE_METAL, 0, 0, 0.62, 0.65);
  cad.addRubyChaton(0.82, 0.645, z7 + 0.01, 0.062, 0.038, segSmall, 7);
  cad.addChamferedRing(0.01, 0.105, z7 + 0.01, 0.044, 0.010, segSmall * 2, 7, LUMEN_MAT.DARK_ANODIZED, 0, 0, -0.64, 0.65);
  // Left & Right Camera Strap Eyelets
  cad.addChamferedRing(0.022, 0.048, z7 - 0.02, 0.022, 0.007, segSmall, 7, LUMEN_MAT.GENEVE_STEEL, 0, 0, -0.99, 0.38);
  cad.addChamferedRing(0.022, 0.048, z7 - 0.02, 0.022, 0.007, segSmall, 7, LUMEN_MAT.GENEVE_STEEL, 0, 0, 0.99, 0.38);

  // Sculpted Left & Right Pebbled Obsidian Leather Ergonomic Camera Grips
  cad.addBevelBox(-0.80, -0.02, z7 - 0.01, 0.175, 0.49, 0.142, 0.032, 0, 7, LUMEN_MAT.OBSIDIAN_LEATHER);
  cad.addBevelBox(0.80, -0.02, z7 - 0.01, 0.175, 0.49, 0.142, 0.032, 0, 7, LUMEN_MAT.OBSIDIAN_LEATHER);
  // Right-hand ergonomic finger grip bolster
  cad.addBevelBox(0.87, -0.02, z7 + 0.075, 0.075, 0.44, 0.085, 0.028, 0, 7, LUMEN_MAT.OBSIDIAN_LEATHER);

  // Interior Côtes de Genève & Perlage Movement Plate + 4 Sculpted Bridges + 12 Blued Screws + 8 Rubies
  cad.addChamferedRing(0.02, 0.68, z7 + 0.095, 0.022, 0.006, segHi, 7, LUMEN_MAT.GENEVE_STEEL);
  for (let b = 0; b < 4; b++) {
    const a = (b / 4) * TAU + Math.PI * 0.25;
    cad.addCurvedArcSolid(0, 0, z7 + 0.128, 0.28, 0.61, 0.016, a - 0.52, a + 0.52, isCard ? 12 : 24, 7, LUMEN_MAT.GENEVE_STEEL);
  }
  for (let s = 0; s < 12; s++) {
    const a = (s / 12) * TAU;
    const r = s % 2 === 0 ? 0.54 : 0.36;
    cad.addSlottedScrew(Math.cos(a) * r, Math.sin(a) * r, z7 + 0.142, 0.024, 0.016, a * 1.7 + 0.3, segSmall, 7, LUMEN_MAT.BLUED_STEEL);
    if (s % 2 === 0) {
      cad.addRubyChaton(Math.cos(a + Math.PI / 12) * 0.45, Math.sin(a + Math.PI / 12) * 0.45, z7 + 0.142, 0.028, 0.018, segSmall, 7);
    }
  }

  return cad.finish();
}

/* ============================================================================
   4. CONCENTRIC CAMEO MESH TOPOLOGY & ANALYTICAL 3D MAIDEN SCULPTURE
   ============================================================================ */

const CAMEO_RADIUS = 0.45;
const CAMEO_Z_BASE = -0.30;

// Shirley-Chiu square [-1,1]^2 -> unit disk bijection (true circular cameo boundary, zero polar pinch!)
function squareToDisk(sx, sy) {
  const ax = Math.abs(sx);
  const ay = Math.abs(sy);
  if (ax < 1e-7 && ay < 1e-7) return [0, 0, 0];
  let r;
  let phi;
  if (ax >= ay) {
    r = ax;
    phi = (Math.PI * 0.25) * (sy / sx);
    if (sx < 0) phi += Math.PI;
  } else {
    r = ay;
    phi = (Math.PI * 0.5) - (Math.PI * 0.25) * (sx / sy);
    if (sy < 0) phi += Math.PI;
  }
  return [r * Math.cos(phi), r * Math.sin(phi), r];
}

// Smooth polynomial maximum (eliminates crease/staircase artifacts between sculptural forms)
function smax(a, b, k = 0.016) {
  const h = clamp(0.5 + 0.5 * (b - a) / (k || 1e-5), 0, 1);
  return a * (1 - h) + b * h + k * h * (1 - h);
}

// Analytical 3D Maiden Cameo Relief Evaluator:
// Returns [height, regionCode, hairStrand, lumeMask, catchlight, anatomicalAO]
function evaluateAnalyticalMaiden(u, v, r) {
  const edgeFade = smoothstep(0.985, 0.75, r);
  const rimBead = 0.0135 * Math.exp(-Math.pow((r - 0.955) / 0.021, 2));
  const dishBase = 0.0045 * Math.max(0, 1 - r * r) * (0.86 + 0.14 * Math.cos(r * 44));

  // Subtle serene poised head tilt (~1 deg)
  const x = u - 0.016 * (v - 0.06);
  const y = v;
  const ax = Math.abs(x);
  const sxSign = x >= 0 ? 1 : -1;

  // --------------------------------------------------------------------------
  // 1. Unified Continuous Cranial Crown -> Flowing S-Curve Waterfall Hair
  // --------------------------------------------------------------------------
  // Continuous C1 silhouette width wHair(y): pure oval arch above y = 0.16,
  // seamlessly transitioning at w = 0.42 into a gentle S-wave tapering to 0 at y = -0.78!
  let hairHalfW = 0;
  if (y >= 0.16 && y < 0.645) {
    const ty = (y - 0.16) / 0.485;
    hairHalfW = 0.425 * Math.sqrt(Math.max(0, 1 - ty * ty));
  } else if (y < 0.16 && y > -0.78) {
    const tFlow = (0.16 - y) / 0.94;
    hairHalfW = (0.425 + 0.048 * Math.sin(tFlow * Math.PI * 1.45 + sxSign * 0.25)) *
      Math.pow(Math.max(0, Math.cos(tFlow * Math.PI * 0.5)), 0.78);
  }

  const partDip = 0.0085 * Math.exp(-Math.pow((x + 0.078) / 0.045, 2)) * smoothstep(0.38, 0.58, y);
  const cranDx = x / 0.425;
  const cranDy = (y - 0.18) / 0.465;
  const cranR2 = cranDx * cranDx + cranDy * cranDy;
  const crownDome = cranR2 < 1.08
    ? smoothstep(1.05, 0.72, Math.sqrt(cranR2)) *
      smoothstep(-0.06, 0.18, y) *
      (0.058 + 0.044 * Math.sqrt(Math.max(0, 1 - Math.min(1, cranR2 * 0.88)))) - partDip
    : 0;

  // Flowing S-curve strand locks inside the unified waterfall silhouette (zero temple pinch!)
  const tLock = clamp((0.20 - y) / 0.98, 0, 1);
  const sTrack = hairHalfW * 0.72 + 0.018 * Math.sin(tLock * 5.2 + sxSign * 0.4);
  const strandCoord = (ax - sTrack) * 38 + Math.sin(y * 6.2 + x * 2.5) * 1.25;
  const strandMicro = 0.5 + 0.5 * Math.sin(strandCoord);
  const strandFine = 0.5 + 0.5 * Math.sin(strandCoord * 2.0 + 0.7);
  const hairFlute = 0.0048 * (strandMicro - 0.5) + 0.0018 * (strandFine - 0.5);

  let hHairFlow = 0;
  if (hairHalfW > 0.006 && ax < hairHalfW * 1.08) {
    const nxH = ax / hairHalfW;
    // Below collarbones (y < -0.24), split locks cleanly onto left & right shoulders so hair never crosses her sternum!
    const chestClearance = 1 - smoothstep(-0.20, -0.36, y) * smoothstep(0.28, 0.14, ax);
    const outerLockCushion = Math.exp(-Math.pow((nxH - 0.74) / 0.28, 2)) * 0.026 * smoothstep(0.28, -0.05, y);
    const baseDome = smoothstep(1.06, 0.72, nxH) * (0.040 + 0.022 * Math.sqrt(Math.max(0, 1 - Math.min(1, nxH * nxH))));
    hHairFlow = smoothstep(0.32, 0.08, y) * chestClearance * (baseDome + outerLockCushion + hairFlute * smoothstep(1.04, 0.65, nxH));
  }
  const crownStrand = 0.5 + 0.5 * Math.sin(Math.atan2(y - 0.36, x + 0.078) * 24 + cranR2 * 4.8);
  const hCrown = Math.max(0, crownDome + (crownDome > 0.01 ? 0.0040 * (crownStrand - 0.5) : 0));

  // --------------------------------------------------------------------------
  // 2. Classical Portrait Bust, Graceful Proportionate Neck & Collarbones
  // --------------------------------------------------------------------------
  const bustRx = x / 0.62;
  const bustRy = (y + 0.57) / 0.35;
  const bustR2 = bustRx * bustRx + bustRy * bustRy;
  const hShoulders = bustR2 < 1.15
    ? smoothstep(1.12, 0.38, Math.sqrt(bustR2)) *
      smoothstep(-0.21, -0.39, y) *
      (0.055 + 0.026 * Math.sqrt(Math.max(0, 1 - Math.min(1, bustR2))))
    : 0;

  const clavCurveY = -0.325 + 0.044 * smoothstep(0.03, 0.38, ax) - 0.014 * Math.pow(clamp((ax - 0.20) / 0.18, -1, 1), 2);
  const clavRidge = 0.0074 * Math.exp(-Math.pow((y - clavCurveY) / 0.021, 2)) *
    smoothstep(0.03, 0.095, ax) * smoothstep(0.44, 0.28, ax);
  const sternalHollow = -0.0052 * Math.exp(-(Math.pow(x / 0.046, 2) + Math.pow((y + 0.330) / 0.030, 2)));
  const collarRibbonY = -0.432 + 0.19 * x * x;
  const collarRibbon = 0.0088 * Math.exp(-Math.pow((y - collarRibbonY) / 0.017, 2)) * smoothstep(0.40, 0.04, ax);
  const starPendant = 0.0175 * Math.exp(-(Math.pow(x / 0.030, 2) + Math.pow((y + 0.435) / 0.035, 2)));
  const hBust = Math.max(0, hShoulders + clavRidge + sternalHollow + collarRibbon + starPendant);

  // Proportionate slender neck (-0.20 chin to -0.33 collarbone notch)
  const neckHalfW = 0.114 + 0.030 * smoothstep(-0.18, -0.34, y);
  const neckNx = clamp(ax / neckHalfW, 0, 1.3);
  const hNeck = neckNx < 1.12
    ? smoothstep(1.10, 0.70, neckNx) *
      smoothstep(-0.44, -0.30, y) *
      smoothstep(-0.06, -0.18, y) *
      (0.043 + 0.026 * Math.sqrt(Math.max(0, 1 - Math.min(1, neckNx * neckNx))))
    : 0;

  // --------------------------------------------------------------------------
  // 3. Serene V-Oval Maiden Face (Classic 1/2-Head Eye Line, Petite Nose & Soft Lips)
  // --------------------------------------------------------------------------
  // Centered at (0, 0.095), chin softly rounded at y = -0.20, forehead up to y = +0.39
  const fy = (y - 0.095) / 0.298;
  const cheekSwelling = 0.020 * Math.exp(-Math.pow((y - 0.025) / 0.105, 2));
  const jawProfile = y < 0.095
    ? 0.32 + 0.68 * Math.pow(smoothstep(-0.208, 0.095, y), 0.76)
    : 1.0 - 0.07 * Math.pow(clamp((y - 0.095) / 0.30, 0, 1.2), 1.4);
  const faceHalfW = Math.max(0.052, 0.292 * jawProfile + cheekSwelling);
  const fx = x / faceHalfW;
  const faceR2 = fx * fx + fy * fy;

  let hFace = 0;
  let eyeCreaseAO = 0;
  let lipCreaseAO = 0;
  let irisMask = 0;
  if (faceR2 < 1.12) {
    const faceR = Math.sqrt(faceR2);
    const dome = Math.sqrt(Math.max(0, 1 - Math.min(1, faceR2 * 0.88)));
    hFace = smoothstep(1.06, 0.78, faceR) * (0.048 + 0.062 * dome);

    // Soft cheek fullness & rounded chin cushion
    hFace += 0.0092 * Math.exp(-(Math.pow((ax - 0.155) / 0.095, 2) + Math.pow((y - 0.012) / 0.092, 2)));
    hFace += 0.0046 * Math.exp(-(Math.pow(x / 0.054, 2) + Math.pow((y + 0.165) / 0.040, 2)));

    // Expressive almond eyes at classic 1/2-head height (y = 0.108, |x| = 0.128)
    const eyeCx = 0.128;
    const eyeTiltY = 0.108 + 0.055 * (ax - eyeCx);
    const ex = (ax - eyeCx) / 0.068;
    const ey = (y - eyeTiltY) / 0.035;
    const eyeR2 = ex * ex + ey * ey;
    hFace -= 0.0095 * Math.exp(-eyeR2 * 0.58);
    eyeCreaseAO += 0.30 * Math.exp(-eyeR2 * 0.78);

    if (eyeR2 < 1.15) {
      hFace += 0.0120 * Math.max(0, 1 - eyeR2 * 0.90);
      const irisR2 = Math.pow((ax - eyeCx) / 0.032, 2) + Math.pow((y - eyeTiltY) / 0.029, 2);
      if (irisR2 < 1.0) {
        irisMask = smoothstep(1.0, 0.55, Math.sqrt(irisR2));
        hFace -= 0.0018 * irisMask;
      }
    }

    // Crisp upper eyelash arch, delicate eyelid crease & serene brow arch
    const lashCurve = eyeTiltY + 0.020 - 0.14 * Math.pow(ax - eyeCx, 2);
    const lashBand = Math.exp(-Math.pow((y - lashCurve) / 0.0078, 2)) *
      smoothstep(0.054, 0.078, ax) * smoothstep(0.212, 0.180, ax);
    hFace += 0.0065 * lashBand;
    eyeCreaseAO += 0.46 * lashBand;

    const lidFold = Math.exp(-Math.pow((y - (lashCurve + 0.015)) / 0.0060, 2)) *
      smoothstep(0.062, 0.086, ax) * smoothstep(0.202, 0.168, ax);
    hFace -= 0.0020 * lidFold;
    eyeCreaseAO += 0.20 * lidFold;

    const browCurve = 0.184 + 0.068 * (ax - 0.12) - 0.42 * Math.pow(ax - 0.142, 2);
    const browBand = Math.exp(-Math.pow((y - browCurve) / 0.0115, 2)) *
      smoothstep(0.048, 0.082, ax) * smoothstep(0.232, 0.188, ax);
    hFace += 0.0040 * browBand;
    eyeCreaseAO += 0.16 * browBand;

    // Smooth glabella -> petite narrow nose bridge starting gently below eye line -> pert nose tip at y = -0.024
    const noseBridge = smoothstep(0.115, 0.045, y) * smoothstep(-0.042, -0.008, y) * Math.exp(-Math.pow(x / 0.023, 2));
    hFace += 0.0115 * noseBridge * (0.65 + 0.45 * clamp((0.09 - y) / 0.12, 0, 1));
    hFace += 0.0145 * Math.exp(-(Math.pow(x / 0.030, 2) + Math.pow((y + 0.024) / 0.026, 2)));
    hFace += 0.0038 * Math.exp(-(Math.pow((ax - 0.028) / 0.015, 2) + Math.pow((y + 0.031) / 0.014, 2)));
    const nostrilShadow = Math.exp(-(Math.pow((ax - 0.017) / 0.010, 2) + Math.pow((y + 0.042) / 0.007, 2)));
    hFace -= 0.0026 * nostrilShadow;
    lipCreaseAO += 0.34 * nostrilShadow;

    // Subtle philtrum + gentle Cupid's-bow upper lip, delicate smile-part & soft lower lip
    const philtrum = Math.exp(-Math.pow(x / 0.014, 2)) * smoothstep(-0.042, -0.058, y) * smoothstep(-0.092, -0.072, y);
    hFace -= 0.0018 * philtrum;

    const mouthEnv = Math.exp(-Math.pow(x / 0.058, 2));
    const cupidArch = -0.092 - 0.0052 * Math.cos(clamp(x / 0.022, -Math.PI, Math.PI));
    hFace += 0.0082 * mouthEnv * Math.exp(-Math.pow((y - cupidArch) / 0.011, 2));

    const lipPartY = -0.106 + 0.24 * x * x;
    const lipPart = mouthEnv * Math.exp(-Math.pow((y - lipPartY) / 0.0050, 2));
    hFace -= 0.0042 * lipPart;
    lipCreaseAO += 0.45 * lipPart;

    hFace += 0.0096 * Math.exp(-Math.pow(x / 0.048, 2)) * Math.exp(-Math.pow((y + 0.121) / 0.0135, 2));
    const chinCrease = Math.exp(-Math.pow(x / 0.042, 2)) * Math.exp(-Math.pow((y + 0.142) / 0.010, 2));
    hFace -= 0.0020 * chinCrease;
    lipCreaseAO += 0.16 * chinCrease;
  }

  // --------------------------------------------------------------------------
  // 4. Soft Side-Parted Curtain Bang Sweep, Cheek Forelocks & Crescent Hairpin
  // --------------------------------------------------------------------------
  const cranMask = cranR2 < 1.08 ? smoothstep(1.04, 0.74, Math.sqrt(cranR2)) : 0;
  const partX = x + 0.082;
  const bangArcY = partX >= 0
    ? 0.315 - 0.30 * clamp(partX, 0, 0.40) + 0.013 * Math.sin(partX * 30)
    : 0.315 + 0.38 * clamp(partX, -0.34, 0) + 0.011 * Math.sin(partX * 28);
  const bangFeather = 0.5 + 0.5 * Math.sin(partX * 32 - y * 7);
  const hBangs = cranMask *
    smoothstep(bangArcY - 0.022, bangArcY + 0.055, y) *
    smoothstep(0.60, 0.38, y) *
    smoothstep(0.38, 0.18, ax) *
    (0.104 + 0.0048 * (bangFeather - 0.5));

  // Softly sweeping face-framing temple forelocks curving smoothly along the cheekbones
  const tSide = clamp((0.26 - y) / 0.66, 0, 1);
  const sideCenter = 0.285 - 0.036 * Math.sin(tSide * Math.PI * 0.88) + 0.016 * tSide * tSide;
  const sideHalfW = 0.056 * Math.sin(Math.pow(clamp(tSide, 0.03, 0.99), 0.54) * Math.PI) + 0.004;
  const dSide = Math.abs(ax - sideCenter) / sideHalfW;
  const hSideLock = (y < 0.28 && y > -0.40 && dSide < 1.15)
    ? smoothstep(1.10, 0.32, dSide) * smoothstep(0.28, 0.14, y) * (0.092 + 0.0044 * (strandMicro - 0.5))
    : 0;

  // Starlight crescent hairpin tucked on left temple
  const ornDist2 = Math.pow((x + 0.285) / 0.034, 2) + Math.pow((y - 0.245) / 0.025, 2);
  const hOrnament = 0.019 * Math.exp(-ornDist2);

  // Smooth C1 union of all sculptural forms
  const hairFrontH = smax(smax(hCrown, hBangs, 0.016), hSideLock, 0.018);
  const bustNeckH = smax(hBust, hNeck, 0.016);
  const figureH = smax(smax(hHairFlow, bustNeckH, 0.018), smax(hFace, hairFrontH, 0.014), 0.014) + hOrnament;
  const totalH = dishBase + figureH * edgeFade + rimBead;

  // --------------------------------------------------------------------------
  // 5. Region Classification, Sculptural Chiaroscuro AO & Jewel-Line Lume
  // --------------------------------------------------------------------------
  // Soft lip & iris weights so color transitions on 'ccd' / 'anime' / 'starlight' are silky rather than harsh!
  let region = 0;
  if (hOrnament > 0.005 || starPendant > 0.005 || collarRibbon > 0.0045 || rimBead > 0.005) {
    region = 5;
  } else if (hairFrontH > hFace - 0.001 && hairFrontH > 0.024) {
    region = 2;
  } else if (hFace > 0.024) {
    const eyeCx = 0.128;
    const eyeTiltY = 0.108 + 0.055 * (ax - eyeCx);
    const ex = (ax - eyeCx) / 0.056;
    const ey = (y - eyeTiltY) / 0.025;
    const lipR2 = Math.pow(x / 0.052, 2) + Math.pow((y + 0.106) / 0.022, 2);
    if (ex * ex + ey * ey < 1.0) region = 4;
    else if (lipR2 < 1.0) region = 3;
    else region = 1;
  } else if (hNeck > 0.018 || hShoulders > 0.018) {
    region = 1;
  } else if (hHairFlow > 0.014) {
    region = 2;
  }

  // Rich sculptural Chiaroscuro AO: under-chin shadow, bang/sidelock cast shadow, eye/lip crevices & hair valleys
  const jawBorderY = -0.200 + 0.34 * ax * ax;
  const submentalShadow = (region === 1 && hFace < 0.028 && y < jawBorderY + 0.025)
    ? 0.44 * Math.exp(-Math.pow((y - (jawBorderY - 0.022)) / 0.034, 2)) * smoothstep(0.16, 0.02, ax)
    : 0;
  const bangCastShadow = region === 1
    ? 0.26 * Math.exp(-Math.pow((y - (bangArcY - 0.018)) / 0.024, 2)) * smoothstep(0.30, 0.06, ax)
    : 0;
  const cheekLockShadow = region === 1
    ? 0.22 * Math.exp(-Math.pow((ax - (sideCenter - sideHalfW * 0.92)) / 0.024, 2)) * smoothstep(-0.22, 0.14, y) * smoothstep(0.26, 0.08, y)
    : 0;
  const neckHairShadow = (region === 2 && hHairFlow > hairFrontH)
    ? 0.32 * smoothstep(0.32, 0.12, ax) * smoothstep(0.14, -0.35, y)
    : 0;
  const hairValleyShadow = region === 2
    ? 0.26 * (1 - strandMicro) + 0.10 * (1 - strandFine)
    : 0;
  const clavShadow = region === 1
    ? 0.18 * Math.exp(-Math.pow((y - (clavCurveY + 0.024)) / 0.020, 2)) * smoothstep(0.06, 0.32, ax)
    : 0;

  const ao = clamp(
    1.0 - submentalShadow - bangCastShadow - cheekLockShadow - neckHairShadow -
    hairValleyShadow - clavShadow - eyeCreaseAO - lipCreaseAO - irisMask * 0.24,
    0.32,
    1.0
  );

  // Twin bright starlight catchlights (consistent upper-right key light on BOTH left & right eyes!)
  const eyeLx = -0.128 + 0.015;
  const eyeRx = 0.128 + 0.015;
  const eyeCatchY = 0.116;
  const catchMain = Math.exp(-(Math.pow(x - eyeLx, 2) + Math.pow(y - eyeCatchY, 2)) / 0.00018) +
    Math.exp(-(Math.pow(x - eyeRx, 2) + Math.pow(y - eyeCatchY, 2)) / 0.00018);
  const catchSub = 0.55 * (
    Math.exp(-(Math.pow(x + 0.140, 2) + Math.pow(y - 0.098, 2)) / 0.00011) +
    Math.exp(-(Math.pow(x - 0.116, 2) + Math.pow(y - 0.098, 2)) / 0.00011)
  );
  const catchlight = clamp(catchMain + catchSub, 0, 1);

  // Selective jewel-line lumeMask: pinpoint catchlights, hairpin, collar star/ribbon & outer hair silhouette rim ONLY
  const outerSilhouetteRim = (region === 2 && hairHalfW > 0.05)
    ? strandMicro * 0.28 * smoothstep(hairHalfW * 0.72, hairHalfW * 0.96, ax)
    : 0;
  const lume = clamp(
    catchlight * 1.0 +
    (hOrnament > 0.005 ? 0.90 : 0) +
    (starPendant > 0.005 ? 0.88 : 0) +
    (collarRibbon > 0.0045 ? 0.42 : 0) +
    (rimBead > 0.005 ? 0.62 : 0) +
    outerSilhouetteRim,
    0,
    1
  );

  return [totalH, region, strandMicro, lume, catchlight, ao];
}

function fillCameoGridFromHeightAndColors(cols, rows, heights, colors, uvsOut) {
  const vertexCount = cols * rows;
  const triangleCount = (cols - 1) * (rows - 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(triangleCount * 3);

  for (let j = 0; j < rows; j++) {
    const sy = -1 + (2 * j) / (rows - 1);
    for (let i = 0; i < cols; i++) {
      const sx = -1 + (2 * i) / (cols - 1);
      const [dx, dy] = squareToDisk(sx, sy);
      const k = j * cols + i;
      const k3 = k * 3;
      positions[k3] = dx * CAMEO_RADIUS;
      positions[k3 + 1] = dy * CAMEO_RADIUS;
      positions[k3 + 2] = CAMEO_Z_BASE + heights[k];
      if (uvsOut) {
        const k2 = k * 2;
        uvsOut[k2] = 0.5 + 0.5 * dx;
        uvsOut[k2 + 1] = 0.5 - 0.5 * dy;
      }
    }
  }

  // Compute smooth 3D surface normals via central differences on actual 3D neighbor vectors
  for (let j = 0; j < rows; j++) {
    const jm = Math.max(0, j - 1);
    const jp = Math.min(rows - 1, j + 1);
    for (let i = 0; i < cols; i++) {
      const im = Math.max(0, i - 1);
      const ip = Math.min(cols - 1, i + 1);
      const k = j * cols + i;
      const l3 = (j * cols + im) * 3;
      const r3 = (j * cols + ip) * 3;
      const d3 = (jm * cols + i) * 3;
      const u3 = (jp * cols + i) * 3;

      const tx = positions[r3] - positions[l3];
      const ty = positions[r3 + 1] - positions[l3 + 1];
      const tz = positions[r3 + 2] - positions[l3 + 2];
      const bx = positions[u3] - positions[d3];
      const by = positions[u3 + 1] - positions[d3 + 1];
      const bz = positions[u3 + 2] - positions[d3 + 2];

      let nx = ty * bz - tz * by;
      let ny = tz * bx - tx * bz;
      let nz = tx * by - ty * bx;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const inv = 1 / (Math.hypot(nx, ny, nz) || 1);
      const k3 = k * 3;
      normals[k3] = nx * inv;
      normals[k3 + 1] = ny * inv;
      normals[k3 + 2] = inv ? nz * inv : 1;
    }
  }

  let ic = 0;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols + 1;
      const d = a + cols;
      indices[ic++] = a; indices[ic++] = b; indices[ic++] = c;
      indices[ic++] = a; indices[ic++] = c; indices[ic++] = d;
    }
  }

  return { positions, normals, colors, uvs: uvsOut, indices, vertexCount, triangleCount };
}

function buildProceduralMuseCore(presetId = 'starlight', options = {}) {
  const isCard = options.detail === 'card';
  const cols = isCard ? 128 : 240;
  const rows = isCard ? 120 : 220;
  const count = cols * rows;
  const heights = new Float32Array(count);
  const regions = new Uint8Array(count);
  const strands = new Float32Array(count);
  const lumes = new Float32Array(count);
  const catchlights = new Float32Array(count);
  const aos = new Float32Array(count);
  const colors = new Float32Array(count * 4);
  const uvs = new Float32Array(count * 2);

  for (let j = 0; j < rows; j++) {
    const sy = -1 + (2 * j) / (rows - 1);
    for (let i = 0; i < cols; i++) {
      const sx = -1 + (2 * i) / (cols - 1);
      const [u, v, r] = squareToDisk(sx, sy);
      const [h, region, strand, lume, catchlight, ao] = evaluateAnalyticalMaiden(u, v, r);
      const k = j * cols + i;
      heights[k] = h;
      regions[k] = region;
      strands[k] = strand;
      lumes[k] = lume;
      catchlights[k] = catchlight;
      aos[k] = ao;
    }
  }

  // Multi-scale sculptural cavity map from heightfield (convex ridges warm/luminous, concave crevices deep cool AO!)
  const hBlur = boxBlur2D(heights, cols, rows, isCard ? 2 : 4);

  for (let k = 0; k < count; k++) {
    const region = regions[k];
    const strand = strands[k];
    const catchlight = catchlights[k];
    const cavity = clamp((heights[k] - hBlur[k]) * 38, -1, 1);
    const cavityAO = clamp(1.0 + Math.min(0, cavity) * 0.42, 0.58, 1.0);
    const ridgeLift = Math.max(0, cavity) * 0.08;
    const ao = clamp(aos[k] * cavityAO, 0.30, 1.0);

    let cr = 0.06;
    let cg = 0.07;
    let cb = 0.10;

    if (presetId === 'ccd') {
      if (region === 1) { cr = 0.94; cg = 0.85; cb = 0.84; }
      else if (region === 2) { const s = 0.08 + 0.16 * strand; cr = s * 0.90; cg = s; cb = s * 1.18; }
      else if (region === 3) { cr = 0.89; cg = 0.58; cb = 0.60; }
      else if (region === 4) { cr = 0.18 + 0.80 * catchlight; cg = 0.21 + 0.77 * catchlight; cb = 0.28 + 0.72 * catchlight; }
      else if (region === 5) { cr = 0.86; cg = 0.90; cb = 0.97; }
      if (region > 0) {
        const shade = 0.26 + 0.74 * ao;
        cr = clamp(cr * shade + ridgeLift * 0.7, 0, 1);
        cg = clamp(cg * (0.24 + 0.76 * ao) + ridgeLift * 0.7, 0, 1);
        cb = clamp(cb * (0.30 + 0.70 * ao) + ridgeLift * 0.8, 0, 1);
      }
    } else if (presetId === 'anime') {
      if (region === 1) { cr = 0.97; cg = 0.90; cb = 0.88; }
      else if (region === 2) { cr = 0.76 + 0.16 * strand; cg = 0.81 + 0.13 * strand; cb = 0.93 + 0.06 * strand; }
      else if (region === 3) { cr = 0.95; cg = 0.58; cb = 0.62; }
      else if (region === 4) { cr = 0.30 + 0.68 * catchlight; cg = 0.72 + 0.26 * catchlight; cb = 0.74 + 0.24 * catchlight; }
      else if (region === 5) { cr = 0.95; cg = 0.81; cb = 0.46; }
      if (region > 0) {
        const shade = 0.30 + 0.70 * ao;
        cr = clamp(cr * shade + ridgeLift * 0.6, 0, 1);
        cg = clamp(cg * (0.28 + 0.72 * ao) + ridgeLift * 0.6, 0, 1);
        cb = clamp(cb * (0.36 + 0.64 * ao) + ridgeLift * 0.7, 0, 1);
      }
    } else {
      // 'starlight' Gallery-Grade Translucent Alabaster & Moonstone Jade Chiaroscuro Sculpture
      if (region === 1) {
        cr = 0.95; cg = 0.94; cb = 0.97;
      } else if (region === 2) {
        cr = 0.79 + 0.15 * strand;
        cg = 0.83 + 0.13 * strand;
        cb = 0.92 + 0.07 * strand;
      } else if (region === 3) {
        cr = 0.91; cg = 0.83; cb = 0.88;
      } else if (region === 4) {
        // Deep sculpted moonstone iris + brilliant starlight catchlights
        cr = 0.46 + 0.54 * catchlight;
        cg = 0.56 + 0.44 * catchlight;
        cb = 0.72 + 0.28 * catchlight;
      } else if (region === 5) {
        cr = 0.96; cg = 0.89; cb = 0.72;
      }
      if (region > 0) {
        // Blend between cool celadon-slate shadow in crevices (ao -> 0.30) and warm pearlescent ivory on convex ridges!
        const shT = clamp((ao - 0.30) / 0.70, 0, 1);
        const shadowR = 0.26;
        const shadowG = 0.31;
        const shadowB = 0.42;
        cr = clamp(shadowR * (1 - shT) + cr * shT + ridgeLift, 0, 1);
        cg = clamp(shadowG * (1 - shT) + cg * shT + ridgeLift, 0, 1);
        cb = clamp(shadowB * (1 - shT) + cb * shT + ridgeLift * 1.1, 0, 1);
      }
    }

    const k4 = k * 4;
    colors[k4] = cr;
    colors[k4 + 1] = cg;
    colors[k4 + 2] = cb;
    colors[k4 + 3] = lumes[k];
  }

  return fillCameoGridFromHeightAndColors(cols, rows, heights, colors, uvs);
}

/* ============================================================================
   5. IMAGE-DRIVEN 3D MAIDEN RELIEF UPGRADE (buildImageMuseCore)
   ============================================================================ */

function boxBlur2D(src, w, h, radius) {
  const tmp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);
  const inv = 1 / (2 * radius + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = src[row] * (radius + 1);
    for (let x = 1; x <= radius; x++) sum += src[row + Math.min(w - 1, x)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum * inv;
      sum += src[row + Math.min(w - 1, x + radius + 1)] - src[row + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = tmp[x] * (radius + 1);
    for (let y = 1; y <= radius; y++) sum += tmp[Math.min(h - 1, y) * w + x];
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = sum * inv;
      sum += tmp[Math.min(h - 1, y + radius + 1) * w + x] - tmp[Math.max(0, y - radius) * w + x];
    }
  }
  return dst;
}

function rasterizeImageCrop(imageSource, crop, w, h) {
  if (!imageSource) return null;
  if (imageSource.data && imageSource.width && imageSource.height) {
    return imageSource;
  }
  const srcW = Number(imageSource.naturalWidth || imageSource.videoWidth || imageSource.width) || 0;
  const srcH = Number(imageSource.naturalHeight || imageSource.videoHeight || imageSource.height) || 0;
  if (!srcW || !srcH) return null;

  let ctx = null;
  if (typeof OffscreenCanvas !== 'undefined') {
    ctx = new OffscreenCanvas(w, h).getContext('2d');
  } else if (typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    ctx = cv.getContext('2d');
  }
  if (!ctx) return null;

  const sx = Math.round((crop.x || 0) * srcW);
  const sy = Math.round((crop.y || 0) * srcH);
  const sw = Math.max(1, Math.round((crop.w || 1) * srcW));
  const sh = Math.max(1, Math.round((crop.h || 1) * srcH));
  ctx.drawImage(imageSource, sx, sy, sw, sh, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function buildImageMuseCore(imageSource, presetId = 'ccd', options = {}) {
  const isCard = options.detail === 'card';
  const cols = isCard ? 128 : 240;
  const rows = isCard ? 120 : 220;
  const preset = MUSE_PRESETS.get(presetId);
  const imgData = rasterizeImageCrop(imageSource, preset.crop || { x: 0.14, y: 0.03, w: 0.72, h: 0.56 }, cols, rows);
  if (!imgData || !imgData.data) {
    return buildProceduralMuseCore(presetId, options);
  }

  const px = imgData.data;
  const iw = imgData.width || cols;
  const ih = imgData.height || rows;
  const lum = new Float32Array(iw * ih);
  for (let p = 0; p < iw * ih; p++) {
    const p4 = p * 4;
    lum[p] = (0.299 * px[p4] + 0.587 * px[p4 + 1] + 0.114 * px[p4 + 2]) / 255;
  }

  // 3-scale optical pyramid: fine (de-noised porcelain normals), mid (facial volume), broad (bust silhouette)
  const lumFine = boxBlur2D(lum, iw, ih, 1);
  const lumSmooth = boxBlur2D(lumFine, iw, ih, 4);
  const lumBroad = boxBlur2D(lumSmooth, iw, ih, 10);

  const count = cols * rows;
  const heights = new Float32Array(count);
  const colors = new Float32Array(count * 4);
  const uvs = new Float32Array(count * 2);

  // Filmic midtone/shadow S-curve + ~1.13 gamma so obsidian hair & eyelashes keep rich contrast instead of milky grey
  const toneChannel = (c, cavBoost) => {
    const g = Math.pow(clamp(c, 0, 1), 1.13);
    const s = 0.78 * g + 0.22 * smoothstep(0.035, 0.965, g);
    return clamp(s * cavBoost, 0, 1);
  };

  for (let j = 0; j < rows; j++) {
    const sy = -1 + (2 * j) / (rows - 1);
    for (let i = 0; i < cols; i++) {
      const sx = -1 + (2 * i) / (cols - 1);
      const [dx, dy, r] = squareToDisk(sx, sy);
      const uImg = clamp(0.5 + 0.5 * dx, 0, 0.9999);
      const vImg = clamp(0.5 - 0.5 * dy, 0, 0.9999);
      const ix = Math.min(iw - 1, Math.floor(uImg * iw));
      const iy = Math.min(ih - 1, Math.floor(vImg * ih));
      const idxP = iy * iw + ix;
      const p4 = idxP * 4;

      const crRaw = px[p4] / 255;
      const cgRaw = px[p4 + 1] / 255;
      const cbRaw = px[p4 + 2] / 255;
      const lRaw = lum[idxP];
      const lFine = lumFine[idxP];
      const lMid = lumSmooth[idxP];
      const lLow = lumBroad[idxP];
      const micro = lFine - lMid;

      // Local Sobel/central luminance gradient for crisp jewel-line contour & hair-rim detection
      const ixL = Math.max(0, ix - 1);
      const ixR = Math.min(iw - 1, ix + 1);
      const iyD = Math.max(0, iy - 1);
      const iyU = Math.min(ih - 1, iy + 1);
      const gx = lumFine[iy * iw + ixR] - lumFine[iy * iw + ixL];
      const gy = lumFine[iyU * iw + ix] - lumFine[iyD * iw + ix];
      const gradMag = Math.hypot(gx, gy);

      // Foreground subject cushion so dark hair inside the bust silhouette retains lush 3D volume,
      // while outer dark background fades cleanly to zero depth into the circular cameo chamber!
      const bustDome = Math.max(0, 1 - Math.pow(dx / 0.68, 2) - Math.pow((dy - 0.02) / 0.82, 2));
      const fgMask = clamp(smoothstep(0.055, 0.24, Math.max(lLow, bustDome * 0.34)), 0, 1);
      const cameoFade = smoothstep(0.99, 0.76, r);
      const rimBead = 0.013 * Math.exp(-Math.pow((r - 0.955) / 0.022, 2));

      // Smooth porcelain 3D relief without high-frequency pixel spikes
      const relief = (0.044 * bustDome + 0.050 * Math.pow(lMid, 0.88) + 0.022 * lLow + 0.0055 * micro) * fgMask * cameoFade + rimBead;
      const k = j * cols + i;
      heights[k] = relief;

      // Selective jewel-line lumeMask: pinpoint catchlights, hair rim highlights & silver collar filigree ONLY!
      // Broad smooth skin has micro ≈ 0 and low gradMag, so her face stays nuanced & never blows out white in SHOT 04!
      const localPeak = Math.max(0, lRaw - lMid);
      const pinpointCatchlight = smoothstep(0.048, 0.165, localPeak) * smoothstep(0.56, 0.90, lRaw);
      const filigreeAndRim = smoothstep(0.058, 0.21, gradMag) * (0.28 + 0.72 * smoothstep(0.28, 0.82, lFine)) * 0.50;
      const lume = clamp(
        Math.max(pinpointCatchlight, filigreeAndRim) * fgMask * cameoFade + (rimBead > 0.005 ? 0.62 : 0),
        0,
        1
      );

      const cavBoost = clamp(1.0 + micro * 0.42, 0.74, 1.06);
      const cr = toneChannel(crRaw, cavBoost);
      const cg = toneChannel(cgRaw, cavBoost);
      const cb = toneChannel(cbRaw, cavBoost);

      const bgMix = fgMask * cameoFade;
      const k4 = k * 4;
      colors[k4] = 0.045 * (1 - bgMix) + cr * bgMix;
      colors[k4 + 1] = 0.050 * (1 - bgMix) + cg * bgMix;
      colors[k4 + 2] = 0.070 * (1 - bgMix) + cb * bgMix;
      colors[k4 + 3] = lume;
    }
  }

  return fillCameoGridFromHeightAndColors(cols, rows, heights, colors, uvs);
}

/* ============================================================================
   6. LATENT DIFFUSION PARTICLE CLOUD BUFFERS (buildLatentParticleBuffers)
   ============================================================================ */

function buildLatentParticleBuffers(count = 16384, museData = null) {
  const n = Math.max(64, count | 0);
  const seeds = new Float32Array(n * 4);
  const targetPos = new Float32Array(n * 3);
  const colors = new Float32Array(n * 4);

  const srcPos = museData && museData.positions ? museData.positions : null;
  const srcCol = museData && museData.colors ? museData.colors : null;
  const srcVCount = srcPos ? (srcPos.length / 3) | 0 : 0;

  // Deterministic Mulberry32 PRNG for reproducible, zero-flicker particle cloud
  let rng = 0x51f15e05;
  const rand = () => {
    rng |= 0; rng = (rng + 0x6d2b79f5) | 0;
    let t = Math.imul(rng ^ (rng >>> 15), 1 | rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 0; i < n; i++) {
    const i4 = i * 4;
    const i3 = i * 3;
    seeds[i4] = rand();
    seeds[i4 + 1] = rand();
    seeds[i4 + 2] = rand();
    seeds[i4 + 3] = rand();

    if (srcVCount > 0) {
      // Rejection-prefer salient elevated relief vertices on the Maiden Muse portrait!
      let pick = (rand() * srcVCount) | 0;
      for (let attempt = 0; attempt < 4; attempt++) {
        const cand = (rand() * srcVCount) | 0;
        if (srcPos[cand * 3 + 2] > CAMEO_Z_BASE + 0.022) {
          pick = cand;
          break;
        }
      }
      targetPos[i3] = srcPos[pick * 3];
      targetPos[i3 + 1] = srcPos[pick * 3 + 1];
      targetPos[i3 + 2] = srcPos[pick * 3 + 2] + 0.004;

      if (srcCol) {
        colors[i4] = srcCol[pick * 4];
        colors[i4 + 1] = srcCol[pick * 4 + 1];
        colors[i4 + 2] = srcCol[pick * 4 + 2];
        colors[i4 + 3] = Math.max(0.28, srcCol[pick * 4 + 3]);
      } else {
        colors[i4] = 0.55; colors[i4 + 1] = 0.82; colors[i4 + 2] = 1.0; colors[i4 + 3] = 0.75;
      }
    } else {
      const a = rand() * TAU;
      const rad = Math.sqrt(rand()) * 0.36;
      const u = (rad * Math.cos(a)) / CAMEO_RADIUS;
      const v = (rad * Math.sin(a)) / CAMEO_RADIUS;
      const [h, , , lume] = evaluateAnalyticalMaiden(u, v, rad / CAMEO_RADIUS);
      targetPos[i3] = rad * Math.cos(a);
      targetPos[i3 + 1] = rad * Math.sin(a);
      targetPos[i3 + 2] = CAMEO_Z_BASE + h + 0.004;
      // Blend polar ice (#8CD2FF), emerald bokeh (#1BEB9E) & amber (#F59E0B)
      const band = i % 10;
      if (band === 0) { colors[i4] = 0.11; colors[i4 + 1] = 0.92; colors[i4 + 2] = 0.62; }
      else if (band === 1) { colors[i4] = 0.96; colors[i4 + 1] = 0.62; colors[i4 + 2] = 0.04; }
      else { colors[i4] = 0.55; colors[i4 + 1] = 0.82; colors[i4 + 2] = 1.0; }
      colors[i4 + 3] = Math.max(0.35, lume);
    }
  }

  return { seeds, targetPos, colors, count: n };
}

return Object.freeze({
  LUMEN_MAT,
  LUMEN_LAYER_META,
  IRIS_PIVOT_RADIUS,
  HAMMER_PIVOTS,
  MUSE_PRESETS,
  buildMechanicalGeometry,
  buildProceduralMuseCore,
  buildImageMuseCore,
  buildLatentParticleBuffers,
});
})();

export const LUMEN_MAT = _lmg.LUMEN_MAT;
export const LUMEN_LAYER_META = _lmg.LUMEN_LAYER_META;
export const IRIS_PIVOT_RADIUS = _lmg.IRIS_PIVOT_RADIUS;
export const HAMMER_PIVOTS = _lmg.HAMMER_PIVOTS;
export const MUSE_PRESETS = _lmg.MUSE_PRESETS;
export const buildMechanicalGeometry = _lmg.buildMechanicalGeometry;
export const buildProceduralMuseCore = _lmg.buildProceduralMuseCore;
export const buildImageMuseCore = _lmg.buildImageMuseCore;
export const buildLatentParticleBuffers = _lmg.buildLatentParticleBuffers;

export default _lmg;
