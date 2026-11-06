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
const PORT = Number(process.env.PORT) || 6060;
const inFlightProxy = new Map();

function proxyTrueJpegAsset(u, fp) {
  if (inFlightProxy.has(u)) {
    return inFlightProxy.get(u);
  }
  const p = fetchUpstreamBuffer(`https://truejpeg.com${u}`, { timeoutMs: 15000 })
    .then((buf) => {
      writeFileAtomicSync(fp, buf);
      inFlightProxy.delete(u);
      return buf;
    })
    .catch((err) => {
      inFlightProxy.delete(u);
      throw err;
    });

  inFlightProxy.set(u, p);
  return p;
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

  // Mock beacon /api/e so console has zero errors
  if (u.startsWith('/api/')) {
    res.writeHead(204, applyCorsHeaders(req));
    res.end();
    return;
  }

  if (u.split('/').includes('..') || u.includes('\\')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (u === '/') u = '/index.html';
  if (u === '/legal') u = '/legal.html';
  if (u === '/lab') u = '/lab.html';

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

  const ext = path.extname(fp).toLowerCase();
  const contentType = DEFAULT_MIME_TYPES[ext] || 'application/octet-stream';
  const isCode = ['.html', '.js', '.mjs', '.css', '.json'].includes(ext);
  const cacheHeader = isCode ? 'public, max-age=0, must-revalidate' : 'public, max-age=3600';

  if (fs.existsSync(fp) && fs.statSync(fp).isFile() && fs.statSync(fp).size > 0) {
    serveStaticFile(req, res, fp, { contentType, cacheControl: cacheHeader });
    return;
  }

  // On-demand fallback fetch & atomic cache from truejpeg.com (only for /images/ or /prompts/)
  if (!u.startsWith('/images/') && !u.startsWith('/prompts/')) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  try {
    const buf = await proxyTrueJpegAsset(u, fp);
    res.writeHead(
      200,
      applyCorsHeaders(req, {
        'Content-Type': contentType,
        'Content-Length': buf.length,
        'Cache-Control': cacheHeader
      })
    );
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(buf);
    }
  } catch (_) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Upstream error');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`1:1 Mirror Server running at http://127.0.0.1:${PORT}/`);
});
