/**
 * scripts/smoke-test.js
 *
 * Automated syntax verification & full-stack security/protocol smoke test suite
 * for decon-web (:6050 Portal + :6060..:6064 Specimen Servers).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

const JS_FILES_TO_CHECK = [
  'shared/static-server.js',
  'portal/server.js',
  'portal/app.js',
  'portal/lab.js',
  'shared-ui/truejpeg-ui.js',
  'shared-ui/mfp-ui.js',
  'shared-ui/photo-vault-ui.js',
  'shared-ui/igloo-ui.js',
  'shared-ui/lumen-muse-geometry.js',
  'shared-ui/lumen-muse-stage.js',
  'shared-ui/lumen-muse-audio.js',
  'shared-ui/lumen-muse-ui.js',
  'sites/01-truejpeg/server.js',
  'sites/01-truejpeg/app.js',
  'sites/01-truejpeg/i18n.js',
  'sites/01-truejpeg/works.js',
  'sites/01-truejpeg/data.js',
  'sites/01-truejpeg/tool.js',
  'sites/01-truejpeg/sync_images.js',
  'sites/02-musicforprogramming/server.js',
  'sites/02-musicforprogramming/app.js',
  'sites/02-musicforprogramming/sync_rss.js',
  'sites/03-sambecker-photos/server.js',
  'sites/03-sambecker-photos/app.js',
  'sites/03-sambecker-photos/sync_photos.js',
  'sites/04-igloo-inc/server.js',
  'sites/04-igloo-inc/pro-hud.js',
  'sites/04-igloo-inc/sync_assets.js',
  'sites/05-lumen-muse/server.js',
  'sites/05-lumen-muse/app.js'
];

const SERVERS = [
  { name: 'Portal (:6050)', port: 6050, script: 'portal/server.js' },
  { name: 'Specimen #01 True JPEG (:6060)', port: 6060, script: 'sites/01-truejpeg/server.js' },
  { name: 'Specimen #02 musicForProgramming (:6061)', port: 6061, script: 'sites/02-musicforprogramming/server.js' },
  { name: 'Specimen #03 Sam Becker Photos (:6062)', port: 6062, script: 'sites/03-sambecker-photos/server.js' },
  { name: 'Specimen #04 Igloo Inc (:6063)', port: 6063, script: 'sites/04-igloo-inc/server.js' },
  { name: 'Specimen #05 Lumen Muse (:6064)', port: 6064, script: 'sites/05-lumen-muse/server.js' }
];

function rawHttpRequest({ port, method = 'GET', reqPath = '/', headers = {}, body = null, timeoutMs = 4000 }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers,
        timeout: timeoutMs
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks)
          });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout on :${port}${reqPath}`));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findOggAssetInIgloo() {
  const audioDir = path.join(repoRoot, 'sites/04-igloo-inc/assets/audio');
  if (fs.existsSync(audioDir)) {
    const files = fs.readdirSync(audioDir).filter((f) => f.endsWith('.ogg'));
    for (const f of files) {
      const full = path.join(audioDir, f);
      if (fs.statSync(full).size >= 500) {
        return `/assets/audio/${f}`;
      }
    }
  }
  const assetsDir = path.join(repoRoot, 'sites/04-igloo-inc/assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.ogg') || f.endsWith('.js'));
    for (const f of files) {
      const full = path.join(assetsDir, f);
      if (fs.statSync(full).isFile() && fs.statSync(full).size >= 500) {
        return `/assets/${f}`;
      }
    }
  }
  return '/pro-hud.js';
}

async function main() {
  let passed = 0;
  let failed = 0;
  const tempChildren = [];

  const assert = (cond, label, detail = '') => {
    if (cond) {
      passed++;
      console.log(`  [PASS] ${label}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${label}${detail ? ' — ' + detail : ''}`);
    }
  };

  console.log('=== 1. Syntax Verification (node --check) ===');
  for (const rel of JS_FILES_TO_CHECK) {
    const abs = path.join(repoRoot, rel);
    try {
      execFileSync(process.execPath, ['--check', abs], { stdio: 'pipe' });
      assert(true, `Syntax OK: ${rel}`);
    } catch (err) {
      assert(false, `Syntax check failed: ${rel}`, err.message);
    }
  }

  console.log('\n=== 2. Ensuring All 6 Servers Are Online ===');
  for (const srv of SERVERS) {
    let online = false;
    try {
      const r = await rawHttpRequest({ port: srv.port, reqPath: '/' });
      online = r.statusCode === 200;
    } catch (_) {
      online = false;
    }
    if (!online) {
      const scriptAbs = path.join(repoRoot, srv.script);
      const child = spawn(process.execPath, [scriptAbs], {
        cwd: path.dirname(scriptAbs),
        stdio: 'ignore',
        env: { ...process.env, PORT: String(srv.port), DECON_NO_AUTOWAKE: '1' }
      });
      tempChildren.push(child);
      for (let i = 0; i < 25; i++) {
        await sleep(150);
        try {
          const r = await rawHttpRequest({ port: srv.port, reqPath: '/' });
          if (r.statusCode === 200) break;
        } catch (_) {}
      }
    }
  }

  console.log('\n=== 3. Probing HTTP Endpoints & Security Guards ===');
  for (const srv of SERVERS) {
    // Test 1: GET / -> 200 OK
    try {
      const r1 = await rawHttpRequest({ port: srv.port, reqPath: '/' });
      assert(r1.statusCode === 200, `${srv.name} GET / -> 200 OK (got ${r1.statusCode})`);
    } catch (err) {
      assert(false, `${srv.name} GET / -> 200 OK`, err.message);
    }

    // Test 2: GET /%E0%A4%A (Malformed URI) -> 400 Bad Request + Process survives
    try {
      const r2 = await rawHttpRequest({ port: srv.port, reqPath: '/%E0%A4%A' });
      assert(
        r2.statusCode === 400,
        `${srv.name} GET /%E0%A4%A -> 400 Bad Request (got ${r2.statusCode})`
      );
      const rAlive = await rawHttpRequest({ port: srv.port, reqPath: '/' });
      assert(
        rAlive.statusCode === 200,
        `${srv.name} survives malformed URL & responds 200 OK on subsequent GET /`
      );
    } catch (err) {
      assert(false, `${srv.name} malformed URL survival check`, err.message);
    }

    // Test 3: GET /shared-ui/../portal/server.js -> 403 or 404
    try {
      const r3 = await rawHttpRequest({
        port: srv.port,
        reqPath: '/shared-ui/../portal/server.js'
      });
      assert(
        r3.statusCode === 403 || r3.statusCode === 404,
        `${srv.name} blocks path traversal /shared-ui/../portal/server.js -> ${r3.statusCode}`
      );
    } catch (err) {
      assert(false, `${srv.name} path traversal check`, err.message);
    }
  }

  // Test 3b: Internal sync scripts blocked with 403 on both Specimen #02 (:6061) and Portal (:6050)
  try {
    const rSyncDirect = await rawHttpRequest({ port: 6061, reqPath: '/sync_rss.js' });
    assert(
      rSyncDirect.statusCode === 403,
      `Specimen #02 (:6061) blocks internal script GET /sync_rss.js -> 403 (got ${rSyncDirect.statusCode})`
    );
    const rSyncPortal = await rawHttpRequest({
      port: 6050,
      reqPath: '/sites/02-musicforprogramming/sync_rss.js'
    });
    assert(
      rSyncPortal.statusCode === 403,
      `Portal (:6050) blocks internal script GET /sites/02-musicforprogramming/sync_rss.js -> 403 (got ${rSyncPortal.statusCode})`
    );
  } catch (err) {
    assert(false, 'Internal sync script 403 block check', err.message);
  }

  // Test 4: POST http://127.0.0.1:6050/api/wake with Content-Type: text/plain -> 415 or 403
  try {
    const rWakeCsrf = await rawHttpRequest({
      port: 6050,
      method: 'POST',
      reqPath: '/api/wake',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': 12
      },
      body: '{"id":"all"}'
    });
    assert(
      rWakeCsrf.statusCode === 415 || rWakeCsrf.statusCode === 403,
      `Portal (:6050) POST /api/wake with Content-Type: text/plain rejected -> ${rWakeCsrf.statusCode}`
    );
  } catch (err) {
    assert(false, `Portal (:6050) POST /api/wake CSRF protection`, err.message);
  }

  // Test 5: :6063 Range requests (bytes=-500 -> 206 Partial Content + Content-Length: 500; bytes=999999999- -> 416)
  const rangeTarget = findOggAssetInIgloo();
  try {
    const rSuffix = await rawHttpRequest({
      port: 6063,
      reqPath: rangeTarget,
      headers: {
        Range: 'bytes=-500'
      }
    });
    const contentLen = Number(rSuffix.headers['content-length']);
    assert(
      rSuffix.statusCode === 206 && contentLen === 500 && rSuffix.body.length === 500,
      `Specimen #04 (:6063) ${rangeTarget} Range: bytes=-500 -> 206 Partial Content & Content-Length: 500 (got status=${rSuffix.statusCode}, len=${contentLen})`
    );

    const rInvalidRange = await rawHttpRequest({
      port: 6063,
      reqPath: rangeTarget,
      headers: {
        Range: 'bytes=999999999-'
      }
    });
    assert(
      rInvalidRange.statusCode === 416,
      `Specimen #04 (:6063) ${rangeTarget} Range: bytes=999999999- -> 416 Range Not Satisfiable (got ${rInvalidRange.statusCode})`
    );
  } catch (err) {
    assert(false, `Specimen #04 (:6063) RFC 9110 Range test`, err.message);
  }

  console.log('\n=== 4. Specimen #05「LUMEN MUSE · 潜影缪斯」End-to-End Verification ===');

  // Test 6a: Portal (:6050) Card #05, /lab & /lab.html #sb-17 (/shared-ui/lumen-muse-ui.js)
  try {
    const rPortalHome = await rawHttpRequest({ port: 6050, reqPath: '/' });
    const homeHtml = rPortalHome.body.toString('utf8');
    const card05Idx = homeHtml.indexOf('id="specimen-card-05"');
    const card05Slice = card05Idx >= 0 ? homeHtml.slice(card05Idx, card05Idx + 2600) : '';
    assert(
      rPortalHome.statusCode === 200 &&
        card05Idx >= 0 &&
        /LUMEN MUSE/i.test(card05Slice) &&
        card05Slice.includes('潜影缪斯') &&
        card05Slice.includes('?embed=card'),
      `Portal (:6050) GET / contains 5th card #specimen-card-05 with LUMEN MUSE / 潜影缪斯 and ?embed=card`
    );

    const rPortalLabRoute = await rawHttpRequest({ port: 6050, reqPath: '/lab' });
    const labRouteHtml = rPortalLabRoute.body.toString('utf8');
    const sb17RouteIdx = labRouteHtml.indexOf('id="sb-17"');
    const sb17RouteSlice = sb17RouteIdx >= 0 ? labRouteHtml.slice(sb17RouteIdx, sb17RouteIdx + 2600) : '';
    assert(
      rPortalLabRoute.statusCode === 200 &&
        sb17RouteIdx >= 0 &&
        sb17RouteSlice.includes('copy-esm-btn') &&
        sb17RouteSlice.includes('/shared-ui/lumen-muse-ui.js'),
      `Portal (:6050) GET /lab contains #sb-17 with copy-esm-btn referencing /shared-ui/lumen-muse-ui.js`
    );

    const rPortalLabHtml = await rawHttpRequest({ port: 6050, reqPath: '/lab.html' });
    const labHtml = rPortalLabHtml.body.toString('utf8');
    const sb17LabIdx = labHtml.indexOf('id="sb-17"');
    const sb17LabSlice = sb17LabIdx >= 0 ? labHtml.slice(sb17LabIdx, sb17LabIdx + 2600) : '';
    assert(
      rPortalLabHtml.statusCode === 200 &&
        sb17LabIdx >= 0 &&
        sb17LabSlice.includes('copy-esm-btn') &&
        sb17LabSlice.includes('/shared-ui/lumen-muse-ui.js'),
      `Portal (:6050) GET /lab.html (portal/lab.html) contains #sb-17 with copy-esm-btn referencing /shared-ui/lumen-muse-ui.js`
    );
  } catch (err) {
    assert(false, 'Portal (:6050) Card #05 & SB-17 markup check', err.message);
  }

  // Test 6b: Portal (:6050) GET /api/status ('05' online on :6064) & /api/muse-portrait?id=ccd + whitelist guard
  try {
    const rStatus = await rawHttpRequest({ port: 6050, reqPath: '/api/status' });
    const statusJson = JSON.parse(rStatus.body.toString('utf8'));
    const spec05 = statusJson && statusJson.specimens && statusJson.specimens['05'];
    assert(
      rStatus.statusCode === 200 &&
        statusJson.ok === true &&
        Boolean(spec05) &&
        spec05.port === 6064 &&
        spec05.online === true,
      `Portal (:6050) GET /api/status reports specimen '05' online on port 6064`
    );

    const rPortrait50 = await rawHttpRequest({
      port: 6050,
      reqPath: '/api/muse-portrait?id=ccd'
    });
    const ct50 = String(rPortrait50.headers['content-type'] || '').toLowerCase();
    assert(
      rPortrait50.statusCode === 200 &&
        ct50.includes('image/jpeg') &&
        rPortrait50.body.length > 1000,
      `Portal (:6050) GET /api/muse-portrait?id=ccd -> 200 image/jpeg (${rPortrait50.body.length} bytes)`
    );

    const rPortrait50Bad = await rawHttpRequest({
      port: 6050,
      reqPath: '/api/muse-portrait?id=../../portal/server.js'
    });
    assert(
      rPortrait50Bad.statusCode === 400,
      `Portal (:6050) GET /api/muse-portrait?id=../../portal/server.js -> 400 Bad Request whitelist guard (got ${rPortrait50Bad.statusCode})`
    );
  } catch (err) {
    assert(false, `Portal (:6050) /api/status & /api/muse-portrait check`, err.message);
  }

  // Test 6c: Specimen #05 (:6064) /?embed=card, /lab, /standalone, /api/muse-portrait?id=anime + whitelist guard, and /server.js 403
  try {
    const rEmbed = await rawHttpRequest({ port: 6064, reqPath: '/?embed=card' });
    const embedHtml = rEmbed.body.toString('utf8');
    assert(
      rEmbed.statusCode === 200 &&
        embedHtml.includes('lumen-canvas') &&
        embedHtml.includes('embed=card'),
      `Specimen #05 (:6064) GET /?embed=card -> 200 OK with valid stage markup (got ${rEmbed.statusCode})`
    );

    const rLab = await rawHttpRequest({ port: 6064, reqPath: '/lab' });
    const lumenLabHtml = rLab.body.toString('utf8');
    assert(
      rLab.statusCode === 200 && lumenLabHtml.includes('/shared-ui/lumen-muse-ui.js'),
      `Specimen #05 (:6064) GET /lab -> 200 OK with /shared-ui/lumen-muse-ui.js (got ${rLab.statusCode})`
    );

    const rStandalone = await rawHttpRequest({ port: 6064, reqPath: '/standalone' });
    const standaloneHtml = rStandalone.body.toString('utf8');
    const standaloneCt = String(rStandalone.headers['content-type'] || '').toLowerCase();
    assert(
      rStandalone.statusCode === 200 &&
        standaloneCt.includes('text/html') &&
        standaloneHtml.length > 50000 &&
        standaloneHtml.includes('createLumenMuseStage') &&
        standaloneHtml.includes('buildMechanicalGeometry'),
      `Specimen #05 (:6064) GET /standalone -> 200 OK self-contained HTML (${standaloneHtml.length} chars)`
    );

    const rPortrait64 = await rawHttpRequest({
      port: 6064,
      reqPath: '/api/muse-portrait?id=anime'
    });
    const ct64 = String(rPortrait64.headers['content-type'] || '').toLowerCase();
    assert(
      rPortrait64.statusCode === 200 &&
        ct64.includes('image/webp') &&
        rPortrait64.body.length > 1000,
      `Specimen #05 (:6064) GET /api/muse-portrait?id=anime -> 200 image/webp (${rPortrait64.body.length} bytes)`
    );

    const rPortrait64Bad = await rawHttpRequest({
      port: 6064,
      reqPath: '/api/muse-portrait?id=../../portal/server.js'
    });
    assert(
      rPortrait64Bad.statusCode === 400,
      `Specimen #05 (:6064) GET /api/muse-portrait?id=../../portal/server.js -> 400 Bad Request whitelist guard (got ${rPortrait64Bad.statusCode})`
    );

    const rServerBlocked = await rawHttpRequest({ port: 6064, reqPath: '/server.js' });
    assert(
      rServerBlocked.statusCode === 403,
      `Specimen #05 (:6064) blocks internal script GET /server.js -> 403 (got ${rServerBlocked.statusCode})`
    );
  } catch (err) {
    assert(false, 'Specimen #05 (:6064) end-to-end routes & security check', err.message);
  }

  for (const child of tempChildren) {
    try {
      child.kill();
    } catch (_) {}
  }

  console.log(`\n=== Smoke Test Summary: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in smoke-test:', err);
  process.exit(1);
});
