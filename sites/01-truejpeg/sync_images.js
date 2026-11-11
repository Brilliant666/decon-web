const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  isPathInsideRoot,
  writeFileAtomicSync,
  fetchUpstreamBuffer
} = require('../../shared/static-server');

const root = __dirname;
const metadataOnly = process.argv.includes('--metadata-only');

const UPSTREAM_METADATA_FILES = [
  'works.js',
  'data.js',
  'prompts/en.json',
  'prompts/ja.json'
];

async function syncMetadataFiles() {
  console.log('=== Step 1: Syncing upstream metadata & translation packs ===');
  for (const relPath of UPSTREAM_METADATA_FILES) {
    const cleanRel = String(relPath || '').replace(/^\/+/, '');
    const dest = path.resolve(root, cleanRel);
    if (!cleanRel || !isPathInsideRoot(dest, root)) {
      console.warn(`  [SKIP] Blocked out-of-bounds metadata path: ${relPath}`);
      continue;
    }
    const url = `https://truejpeg.com/${cleanRel}`;
    try {
      const buf = await fetchUpstreamBuffer(url, { timeoutMs: 20000 });
      writeFileAtomicSync(dest, buf);
      console.log(`  [SYNCED] ${cleanRel} (${buf.length} bytes)`);
    } catch (err) {
      if (fs.existsSync(dest)) {
        console.warn(`  [WARN] Failed to fetch ${url} (${err.message}), using cached local ${cleanRel}`);
      } else {
        throw err;
      }
    }
  }
}

function slugifyGfmHeading(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .trim()
    .replace(/ /g, '-');
}

function buildCatalogMarkdown(works) {
  const indexMap = new Map();
  works.forEach((w, idx) => {
    indexMap.set(w, String(idx + 1).padStart(3, '0'));
  });

  const isFeian = (w) => (w.tags || []).includes('Feian');
  const isNsfw = (w) => (w.tags || []).includes('NSFW');

  const portraitWorks = works.filter(
    (w) =>
      !isFeian(w) &&
      !isNsfw(w) &&
      ((w.tags || []).includes('Portrait') ||
        (!(w.tags || []).includes('Anime') && !(w.tags || []).includes('Poster')))
  );
  const animeWorks = works.filter(
    (w) => !isFeian(w) && !isNsfw(w) && (w.tags || []).includes('Anime')
  );
  const posterWorks = works.filter(
    (w) => !isFeian(w) && !isNsfw(w) && (w.tags || []).includes('Poster')
  );
  const feianWorks = works.filter((w) => isFeian(w));
  const nsfwWorks = works.filter((w) => !isFeian(w) && isNsfw(w));

  const formatEntry = (w) => {
    const no = indexMap.get(w) || '000';
    const model = (w.params && w.params.Model) || 'SeeDream 5.0 Pro';
    const tagsStr = (w.tags || []).map((t) => `\`${t}\``).join(', ');
    const imgPath = w.image || w.thumb || '';
    return [
      `### No.${no} (ID: \`#${w.id}\`) — ${w.title}`,
      `- **模型**: \`${model}\` | **尺寸**: \`${w.width} × ${w.height}\` | **日期**: \`${w.date || ''}\` | **标签**: ${tagsStr}`,
      `- **预览图**: [原图 (truejpeg.com)](https://truejpeg.com/${imgPath}) | [作品直达](https://truejpeg.com/#${w.id})`,
      '',
      '```text',
      (w.prompt || '').trim(),
      '```'
    ].join('\n');
  };

  const sections = [
    {
      tocLabel: `1. 写实人像 (Portrait - Safe)（共 ${portraitWorks.length} 组）`,
      title: `1. 写实人像 (Portrait)（共 ${portraitWorks.length} 组）`,
      items: portraitWorks
    },
    {
      tocLabel: `2. 二次元与插画 (Anime)（共 ${animeWorks.length} 组）`,
      title: `2. 二次元与插画 (Anime)（共 ${animeWorks.length} 组）`,
      items: animeWorks
    },
    {
      tocLabel: `3. 视觉海报 (Poster)（共 ${posterWorks.length} 组）`,
      title: `3. 视觉海报 (Poster)（共 ${posterWorks.length} 组）`,
      items: posterWorks
    },
    {
      tocLabel: `4. 废案归档 (Feian / Outtakes)（共 ${feianWorks.length} 组）`,
      title: `4. 废案归档 (Feian / Outtakes)（共 ${feianWorks.length} 组）`,
      items: feianWorks
    },
    {
      tocLabel: `5. 写实人像 (NSFW 分类)（共 ${nsfwWorks.length} 组）`,
      title: `5. 写实人像 (NSFW)（共 ${nsfwWorks.length} 组）`,
      items: nsfwWorks
    }
  ].map((sec) => ({
    ...sec,
    anchor: slugifyGfmHeading(sec.title)
  }));

  const header = [
    '# True JPEG — 完整中文 Prompt 配方手册 & 工程拆解',
    '',
    '> 数据来源：[truejpeg.com](https://truejpeg.com/) (`@RTJLDR`)',
    `> 收录作品数：**${works.length} 组** | 主力模型：**SeeDream 5.0 Pro**`,
    '',
    '## 一、 核心 Prompt 工程方法论（为什么没有 AI 塑料感？）',
    '',
    `通过对全部 ${works.length} 组作品的中文原版提示词进行拆解，作者采用了一套**高度工业化、摄影指导级别的模块化结构**。无论是写实人像（Portrait）、二次元插画（Anime）还是海报设计（Poster），都可以套用以下 **8 段式黄金公式**：`,
    '',
    '1. **【人物与骨相固定】**：明确年龄段、面部骨骼特征、发型结构（发尾走向、刘海密度）、眼妆细节（眼线尾端、睫毛分明度、高光点）及微表情（如*“安静、略带倦意、距离感”*，避免千篇一律的假笑）。',
    '2. **【身材与物理体块】**：强调真实软组织体积与衣料承托关系（如*“自然下坠与真实重量感”、“衣料沿胸腰形成柔和起伏与斜向张力褶皱”*），并直接加入负面约束（*“避免纸片身材、不自然比例”*）。',
    '3. **【皮肤/表面微观质感】**：写实类强调*“冷调超白皮肤，保留真实毛孔、细小汗毛、自然唇纹和细微肤色变化，表面光泽克制”*；插画类强调*“精细稳定线稿、赛璐璐硬边明暗、局部薄层厚涂”*。',
    '4. **【姿态与空间几何】**：用前景、中景、对角线、三角关系来描述动作（如*“前臂沿画面右侧形成斜向前景”、“手部与面部形成三角关系，不遮挡主要表情”*）。',
    '5. **【服装与材质碰撞】**：细致区分不同材质的反射属性（如*“细腻哑光高弹面料”* 对比 *“窄而锋利的液态金属高光”* 或 *“真实网眼密度与透肤层次”*）。',
    '6. **【镜头参数与机位】**：明确物理焦段与机位（高频使用：**`20mm 广角定焦镜头，f/1.8，近距离高机位俯拍/仰拍手持`** 或 **`28mm-35mm 微广角`**），并要求*“控制近摄广角畸变放大”*。',
    '7. **【布光逻辑】**：高频杀手锏——**「压暗环境光 + 近镜头微弱直闪」**。要求*“人物比背景亮 2—3 档，局部反光硬而真实，禁止 HDR 强行抬亮阴影，不做大面积柔光箱效果”*。',
    '8. **【照片质感固定（反塑料感核心咒语）】**：',
    '   > `2000年代日系便携CCD室内低照度直闪抓拍，高对比暗调、有限动态范围、深黑位、轻微柔焦、明显数字噪点与粗颗粒，带少量压缩痕迹，暗部带轻微青绿/灰紫偏色。画面无文字、水印或界面。`',
    '',
    '---',
    '',
    '## 二、 分类索引',
    '',
    ...sections.map((sec) => `- [${sec.tocLabel}](#${sec.anchor})`),
    ''
  ].join('\n');

  const body = sections
    .map((sec) => {
      const entries = sec.items.map(formatEntry).join('\n\n');
      return `<a id="${sec.anchor}"></a>\n\n## ${sec.title}\n\n${entries}`;
    })
    .join('\n\n');

  return `${header}\n${body}\n`;
}

function generatePromptsAndCatalog() {
  console.log('=== Step 2 & 3: Generating prompts.json & PROMPTS_CATALOG.md ===');
  const code = fs.readFileSync(path.join(root, 'works.js'), 'utf8');
  const sandbox = { window: Object.create(null) };
  vm.runInNewContext(code, sandbox, { timeout: 1000 });
  const rawWorks = Array.isArray(sandbox.window.GALLERY_WORKS) ? sandbox.window.GALLERY_WORKS : [];
  const works = rawWorks.filter((w) => !w.slot);

  const promptsJsonPath = path.join(root, 'prompts.json');
  writeFileAtomicSync(promptsJsonPath, JSON.stringify(works, null, 2) + '\n', 'utf8');
  console.log(`  [GENERATED] prompts.json (${works.length} works)`);

  const catalogMdPath = path.join(root, 'PROMPTS_CATALOG.md');
  const catalogContent = buildCatalogMarkdown(works);
  writeFileAtomicSync(catalogMdPath, catalogContent, 'utf8');
  console.log(`  [GENERATED] PROMPTS_CATALOG.md (${works.length} works)`);

  return works;
}

async function syncImageAssets(works) {
  console.log('=== Step 4: Incrementally syncing image assets ===');
  const urls = new Set();
  works.forEach((w) => {
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
  console.log(`Total asset files to check/sync: ${queue.length}`);

  let done = 0;
  let skipped = 0;
  let failed = 0;

  async function downloadOne(relPath) {
    const cleanRel = String(relPath || '').replace(/^\/+/, '');
    const dest = path.resolve(root, cleanRel);
    if (!cleanRel || !isPathInsideRoot(dest, root)) {
      console.warn(`  [SKIP] Blocked out-of-bounds asset path: ${relPath}`);
      failed++;
      done++;
      return;
    }

    if (fs.existsSync(dest) && fs.statSync(dest).isFile() && fs.statSync(dest).size > 0) {
      skipped++;
      done++;
      return;
    }

    try {
      const buf = await fetchUpstreamBuffer(`https://truejpeg.com/${cleanRel}`, {
        timeoutMs: 15000
      });
      writeFileAtomicSync(dest, buf);
    } catch (err) {
      failed++;
      console.warn(`  [WARN] Failed to download ${cleanRel}: ${err.message}`);
    }

    done++;
    if (done % 50 === 0 || done === queue.length) {
      console.log(
        `Progress: ${done}/${queue.length} (downloaded: ${done - skipped - failed}, skipped: ${skipped}, failed: ${failed})`
      );
    }
  }

  const concurrency = 16;
  let idx = 0;
  async function worker() {
    while (idx < queue.length) {
      const item = queue[idx++];
      await downloadOne(item);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(
    `Finished! Total: ${queue.length}, Downloaded: ${done - skipped - failed}, Skipped: ${skipped}, Failed: ${failed}`
  );
}

async function main() {
  await syncMetadataFiles();
  const works = generatePromptsAndCatalog();
  if (metadataOnly) {
    console.log('Skipping image asset download (--metadata-only).');
    return;
  }
  await syncImageAssets(works);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
