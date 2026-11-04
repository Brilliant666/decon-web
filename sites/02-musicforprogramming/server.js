/**
 * Specimen #02: musicForProgramming(); — Local 1:1 Mirror & Hybrid Audio/RSS Proxy Server
 * Default: http://127.0.0.1:6061/
 * Supports:
 *   - Static assets in sites/02-musicforprogramming/
 *   - Cross-directory /shared-ui/ routing -> ../../shared-ui/
 *   - /api/rss proxy -> https://musicforprogramming.net/rss.xml (with local fallback)
 *   - /api/audio?url=... CORS + HTTP Range streaming proxy for datashat.net MP3s
 *   - Clean SPA routes (/latest, /about, /credits, /one .. /seventynine)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const sharedRoot = path.resolve(root, '../../shared-ui');
const PORT = process.env.PORT || 6061;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon'
};

function proxyRss(req, res) {
  const localRss = path.join(root, 'rss.xml');
  https.get('https://musicforprogramming.net/rss.xml', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (upRes) => {
    if (upRes.statusCode !== 200) {
      upRes.resume();
      if (fs.existsSync(localRss)) {
        res.writeHead(200, {
          'Content-Type': 'application/xml; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(localRss).pipe(res);
      } else {
        res.writeHead(upRes.statusCode || 502);
        res.end('Upstream RSS error');
      }
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=1800'
    });
    const chunks = [];
    upRes.on('data', (c) => chunks.push(c));
    upRes.on('end', () => {
      const buf = Buffer.concat(chunks);
      try { fs.writeFileSync(localRss, buf); } catch (_) {}
    });
    upRes.pipe(res);
  }).on('error', () => {
    if (fs.existsSync(localRss)) {
      res.writeHead(200, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(localRss).pipe(res);
    } else {
      res.writeHead(502);
      res.end('Offline and no cached rss.xml');
    }
  });
}

function proxyAudio(req, res, targetUrl, redirectsLeft = 4) {
  if (redirectsLeft <= 0) {
    res.writeHead(502);
    res.end('Too many redirects');
    return;
  }
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (_) {
    res.writeHead(400);
    res.end('Invalid audio URL');
    return;
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    res.writeHead(400);
    res.end('Unsupported protocol');
    return;
  }
  // Security whitelist: only allow official MFP audio hosts
  const allowedHosts = ['datashat.net', 'www.datashat.net', 'musicforprogramming.net', 'www.musicforprogramming.net'];
  if (!allowedHosts.includes(parsed.hostname)) {
    res.writeHead(403);
    res.end('Host not allowed by audio proxy');
    return;
  }

  const client = parsed.protocol === 'https:' ? https : http;
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  if (req.headers.range) headers.Range = req.headers.range;

  const upReq = client.request(parsed, { method: req.method === 'HEAD' ? 'HEAD' : 'GET', headers }, (upRes) => {
    if ([301, 302, 303, 307, 308].includes(upRes.statusCode) && upRes.headers.location) {
      upRes.resume();
      const nextUrl = new URL(upRes.headers.location, parsed).href;
      proxyAudio(req, res, nextUrl, redirectsLeft - 1);
      return;
    }

    const outHeaders = {
      'Content-Type': upRes.headers['content-type'] || 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Accept-Ranges': upRes.headers['accept-ranges'] || 'bytes'
    };
    if (upRes.headers['content-length']) outHeaders['Content-Length'] = upRes.headers['content-length'];
    if (upRes.headers['content-range']) outHeaders['Content-Range'] = upRes.headers['content-range'];

    res.writeHead(upRes.statusCode || 200, outHeaders);
    if (req.method === 'HEAD') {
      upRes.resume();
      res.end();
    } else {
      upRes.pipe(res);
    }
  });

  upReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
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
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type'
    });
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let u = decodeURIComponent(reqUrl.pathname);

  if (u === '/api/rss' || u === '/rss.xml' || u === '/rss.php') {
    proxyRss(req, res);
    return;
  }

  if (u === '/api/audio') {
    const target = reqUrl.searchParams.get('url');
    if (!target) {
      res.writeHead(400);
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
    fp = path.join(sharedRoot, u.slice('/shared-ui/'.length));
    if (!path.resolve(fp).startsWith(sharedRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
  } else {
    fp = path.join(root, u);
    if (!path.resolve(fp).startsWith(path.resolve(root))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
  }

  // If clean episode slug route like /seventynine or /one, serve index.html
  if (!fs.existsSync(fp) && !path.extname(u)) {
    fp = path.join(root, 'index.html');
  }

  const ext = path.extname(fp).toLowerCase();
  const contentType = mime[ext] || 'application/octet-stream';
  const isCode = ['.html', '.js', '.mjs', '.css', '.json'].includes(ext);
  const cacheHeader = isCode ? 'no-store, no-cache, must-revalidate' : 'public, max-age=3600';

  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheHeader,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(fp).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`musicForProgramming(); 1:1 Mirror Server running at http://127.0.0.1:${PORT}/`);
});
