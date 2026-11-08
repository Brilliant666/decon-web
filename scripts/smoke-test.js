/**
 * scripts/smoke-test.js
 *
 * Automated syntax verification & full-stack security/protocol smoke test suite
 * for decon-web (:6050 Portal + :6060..:6063 Specimen Servers).
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
  'sites/01-truejpeg/server.js',
  'sites/01-truejpeg/sync_images.js',
  'sites/02-musicforprogramming/server.js',
  'sites/02-musicforprogramming/app.js',
  'sites/03-sambecker-photos/server.js',
  'sites/03-sambecker-photos/app.js',
  'sites/04-igloo-inc/server.js',
  'sites/04-igloo-inc/pro-hud.js'
];

const SERVERS = [
  { name: 'Portal (:6050)', port: 6050, script: 'portal/server.js' },
  { name: 'Specimen #01 True JPEG (:6060)', port: 6060, script: 'sites/01-truejpeg/server.js' },
  { name: 'Specimen #02 musicForProgramming (:6061)', port: 6061, script: 'sites/02-musicforprogramming/server.js' },
  { name: 'Specimen #03 Sam Becker Photos (:6062)', port: 6062, script: 'sites/03-sambecker-photos/server.js' },
  { name: 'Specimen #04 Igloo Inc (:6063)', port: 6063, script: 'sites/04-igloo-inc/server.js' }
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

  console.log('\n=== 2. Ensuring All 5 Servers Are Online ===');
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
        env: { ...process.env, PORT: String(srv.port) }
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
