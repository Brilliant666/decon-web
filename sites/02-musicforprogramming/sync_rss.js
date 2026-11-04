/**
 * sync_rss.js — Standalone RSS Sync & Parser for musicForProgramming();
 * Fetches https://musicforprogramming.net/rss.xml and parses all episodes,
 * tracklists, durations, file sizes, and direct MP3 stream URLs.
 *
 * Usage:
 *   node sites/02-musicforprogramming/sync_rss.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const RSS_URL = 'https://musicforprogramming.net/rss.xml';
const OUT_RSS = path.join(__dirname, 'rss.xml');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'decon-web-mfp-sync/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(new URL(res.headers.location, url).href).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(xml);
  if (!m) return '';
  return m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim();
}

function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const titleRaw = extractTag(block, 'title').replace(/^Episode\s+/i, '');
    const link = extractTag(block, 'link');
    const slug = link.split('/').filter(Boolean).pop() || '';
    const duration = extractTag(block, 'itunes:duration');
    const pubDate = extractTag(block, 'pubDate');
    const encMatch = /<enclosure[^>]*url=["']([^"']+)["'][^>]*length=["']([^"']*)["']/i.exec(block);
    const file = encMatch ? encMatch[1] : extractTag(block, 'guid');
    const filesize = encMatch ? Number(encMatch[2]) || 0 : 0;
    const desc = extractTag(block, 'description') || extractTag(block, 'content:encoded');
    const orderMatch = /^(\d+):/.exec(titleRaw);
    const order = orderMatch ? Number(orderMatch[1]) : 0;
    items.push({
      order,
      num: String(order).padStart(2, '0'),
      slug,
      title: titleRaw,
      file,
      filesize,
      duration,
      pubDate,
      descriptionLength: desc.length
    });
  }
  return items.sort((a, b) => b.order - a.order);
}

(async () => {
  try {
    console.log(`[sync_rss] Fetching ${RSS_URL} ...`);
    const xml = await fetchUrl(RSS_URL);
    fs.writeFileSync(OUT_RSS, xml, 'utf8');
    const items = parseRssItems(xml);
    console.log(`[sync_rss] Cached rss.xml (${(xml.length / 1024).toFixed(1)} KB) — parsed ${items.length} episodes.`);
    if (items.length > 0) {
      console.log(`[sync_rss] Latest: Episode ${items[0].title} (${items[0].duration}) -> ${items[0].file}`);
      console.log(`[sync_rss] First : Episode ${items[items.length - 1].title} (${items[items.length - 1].duration})`);
    }
  } catch (err) {
    console.error(`[sync_rss] Error:`, err.message);
    process.exitCode = 1;
  }
})();
