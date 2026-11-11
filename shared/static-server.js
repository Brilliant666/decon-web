/**
 * shared/static-server.js
 *
 * Common security, atomic disk persistence, RFC 9110 Range + ETag static file hosting,
 * and timeout-guarded upstream fetch primitives shared across all 5 decon-web servers.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const LOOPBACK_ORIGIN_RE = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;

const DEFAULT_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.ktx2': 'image/ktx2',
  '.drc': 'application/octet-stream',
  '.exr': 'application/octet-stream',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

/**
 * 1. Safe URL pathname decoding.
 * Returns null on malformed percent-encoding (e.g. /%E0%A4%A) or control chars (\0).
 */
function safeDecodePath(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  const pathname = (rawUrl || '/').split('?')[0];
  try {
    const decoded = decodeURIComponent(pathname);
    if (!decoded || !decoded.startsWith('/') || /[\x00-\x1f]/.test(decoded)) {
      return null;
    }
    return decoded;
  } catch (_) {
    return null;
  }
}

/**
 * 2. Strict directory boundary check using path.relative.
 * Prevents prefix collisions (e.g. /root-evil matching /root) and .. traversal.
 */
function isPathInsideRoot(candidatePath, rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedCandidate = path.resolve(candidatePath);
  if (resolvedCandidate === resolvedRoot) return true;
  const rel = path.relative(resolvedRoot, resolvedCandidate);
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * 2b. Unified blocklist for internal server scripts, sync CLIs, package manifests, and dotfiles.
 */
function isBlockedServerFile(filePath) {
  const baseName = path.basename(String(filePath || ''));
  if (!baseName) return false;
  return (
    baseName === 'server.js' ||
    /^sync_.*\.js$/i.test(baseName) ||
    baseName === 'package.json' ||
    baseName.startsWith('.')
  );
}

/**
 * 3. Loopback CORS Origin whitelist & Local JSON POST CSRF guard.
 */
function getCorsOrigin(req) {
  const origin = req && req.headers ? req.headers.origin : '';
  if (typeof origin === 'string' && LOOPBACK_ORIGIN_RE.test(origin)) {
    return origin;
  }
  return null;
}

function applyCorsHeaders(req, headers = {}) {
  const origin = getCorsOrigin(req);
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

function handleOptionsRequest(req, res, methods = 'GET, POST, HEAD, OPTIONS') {
  const headers = applyCorsHeaders(req, {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Range'
  });
  res.writeHead(204, headers);
  res.end();
}

function verifyLocalJsonPost(req, res) {
  const origin = req && req.headers ? req.headers.origin : undefined;
  if (origin !== undefined && !LOOPBACK_ORIGIN_RE.test(String(origin))) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Forbidden cross-origin POST' }));
    return false;
  }
  const contentType = String((req && req.headers && req.headers['content-type']) || '').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    res.writeHead(415, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Unsupported Media Type: application/json required' }));
    return false;
  }
  return true;
}

/**
 * 4. RFC 9110 Standard Range + ETag + 304 Static File Server.
 */
function serveStaticFile(req, res, filePath, options = {}) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = options.mimeTypes || DEFAULT_MIME_TYPES;
    const contentType = options.contentType || mimeMap[ext] || 'application/octet-stream';
    const isCodeOrMarkup =
      ext === '.html' || ext === '.js' || ext === '.mjs' || ext === '.css' || ext === '.json' || ext === '.xml';
    const cacheControl =
      options.cacheControl ||
      (isCodeOrMarkup ? 'public, max-age=0, must-revalidate' : 'public, max-age=86400');

    const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
    const rangeHeader = req.headers.range;

    if (!rangeHeader && req.headers['if-none-match'] === etag) {
      const headers304 = applyCorsHeaders(req, {
        ETag: etag,
        'Cache-Control': cacheControl
      });
      res.writeHead(304, headers304);
      res.end();
      return;
    }

    if (rangeHeader) {
      if (stat.size === 0) {
        const headers416 = applyCorsHeaders(req, {
          'Content-Range': `bytes */${stat.size}`,
          'Content-Type': 'text/plain; charset=utf-8'
        });
        res.writeHead(416, headers416);
        res.end('416 Range Not Satisfiable');
        return;
      }

      const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader).trim());
      if (!match || (match[1] === '' && match[2] === '')) {
        const headers416 = applyCorsHeaders(req, {
          'Content-Range': `bytes */${stat.size}`,
          'Content-Type': 'text/plain; charset=utf-8'
        });
        res.writeHead(416, headers416);
        res.end('416 Range Not Satisfiable');
        return;
      }

      const startStr = match[1];
      const endStr = match[2];
      let start;
      let end;

      if (startStr === '') {
        // Suffix range: bytes=-500
        const suffixLength = parseInt(endStr, 10);
        if (isNaN(suffixLength) || suffixLength <= 0) {
          const headers416 = applyCorsHeaders(req, {
            'Content-Range': `bytes */${stat.size}`,
            'Content-Type': 'text/plain; charset=utf-8'
          });
          res.writeHead(416, headers416);
          res.end('416 Range Not Satisfiable');
          return;
        }
        start = Math.max(0, stat.size - suffixLength);
        end = stat.size - 1;
      } else {
        start = parseInt(startStr, 10);
        end = endStr !== '' ? Math.min(parseInt(endStr, 10), stat.size - 1) : stat.size - 1;
      }

      if (isNaN(start) || isNaN(end) || start < 0 || start >= stat.size || start > end) {
        const headers416 = applyCorsHeaders(req, {
          'Content-Range': `bytes */${stat.size}`,
          'Content-Type': 'text/plain; charset=utf-8'
        });
        res.writeHead(416, headers416);
        res.end('416 Range Not Satisfiable');
        return;
      }

      const chunkSize = end - start + 1;
      const headers206 = applyCorsHeaders(req, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        ETag: etag,
        'Cache-Control': cacheControl
      });

      res.writeHead(206, headers206);
      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      const stream = fs.createReadStream(filePath, { start, end });
      stream.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500);
          res.end('Internal Server Error');
        } else {
          res.destroy();
        }
      });
      stream.pipe(res);
      return;
    }

    const headers200 = applyCorsHeaders(req, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      ETag: etag,
      'Cache-Control': cacheControl
    });

    res.writeHead(200, headers200);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal Server Error');
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  });
}

/**
 * 5. Atomic file write via .tmp + fs.renameSync.
 * Prevents truncated/corrupted partial files from persisting on disk.
 */
function writeFileAtomicSync(destPath, data, encoding) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const tmpPath = `${destPath}.${process.pid}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    if (encoding) {
      fs.writeFileSync(tmpPath, data, encoding);
    } else {
      fs.writeFileSync(tmpPath, data);
    }
    try {
      fs.renameSync(tmpPath, destPath);
    } catch (renameErr) {
      if (
        process.platform === 'win32' &&
        (renameErr.code === 'EPERM' || renameErr.code === 'EEXIST' || renameErr.code === 'EACCES')
      ) {
        try {
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        } catch (_) {}
        fs.renameSync(tmpPath, destPath);
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_) {}
    throw err;
  }
}

/**
 * 6. Upstream buffer fetch with timeout and redirect cap.
 */
function fetchUpstreamBuffer(url, { timeoutMs = 15000, maxRedirects = 4, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      return reject(err);
    }

    const client = parsed.protocol === 'https:' ? https : http;
    let settled = false;
    const finish = (err, buf) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(buf);
    };

    const req = client.get(
      parsed,
      {
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'Mozilla/5.0 (DeconWeb-Local-Mirror/1.0)',
          Accept: '*/*',
          ...headers
        }
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          if (maxRedirects <= 0) {
            return finish(new Error(`Too many redirects for ${url}`));
          }
          const nextUrl = new URL(res.headers.location, parsed).toString();
          fetchUpstreamBuffer(nextUrl, {
            timeoutMs,
            maxRedirects: maxRedirects - 1,
            headers
          }).then(
            (buf) => finish(null, buf),
            (err) => finish(err)
          );
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          return finish(new Error(`Upstream HTTP ${res.statusCode} for ${url}`));
        }

        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => finish(null, Buffer.concat(chunks)));
        res.on('error', (err) => finish(err));
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Upstream timeout (${timeoutMs}ms) for ${url}`));
    });

    req.on('error', (err) => finish(err));
  });
}

module.exports = {
  DEFAULT_MIME_TYPES,
  safeDecodePath,
  isPathInsideRoot,
  isBlockedServerFile,
  getCorsOrigin,
  applyCorsHeaders,
  handleOptionsRequest,
  verifyLocalJsonPost,
  serveStaticFile,
  writeFileAtomicSync,
  fetchUpstreamBuffer
};
