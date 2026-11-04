const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const PORT = process.env.PORT || 6060;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  // Mock beacon /api/e so console has zero errors
  if (req.url.startsWith('/api/')) {
    res.writeHead(204);
    res.end();
    return;
  }

  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  if (u === '/legal') u = '/legal.html';

  const sharedRoot = path.resolve(root, '../../shared-ui');
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
    // Security check to stay inside root
    if (!path.resolve(fp).startsWith(path.resolve(root))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
  }

  const ext = path.extname(fp).toLowerCase();
  const contentType = mime[ext] || 'application/octet-stream';
  const isCode = ['.html', '.js', '.css', '.json'].includes(ext);
  const cacheHeader = isCode ? 'no-store, no-cache, must-revalidate' : 'public, max-age=3600';

  if (fs.existsSync(fp) && fs.statSync(fp).isFile() && fs.statSync(fp).size > 0) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheHeader
    });
    fs.createReadStream(fp).pipe(res);
    return;
  }

  // On-demand fallback fetch & cache from truejpeg.com (only for /images/ or /prompts/)
  if (!u.startsWith('/images/') && !u.startsWith('/prompts/')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  https.get(`https://truejpeg.com${u}`, (upRes) => {
    if (upRes.statusCode !== 200) {
      upRes.resume();
      res.writeHead(upRes.statusCode || 404);
      res.end('Not found');
      return;
    }
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheHeader
    });
    const file = fs.createWriteStream(fp);
    upRes.pipe(file);
    upRes.pipe(res);
  }).on('error', () => {
    res.writeHead(502);
    res.end('Upstream error');
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`1:1 Mirror Server running at http://127.0.0.1:${PORT}/`);
});
