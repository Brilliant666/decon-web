const fs = require('fs');
const path = require('path');
const https = require('https');

const root = __dirname;
const window = {};
eval(fs.readFileSync(path.join(root, 'works.js'), 'utf8'));
const works = window.GALLERY_WORKS.filter(w => !w.slot);

const urls = new Set();
works.forEach(w => {
  if (w.image) urls.add(w.image);
  if (w.thumb) {
    urls.add(w.thumb);
    urls.add(w.thumb.replace('/thumbs/', '/thumbs/sm/'));
    if (/\.jpe?g$/i.test(w.thumb)) {
      urls.add(w.thumb.replace(/\.jpe?g$/i, '.avif'));
      urls.add(w.thumb.replace('/thumbs/', '/thumbs/sm/').replace(/\.jpe?g$/i, '.avif'));
    }
  }
  if (w.ref && w.ref.file) urls.add(w.ref.file);
});

const queue = Array.from(urls);
console.log(`Total asset files to sync: ${queue.length}`);

const agent = new https.Agent({ keepAlive: true, maxSockets: 16 });
let done = 0, skipped = 0, failed = 0;

function downloadOne(relPath) {
  return new Promise((resolve) => {
    const dest = path.join(root, relPath);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      skipped++;
      done++;
      return resolve();
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const req = https.get(`https://truejpeg.com/${relPath}`, { agent }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        failed++;
        done++;
        return resolve();
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          done++;
          if (done % 50 === 0 || done === queue.length) {
            console.log(`Progress: ${done}/${queue.length} (skipped: ${skipped}, failed: ${failed})`);
          }
          resolve();
        });
      });
    });
    req.on('error', () => {
      failed++;
      done++;
      resolve();
    });
  });
}

async function run() {
  const concurrency = 16;
  let idx = 0;
  async function worker() {
    while (idx < queue.length) {
      const item = queue[idx++];
      await downloadOne(item);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`Finished! Total: ${queue.length}, Downloaded: ${done - skipped - failed}, Skipped: ${skipped}, Failed: ${failed}`);
}

run();
