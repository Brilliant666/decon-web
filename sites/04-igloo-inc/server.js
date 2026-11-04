/**
 * Specimen #04: Igloo Inc (igloo.inc by Lusion) — Local 1:1 WebGL2 3D Mirror & Cryo-Telemetry Server
 * Default: http://127.0.0.1:6063/
 *
 * Features:
 *   - Static assets in sites/04-igloo-inc/
 *   - Cross-directory /shared-ui/* routing -> ../../shared-ui/
 *   - /lab and /lab.html routing -> sites/04-igloo-inc/lab.html
 *   - /assets/* static hosting + transparent upstream proxy & local disk cache from https://www.igloo.inc/assets/*
 *     (automatically patches index-2e130bc1.js hardcoded "https://www.igloo.inc/" -> "/")
 *   - Clean SPA routes (/, /portfolio/*) -> sites/04-igloo-inc/index.html
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const sharedRoot = path.resolve(root, '../../shared-ui');
const assetsRoot = path.join(root, 'assets');
const PORT = Number(process.env.PORT) || 6063;
const UPSTREAM_ORIGIN = 'https://www.igloo.inc';

fs.mkdirSync(assetsRoot, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.ktx2': 'image/ktx2',
  '.drc': 'application/octet-stream',
  '.exr': 'application/octet-stream',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

const inFlightProxy = new Map();

const ASSET_ALIAS_MAP = {
  'assets/geometries/cubes/pudgy.drc': 'assets/geometries/pudgy.drc',
  'assets/geometries/cubes/overpass_logo.drc': 'assets/geometries/overpass_logo.drc',
  'assets/images/igloo/mountain_env.exr': 'assets/images/cubes_env.exr',
  'assets/images/smoke_datatexture.ktx2': 'assets/images/perlin-datatexture.ktx2'
};

function fetchUpstreamBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Igloo-Local-Proxy/1.0)',
            Accept: '*/*'
          }
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return fetchUpstreamBuffer(new URL(res.headers.location, url).toString()).then(resolve, reject);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`Upstream HTTP ${res.statusCode} for ${url}`));
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        }
      )
      .on('error', reject);
  });
}

function proxyUpstreamAsset(relAssetPath, destPath) {
  const key = relAssetPath.replace(/^\/+/, '');
  if (inFlightProxy.has(key)) {
    return inFlightProxy.get(key);
  }

  const upstreamKey = ASSET_ALIAS_MAP[key] || key;
  const upstreamUrl = `${UPSTREAM_ORIGIN}/${upstreamKey}`;
  const p = fetchUpstreamBuffer(upstreamUrl)
    .then((rawBuf) => {
      let buf = rawBuf;
      if (key.endsWith('index-2e130bc1.js')) {
        const patched = rawBuf.toString('utf8').replace(/https:\/\/www\.igloo\.inc\//g, '/');
        buf = Buffer.from(patched, 'utf8');
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, buf);
      inFlightProxy.delete(key);
      return buf;
    })
    .catch((err) => {
      inFlightProxy.delete(key);
      throw err;
    });

  inFlightProxy.set(key, p);
  return p;
}

function serveBufferOrFile(req, res, filePath, contentType, cacheControl) {
  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range && filePath.endsWith('.ogg')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10) || 0;
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': cacheControl,
    'Access-Control-Allow-Origin': '*'
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range'
    });
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let u = decodeURIComponent(reqUrl.pathname);

  // 1. Transparent /assets/* local disk cache & upstream HTTPS fallback proxy
  if (u.startsWith('/assets/')) {
    const relAsset = u.slice(1); // "assets/..."
    const localAssetPath = path.join(root, relAsset);
    if (!path.resolve(localAssetPath).startsWith(path.resolve(assetsRoot))) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(localAssetPath).toLowerCase();
    const contentType = mime[ext] || 'application/octet-stream';
    const cacheHeader = 'public, max-age=86400';

    if (fs.existsSync(localAssetPath) && fs.statSync(localAssetPath).isFile()) {
      // Ensure index-2e130bc1.js is always patched
      if (relAsset.endsWith('index-2e130bc1.js')) {
        const code = fs.readFileSync(localAssetPath, 'utf8');
        if (code.includes('https://www.igloo.inc/')) {
          const patched = code.replace(/https:\/\/www\.igloo\.inc\//g, '/');
          fs.writeFileSync(localAssetPath, patched, 'utf8');
        }
      }
      serveBufferOrFile(req, res, localAssetPath, contentType, cacheHeader);
      return;
    }

    try {
      const buf = await proxyUpstreamAsset(relAsset, localAssetPath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': buf.length,
        'Accept-Ranges': 'bytes',
        'Cache-Control': cacheHeader,
        'Access-Control-Allow-Origin': '*'
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(buf);
      }
      return;
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Upstream asset proxy error (${relAsset}): ${err.message}`);
      return;
    }
  }

  // 2. Clean SPA & Lab routes
  if (u === '/' || u.startsWith('/portfolio/')) {
    u = '/index.html';
  } else if (u === '/lab') {
    u = '/lab.html';
  } else if (u === '/favicon.ico') {
    u = '/assets/favicon32-af94112f.png';
    const favPath = path.join(root, u.slice(1));
    if (fs.existsSync(favPath)) {
      serveBufferOrFile(req, res, favPath, 'image/png', 'public, max-age=86400');
      return;
    }
  }

  // 3. Resolve /shared-ui/* or site-local files
  let fp;
  if (u.startsWith('/shared-ui/')) {
    fp = path.join(sharedRoot, u.slice('/shared-ui/'.length));
    if (!path.resolve(fp).startsWith(sharedRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
  } else {
    fp = path.join(root, u);
    if (!path.resolve(fp).startsWith(path.resolve(root))) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
  }

  if (!fs.existsSync(fp) && !path.extname(u)) {
    fp = path.join(root, 'index.html');
  }

  const ext = path.extname(fp).toLowerCase();
  const contentType = mime[ext] || 'application/octet-stream';
  const isCode = ['.html', '.js', '.mjs', '.css', '.json'].includes(ext);
  const cacheHeader = isCode ? 'no-store, no-cache, must-revalidate' : 'public, max-age=3600';

  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    serveBufferOrFile(req, res, fp, contentType, cacheHeader);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Igloo Inc (Specimen #04) 1:1 WebGL2 3D Mirror & Cryo-Telemetry Server running at http://127.0.0.1:${PORT}/`);
});
