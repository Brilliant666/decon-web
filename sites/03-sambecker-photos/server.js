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
const fs = require('fs');
const path = require('path');
const {
  DEFAULT_MIME_TYPES,
  safeDecodePath,
  isPathInsideRoot,
  applyCorsHeaders,
  handleOptionsRequest,
  verifyLocalJsonPost,
  serveStaticFile,
  writeFileAtomicSync,
  fetchUpstreamBuffer
} = require('../../shared/static-server');

const root = __dirname;
const sharedRoot = path.resolve(root, '../../shared-ui');
const photosRoot = path.join(root, 'photos');
const userPhotosDir = path.join(photosRoot, 'user');
const userManifestPath = path.join(userPhotosDir, 'manifest.json');
const PORT = Number(process.env.PORT) || 6062;
const MAX_USER_PHOTOS = 100;

fs.mkdirSync(photosRoot, { recursive: true });
fs.mkdirSync(userPhotosDir, { recursive: true });

const inFlightProxy = new Map();

function proxyUpstreamPhoto(filename, destPath) {
  if (inFlightProxy.has(filename)) {
    return inFlightProxy.get(filename);
  }
  const blobUrl = `https://wpz47wrhgzc7qaub.public.blob.vercel-storage.com/${filename}`;
  const nextImgUrl = `https://photos.sambecker.com/_next/image?url=${encodeURIComponent(blobUrl)}&w=1200&q=85`;
  const headers = { 'User-Agent': 'Mozilla/5.0 (SamBecker-Local-Proxy/1.0)' };

  const p = fetchUpstreamBuffer(nextImgUrl, { timeoutMs: 15000, headers })
    .catch(() => fetchUpstreamBuffer(blobUrl, { timeoutMs: 15000, headers }))
    .then((buf) => {
      writeFileAtomicSync(destPath, buf);
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
  writeFileAtomicSync(userManifestPath, JSON.stringify(items, null, 2), 'utf8');
}

function sendJson(req, res, statusCode, obj) {
  const headers = applyCorsHeaders(req, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(obj));
}

function cleanTextField(val, fallback = '', maxLen = 120) {
  const cleaned = String(val ?? fallback)
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
}

function isValidImageMagicBytes(buf) {
  if (!Buffer.isBuffer(buf) || buf.length <= 32) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return true;
  }
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return true;
  }
  // WebP: RIFF....WEBP
  if (
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return true;
  }
  return false;
}

function handleIngest(req, res) {
  if (!verifyLocalJsonPost(req, res)) {
    return;
  }

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
      const items = readUserManifest();
      if (items.length >= MAX_USER_PHOTOS) {
        sendJson(req, res, 400, {
          ok: false,
          error: `Maximum user photo limit (${MAX_USER_PHOTOS}) reached`
        });
        return;
      }

      const bodyStr = Buffer.concat(chunks).toString('utf8');
      const payload = JSON.parse(bodyStr);

      let imgBuffer = null;
      if (payload.dataUrl && typeof payload.dataUrl === 'string') {
        const commaIdx = payload.dataUrl.indexOf(',');
        const b64 = commaIdx >= 0 ? payload.dataUrl.slice(commaIdx + 1) : payload.dataUrl;
        imgBuffer = Buffer.from(b64, 'base64');
      } else if (payload.base64 && typeof payload.base64 === 'string') {
        imgBuffer = Buffer.from(payload.base64, 'base64');
      }

      if (!isValidImageMagicBytes(imgBuffer)) {
        sendJson(req, res, 400, { ok: false, error: '400 Invalid image binary' });
        return;
      }

      const rawName = String(payload.filename || 'frame.jpg').replace(/[^a-zA-Z0-9._-]/g, '-');
      const extMatch = rawName.match(/\.(jpe?g|png|webp)$/i);
      const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
      const baseSlug =
        rawName.replace(/\.(jpe?g|png|webp)$/i, '').toLowerCase().slice(0, 64) || 'ingested-frame';
      const stamp = Date.now();
      const savedFilename = `${stamp}-${baseSlug}${ext}`;
      const savedPath = path.join(userPhotosDir, savedFilename);

      writeFileAtomicSync(savedPath, imgBuffer);

      const exif = payload.exif && typeof payload.exif === 'object' ? payload.exif : {};
      const make = cleanTextField(exif.make || payload.make || 'FUJIFILM', 'FUJIFILM', 48).toUpperCase();
      const model = cleanTextField(exif.model || payload.model || 'X-T5', 'X-T5', 64);
      const lensModel = cleanTextField(
        exif.lens || payload.lensModel || payload.lens || 'XF35mmF1.4 R',
        'XF35mmF1.4 R',
        80
      );
      const focalStr = cleanTextField(exif.focalLength || payload.focalLengthFormatted || '35mm', '35mm', 24);
      const focal35Str = cleanTextField(
        exif.focalLength35mm || payload.focalLengthIn35MmFormatFormatted || '53mm',
        '53mm',
        24
      );
      const fNumberFormatted = cleanTextField(
        exif.aperture || payload.fNumberFormatted || 'ƒ/2.0',
        'ƒ/2.0',
        24
      ).replace(/^f\//i, 'ƒ/');
      const exposureTimeFormatted = cleanTextField(
        exif.shutterSpeed || payload.exposureTimeFormatted || '1/500s',
        '1/500s',
        24
      );
      const isoFormatted = cleanTextField(
        exif.iso || payload.isoFormatted || 'ISO400',
        'ISO400',
        24
      ).replace(/\s+/g, '');

      const rawBlur = typeof payload.blurData === 'string' ? payload.blurData.trim() : '';
      const validBlurData =
        rawBlur.length < 65536 &&
        /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(rawBlur)
          ? rawBlur
          : '';

      const defaultPalette = ['#C88A4B', '#7B4E34', '#D7B66E', '#EDE8D8', '#3B423E'];
      const cleanedPalette = Array.isArray(payload.palette)
        ? payload.palette
            .map((c) => String(c || '').trim())
            .filter((c) => /^#[0-9a-fA-F]{3,8}$/.test(c))
            .slice(0, 8)
        : [];

      const cleanedTags = Array.isArray(payload.tags)
        ? payload.tags
            .map((t) => cleanTextField(t, '', 32))
            .filter(Boolean)
            .slice(0, 12)
        : [];

      const defaultTitle = baseSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const title = cleanTextField(payload.title, defaultTitle, 120);
      const caption = cleanTextField(
        payload.caption,
        'Local user photograph ingested via binary EXIF parser',
        120
      );
      const film = cleanTextField(payload.film, 'classic-neg', 64);
      const filmLabel = cleanTextField(payload.filmLabel, 'CLASSIC NEG.', 64);
      const recipeTitle = cleanTextField(payload.recipeTitle, 'classic-cuban', 64);
      const recipeLabel = cleanTextField(payload.recipeLabel, 'Classic Cuban', 64);

      const nextIndex =
        Math.max(36, ...items.map((i) => Number(i.index) || 0)) + 1;

      const newPhoto = {
        id: `user-${stamp.toString(36)}`,
        slug: `user-${stamp.toString(36)}`,
        index: nextIndex,
        title,
        caption,
        semanticDescription: caption || 'User ingested frame',
        url: `/photos/user/${savedFilename}`,
        remoteUrl: `/photos/user/${savedFilename}`,
        blurData: validBlurData,
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
        exposureCompensationFormatted: cleanTextField(exif.ev, '0 EV', 24),
        film,
        filmLabel,
        recipeTitle,
        recipeLabel,
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
        palette: cleanedPalette.length ? cleanedPalette : defaultPalette,
        takenAt: new Date().toISOString(),
        takenAtNaiveFormatted: cleanTextField(
          exif.date || new Date().toUTCString().slice(5, 22),
          '18 OCT 2026',
          32
        ).toUpperCase(),
        tags: cleanedTags.length ? cleanedTags : ['ingested', 'vault', 'local'],
        isUserIngested: true
      };

      items.unshift(newPhoto);
      writeUserManifest(items);

      sendJson(req, res, 200, { ok: true, photo: newPhoto, totalUserPhotos: items.length });
    } catch (err) {
      sendJson(req, res, 400, { ok: false, error: err.message || 'Invalid ingest payload' });
    }
  });
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    handleOptionsRequest(req, res, 'GET, POST, HEAD, OPTIONS');
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

  if (u === '/api/user-photos' && req.method === 'GET') {
    sendJson(req, res, 200, { ok: true, items: readUserManifest() });
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
    if (!isPathInsideRoot(localPhotoPath, photosRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    if (fs.existsSync(localPhotoPath) && fs.statSync(localPhotoPath).isFile()) {
      serveStaticFile(req, res, localPhotoPath, {
        cacheControl: 'public, max-age=86400'
      });
      return;
    }
    if (/^photo-[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$/i.test(filename)) {
      try {
        const buf = await proxyUpstreamPhoto(filename, localPhotoPath);
        const ext = path.extname(filename).toLowerCase();
        res.writeHead(
          200,
          applyCorsHeaders(req, {
            'Content-Type': DEFAULT_MIME_TYPES[ext] || 'image/jpeg',
            'Content-Length': buf.length,
            'Cache-Control': 'public, max-age=86400'
          })
        );
        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end(buf);
        }
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

  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    serveStaticFile(req, res, fp, { mimeTypes: DEFAULT_MIME_TYPES });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Sam Becker Photos (Specimen #03) 1:1 Mirror & Photo Vault Server running at http://127.0.0.1:${PORT}/`);
});
