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
const fs = require('fs');
const path = require('path');
const {
  DEFAULT_MIME_TYPES,
  safeDecodePath,
  isPathInsideRoot,
  applyCorsHeaders,
  handleOptionsRequest,
  serveStaticFile,
  writeFileAtomicSync,
  fetchUpstreamBuffer
} = require('../../shared/static-server');

const root = __dirname;
const sharedRoot = path.resolve(root, '../../shared-ui');
const assetsRoot = path.join(root, 'assets');
const PORT = Number(process.env.PORT) || 6063;
const UPSTREAM_ORIGIN = 'https://www.igloo.inc';

fs.mkdirSync(assetsRoot, { recursive: true });

const inFlightProxy = new Map();

const ASSET_ALIAS_MAP = {
  'assets/geometries/cubes/pudgy.drc': 'assets/geometries/pudgy.drc',
  'assets/geometries/cubes/overpass_logo.drc': 'assets/geometries/overpass_logo.drc',
  'assets/images/igloo/mountain_env.exr': 'assets/images/cubes_env.exr',
  'assets/images/smoke_datatexture.ktx2': 'assets/images/perlin-datatexture.ktx2'
};

function proxyUpstreamAsset(relAssetPath, destPath) {
  const key = relAssetPath.replace(/^\/+/, '');
  if (inFlightProxy.has(key)) {
    return inFlightProxy.get(key);
  }

  const upstreamKey = ASSET_ALIAS_MAP[key] || key;
  const upstreamUrl = `${UPSTREAM_ORIGIN}/${upstreamKey}`;
  const p = fetchUpstreamBuffer(upstreamUrl, {
    timeoutMs: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Igloo-Local-Proxy/1.0)',
      Accept: '*/*'
    }
  })
    .then((rawBuf) => {
      let buf = rawBuf;
      if (key.endsWith('index-2e130bc1.js')) {
        const patched = rawBuf.toString('utf8').replace(/https:\/\/www\.igloo\.inc\//g, '/');
        buf = Buffer.from(patched, 'utf8');
      }
      writeFileAtomicSync(destPath, buf);
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

let indexBundlePatched = false;

function serveBufferOrFile(req, res, filePath, contentType, cacheControl) {
  serveStaticFile(req, res, filePath, {
    contentType,
    cacheControl,
    mimeTypes: DEFAULT_MIME_TYPES
  });
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    handleOptionsRequest(req, res, 'GET, HEAD, OPTIONS');
    return;
  }

  let u = safeDecodePath(req.url || '/');
  if (!u) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }

  if (u.split('/').includes('..') || u.includes('\\')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  // 1. Transparent /assets/* local disk cache & upstream HTTPS fallback proxy
  if (u.startsWith('/assets/')) {
    const relAsset = u.slice(1); // "assets/..."
    const localAssetPath = path.resolve(root, relAsset);
    if (!isPathInsideRoot(localAssetPath, assetsRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(localAssetPath).toLowerCase();
    const contentType = DEFAULT_MIME_TYPES[ext] || 'application/octet-stream';
    const isCodeOrMarkup =
      ext === '.html' || ext === '.js' || ext === '.mjs' || ext === '.css' || ext === '.json';
    const cacheHeader = isCodeOrMarkup
      ? 'public, max-age=0, must-revalidate'
      : 'public, max-age=86400';

    if (fs.existsSync(localAssetPath) && fs.statSync(localAssetPath).isFile()) {
      // Ensure index-2e130bc1.js is checked/patched only once per server process
      if (!indexBundlePatched && relAsset.endsWith('index-2e130bc1.js')) {
        const code = fs.readFileSync(localAssetPath, 'utf8');
        if (code.includes('https://www.igloo.inc/')) {
          const patched = code.replace(/https:\/\/www\.igloo\.inc\//g, '/');
          writeFileAtomicSync(localAssetPath, patched, 'utf8');
        }
        indexBundlePatched = true;
      }
      serveBufferOrFile(req, res, localAssetPath, contentType, cacheHeader);
      return;
    }

    try {
      await proxyUpstreamAsset(relAsset, localAssetPath);
      serveBufferOrFile(req, res, localAssetPath, contentType, cacheHeader);
      return;
    } catch (err) {
      res.writeHead(502, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
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
    fp = path.resolve(sharedRoot, u.slice('/shared-ui/'.length));
    if (!isPathInsideRoot(fp, sharedRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
  } else {
    fp = path.resolve(root, u.replace(/^\/+/, ''));
    if (!isPathInsideRoot(fp, root)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
  }

  const baseName = path.basename(fp);
  if (baseName === 'server.js' || baseName === 'sync_images.js') {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(fp) && !path.extname(u)) {
    fp = path.join(root, 'index.html');
  }

  const ext = path.extname(fp).toLowerCase();
  const contentType = DEFAULT_MIME_TYPES[ext] || 'application/octet-stream';
  const isCode = ['.html', '.js', '.mjs', '.css', '.json'].includes(ext);
  const cacheHeader = isCode ? 'public, max-age=0, must-revalidate' : 'public, max-age=86400';

  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    serveBufferOrFile(req, res, fp, contentType, cacheHeader);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Igloo Inc (Specimen #04) 1:1 WebGL2 3D Mirror & Cryo-Telemetry Server running at http://127.0.0.1:${PORT}/`);
});
