/**
 * Specimen #04: Igloo Inc (igloo.inc) — Upstream 3D WebGL Asset Pre-Sync Script
 * Usage: node sites/04-igloo-inc/sync_assets.js
 *
 * Pre-fetches and caches the complete Lusion WebGL 3D asset suite locally into
 * sites/04-igloo-inc/assets/ and patches index-2e130bc1.js ("https://www.igloo.inc/" -> "/")
 * so http://127.0.0.1:6063/ boots instantaneously offline/local.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const UPSTREAM_ORIGIN = 'https://www.igloo.inc';
const ASSETS_ROOT = path.join(__dirname, 'assets');

const ASSET_MANIFEST = [
  // Core Bundles & 4 Web Workers
  'assets/index-2e130bc1.js',
  'assets/App3D-d68cb154.js',
  'assets/audioworker-036a09db.js',
  'assets/msdfworker-ac346fa7.js',
  'assets/bitmapworker-046527f8.js',
  'assets/exrworker-41cbee65.js',

  // Favicons & Meta
  'assets/favicon32-af94112f.png',
  'assets/favicon16-9e4401be.png',
  'assets/images/social.jpg',

  // Web Fonts & MSDF 3D Font Atlas
  'assets/IBMPlexMono-Medium-897c8c30.woff2',
  'assets/IBMPlexMono-Medium-1e253194.woff',
  'assets/IBMPlexMono-Regular-d3034935.woff2',
  'assets/IBMPlexMono-Regular-419d45f6.woff',
  'assets/fonts/IBMPlexMono-Medium.json',
  'assets/fonts/IBMPlexMono-Medium-datatexture.ktx2',

  // Draco & Basis WASM Decoders
  'assets/libs/draco/draco_decoder.js',
  'assets/libs/draco/draco_wasm_wrapper.js',
  'assets/libs/draco/draco_decoder.wasm',
  'assets/libs/basis/basis_transcoder.js',
  'assets/libs/basis/basis_transcoder.wasm',

  // Draco 3D Geometries (.drc)
  'assets/geometries/ground.drc',
  'assets/geometries/mountain.drc',
  'assets/geometries/intro_particles.drc',
  'assets/geometries/igloo.drc',
  'assets/geometries/igloo/igloo_cage.drc',
  'assets/geometries/igloo/igloo_outline.drc',
  'assets/geometries/igloo/patch.drc',
  'assets/geometries/blurrytext.drc',
  'assets/geometries/blurrytext_cylinder.drc',
  'assets/geometries/cubes/cube3.drc',
  'assets/geometries/cubes/cube1.drc',
  'assets/geometries/cubes/background_shapes.drc',
  'assets/geometries/pudgy.drc',
  'assets/geometries/overpass_logo.drc',
  'assets/geometries/shattered_ring.drc',
  'assets/geometries/shattered_ring2.drc',
  'assets/geometries/shattered_ring_smoke.drc',
  'assets/geometries/floor.drc',
  'assets/geometries/smoke_trail.drc',
  'assets/geometries/ceilingsmoke.drc',

  // KTX2 / EXR / PNG Textures & 3D Volumes
  'assets/images/scroll-datatexture.ktx2',
  'assets/images/frost-datatexture.ktx2',
  'assets/images/noises/blue-8-128-rgb.ktx2',
  'assets/images/wind_noise.ktx2',
  'assets/images/mosaic.ktx2',
  'assets/images/numbers-datatexture.ktx2',
  'assets/images/perlin-datatexture.ktx2',
  'assets/images/perlin-datatexture.png',
  'assets/images/shapes_blurred.ktx2',
  'assets/images/cubes_env.exr',
  'assets/images/floor_color.ktx2',
  'assets/images/clouds_noise.ktx2',
  'assets/images/caustics.ktx2',
  'assets/images/bokeh.ktx2',
  'assets/images/uv/uvchecker-srgb.png',
  'assets/images/uv/uvchecker-srgb.ktx2',
  'assets/images/igloo/igloo_scene.ktx2',
  'assets/images/igloo/ground_color.ktx2',
  'assets/images/igloo/ground_glow.ktx2',
  'assets/images/igloo/triangles_tiling.ktx2',
  'assets/images/igloo/mountain_color.ktx2',
  'assets/images/igloo/ground_sansigloo_color.ktx2',
  'assets/images/igloo/numbers.ktx2',
  'assets/images/igloo/igloo_color.ktx2',
  'assets/images/igloo/igloo_exploded_color.ktx2',
  'assets/images/cubes/cube_scene.ktx2',
  'assets/images/cubes/dot_pattern.ktx2',
  'assets/images/cubes/blurrytext_atlas.ktx2',
  'assets/images/cubes/advect.png',
  'assets/images/cubes/bg.png',
  'assets/images/cubes/cube3_roughness.ktx2',
  'assets/images/cubes/cube3_normal.ktx2',
  'assets/images/cubes/cube1_roughness.ktx2',
  'assets/images/cubes/cube1_normal.ktx2',
  'assets/images/cubes/pudgy_color.ktx2',
  'assets/images/cubes/overpass_logo_color.ktx2',
  'assets/images/pudgy_dark_color.ktx2',
  'assets/images/overpass_logo_dark_color.ktx2',
  'assets/images/shattered_ring_color.ktx2',
  'assets/images/shattered_ring_ao.ktx2',
  'assets/images/shattered_ring2_color.ktx2',
  'assets/images/shattered_ring2_ao.ktx2',
  'assets/images/ui/visit-datatexture.ktx2',
  'assets/images/ui/logo-datatexture.ktx2',
  'assets/images/ui/sound-datatexture.ktx2',
  'assets/images/ui/close-datatexture.ktx2',
  'assets/images/ui/arrow-datatexture.ktx2',
  'assets/images/volumes/peachesbody_64.ktx2',
  'assets/images/volumes/x_64.ktx2',
  'assets/images/volumes/medium_32.ktx2',

  // 18 Spatial Audio Tracks (.ogg)
  'assets/audio/music-highq.ogg',
  'assets/audio/room.ogg',
  'assets/audio/wind.ogg',
  'assets/audio/igloo.ogg',
  'assets/audio/beeps.ogg',
  'assets/audio/beeps2.ogg',
  'assets/audio/beeps3.ogg',
  'assets/audio/click-project.ogg',
  'assets/audio/enter-project.ogg',
  'assets/audio/leave-project.ogg',
  'assets/audio/shard.ogg',
  'assets/audio/project-text.ogg',
  'assets/audio/circles.ogg',
  'assets/audio/particles.ogg',
  'assets/audio/logo.ogg',
  'assets/audio/ui-long.ogg',
  'assets/audio/ui-short.ogg',
  'assets/audio/manifesto.ogg'
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Igloo-Local-Mirror/1.0)',
            Accept: '*/*'
          }
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return fetchBuffer(new URL(res.headers.location, url).toString()).then(resolve, reject);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        }
      )
      .on('error', reject);
  });
}

function patchIndexBundle(buf) {
  const raw = buf.toString('utf8');
  const patched = raw.replace(/https:\/\/www\.igloo\.inc\//g, '/');
  return Buffer.from(patched, 'utf8');
}

async function syncSingleAsset(relAssetPath, force = false) {
  const cleanRel = relAssetPath.replace(/^\/+/, '');
  const localDest = path.join(__dirname, cleanRel);
  const isIndexBundle = cleanRel.endsWith('index-2e130bc1.js');

  if (!force && fs.existsSync(localDest) && fs.statSync(localDest).size > 0) {
    if (isIndexBundle) {
      const existing = fs.readFileSync(localDest, 'utf8');
      if (existing.includes('https://www.igloo.inc/')) {
        const patched = patchIndexBundle(Buffer.from(existing, 'utf8'));
        fs.writeFileSync(localDest, patched);
        return { status: 'patched', bytes: patched.length, path: cleanRel };
      }
    }
    return { status: 'cached', bytes: fs.statSync(localDest).size, path: cleanRel };
  }

  const upstreamUrl = `${UPSTREAM_ORIGIN}/${cleanRel}`;
  let buf = await fetchBuffer(upstreamUrl);
  if (isIndexBundle) {
    buf = patchIndexBundle(buf);
  }
  fs.mkdirSync(path.dirname(localDest), { recursive: true });
  fs.writeFileSync(localDest, buf);
  return { status: 'downloaded', bytes: buf.length, path: cleanRel };
}

async function main() {
  const force = process.argv.includes('--force');
  fs.mkdirSync(ASSETS_ROOT, { recursive: true });

  console.log(`[IGLOO-SYNC] Starting pre-sync of ${ASSET_MANIFEST.length} Lusion WebGL2 3D assets...`);
  const concurrency = 10;
  let cursor = 0;
  let downloaded = 0;
  let cached = 0;
  let failed = 0;
  let totalBytes = 0;

  async function worker() {
    while (cursor < ASSET_MANIFEST.length) {
      const idx = cursor++;
      const item = ASSET_MANIFEST[idx];
      try {
        const res = await syncSingleAsset(item, force);
        totalBytes += res.bytes;
        if (res.status === 'downloaded' || res.status === 'patched') {
          downloaded++;
          console.log(`  [OK] (${idx + 1}/${ASSET_MANIFEST.length}) ${res.status.toUpperCase()} ${res.path} (${(res.bytes / 1024).toFixed(1)} KB)`);
        } else {
          cached++;
        }
      } catch (err) {
        failed++;
        console.warn(`  [WARN] (${idx + 1}/${ASSET_MANIFEST.length}) Failed ${item}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Mirror subdirectory aliases so both canonical & cube/igloo-scoped paths resolve to genuine binaries
  const ALIAS_PAIRS = [
    ['assets/geometries/pudgy.drc', 'assets/geometries/cubes/pudgy.drc'],
    ['assets/geometries/overpass_logo.drc', 'assets/geometries/cubes/overpass_logo.drc'],
    ['assets/images/cubes_env.exr', 'assets/images/igloo/mountain_env.exr'],
    ['assets/images/perlin-datatexture.ktx2', 'assets/images/smoke_datatexture.ktx2']
  ];
  for (const [srcRel, dstRel] of ALIAS_PAIRS) {
    const srcAbs = path.join(__dirname, srcRel);
    const dstAbs = path.join(__dirname, dstRel);
    if (fs.existsSync(srcAbs)) {
      fs.mkdirSync(path.dirname(dstAbs), { recursive: true });
      fs.copyFileSync(srcAbs, dstAbs);
    }
  }

  console.log(
    `[IGLOO-SYNC] Complete! Downloaded/Patched: ${downloaded}, Cached: ${cached}, Failed: ${failed}, Total Cache: ${(
      totalBytes /
      (1024 * 1024)
    ).toFixed(2)} MB`
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[IGLOO-SYNC] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { ASSET_MANIFEST, syncSingleAsset, patchIndexBundle };
