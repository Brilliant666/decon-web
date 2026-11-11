/**
 * Specimen #02: musicForProgramming(); — Local 1:1 Mirror & Hybrid Audio/RSS Proxy Server
 * Default: http://127.0.0.1:6061/
 * Supports:
 *   - Static assets in sites/02-musicforprogramming/
 *   - Cross-directory /shared-ui/ routing -> ../../shared-ui/
 *   - /api/rss proxy -> https://musicforprogramming.net/rss.xml (with local fallback & atomic cache)
 *   - /api/audio?url=... CORS + HTTP Range streaming proxy for datashat.net MP3s
 *   - Clean SPA routes (/latest, /about, /credits, /one .. /seventynine)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const {
  DEFAULT_MIME_TYPES,
  safeDecodePath,
  isPathInsideRoot,
  isBlockedServerFile,
  applyCorsHeaders,
  handleOptionsRequest,
  serveStaticFile,
  writeFileAtomicSync,
  fetchUpstreamBuffer
} = require('../../shared/static-server');

const root = __dirname;
const sharedRoot = path.resolve(root, '../../shared-ui');
const PORT = Number(process.env.PORT) || 6061;

async function proxyRss(req, res) {
  const localRss = path.join(root, 'rss.xml');
  try {
    const buf = await fetchUpstreamBuffer('https://musicforprogramming.net/rss.xml', {
      timeoutMs: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    try {
      writeFileAtomicSync(localRss, buf);
    } catch (_) {}
    res.writeHead(
      200,
      applyCorsHeaders(req, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Length': buf.length,
        'Cache-Control': 'public, max-age=1800'
      })
    );
    res.end(buf);
  } catch (_) {
    if (fs.existsSync(localRss) && fs.statSync(localRss).isFile()) {
      serveStaticFile(req, res, localRss, {
        contentType: 'application/xml; charset=utf-8',
        cacheControl: 'public, max-age=300'
      });
    } else {
      res.writeHead(502, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
      res.end('Offline and no cached rss.xml');
    }
  }
}

function proxyAudio(req, res, targetUrl, redirectsLeft = 4) {
  if (redirectsLeft <= 0) {
    res.writeHead(502, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
    res.end('Too many redirects');
    return;
  }
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (_) {
    res.writeHead(400, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
    res.end('Invalid audio URL');
    return;
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    res.writeHead(400, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
    res.end('Unsupported protocol');
    return;
  }
  // Security whitelist: only allow official MFP audio hosts
  const allowedHosts = ['datashat.net', 'www.datashat.net', 'musicforprogramming.net', 'www.musicforprogramming.net'];
  if (!allowedHosts.includes(parsed.hostname)) {
    res.writeHead(403, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
    res.end('Host not allowed by audio proxy');
    return;
  }

  const client = parsed.protocol === 'https:' ? https : http;
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  if (req.headers.range) headers.Range = req.headers.range;

  const upReq = client.request(
    parsed,
    {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      timeout: 15000,
      headers
    },
    (upRes) => {
      if ([301, 302, 303, 307, 308].includes(upRes.statusCode) && upRes.headers.location) {
        upRes.resume();
        const nextUrl = new URL(upRes.headers.location, parsed).href;
        proxyAudio(req, res, nextUrl, redirectsLeft - 1);
        return;
      }

      const outHeaders = applyCorsHeaders(req, {
        'Content-Type': upRes.headers['content-type'] || 'audio/mpeg',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
        'Accept-Ranges': upRes.headers['accept-ranges'] || 'bytes'
      });
      if (upRes.headers['content-length']) outHeaders['Content-Length'] = upRes.headers['content-length'];
      if (upRes.headers['content-range']) outHeaders['Content-Range'] = upRes.headers['content-range'];

      res.writeHead(upRes.statusCode || 200, outHeaders);
      if (req.method === 'HEAD') {
        upRes.resume();
        res.end();
      } else {
        upRes.pipe(res);
      }
    }
  );

  upReq.on('timeout', () => {
    upReq.destroy(new Error('Upstream audio timeout'));
  });

  upReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
      res.end('Upstream audio stream unreachable');
    }
  });

  req.on('close', () => {
    upReq.destroy();
  });

  upReq.end();
}

http.createServer((req, res) => {
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

  if (u === '/api/rss' || u === '/rss.xml' || u === '/rss.php') {
    proxyRss(req, res);
    return;
  }

  if (u === '/api/audio') {
    let target = null;
    try {
      const reqUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
      target = reqUrl.searchParams.get('url');
    } catch (_) {}
    if (!target) {
      res.writeHead(400, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
      res.end('Missing ?url= parameter');
      return;
    }
    proxyAudio(req, res, target);
    return;
  }

  if (u === '/' || u === '/latest' || u === '/about' || u === '/credits') {
    u = '/index.html';
  } else if (u === '/lab') {
    u = '/lab.html';
  }

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

  if (isBlockedServerFile(fp)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  // If clean episode slug route like /seventynine or /one, serve index.html
  if (!fs.existsSync(fp) && !path.extname(u)) {
    fp = path.join(root, 'index.html');
  }

  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    serveStaticFile(req, res, fp, { mimeTypes: DEFAULT_MIME_TYPES });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`musicForProgramming(); 1:1 Mirror Server running at http://127.0.0.1:${PORT}/`);
});
