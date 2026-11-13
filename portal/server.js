/**
 * decon-web Master Exhibition Portal Server
 * Listens on http://127.0.0.1:6050/ (and mirror port 6080)
 *
 * Capabilities:
 *   1. Static hosting for portal/ root directory files (index.html, styles.css, app.js, lab.js, README.md)
 *   2. Cross-directory ESM module mapping: /shared-ui/* -> ../shared-ui/*
 *   3. GET  /api/status -> Concurrently probes 127.0.0.1:6060..6064 liveness & latency (ms)
 *   4. POST /api/wake   -> Spawns background sub-site server processes ({ id: "01"|"02"|"03"|"04"|"05"|"all" })
 *                          and waits until ports are online before returning updated telemetry JSON.
 *   5. GET  /api/muse-portrait?id=ccd|anime -> Whitelisted local #01 True JPEG portrait bridge for Specimen #05 & SB-17.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');
const {
  DEFAULT_MIME_TYPES,
  safeDecodePath,
  isPathInsideRoot,
  isBlockedServerFile,
  applyCorsHeaders,
  handleOptionsRequest,
  verifyLocalJsonPost,
  serveStaticFile
} = require('../shared/static-server');

const PRIMARY_PORT = Number(process.env.PORT) || 6050;
const LISTEN_PORTS = Array.from(new Set([PRIMARY_PORT, 6080]));
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
  },
  '05': {
    id: '05',
    slug: '05-lumen-muse',
    name: 'LUMEN MUSE · 潜影缪斯',
    creator: 'Decon-Web Optics R&D',
    originUrl: 'http://127.0.0.1:6064/',
    port: 6064,
    url: 'http://127.0.0.1:6064/',
    labUrl: 'http://127.0.0.1:6064/lab',
    dir: path.join(repoRoot, 'sites', '05-lumen-muse'),
    script: path.join(repoRoot, 'sites', '05-lumen-muse', 'server.js')
  }
};

const MUSE_PORTRAIT_WHITELIST = Object.freeze({
  ccd: {
    file: path.join(repoRoot, 'sites', '01-truejpeg', 'images', '038.jpg'),
    subPath: '/images/038.jpg'
  },
  anime: {
    file: path.join(repoRoot, 'sites', '01-truejpeg', 'images', '197.webp'),
    subPath: '/images/197.webp'
  }
});

const spawnedChildren = new Set();

function cleanupChildren() {
  for (const child of spawnedChildren) {
    try {
      if (child && !child.killed) {
        child.kill();
      }
    } catch (_) {}
  }
  spawnedChildren.clear();
}

process.on('exit', cleanupChildren);
process.on('SIGINT', () => {
  cleanupChildren();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanupChildren();
  process.exit(0);
});

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
 * Spawns a background process for a specimen server if not already online
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
    spawnedChildren.add(child);
    child.on('exit', () => {
      spawnedChildren.delete(child);
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

function sendJson(req, res, statusCode, payload) {
  const body = JSON.stringify(payload);
  const headers = applyCorsHeaders(req, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  res.writeHead(statusCode, headers);
  res.end(body);
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptionsRequest(req, res, 'GET, POST, OPTIONS');
    return;
  }

  const cleanPath = safeDecodePath(req.url || '/');
  if (!cleanPath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }

  // 1. GET /api/status
  if (req.method === 'GET' && cleanPath === '/api/status') {
    try {
      const status = await probeAllSpecimens();
      sendJson(req, res, 200, status);
    } catch (err) {
      sendJson(req, res, 500, { ok: false, error: err.message });
    }
    return;
  }

  // 1b. GET /api/muse-portrait?id=ccd|anime (whitelisted local portrait bridge for #05 & SB-17)
  if ((req.method === 'GET' || req.method === 'HEAD') && cleanPath === '/api/muse-portrait') {
    const rawUrlStr = String(req.url || '');
    const qIndex = rawUrlStr.indexOf('?');
    const params = new URLSearchParams(qIndex >= 0 ? rawUrlStr.slice(qIndex + 1) : '');
    const id = (params.get('id') || '').trim();
    if (!Object.prototype.hasOwnProperty.call(MUSE_PORTRAIT_WHITELIST, id)) {
      sendJson(req, res, 400, {
        ok: false,
        error: 'Invalid portrait id. Allowed: ccd, anime'
      });
      return;
    }
    const entry = MUSE_PORTRAIT_WHITELIST[id];
    if (!isPathInsideRoot(entry.file, repoRoot)) {
      sendJson(req, res, 403, { ok: false, error: 'Forbidden' });
      return;
    }
    if (fs.existsSync(entry.file)) {
      serveStaticFile(req, res, entry.file, { mimeTypes: DEFAULT_MIME_TYPES });
      return;
    }
    proxyMissingSpecimenMedia(req, res, '01', 6060, entry.subPath);
    return;
  }

  // 2. POST /api/wake
  if (req.method === 'POST' && cleanPath === '/api/wake') {
    if (!verifyLocalJsonPost(req, res)) {
      return;
    }
    let bodyStr = '';
    req.on('data', (chunk) => {
      bodyStr += chunk;
      if (bodyStr.length > 16384) req.destroy();
    });
    req.on('end', async () => {
      try {
        const parsed = bodyStr ? JSON.parse(bodyStr) : { id: 'all' };
        const result = await wakeSpecimens(parsed.id || 'all');
        sendJson(req, res, 200, result);
      } catch (err) {
        sendJson(req, res, 400, { ok: false, error: err.message });
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

  if (cleanPath.split('/').includes('..') || cleanPath.includes('\\')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  // 4. Route /shared-ui/* -> ../shared-ui/* and /sites/* -> ../sites/*
  let filePath = null;
  let siteRel = null;
  if (cleanPath.startsWith('/shared-ui/')) {
    const rel = cleanPath.slice('/shared-ui/'.length);
    const candidate = path.resolve(sharedRoot, rel);
    if (!isPathInsideRoot(candidate, sharedRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
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
    if (!isPathInsideRoot(candidate, sitesRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    filePath = candidate;
    siteRel = rel;
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
    const candidate = path.resolve(portalRoot, relPath.replace(/^\/+/, ''));
    if (!isPathInsideRoot(candidate, portalRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
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

  if (isBlockedServerFile(filePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  // Transparent loopback fallback to specimen servers (:6060 / :6062) when gitignored media is not cached yet
  if (siteRel) {
    let hasLocal = false;
    try {
      const st = fs.statSync(filePath);
      hasLocal = st.isFile() && st.size > 0;
    } catch (_) {
      hasLocal = false;
    }
    if (!hasLocal) {
      if (/^01-truejpeg\/(images|prompts)\//.test(siteRel)) {
        proxyMissingSpecimenMedia(req, res, '01', 6060, siteRel.slice('01-truejpeg'.length));
        return;
      }
      if (/^03-sambecker-photos\/photos\//.test(siteRel)) {
        proxyMissingSpecimenMedia(req, res, '03', 6062, siteRel.slice('03-sambecker-photos'.length));
        return;
      }
    }
  }

  serveStaticFile(req, res, filePath, { mimeTypes: DEFAULT_MIME_TYPES });
}

function forwardToLocalPort(req, res, port, subPath) {
  return new Promise((resolve, reject) => {
    const fwdHeaders = {};
    if (req.headers.accept) fwdHeaders.Accept = req.headers.accept;
    if (req.headers.range) fwdHeaders.Range = req.headers.range;
    if (req.headers['if-none-match']) fwdHeaders['If-None-Match'] = req.headers['if-none-match'];

    const upReq = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: encodeURI(subPath),
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: fwdHeaders,
        timeout: 18000
      },
      (upRes) => {
        const outHeaders = {};
        const copyKeys = [
          'content-type',
          'content-length',
          'cache-control',
          'etag',
          'accept-ranges',
          'content-range'
        ];
        for (const k of copyKeys) {
          if (upRes.headers[k] !== undefined) {
            outHeaders[k] = upRes.headers[k];
          }
        }
        res.writeHead(upRes.statusCode || 502, applyCorsHeaders(req, outHeaders));
        if (req.method === 'HEAD') {
          upRes.resume();
          res.end();
          resolve();
          return;
        }
        upRes.on('error', () => {
          res.destroy();
          resolve();
        });
        upRes.pipe(res);
        res.on('finish', resolve);
      }
    );

    upReq.on('timeout', () => {
      upReq.destroy(new Error('Specimen media proxy timeout'));
    });
    upReq.on('error', reject);
    upReq.end();
  });
}

async function proxyMissingSpecimenMedia(req, res, specId, port, subPath) {
  try {
    await forwardToLocalPort(req, res, port, subPath);
  } catch (_) {
    if (process.env.DECON_NO_AUTOWAKE !== '1') {
      try {
        await wakeSpecimens(specId);
        await forwardToLocalPort(req, res, port, subPath);
        return;
      } catch (_retryErr) {}
    }
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Upstream media unavailable');
    }
  }
}

let autoWakeTriggered = false;

LISTEN_PORTS.forEach((port) => {
  const srv = http.createServer(handleRequest);
  srv.on('error', (err) => {
    console.warn(`[DECON-WEB PORTAL] Port ${port} bind warning: ${err.message}`);
  });
  srv.listen(port, '127.0.0.1', () => {
    console.log(`[DECON-WEB PORTAL] Master Exhibition Museum listening at http://127.0.0.1:${port}/`);
    if (!autoWakeTriggered && process.env.DECON_NO_AUTOWAKE !== '1') {
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
