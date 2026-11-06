/**
 * Specimen #04: Igloo Inc (igloo.inc by Lusion) — Local 1:1 WebGL2 3D Mirror & Cryo-Telemetry Server
 * Default: http://127.0.0.1:6063/
 *
 * Features:
 *   - Static assets in sites/04-igloo-inc/
 *   - Cross-directory /shared-ui/* routing -> ../../shared-ui/
 *   - /lab and /lab.html routing -> sites/04-igloo-inc/lab.html
 *   - /assets/* static hosting + transparent upstream proxy & local disk cache from https://www.igloo.inc/assets/*
 *     (automatically patches index-2e130bc1.js hardcoded "https://www.igloo.inc/" -> "/"
 *      and patches App3D-d68cb154.js with ?embed=card Scene-01 Only Fast Path)
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

/**
 * Idempotently injects ?embed=card Scene-01 Only Fast Path into App3D-d68cb154.js
 */
function patchApp3DBundleIfNeeded(code) {
  if (typeof code !== 'string' || code.includes('isEmbedCardMode')) {
    return { code, changed: false };
  }

  let next = code;

  // 1. Skip detail project 3D text meshes in QF.init() when in ?embed=card mode
  next = next.replace(
    'class QF{constructor(e){this.scene=e,this.ready=new Promise(t=>{this.isReady=t}),this.group=new Gi,this.group.name="projects",this.scene.add(this.group),this.options={width:.6,align:"left",lineHeight:.8,size:.09},this.projects=[],this.projectID=-1,this.mouseSim=null,this.scrollMultiplier=1,this.init()}async init(){await Promise.all(',
    'class QF{constructor(e){this.scene=e,this.ready=new Promise(t=>{this.isReady=t}),this.group=new Gi,this.group.name="projects",this.scene.add(this.group),this.options={width:.6,align:"left",lineHeight:.8,size:.09},this.projects=[],this.projectID=-1,this.mouseSim=null,this.scrollMultiplier=1,this.init()}async init(){if(typeof window<"u"&&window.location.search.includes("embed=card"))return this.isReady();await Promise.all('
  );

  // 2. Skip cubes, entry scenes and audioController (13 .ogg downloads) in ?embed=card mode
  next = next.replace(
    'const ty={igloo:F3,cubes:aF,entry:UF};class jF{constructor(e){this.options=e,this.isFirstNavigation=!0,this.currentSection=null,this.ready=new Promise(t=>{this.isReady=t}),this.scroll={total:0,targetY1:0,targetY2:0,y:0,velocity:0},this.autoCenter={needed:!1,animating:!1,lastTarget:0,lastTime:0},this.scrollMultiplier=75e-5,this.scrollBlocked=!1,this.detailIndex=0,this.isDetailOpen=!1,this.scrollComposers=[],this.detailScene=null,this.detailComposer=null,this.init()}async init(){this.initGlobalPlane(),await this.createScenes(),this.audioController=new u3(this),',
    'const isEmbedCardMode=typeof window<"u"&&window.location.search.includes("embed=card");const ty=isEmbedCardMode?{igloo:F3}:{igloo:F3,cubes:aF,entry:UF};class jF{constructor(e){this.options=e,this.isFirstNavigation=!0,this.currentSection=null,this.ready=new Promise(t=>{this.isReady=t}),this.scroll={total:0,targetY1:0,targetY2:0,y:0,velocity:0},this.autoCenter={needed:!1,animating:!1,lastTarget:0,lastTime:0},this.scrollMultiplier=75e-5,this.scrollBlocked=!1,this.detailIndex=0,this.isDetailOpen=!1,this.scrollComposers=[],this.detailScene=null,this.detailComposer=null,this.init()}async init(){this.initGlobalPlane(),await this.createScenes(),this.audioController=isEmbedCardMode?null:new u3(this),'
  );

  // 3. Skip detailScene (JF) and detailComposer in jF.createScenes()
  next = next.replace(
    'this.detailScene=new JF({mainController:this}),this.detailComposer=new tA({scene:this.detailScene}),await Promise.all([this.uiScene.uploaded,...this.scrollComposers.map(e=>e.passes[0].scene.uploaded),this.detailComposer.passes[0].scene.uploaded]),this.uiScene.projects.setMouseSim(this.detailScene.mouseSim)',
    'isEmbedCardMode||(this.detailScene=new JF({mainController:this}),this.detailComposer=new tA({scene:this.detailScene})),await Promise.all([this.uiScene.uploaded,...this.scrollComposers.map(e=>e.passes[0].scene.uploaded),...(this.detailComposer?[this.detailComposer.passes[0].scene.uploaded]:[])]),this.detailScene&&this.uiScene.projects.setMouseSim(this.detailScene.mouseSim)'
  );

  // 4. Safe fallback for tCubes uniform in jF.render()
  next = next.replace(
    'this.material.uniforms.tCubes.value=this.scrollComposers[1].readBuffer.texture',
    'this.material.uniforms.tCubes.value=(this.scrollComposers[1]||this.scrollComposers[0]).readBuffer.texture'
  );

  // 5. Lock DPR to 1 in sN launcher when in ?embed=card mode
  next = next.replace(
    'const u=window.devicePixelRatio<=2?Math.min(window.devicePixelRatio,1.15):Math.min(window.devicePixelRatio,1.5);',
    'const u=isEmbedCardMode?1:window.devicePixelRatio<=2?Math.min(window.devicePixelRatio,1.15):Math.min(window.devicePixelRatio,1.5);'
  );

  return { code: next, changed: next !== code };
}

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
      } else if (key.endsWith('App3D-d68cb154.js')) {
        const { code } = patchApp3DBundleIfNeeded(rawBuf.toString('utf8'));
        buf = Buffer.from(code, 'utf8');
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
let app3DBundlePatched = false;

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
      // Ensure index-2e130bc1.js & App3D-d68cb154.js are checked/patched only once per server process
      if (!indexBundlePatched && relAsset.endsWith('index-2e130bc1.js')) {
        const code = fs.readFileSync(localAssetPath, 'utf8');
        if (code.includes('https://www.igloo.inc/')) {
          const patched = code.replace(/https:\/\/www\.igloo\.inc\//g, '/');
          writeFileAtomicSync(localAssetPath, patched, 'utf8');
        }
        indexBundlePatched = true;
      } else if (!app3DBundlePatched && relAsset.endsWith('App3D-d68cb154.js')) {
        const rawCode = fs.readFileSync(localAssetPath, 'utf8');
        const { code, changed } = patchApp3DBundleIfNeeded(rawCode);
        if (changed) {
          writeFileAtomicSync(localAssetPath, code, 'utf8');
        }
        app3DBundlePatched = true;
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
