/**
 * sites/05-lumen-muse/server.js
 * Specimen #05: LUMEN MUSE (潜影缪斯 · Optics LM-05 · 85mm f/1.2) — Standalone HTTP Server
 * Listens on http://127.0.0.1:6064/ (or process.env.PORT)
 *
 * SPDX-License-Identifier: MIT
 *
 * Capabilities:
 *   1. Static hosting for sites/05-lumen-muse/* (/, /?embed=card, /lab, /favicon.svg)
 *   2. Shared ESM hosting: /shared-ui/* -> ../../shared-ui/*
 *   3. Safe whitelisted portrait proxy: GET /api/muse-portrait?id=ccd|anime
 *      -> sites/01-truejpeg/images/038.jpg | 197.webp (400 on any non-whitelisted id)
 *   4. Single-file self-contained exhibition bundle: GET /standalone (and /export)
 *   5. Security & RFC 9110 Range parity via ../../shared/static-server
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  DEFAULT_MIME_TYPES,
  safeDecodePath,
  isPathInsideRoot,
  isBlockedServerFile,
  applyCorsHeaders,
  handleOptionsRequest,
  serveStaticFile
} = require('../../shared/static-server');

const PORT = Number(process.env.PORT) || 6064;
const HOST = '127.0.0.1';

const siteRoot = __dirname;
const repoRoot = path.resolve(siteRoot, '..', '..');
const sharedRoot = path.join(repoRoot, 'shared-ui');

const MIME_TYPES = {
  ...DEFAULT_MIME_TYPES,
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const MUSE_PORTRAIT_WHITELIST = Object.freeze({
  ccd: path.join(repoRoot, 'sites', '01-truejpeg', 'images', '038.jpg'),
  anime: path.join(repoRoot, 'sites', '01-truejpeg', 'images', '197.webp')
});

function sendJson(req, res, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const headers = applyCorsHeaders(req, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store'
  });
  res.writeHead(statusCode, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(body);
}

/**
 * Strips local ES module import/export syntax and wraps a module file inside an isolated
 * lexical IIFE closure so concatenating multiple modules into one <script type="module">
 * never causes top-level identifier collisions.
 */
function wrapModuleIntoRegistry(sourceCode, modKey, depMap = {}) {
  let code = String(sourceCode || '');
  const exportedBindings = new Map();

  // 1. Replace static `import ... from '...'` statements with destructuring from __LUMEN_REG__
  code = code.replace(
    /^\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/gm,
    (_full, clause, spec) => {
      let targetKey = null;
      for (const [suffix, regKey] of Object.entries(depMap)) {
        if (spec.endsWith(suffix)) {
          targetKey = regKey;
          break;
        }
      }
      if (!targetKey) return '';
      const trimmed = clause.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const inner = trimmed
          .slice(1, -1)
          .replace(/\s+as\s+/g, ': ');
        return `const { ${inner} } = __LUMEN_REG__.${targetKey};`;
      }
      if (trimmed.startsWith('* as ')) {
        const ns = trimmed.slice(5).trim();
        return `const ${ns} = __LUMEN_REG__.${targetKey};`;
      }
      if (trimmed.includes(',')) {
        const commaIdx = trimmed.indexOf(',');
        const defPart = trimmed.slice(0, commaIdx).trim();
        const namedPart = trimmed
          .slice(commaIdx + 1)
          .trim()
          .replace(/^\{|\}$/g, '')
          .replace(/\s+as\s+/g, ': ');
        return `const ${defPart} = __LUMEN_REG__.${targetKey}.default || __LUMEN_REG__.${targetKey};\nconst { ${namedPart} } = __LUMEN_REG__.${targetKey};`;
      }
      return `const ${trimmed} = __LUMEN_REG__.${targetKey}.default || __LUMEN_REG__.${targetKey};`;
    }
  );

  // 1b. Transform `export { a, b as c } from '...'` re-exports
  code = code.replace(
    /^\s*export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?/gm,
    (_full, list, spec) => {
      let targetKey = null;
      for (const [suffix, regKey] of Object.entries(depMap)) {
        if (spec.endsWith(suffix)) {
          targetKey = regKey;
          break;
        }
      }
      if (!targetKey) return '';
      const lines = [];
      list
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((part) => {
          const asMatch = part.match(/^([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)$/);
          const srcName = asMatch ? asMatch[1] : part;
          const expName = asMatch ? asMatch[2] : part;
          const tempVar = `__reexp_${targetKey}_${expName}`;
          lines.push(`const ${tempVar} = __LUMEN_REG__.${targetKey}.${srcName};`);
          exportedBindings.set(expName, tempVar);
        });
      return lines.join('\n');
    }
  );

  // 2. Transform `export async function Name` / `export function Name` / `export class Name`
  code = code.replace(
    /^\s*export\s+(async\s+function|function|class)\s+([A-Za-z0-9_$]+)/gm,
    (_m, kw, name) => {
      exportedBindings.set(name, name);
      return `${kw} ${name}`;
    }
  );

  // 3. Transform `export const/let/var Name`
  code = code.replace(
    /^\s*export\s+(const|let|var)\s+([A-Za-z0-9_$]+)/gm,
    (_m, kw, name) => {
      exportedBindings.set(name, name);
      return `${kw} ${name}`;
    }
  );

  // 4. Transform `export { a, b as c }` (without `from`)
  code = code.replace(/^\s*export\s*\{([^}]*)\}\s*;?/gm, (_m, list) => {
    list
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((part) => {
        const asMatch = part.match(/^([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)$/);
        if (asMatch) {
          exportedBindings.set(asMatch[2], asMatch[1]);
        } else {
          exportedBindings.set(part, part);
        }
      });
    return '';
  });

  // 5. Transform `export default ...`
  let hasDefault = false;
  code = code.replace(/^\s*export\s+default\s+/gm, () => {
    hasDefault = true;
    return 'const __default_export__ = ';
  });
  if (hasDefault) {
    exportedBindings.set('default', '__default_export__');
  }

  const returnEntries = Array.from(exportedBindings.entries())
    .map(([expName, locName]) => (expName === locName ? expName : `${expName}: ${locName}`))
    .join(', ');

  const safeCode = code.replace(/<\/script/gi, '<\\/script');

  if (!modKey) {
    return `(() => {\n${safeCode}\n})();`;
  }
  return `__LUMEN_REG__.${modKey} = (() => {\n${safeCode}\n  return { ${returnEntries} };\n})();`;
}

function buildStandaloneHtml() {
  const indexHtmlPath = path.join(siteRoot, 'index.html');
  const stylesPath = path.join(siteRoot, 'styles.css');
  const appPath = path.join(siteRoot, 'app.js');
  const geomPath = path.join(sharedRoot, 'lumen-muse-geometry.js');
  const audioPath = path.join(sharedRoot, 'lumen-muse-audio.js');
  const stagePath = path.join(sharedRoot, 'lumen-muse-stage.js');
  const uiPath = path.join(sharedRoot, 'lumen-muse-ui.js');

  const readSafe = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

  let html = readSafe(indexHtmlPath);
  const css = readSafe(stylesPath);
  const geomSrc = readSafe(geomPath);
  const audioSrc = readSafe(audioPath);
  const stageSrc = readSafe(stagePath);
  const uiSrc = readSafe(uiPath);
  const appSrc = readSafe(appPath);

  const depLookup = {
    'lumen-muse-geometry.js': 'geometry',
    'lumen-muse-audio.js': 'audio',
    'lumen-muse-stage.js': 'stage',
    'lumen-muse-ui.js': 'ui'
  };

  const inlineModuleBundle = [
    'const __LUMEN_REG__ = Object.create(null);',
    wrapModuleIntoRegistry(geomSrc, 'geometry', depLookup),
    wrapModuleIntoRegistry(audioSrc, 'audio', depLookup),
    wrapModuleIntoRegistry(stageSrc, 'stage', depLookup),
    wrapModuleIntoRegistry(uiSrc, 'ui', depLookup),
    wrapModuleIntoRegistry(appSrc, null, depLookup)
  ].join('\n\n');

  html = html.replace(/<link[^>]+rel=["']modulepreload["'][^>]*>\s*/gi, '');
  html = html.replace(
    /<link[^>]+href=["']\/?styles\.css["'][^>]*>/i,
    () => `<style>\n${css}\n</style>`
  );
  html = html.replace(
    /<script[^>]+src=["']\/?app\.js["'][^>]*><\/script>/i,
    () => `<script type="module">\n${inlineModuleBundle}\n</script>`
  );

  return html;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    handleOptionsRequest(req, res, 'GET, HEAD, OPTIONS');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
    res.end('Method Not Allowed');
    return;
  }

  const rawUrl = String(req.url || '/');
  const qIdx = rawUrl.indexOf('?');
  const rawPathname = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;
  const rawQuery = qIdx >= 0 ? rawUrl.slice(qIdx + 1) : '';

  const decodedPath = safeDecodePath(rawPathname);
  if (!decodedPath) {
    res.writeHead(400, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
    res.end('400 Bad Request: Malformed URI');
    return;
  }

  // 1. Safe Local #01 True JPEG Portrait Proxy (ccd | anime strictly whitelisted)
  if (decodedPath === '/api/muse-portrait') {
    const params = new URLSearchParams(rawQuery);
    const id = (params.get('id') || '').trim();
    if (!Object.prototype.hasOwnProperty.call(MUSE_PORTRAIT_WHITELIST, id)) {
      sendJson(req, res, 400, {
        ok: false,
        error: 'Invalid portrait id. Allowed: ccd, anime'
      });
      return;
    }
    const portraitFile = MUSE_PORTRAIT_WHITELIST[id];
    if (!isPathInsideRoot(portraitFile, repoRoot) || !fs.existsSync(portraitFile)) {
      sendJson(req, res, 404, { ok: false, error: 'Portrait asset not found' });
      return;
    }
    serveStaticFile(req, res, portraitFile, { mimeTypes: MIME_TYPES });
    return;
  }

  // 2. Single-File Self-Contained Exhibition Export (/standalone & /export)
  if (
    decodedPath === '/standalone' ||
    decodedPath === '/standalone/' ||
    decodedPath === '/export' ||
    decodedPath === '/export/'
  ) {
    try {
      const standaloneHtml = buildStandaloneHtml();
      const buf = Buffer.from(standaloneHtml, 'utf8');
      res.writeHead(
        200,
        applyCorsHeaders(req, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': buf.length,
          'Cache-Control': 'no-store'
        })
      );
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(buf);
    } catch (_err) {
      res.writeHead(500, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
      res.end('500 Internal Server Error');
    }
    return;
  }

  // 3. Cross-directory /shared-ui/* static mapping
  if (decodedPath === '/shared-ui' || decodedPath.startsWith('/shared-ui/')) {
    const relShared = decodedPath.slice('/shared-ui'.length).replace(/^\/+/, '');
    const targetShared = path.resolve(sharedRoot, relShared);
    if (!isPathInsideRoot(targetShared, sharedRoot) || isBlockedServerFile(targetShared)) {
      res.writeHead(403, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
      res.end('403 Forbidden');
      return;
    }
    serveStaticFile(req, res, targetShared, { mimeTypes: MIME_TYPES });
    return;
  }

  // 4. Clean route aliases
  let cleanRoute = decodedPath;
  if (cleanRoute === '/' || cleanRoute === '/index') {
    cleanRoute = '/index.html';
  } else if (cleanRoute === '/lab' || cleanRoute === '/lab/') {
    cleanRoute = '/lab.html';
  } else if (cleanRoute === '/favicon.ico') {
    cleanRoute = '/favicon.svg';
  }

  const relSite = cleanRoute.replace(/^\/+/, '');
  const targetFile = path.resolve(siteRoot, relSite);

  if (!isPathInsideRoot(targetFile, siteRoot) || isBlockedServerFile(targetFile)) {
    res.writeHead(403, applyCorsHeaders(req, { 'Content-Type': 'text/plain; charset=utf-8' }));
    res.end('403 Forbidden');
    return;
  }

  serveStaticFile(req, res, targetFile, { mimeTypes: MIME_TYPES });
});

server.on('clientError', (_err, socket) => {
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[05-lumen-muse] LUMEN MUSE server listening at http://${HOST}:${PORT}/`);
});
