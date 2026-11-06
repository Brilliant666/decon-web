/**
 * decon-web Master Exhibition Portal Server
 * Listens on http://127.0.0.1:6000/
 *
 * Capabilities:
 *   1. Static hosting for portal/ root directory files (index.html, styles.css, app.js, README.md)
 *   2. Cross-directory ESM module mapping: /shared-ui/* -> ../shared-ui/*
 *   3. GET  /api/status -> Concurrently probes 127.0.0.1:6060, 6061, 6062, 6063 liveness & latency (ms)
 *   4. POST /api/wake   -> Spawns background sub-site server processes ({ id: "01"|"02"|"03"|"04"|"all" })
 *                          and waits until ports are online before returning updated telemetry JSON.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');

const PRIMARY_PORT = Number(process.env.PORT) || 6000;
// Note: Chromium/Firefox block TCP port 6000 (X11) with ERR_UNSAFE_PORT in standard browser tabs.
// We simultaneously bind browser-safe mirror ports 6050 & 6080 alongside 6000 so both browser & CLI work seamlessly!
const LISTEN_PORTS = Array.from(new Set([PRIMARY_PORT, 6050, 6080]));
const portalRoot = __dirname;
const repoRoot = path.resolve(portalRoot, '..');
const sharedRoot = path.join(repoRoot, 'shared-ui');
const sitesRoot = path.join(repoRoot, 'sites');

const SPECIMEN_REGISTRY = {
  '01': {
    id: '01',
    slug: '01-truejpeg',
    name: 'True JPEG',
    creator: 'TJ (@RTJLDR)',
    originUrl: 'https://truejpeg.com/',
    port: 6060,
    url: 'http://127.0.0.1:6060/',
    labUrl: 'http://127.0.0.1:6060/lab.html',
    dir: path.join(repoRoot, 'sites', '01-truejpeg'),
    script: path.join(repoRoot, 'sites', '01-truejpeg', 'server.js')
  },
  '02': {
    id: '02',
    slug: '02-musicforprogramming',
    name: 'musicForProgramming();',
    creator: 'Datassette',
    originUrl: 'https://musicforprogramming.net/',
    port: 6061,
    url: 'http://127.0.0.1:6061/',
    labUrl: 'http://127.0.0.1:6061/lab.html',
    dir: path.join(repoRoot, 'sites', '02-musicforprogramming'),
    script: path.join(repoRoot, 'sites', '02-musicforprogramming', 'server.js')
  },
  '03': {
    id: '03',
    slug: '03-sambecker-photos',
    name: 'Sam Becker Photos',
    creator: 'Sam Becker',
    originUrl: 'https://photos.sambecker.com/',
    port: 6062,
    url: 'http://127.0.0.1:6062/',
    labUrl: 'http://127.0.0.1:6062/lab',
    dir: path.join(repoRoot, 'sites', '03-sambecker-photos'),
    script: path.join(repoRoot, 'sites', '03-sambecker-photos', 'server.js')
  },
  '04': {
    id: '04',
    slug: '04-igloo-inc',
    name: 'Igloo Inc',
    creator: 'Lusion / Igloo Inc.',
    originUrl: 'https://www.igloo.inc/',
    port: 6063,
    url: 'http://127.0.0.1:6063/',
    labUrl: 'http://127.0.0.1:6063/lab',
    dir: path.join(repoRoot, 'sites', '04-igloo-inc'),
    script: path.join(repoRoot, 'sites', '04-igloo-inc', 'server.js')
  }
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

/**
 * Probes a single specimen HTTP server on 127.0.0.1:port
 */
function probeSpecimen(spec, timeoutMs = 1100) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    let settled = false;

    const finish = (online, statusCode = 0) => {
      if (settled) return;
      settled = true;
      const latencyMs = online ? Math.max(1, Math.round(performance.now() - t0)) : null;
      resolve({
        id: spec.id,
        slug: spec.slug,
        name: spec.name,
        creator: spec.creator,
        originUrl: spec.originUrl,
        port: spec.port,
        url: spec.url,
        labUrl: spec.labUrl,
        online,
        statusCode,
        latencyMs
      });
    };

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: spec.port,
        path: '/',
        method: 'GET',
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'DeconWeb-Master-Portal-Probe/1.0',
          Accept: 'text/html,*/*'
        }
      },
      (res) => {
        res.resume();
        const ok = res.statusCode >= 200 && res.statusCode < 500;
        finish(ok, res.statusCode);
      }
    );

    req.on('timeout', () => {
      req.destroy();
      finish(false, 0);
    });

    req.on('error', () => {
      finish(false, 0);
    });

    req.end();
  });
}

/**
 * Concurrently probes all 4 specimen servers
 */
async function probeAllSpecimens() {
  const keys = Object.keys(SPECIMEN_REGISTRY);
  const results = await Promise.all(keys.map((k) => probeSpecimen(SPECIMEN_REGISTRY[k])));
  const specimens = {};
  let onlineCount = 0;

  for (const item of results) {
    specimens[item.id] = item;
    if (item.online) onlineCount++;
  }

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    onlineCount,
    totalCount: keys.length,
    specimens,
    list: results
  };
}

/**
 * Spawns a detached background process for a specimen server if not already online
 */
function spawnSpecimenServer(spec) {
  if (!fs.existsSync(spec.script)) {
    return { spawned: false, error: `Server script not found: ${spec.script}` };
  }
  try {
    const child = spawn(process.execPath, [spec.script], {
      cwd: spec.dir,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, PORT: String(spec.port) }
    });
    child.unref();
    return { spawned: true, pid: child.pid || null };
  } catch (err) {
    return { spawned: false, error: err.message };
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Wakes one or all offline specimen servers and polls until ready
 */
async function wakeSpecimens(targetId = 'all') {
  const normalized = String(targetId || 'all').toLowerCase().replace(/^#/, '').padStart(targetId === 'all' ? 3 : 2, '0');
  const idsToWake =
    targetId === 'all' || normalized === 'all'
      ? Object.keys(SPECIMEN_REGISTRY)
      : SPECIMEN_REGISTRY[normalized]
        ? [normalized]
        : SPECIMEN_REGISTRY[String(targetId)]
          ? [String(targetId)]
          : [];

  if (idsToWake.length === 0) {
    const status = await probeAllSpecimens();
    return { ...status, ok: false, error: `Unknown specimen id: ${targetId}`, woken: [] };
  }

  const initialStatus = await probeAllSpecimens();
  const woken = [];
  const needWait = [];

  for (const id of idsToWake) {
    const current = initialStatus.specimens[id];
    const spec = SPECIMEN_REGISTRY[id];
    if (!current.online) {
      const res = spawnSpecimenServer(spec);
      if (res.spawned) {
        woken.push({ id, port: spec.port, pid: res.pid });
        needWait.push(spec);
      }
    }
  }

  if (needWait.length > 0) {
    const deadline = performance.now() + 4500;
    while (performance.now() < deadline) {
      await sleep(160);
      const checks = await Promise.all(needWait.map((s) => probeSpecimen(s, 500)));
      if (checks.every((c) => c.online)) {
        break;
      }
    }
  }

  const finalStatus = await probeAllSpecimens();
  return {
    ...finalStatus,
    woken
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const rawUrl = req.url || '/';
  const cleanPath = decodeURIComponent(rawUrl.split('?')[0]);

  // 1. GET /api/status
  if (req.method === 'GET' && cleanPath === '/api/status') {
    try {
      const status = await probeAllSpecimens();
      sendJson(res, 200, status);
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
    }
    return;
  }

  // 2. POST /api/wake
  if (req.method === 'POST' && cleanPath === '/api/wake') {
    let bodyStr = '';
    req.on('data', (chunk) => {
      bodyStr += chunk;
      if (bodyStr.length > 16384) req.destroy();
    });
    req.on('end', async () => {
      try {
        const parsed = bodyStr ? JSON.parse(bodyStr) : { id: 'all' };
        const result = await wakeSpecimens(parsed.id || 'all');
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
    });
    return;
  }

  // 3. Favicon fallback (inline SVG dot-matrix prism icon so browser never logs 404)
  if (cleanPath === '/favicon.ico' || cleanPath === '/favicon.svg') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#07080B"/><circle cx="10" cy="10" r="2.5" fill="#ECECEA"/><circle cx="22" cy="10" r="2.5" fill="#1BEB9E"/><circle cx="10" cy="22" r="2.5" fill="#E5A93C"/><circle cx="22" cy="22" r="2.5" fill="#8CD2FF"/><path d="M10 10L22 22M22 10L10 22" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>`;
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400'
    });
    res.end(svg);
    return;
  }

  // 4. Route /shared-ui/* -> ../shared-ui/* and /sites/* -> ../sites/*
  let filePath = null;
  if (cleanPath.startsWith('/shared-ui/')) {
    const rel = cleanPath.slice('/shared-ui/'.length);
    const candidate = path.resolve(sharedRoot, rel);
    if (!candidate.startsWith(sharedRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    filePath = candidate;
  } else if (cleanPath.startsWith('/sites/')) {
    let rel = cleanPath.slice('/sites/'.length);
    rel = rel
      .replace(/^01-truejpeg\/examples\//, '01-truejpeg/images/')
      .replace(/^03-sam-becker\//, '03-sambecker-photos/')
      .replace(/^04-igloo\/images\//, '04-igloo-inc/assets/images/')
      .replace(/^04-igloo\//, '04-igloo-inc/');
    const candidate = path.resolve(sitesRoot, rel);
    if (!candidate.startsWith(sitesRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    filePath = candidate;
  } else {
    // Route portal static files — unify /, /list, /lab, /arsenal into the True SPA (/index.html)
    let relPath = cleanPath;
    if (
      relPath === '/' ||
      relPath === '/index.html' ||
      relPath === '/cards' ||
      relPath === '/list' ||
      relPath === '/lab' ||
      relPath === '/lab/' ||
      relPath === '/arsenal'
    ) {
      relPath = '/index.html';
    } else if (relPath === '/lab.html') {
      relPath = '/lab.html';
    }
    const candidate = path.resolve(portalRoot, '.' + relPath);
    if (!candidate.startsWith(portalRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    filePath = candidate;
  }

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Not Found: ${cleanPath}`);
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Not Found: ${cleanPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
    const isCodeOrMarkup =
      ext === '.html' || ext === '.js' || ext === '.mjs' || ext === '.css' || ext === '.json';
    const cacheControl = isCodeOrMarkup
      ? 'public, max-age=0, must-revalidate'
      : 'public, max-age=86400';

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, {
        ETag: etag,
        'Cache-Control': cacheControl,
        'Access-Control-Allow-Origin': '*'
      });
      res.end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      ETag: etag,
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });
    stream.pipe(res);
  });
}

let autoWakeTriggered = false;

LISTEN_PORTS.forEach((port) => {
  const srv = http.createServer(handleRequest);
  srv.on('error', (err) => {
    console.warn(`[DECON-WEB PORTAL] Port ${port} bind warning: ${err.message}`);
  });
  srv.listen(port, () => {
    console.log(`[DECON-WEB PORTAL] Master Exhibition Museum listening at http://127.0.0.1:${port}/`);
    if (!autoWakeTriggered) {
      autoWakeTriggered = true;
      wakeSpecimens('all')
        .then((status) => {
          console.log(
            `[DECON-WEB PORTAL] Auto-woke all specimen engines (${status.onlineCount}/${status.totalCount} online).`
          );
        })
        .catch((err) => {
          console.warn(`[DECON-WEB PORTAL] Auto-wake warning: ${err.message}`);
        });
    }
  });
});
