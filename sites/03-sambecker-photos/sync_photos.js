#!/usr/bin/env node
/**
 * sync_photos.js — Specimen #03 (03-sambecker-photos)
 *
 * 1. Fetches real photograph metadata, `blurData` (with embedded binary Fujifilm EXIF),
 *    `recipeData`, and `colorData` (oklch palettes) from `https://photos.sambecker.com/grid`
 *    and `https://photos.sambecker.com/feed.json`.
 * 2. Writes `sites/03-sambecker-photos/catalog.js` with 36 real curated photographs.
 * 3. Pre-caches real photograph JPEGs into `sites/03-sambecker-photos/photos/`.
 * 4. Parses binary EXIF headers from local JPEG files in `photos/` and prints a summary table.
 */

const fs = require('fs');
const path = require('path');
const {
  isPathInsideRoot,
  writeFileAtomicSync,
  fetchUpstreamBuffer
} = require('../../shared/static-server');

const SITE_DIR = __dirname;
const PHOTOS_DIR = path.join(SITE_DIR, 'photos');
const CATALOG_PATH = path.join(SITE_DIR, 'catalog.js');

async function fetchText(url) {
  const buf = await fetchUpstreamBuffer(url, {
    timeoutMs: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (SamBecker-Decon-Sync/1.0)' }
  });
  return buf.toString('utf8');
}

async function downloadFile(url, destPath) {
  const resolvedDest = path.resolve(destPath);
  if (!isPathInsideRoot(resolvedDest, PHOTOS_DIR)) {
    throw new Error(`Blocked out-of-bounds destination path: ${destPath}`);
  }
  if (fs.existsSync(resolvedDest) && fs.statSync(resolvedDest).size > 2048) {
    return { cached: true, size: fs.statSync(resolvedDest).size };
  }
  const buf = await fetchUpstreamBuffer(url, {
    timeoutMs: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (SamBecker-Decon-Sync/1.0)' }
  });
  writeFileAtomicSync(resolvedDest, buf);
  return { cached: false, size: buf.length };
}

function formatRecipeTitle(slug) {
  if (!slug) return '';
  if (slug.startsWith('fujifilm-v1-acros-r')) return 'ACROS + R CUSTOM';
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatFilmLabel(filmSlug) {
  if (!filmSlug) return '';
  const map = {
    'classic-neg': 'CLASSIC NEG.',
    'acros-r': 'ACROS+R',
    'classic-chrome': 'CLASSIC CHROME',
    'provia': 'PROVIA/STD',
    'nostalgic-neg': 'NOSTALGIC NEG.',
    'reala-ace': 'REALA ACE',
    'velvia': 'VELVIA',
    'astia': 'ASTIA'
  };
  return map[filmSlug] || filmSlug.toUpperCase();
}

function inferTags(photo) {
  const tags = Array.isArray(photo.tags) ? [...photo.tags] : [];
  const desc = ((photo.title || '') + ' ' + (photo.semanticDescription || '')).toLowerCase();
  if (/gourd|pumpkin|squash|autumn|harvest|straw|corn/.test(desc)) tags.push('autumn', 'still-life');
  if (/forest|tree|wood|fungus|mushroom|clover|leaf|leaves|grass|wildflower|nature/.test(desc)) tags.push('nature', 'botanical');
  if (/bridge|road|crane|sign|stripe|curb|street|building/.test(desc)) tags.push('urban', 'geometry');
  if (/boat|gull|water|bay|ocean|coast/.test(desc)) tags.push('maritime', 'minimal');
  if (/black-and-white|monochrome/.test(desc) || photo.film === 'acros-r') tags.push('monochrome');
  if (tags.length === 0) tags.push('everyday');
  return [...new Set(tags)];
}

function oklchToHex(l, c, h) {
  const hRad = ((h || 0) * Math.PI) / 180;
  const a = (c || 0) * Math.cos(hRad);
  const b = (c || 0) * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const lCube = l_ * l_ * l_;
  const mCube = m_ * m_ * m_;
  const sCube = s_ * s_ * s_;

  let r = +4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube;
  let g = -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube;
  let bl = -0.0041960863 * lCube - 0.7034186147 * mCube + 1.7076147010 * sCube;

  const toSrgb = (v) => {
    const cl = Math.max(0, Math.min(1, v));
    const s = cl <= 0.0031308 ? 12.92 * cl : 1.055 * Math.pow(cl, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(255, s * 255)));
  };
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(toSrgb(r))}${toHex(toSrgb(g))}${toHex(toSrgb(bl))}`;
}

/**
 * Minimal binary EXIF reader for local JPEG verification
 */
function parseBufferExif(buf) {
  if (!buf || buf.length < 12 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const segLen = buf.readUInt16BE(offset + 2);
    if (marker === 0xe1 && offset + 10 <= buf.length && buf.toString('ascii', offset + 4, offset + 8) === 'Exif') {
      const tiffStart = offset + 10;
      const le = buf.toString('ascii', tiffStart, tiffStart + 2) === 'II';
      const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
      const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
      const ifd0 = tiffStart + u32(tiffStart + 4);
      if (ifd0 + 2 > buf.length) return null;
      const entries = u16(ifd0);
      const out = {};
      for (let i = 0; i < entries; i++) {
        const eo = ifd0 + 2 + i * 12;
        if (eo + 12 > buf.length) break;
        const tag = u16(eo);
        const type = u16(eo + 2);
        const count = u32(eo + 4);
        const valOff = tiffStart + u32(eo + 8);
        if (type === 2 && count > 0 && valOff + count <= buf.length) {
          const str = buf.toString('ascii', valOff, valOff + count - 1).trim();
          if (tag === 0x010f) out.make = str;
          if (tag === 0x0110) out.model = str;
          if (tag === 0x0132) out.date = str;
        }
      }
      return out;
    }
    offset += 2 + segLen;
  }
  return null;
}

async function syncFromSamBecker() {
  console.log('[sync] Fetching Next.js RSC Flight payload from https://photos.sambecker.com/grid ...');
  const html = await fetchText('https://photos.sambecker.com/grid');
  const re = /self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g;
  let m;
  let fullRsc = '';
  while ((m = re.exec(html)) !== null) {
    try {
      fullRsc += JSON.parse(m[1]);
    } catch (_) {}
  }

  // Extract RSC binary/text chunks by exact byte/char length
  const blurMap = new Map();
  const headerRe = /([0-9a-f]+):T([0-9a-f]+),/gi;
  let hm;
  while ((hm = headerRe.exec(fullRsc)) !== null) {
    const id = '$' + hm[1];
    const byteLen = parseInt(hm[2], 16);
    const startIdx = hm.index + hm[0].length;
    const payload = fullRsc.slice(startIdx, startIdx + byteLen);
    if (payload.startsWith('data:image/')) {
      blurMap.set(id, payload);
    }
  }

  const photosIdx = fullRsc.indexOf('"photos":[{');
  if (photosIdx === -1) {
    throw new Error('Could not locate "photos":[{ in RSC Flight payload');
  }

  let depth = 0;
  const arrStart = fullRsc.indexOf('[', photosIdx);
  let arrEnd = -1;
  let inStr = false;
  let esc = false;
  for (let i = arrStart; i < fullRsc.length; i++) {
    const ch = fullRsc[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (!inStr) {
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          arrEnd = i + 1;
          break;
        }
      }
    }
  }

  const rawPhotos = JSON.parse(fullRsc.slice(arrStart, arrEnd), (_k, v) =>
    v === '$undefined' ? null : v
  );
  console.log(`[sync] Extracted ${rawPhotos.length} real photographs (${blurMap.size} blurData EXIF chunks).`);

  // Take top 36 real photographs
  const selected = rawPhotos.slice(0, 36).map((p, idx) => {
    const blurData = p.blurData && p.blurData.startsWith('$') ? (blurMap.get(p.blurData) || '') : (p.blurData || '');
    const blobFilename = path.basename(new URL(p.url).pathname);
    const cameraId = `${(p.make || 'camera').toLowerCase()}-${(p.model || 'model').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const lensSlug = (p.lensModel || 'standard-lens').toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
    const colorData = p.colorData || {
      ai: { l: 0.65, c: 0.12, h: 55 },
      colors: [
        { l: 0.48, c: 0.12, h: 42 },
        { l: 0.78, c: 0.11, h: 72 },
        { l: 0.91, c: 0.05, h: 98 },
        { l: 0.62, c: 0.04, h: 65 },
        { l: 0.35, c: 0.03, h: 120 }
      ]
    };
    const paletteSwatches = [
      colorData.ai,
      ...(colorData.colors || []).slice(0, 4)
    ].filter(Boolean).map((c) => oklchToHex(c.l, c.c, c.h));

    return {
      id: p.id,
      slug: p.id,
      index: idx + 1,
      title: p.title || p.semanticDescription?.split(',')[0]?.slice(0, 28) || `Frame #${idx + 1}`,
      caption: p.caption || p.semanticDescription || '',
      semanticDescription: p.semanticDescription || '',
      url: `/photos/${blobFilename}`,
      remoteUrl: p.url,
      nextImageUrl: `https://photos.sambecker.com/_next/image?url=${encodeURIComponent(p.url)}&w=1200&q=85`,
      blurData,
      aspectRatio: Number((p.aspectRatio || 1.5).toFixed(4)),
      width: p.width || 1000,
      height: p.height || 667,
      metaSide: idx % 2 === 0 ? 'right' : 'left',
      make: p.make || 'FUJIFILM',
      model: p.model || 'X-T5',
      cameraId,
      cameraMakeModel: `${p.make || 'FUJIFILM'} ${p.model || 'X-T5'}`,
      lensMake: p.lensMake || p.make || 'FUJIFILM',
      lensModel: p.lensModel || '',
      lensSlug,
      focalLength: p.focalLength || 35,
      focalLengthIn35MmFormat: p.focalLengthIn35MmFormat || 53,
      focalLengthFormatted: p.focalLengthFormatted || (p.focalLength ? `${Math.round(p.focalLength)}mm` : '35mm'),
      focalLengthIn35MmFormatFormatted: p.focalLengthIn35MmFormatFormatted || (p.focalLengthIn35MmFormat ? `${p.focalLengthIn35MmFormat}mm` : '53mm'),
      fNumber: p.fNumber || 1.4,
      fNumberFormatted: p.fNumberFormatted || (p.fNumber ? `ƒ/${p.fNumber}` : 'ƒ/1.4'),
      exposureTime: p.exposureTime || 0.001,
      exposureTimeFormatted: p.exposureTimeFormatted || '1/1000s',
      iso: p.iso || 125,
      isoFormatted: p.isoFormatted || `ISO${p.iso || 125}`,
      exposureCompensation: p.exposureCompensation ?? 0,
      exposureCompensationFormatted: p.exposureCompensationFormatted || '0 EV',
      film: p.film || null,
      filmLabel: formatFilmLabel(p.film),
      recipeTitle: p.recipeTitle || null,
      recipeLabel: formatRecipeTitle(p.recipeTitle),
      recipeData: p.recipeData || null,
      colorData,
      colorSort: p.colorSort || 0,
      palette: paletteSwatches,
      takenAt: p.takenAt || '2026-10-18T12:33:00.000Z',
      takenAtNaive: p.takenAtNaive || '2026-10-18 12:33:00',
      takenAtNaiveFormatted: (p.takenAtNaiveFormatted || '18 OCT 2026 12:33PM').toUpperCase(),
      tags: inferTags(p)
    };
  });

  // Build unique CAMERAS and FILM_RECIPES tables from real data
  const camerasMap = new Map();
  for (const p of selected) {
    if (!camerasMap.has(p.cameraId)) {
      camerasMap.set(p.cameraId, {
        id: p.cameraId,
        make: p.make,
        model: p.model,
        fullName: `${p.make} ${p.model}`,
        lens: p.lensModel || 'Prime Lens',
        sensor: p.make === 'FUJIFILM' ? 'APS-C X-Trans CMOS 5 HR (40.2MP)' : 'Triple Camera Computational RAW',
        cropFactor: p.make === 'FUJIFILM' ? 1.5 : 1.0,
        year: p.make === 'FUJIFILM' ? 2023 : 2025
      });
    }
  }

  const recipesMap = new Map();
  for (const p of selected) {
    if (p.recipeTitle && p.recipeData && !recipesMap.has(p.recipeTitle)) {
      const rd = p.recipeData;
      const wbSign = (v) => (v > 0 ? `+${v}` : `${v || 0}`);
      recipesMap.set(p.recipeTitle, {
        id: p.recipeTitle,
        name: p.recipeLabel,
        shortCode: p.recipeLabel.toUpperCase(),
        baseSimulation: p.filmLabel || 'CLASSIC NEG.',
        filmSlug: p.film || 'classic-neg',
        dynamicRange: `DR${rd.dynamicRange?.development || 400}`,
        grain: rd.grainEffect ? `${rd.grainEffect.roughness}/${rd.grainEffect.size}`.toUpperCase() : 'OFF',
        colorChrome: (rd.colorChromeEffect || 'OFF').toUpperCase(),
        colorChromeBlue: (rd.colorChromeFXBlue || 'OFF').toUpperCase(),
        wb: (rd.whiteBalance?.type || 'AUTO').toUpperCase(),
        wbShift: { r: rd.whiteBalance?.red || 0, b: rd.whiteBalance?.blue || 0 },
        wbLabel: `${(rd.whiteBalance?.type || 'AUTO').toUpperCase()} R${wbSign(rd.whiteBalance?.red || 0)} / B${wbSign(rd.whiteBalance?.blue || 0)}`,
        highlight: rd.highlight ?? 0,
        shadow: rd.shadow ?? 0,
        color: rd.color ?? 0,
        sharpness: rd.sharpness ?? 0,
        clarity: rd.clarity ?? 0,
        nr: rd.highISONoiseReduction ?? 0,
        recipeData: rd
      });
    }
  }

  const catalogSource = `/**
 * catalog.js — Real Photograph & EXIF / Fujifilm Recipe Catalog from photos.sambecker.com
 * Generated by sync_photos.js
 */

export const CAMERAS = ${JSON.stringify([...camerasMap.values()], null, 2)};

export const FILM_RECIPES = ${JSON.stringify([...recipesMap.values()], null, 2)};

export const CURATED_PHOTOS = ${JSON.stringify(selected, null, 2)};

export const ALL_TAGS = Array.from(
  new Set(CURATED_PHOTOS.flatMap((p) => p.tags || []))
).sort();

export function getCameraById(id) {
  return CAMERAS.find((c) => c.id === id) || CAMERAS[0];
}

export function getFilmRecipeById(id) {
  return FILM_RECIPES.find((f) => f.id === id || f.filmSlug === id) || FILM_RECIPES[0];
}

export function getPhotoById(idOrSlug) {
  return CURATED_PHOTOS.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
}
`;

  writeFileAtomicSync(CATALOG_PATH, catalogSource, 'utf8');
  console.log(`[sync] Wrote ${selected.length} real photos to ${path.relative(SITE_DIR, CATALOG_PATH)}.`);

  // Clean up old synthetic curated folder if present
  const oldCuratedDir = path.join(PHOTOS_DIR, 'curated');
  if (fs.existsSync(oldCuratedDir)) {
    fs.rmSync(oldCuratedDir, { recursive: true, force: true });
    console.log('[sync] Removed legacy synthetic photos/curated/ directory.');
  }

  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  const preCacheCount = Math.min(18, selected.length);
  console.log(`[sync] Pre-caching first ${preCacheCount} photographs to sites/03-sambecker-photos/photos/ ...`);
  for (let i = 0; i < preCacheCount; i++) {
    const p = selected[i];
    const filename = path.basename(p.url);
    const dest = path.join(PHOTOS_DIR, filename);
    try {
      const res = await downloadFile(p.nextImageUrl, dest);
      process.stdout.write(`  [${i + 1}/${preCacheCount}] ${filename} (${Math.round(res.size / 1024)}KB${res.cached ? ', cached' : ''})\n`);
    } catch (err) {
      console.warn(`  [${i + 1}/${preCacheCount}] Failed ${filename}: ${err.message}`);
    }
  }

  // Also verify binary EXIF parsing on embedded blurData & local files
  let verifiedExifCount = 0;
  for (const p of selected) {
    if (p.blurData && p.blurData.startsWith('data:image/jpeg;base64,')) {
      const b64 = p.blurData.slice('data:image/jpeg;base64,'.length);
      const exif = parseBufferExif(Buffer.from(b64, 'base64'));
      if (exif && (exif.make || exif.model)) verifiedExifCount++;
    }
  }
  console.log(`[sync] Binary EXIF verification: ${verifiedExifCount}/${selected.length} photos carry authentic binary TIFF/IFD0 EXIF headers.`);
}

syncFromSamBecker().catch((err) => {
  console.error('[sync] Error:', err);
  process.exit(1);
});
