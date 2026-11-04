/**
 * Specimen #03: Sam Becker Photos (photos.sambecker.com) — Local 1:1 Mirror & Photo Vault Server
 * Default: http://127.0.0.1:6062/
 *
 * Features:
 *   - Static assets in sites/03-sambecker-photos/
 *   - Cross-directory /shared-ui/* routing -> ../../shared-ui/
 *   - /photos/* static hosting + transparent upstream proxy & local disk cache from photos.sambecker.com
 *   - GET  /api/user-photos -> returns persisted user-ingested photographs
 *   - POST /api/ingest      -> saves dragged/uploaded local .jpg/.jpeg/.png/.webp into photos/user/ & updates manifest
 *   - Clean SPA routes (/, /grid, /library, /p/:slug, /shot-on/*, /lens/*, /recipe/*, /film/*, /focal/*, /tag/*)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const sharedRoot = path.resolve(root, '../../shared-ui');
const photosRoot = path.join(root, 'photos');
const userPhotosDir = path.join(photosRoot, 'user');
const userManifestPath = path.join(userPhotosDir, 'manifest.json');
const PORT = Number(process.env.PORT) || 6062;

fs.mkdirSync(photosRoot, { recursive: true });
fs.mkdirSync(userPhotosDir, { recursive: true });

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
  '.ico': 'image/x-icon'
};

const inFlightProxy = new Map();

function proxyUpstreamPhoto(filename, destPath) {
  if (inFlightProxy.has(filename)) {
    return inFlightProxy.get(filename);
  }
  const blobUrl = `https://wpz47wrhgzc7qaub.public.blob.vercel-storage.com/${filename}`;
  const nextImgUrl = `https://photos.sambecker.com/_next/image?url=${encodeURIComponent(blobUrl)}&w=1200&q=85`;

  const fetchBuf = (url) =>
    new Promise((resolve, reject) => {
      https
        .get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (SamBecker-Local-Proxy/1.0)' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetchBuf(new URL(res.headers.location, url).toString()).then(resolve, reject);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`Upstream HTTP ${res.statusCode}`));
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        })
        .on('error', reject);
    });

  const p = fetchBuf(nextImgUrl)
    .catch(() => fetchBuf(blobUrl))
    .then((buf) => {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, buf);
      inFlightProxy.delete(filename);
      return buf;
    })
    .catch((err) => {
      inFlightProxy.delete(filename);
      throw err;
    });

  inFlightProxy.set(filename, p);
  return p;
}

function readUserManifest() {
  try {
    if (fs.existsSync(userManifestPath)) {
      const data = JSON.parse(fs.readFileSync(userManifestPath, 'utf8'));
      return Array.isArray(data) ? data : data.items || [];
    }
  } catch (_) {}
  return [];
}

function writeUserManifest(items) {
  fs.mkdirSync(userPhotosDir, { recursive: true });
  fs.writeFileSync(userManifestPath, JSON.stringify(items, null, 2), 'utf8');
}

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(obj));
}

function handleIngest(req, res) {
  const chunks = [];
  let totalBytes = 0;
  const MAX_BYTES = 35 * 1024 * 1024;

  req.on('data', (chunk) => {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BYTES) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    try {
      const bodyStr = Buffer.concat(chunks).toString('utf8');
      const payload = JSON.parse(bodyStr);

      const rawName = String(payload.filename || 'frame.jpg').replace(/[^a-zA-Z0-9._-]/g, '-');
      const extMatch = rawName.match(/\.(jpe?g|png|webp)$/i);
      const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
      const baseSlug = rawName.replace(/\.(jpe?g|png|webp)$/i, '').toLowerCase() || 'ingested-frame';
      const stamp = Date.now();
      const savedFilename = `${stamp}-${baseSlug}${ext}`;
      const savedPath = path.join(userPhotosDir, savedFilename);

      if (payload.dataUrl && typeof payload.dataUrl === 'string') {
        const commaIdx = payload.dataUrl.indexOf(',');
        const b64 = commaIdx >= 0 ? payload.dataUrl.slice(commaIdx + 1) : payload.dataUrl;
        fs.writeFileSync(savedPath, Buffer.from(b64, 'base64'));
      } else if (payload.base64 && typeof payload.base64 === 'string') {
        fs.writeFileSync(savedPath, Buffer.from(payload.base64, 'base64'));
      }

      const items = readUserManifest();
      const exif = payload.exif || {};
      const make = (exif.make || payload.make || 'FUJIFILM').toUpperCase();
      const model = exif.model || payload.model || 'X-T5';
      const lensModel = exif.lens || payload.lensModel || payload.lens || 'XF35mmF1.4 R';
      const focalStr = exif.focalLength || payload.focalLengthFormatted || '35mm';
      const focal35Str = exif.focalLength35mm || payload.focalLengthIn35MmFormatFormatted || '53mm';
      const fNumberFormatted = (exif.aperture || payload.fNumberFormatted || 'ƒ/2.0').replace(/^f\//i, 'ƒ/');
      const exposureTimeFormatted = exif.shutterSpeed || payload.exposureTimeFormatted || '1/500s';
      const isoFormatted = String(exif.iso || payload.isoFormatted || 'ISO400').replace(/\s+/g, '');

      const newPhoto = {
        id: `user-${stamp.toString(36)}`,
        slug: `user-${stamp.toString(36)}`,
        index: 37 + items.length,
        title: payload.title || baseSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        caption: payload.caption || 'Local user photograph ingested via binary EXIF parser',
        semanticDescription: payload.caption || 'User ingested frame',
        url: `/photos/user/${savedFilename}`,
        remoteUrl: `/photos/user/${savedFilename}`,
        blurData: payload.blurData || '',
        aspectRatio: Number(payload.aspectRatio) || 1.5,
        width: Number(payload.width) || 1200,
        height: Number(payload.height) || 800,
        metaSide: items.length % 2 === 0 ? 'right' : 'left',
        make,
        model,
        cameraId: `${make.toLowerCase()}-${model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        cameraMakeModel: `${make} ${model}`,
        lensMake: make,
        lensModel,
        lensSlug: lensModel.toLowerCase().replace(/[^a-z0-9.]+/g, '-'),
        focalLength: parseFloat(focalStr) || 35,
        focalLengthIn35MmFormat: parseFloat(focal35Str) || 53,
        focalLengthFormatted: focalStr,
        focalLengthIn35MmFormatFormatted: focal35Str,
        fNumber: parseFloat(fNumberFormatted.replace(/[^0-9.]/g, '')) || 2.0,
        fNumberFormatted,
        exposureTimeFormatted,
        iso: parseInt(isoFormatted.replace(/[^0-9]/g, ''), 10) || 400,
        isoFormatted,
        exposureCompensationFormatted: exif.ev || '0 EV',
        film: payload.film || 'classic-neg',
        filmLabel: payload.filmLabel || 'CLASSIC NEG.',
        recipeTitle: payload.recipeTitle || 'classic-cuban',
        recipeLabel: payload.recipeLabel || 'Classic Cuban',
        recipeData: payload.recipeData || {
          color: 4,
          shadow: 1,
          clarity: -4,
          highlight: -2,
          sharpness: 0,
          grainEffect: { size: 'large', roughness: 'strong' },
          dynamicRange: { range: 'standard', setting: 'manual', development: 400 },
          whiteBalance: { red: 4, blue: -5, type: 'auto', colorTemperature: 5800 },
          colorChromeEffect: 'strong',
          colorChromeFXBlue: 'strong',
          highISONoiseReduction: -4
        },
        colorData: payload.colorData || {
          ai: { l: 0.68, c: 0.14, h: 58 },
          colors: [
            { l: 0.48, c: 0.13, h: 42 },
            { l: 0.78, c: 0.12, h: 74 },
            { l: 0.91, c: 0.05, h: 98 },
            { l: 0.62, c: 0.04, h: 65 },
            { l: 0.35, c: 0.03, h: 120 }
          ]
        },
        palette: payload.palette || ['#C88A4B', '#7B4E34', '#D7B66E', '#EDE8D8', '#3B423E'],
        takenAt: new Date().toISOString(),
        takenAtNaiveFormatted: (exif.date || new Date().toUTCString().slice(5, 22)).toUpperCase(),
        tags: Array.isArray(payload.tags) && payload.tags.length ? payload.tags : ['ingested', 'vault', 'local'],
        isUserIngested: true
      };

      items.unshift(newPhoto);
      writeUserManifest(items);

      sendJson(res, 200, { ok: true, photo: newPhoto, totalUserPhotos: items.length });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message || 'Invalid ingest payload' });
    }
  });
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range'
    });
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let u = decodeURIComponent(reqUrl.pathname);

  if (u === '/api/user-photos' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, items: readUserManifest() });
    return;
  }

  if (u === '/api/ingest' && req.method === 'POST') {
    handleIngest(req, res);
    return;
  }

  // Transparent image proxy & cache for /photos/photo-*.jpg|.jpeg
  if (u.startsWith('/photos/') && !u.startsWith('/photos/user/')) {
    const filename = path.basename(u);
    const localPhotoPath = path.join(photosRoot, filename);
    if (fs.existsSync(localPhotoPath) && fs.statSync(localPhotoPath).isFile()) {
      const ext = path.extname(localPhotoPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mime[ext] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(localPhotoPath).pipe(res);
      return;
    }
    if (/^photo-[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$/i.test(filename)) {
      try {
        const buf = await proxyUpstreamPhoto(filename, localPhotoPath);
        const ext = path.extname(filename).toLowerCase();
        res.writeHead(200, {
          'Content-Type': mime[ext] || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(buf);
        return;
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Upstream photo proxy error: ${err.message}`);
        return;
      }
    }
  }

  // Clean SPA routes matching photos.sambecker.com
  if (
    u === '/' ||
    u === '/grid' ||
    u === '/library' ||
    u === '/recents' ||
    u.startsWith('/p/') ||
    u.startsWith('/shot-on/') ||
    u.startsWith('/camera/') ||
    u.startsWith('/lens/') ||
    u.startsWith('/recipe/') ||
    u.startsWith('/film/') ||
    u.startsWith('/focal/') ||
    u.startsWith('/tag/') ||
    u.startsWith('/year/')
  ) {
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

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Sam Becker Photos (Specimen #03) 1:1 Mirror & Photo Vault Server running at http://127.0.0.1:${PORT}/`);
});
