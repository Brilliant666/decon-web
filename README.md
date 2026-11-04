# decon-web // 解构网页

> **Deconstructing craft-obsessed, god-tier websites.**
> 拆解与复刻全球极具审美统治力、微交互巧思与工程美学的「神级独立网站」，提炼可复用的零依赖 UI 组件与设计心法。

---

## ⚠️ Educational Attribution & Disclaimer (致敬与声明)

本项目仅作为**前端视觉工程、Canvas/Web Audio 物理交互与 UI 架构的拆解学习仓库（Educational Deconstruction & UI Study）**：
- **Specimen #01 (`True JPEG`)**：原始网站设计、前端架构与 AI 图像/提示词作品版权均归原作者 **TJ ([@RTJLDR](https://x.com/RTJLDR))** 及官方站点 **[truejpeg.com](https://truejpeg.com/)** 所有。
- **Specimen #02 (`musicForProgramming();`)**：原始网站设计、理念宣言与混音电台企划版权均归原作者 **Datassette ([datassette.net](https://datassette.net/))**、各期客座艺术家及官方站点 **[musicforprogramming.net](https://musicforprogramming.net/)** 所有。
- **Specimen #03 (`Sam Becker Photos`)**：原始网站极简摄影博客排版与开源项目创意归原作者 **Sam Becker ([sambecker/exif-photo-blog](https://github.com/sambecker/exif-photo-blog))** 及官方站点 **[photos.sambecker.com](https://photos.sambecker.com/)** 所有。
- **Specimen #04 (`Igloo Inc`)**：原始网站 3D WebGL 极地冰原巨石视觉、GLSL 着色器管线与空间声效工程版权均归创意制作团队 **Lusion ([lusion.co](https://lusion.co/))** 及品牌方 **Igloo Inc. ([igloo.inc](https://www.igloo.inc/))** 所有。
- 为保持 Git 仓库轻量与合规，本仓库**不包含**原站的大体积媒体与 3D 网格/纹理缓存（`images/`、`photos/` 与 `sites/04-igloo-inc/assets/` 目录已在 `.gitignore` 中忽略，均提供一键同步脚本与本地程序化合成/着色器兜底）。

---

## 🗂️ Specimens Catalog (已收录标本)

| 编号 | 网站名称 | 核心美学 / 技术标签 | 1:1 复刻实现 | 独立组件库 | 深度拆解 / 实验室 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#01** | **[True JPEG](https://truejpeg.com/)** (`@RTJLDR`) | 点阵工业风 / 半色调显影 / 硬件标尺 / Vanilla JS + OffscreenCanvas | [`sites/01-truejpeg/`](./sites/01-truejpeg/) (或 `truejpeg` 分支) | [`shared-ui/truejpeg-ui.js`](./shared-ui/truejpeg-ui.js) | [`PROMPTS_CATALOG.md`](./sites/01-truejpeg/PROMPTS_CATALOG.md) · [`lab.html`](./sites/01-truejpeg/lab.html) |
| **#02** | **[musicForProgramming();](https://musicforprogramming.net/)** (`Datassette`) | 代码编辑器 IDE 美学 / 纯 ASCII 控件 / Web Audio 频谱与环境合成器 | [`sites/02-musicforprogramming/`](./sites/02-musicforprogramming/) | [`shared-ui/mfp-ui.js`](./shared-ui/mfp-ui.js) | [`episodes.js`](./sites/02-musicforprogramming/episodes.js) · [`lab.html`](./sites/02-musicforprogramming/lab.html) |
| **#03** | **[Sam Becker Photos](https://photos.sambecker.com/)** (`sambecker`) | 奇偶交错无框画廊 / `oklch` 3px 色彩条 / 3D 文件夹归档 / 二进制 EXIF 解析与 `CLS=0` 暗房套件 | [`sites/03-sambecker-photos/`](./sites/03-sambecker-photos/) | [`shared-ui/photo-vault-ui.js`](./shared-ui/photo-vault-ui.js) | [`catalog.js`](./sites/03-sambecker-photos/catalog.js) · [`lab.html`](./sites/03-sambecker-photos/lab.html) |
| **#04** | **[Igloo Inc](https://www.igloo.inc/)** (`Lusion`) | 3D 极地冰原巨石 / `class f3` 斜向冰刀 5 重色散切屏 / SDF 光线步进冰封立方体 / 隐式键盘暗门工业遥测 HUD | [`sites/04-igloo-inc/`](./sites/04-igloo-inc/) | [`shared-ui/igloo-ui.js`](./shared-ui/igloo-ui.js) | [`sync_assets.js`](./sites/04-igloo-inc/sync_assets.js) · [`lab.html`](./sites/04-igloo-inc/lab.html) |

---

## 🔬 Specimen #01: True JPEG (`truejpeg.com`) 深度解析

### 1. 视觉与交互工程亮点
1. **交互式点阵大字标 (`dotType`)**：
   - 将任意文字或 SVG `Path2D` 在离屏 Canvas 上渲染并按透明度采样为 `Float32Array` 粒子坐标。
   - 鼠标划过时通过平方反比斥力 `(1 - d / R) ** 2` 推开圆点并缩小半径，离开后以 `0.16` 阻尼系数平滑复位。
2. **相片「半色调网点显影」(`halftoneLater` + `OffscreenCanvas` Worker)**：
   - 画廊卡片进入视口或首页窗口悬停前，通过内联 Web Worker 将缩略图按像素亮度 $L = 0.299R + 0.587G + 0.114B$ 实时转换为黑白半色调网点图（`r = step * 0.56 * Math.sqrt(L)`），随后如拍立得暗房显影般过渡为全彩原图，完全不阻塞主线程滚动。
3. **蜂窝点阵波浪转场 (`wipe`)**：
   - 页面切换与主题切换时，从鼠标点击的精确坐标 `(clientX, clientY)` 向全屏扩散交错网格的圆点波浪，波峰前缘带有高亮白点闪烁（`Math.sin(k * Math.PI)`）。
4. **3D 点阵地球仪与黑客帝国字符解码 (`globe` + `scramble`)**：
   - 手写三维球面投影绘制点阵地球；切换英/日/中三语时，全屏短标签按距离延迟依次通过对应语种字符集滚动解码。
5. **定制增强（`RAW / PRO` 双模微小开关 + 无侵入式暗房套件）**：
   - **`RAW / PRO` 硬件指示灯微小开关**：右上角（及大图详情页顶栏）新增了带 3×3 点阵 LED 指示灯的 **`RAW / PRO`** 切换键（快捷键 `P`）。在默认的 **`RAW`** 模式下，隐藏所有魔改控件，保持 **100% 纯净的 1:1 原站视觉**；点击切换为 **`PRO`**（绿灯亮起）后，一键解锁三大暗房神器！
   - **`INK / PAPER` 双模主题切换**：右上角新增**点阵太阳/月蚀光轮开关**（快捷键 `T`），支持在原版深邃墨黑（`INK #111110`）与博物馆画册暖白（`PAPER #f4f3ee`）之间通过蜂窝点阵波浪无缝切换，并实时重绘全站所有 Canvas 元素。
   - **暗房光学放大镜（Optical Loupe，`PRO` 模式开启）**：在大图详情页按住鼠标左键拖动，浮现带 64 颗点阵外环、36 道内圈镜头刻度与十字准星的光学放大镜（滚轮支持 `1.5× ~ 6.0×` 实时变焦），100% 审视原图微距细节。
   - **实时点阵曝光直方图与 5 格色彩基因（Foldable Exposure Histogram & Tones，`PRO` 模式开启）**：位于 `Show prompt` 下方，默认以单行参数（如 `LOW-KEY // SHD 78% · LUM 21%`）无侵入式折叠收纳，点击展开 `40×10` 点阵直方图与 5 格主色/跳色提取色卡（点击一键复制 HEX）。
   - **Contact Sheet（暗房底片索引模式，`PRO` 模式开启）**：画廊工具栏集成第 3 视图开关（快捷键 `3`），将瀑布流一键切换为带齿孔刻度与常显编号的高密度底片小样网格。
   - **Web Audio 机械触觉声效与暗房声场（`createSoundEngine`，`PRO` 模式开启）**：零外部音频依赖，纯 `Web Audio API` 合成金属棘轮变焦（`tick`）、机械拨杆双脉冲（`switch`）、帘幕快门扫频（`shutter`）、双音合焦复制确认（`copy`），并在 `lab.html` 额外提供双层暗房环境声场（`ambient`）实验开关。

### 2. 如何本地运行 Specimen #01

```bash
# 1. 启动本地 1:1 镜像服务器（默认监听 http://127.0.0.1:6060/）
node sites/01-truejpeg/server.js

# 2. （可选）全量下载 777 个图像文件到本地 sites/01-truejpeg/images/ 目录以实现 100% 离线秒开
node sites/01-truejpeg/sync_images.js
```

---

## 🎧 Specimen #02: `musicForProgramming();` (`musicforprogramming.net`) 深度解析

### 1. 视觉与音频工程亮点
1. **三栏响应式代码编辑器 IDE 架构 & 语法高亮宣言 (`IBM Plex Mono`)**：
   - **左栏（主控与宣言区）**：完整复刻 `musicForProgramming();` 语法高亮标题、`[Episodes] [About] [Credits]` 视图切换、经典的 `function musicFor(task = 'programming')` 心流伪代码宣言、原版 4 行 `_.-•:*^º'` 彩色字符声波矩阵与 32 字符滚动跑马灯，以及 `// 79 episodes · 1380 tracks · 96 hours` 代码注释统计。
   - **中栏（当前期数控制台与曲目单）**：超细字重（`font-weight: 200`）大号等宽标题、纯 ASCII 字符播放器控件（`[Play]` / `[Pause]`、`[Stop]`、`[-30s]`、`[+30s]`、`[Synth Mode]`）、支持鼠标点击与拖拽定位的纯字符进度条 `[||||||||||||..................] 14:20 / 58:00` 与字符音量条 `[Vol: ||||||||--] 80%`，以及切换期数时带原版 `—~±§|[].+$^@*()•x%!?#` 乱码解码（`scrambleText`）过渡动效的完整曲目单（Tracklist）。
   - **右栏（全量 79 期矩阵索引）**：收录从 `01: Datassette` 至 `79: Corticyte` 的全部 **79 期节目与 1,380 首曲目**，支持正序/倒序排列（`[Desc ↓]` / `[Asc ↑]`）、关键词/艺术家/曲目实时过滤（`/* filter: [...] */`）以及黄标收藏（`[favourite]`）持久化。
2. **程序化环境电子合成器离线兜底 (`createAmbientPad` / `[Synth Mode]`)**：
   - 当外部 MP3 音频流在受限网络下加载较慢，或用户主动点击 `[Synth Mode]`（快捷键 `S`）时，无缝切换至基于纯 `Web Audio API` 的多声部和谐环境电子合成器。
   - 内置 6 组氛围和弦声位（`Dmaj9`、`F#m11`、`Cmaj9#11`、`Em9`、`Asus2/F`、`Bbmaj9`），结合正弦/三角波微失谐 Pad、慢速 LFO 低通滤波扫频（`0.065Hz` 呼吸调制）与生成式五声泛音钟声，安静悦耳、零刺耳底噪，确保在任何网络环境下都能立即出声并驱动 32 频段频谱仪。
3. **`RAW / PRO` 无侵入双模开关（快捷键 `P`）与三大心流极客增强**：
   - **默认 `RAW` 模式**：隐藏所有扩展面板，100% 纯净还原 `musicforprogramming.net` 原始极简界面。
   - **切换至 `PRO` 模式（快捷键 `P`）**：
     1. **实时 32 频段 ASCII / LED 点阵双模频谱仪 (`createSpectrum`)**：支持在「Unicode 字符柱（`▁▂▃▄▅▆▇█` + 峰值保持）」与「32×12 硬件 LED 点阵 Canvas 频谱」之间一键切换。
     2. **代码注释风番茄钟心流计时器 (`createFlowTimer`)**：内嵌 `/* FLOW_TIMER: 25:00 [START] [25m/50m] [RESET] */`，倒计时结束时触发柔和的 Web Audio 双音泛音提示（`528Hz + 792Hz`）。
     3. **全键盘极客操控与 4 套经典编辑器主题 (`T`)**：支持 `Space`（播放/暂停）、`←/→`（快退/快进 30s）、`↑/↓`（调节音量）、`R`（随机抽选一期）、`S`（切换合成器模式）、`T`（循环切换 `MFP Dark` / `Gruvbox` / `Solarized` / `Paper Light` 四大经典代码配色）。

### 2. 如何本地运行 Specimen #02

```bash
# 1. 启动本地 1:1 镜像与音频/RSS 代理服务器（默认监听 http://127.0.0.1:6061/）
node sites/02-musicforprogramming/server.js

# 2. （可选）从官方同步最新 rss.xml 快照
node sites/02-musicforprogramming/sync_rss.js
```

启动后可访问：
- **1:1 完整复刻站（含 `RAW / PRO` 心流套件与程序化合成器兜底）**：`http://127.0.0.1:6061/`
- **抽离组件交互实验室 & 79 期 1,380 首曲目检索库**：`http://127.0.0.1:6061/lab.html`

---

## 📷 Specimen #03: Sam Becker Photos (`photos.sambecker.com`) 深度解析

### 1. 视觉与摄影工程亮点
1. **真实数据集 (`catalog.js` & `sync_photos.js`)**：
   - 同步自 `photos.sambecker.com` Next.js RSC Flight 数据流的 **36 幅真实摄影作品**（含完整二进制 EXIF 元数据嵌入的 `blurData` 渐进占位缩略图、AI 视觉语义描述 `semanticDescription`、`FUJIFILM X-T5` + `XF35mmF1.4 R` / `XF90mmF2 R LM WR` 与 `Apple iPhone 17 Pro` 实拍参数，以及 4 套真实富士机内配方：`Classic Cuban` / `ACROS + R CUSTOM` / `KODAK PORTRA 400 V2` / `Classic Negative`）。
   - `server.js`（端口 `6062`）支持 `/photos/*` 本地静态托管与上游 Vercel Blob 原图透明回源缓存，确保高清真图秒开与离线兜底。
2. **1:1 视觉与三视图架构 (`/`, `/grid`, `/library`)**：
   - **`Full (/)` 奇偶交错无框画册流**：`Instrument Serif` 大写衬线标题 + `IBM Plex Mono` 无标签 EXIF 侧边栏、奇偶行左右交错（Odd/Even Alternating）无框悬浮画布、原站标志性 **`3px` `oklch` 感知色彩条**（`70px` AI 主色 + 5×`6px` 辅色）、以及脱离文档流的 `[+]` 暗色毛玻璃富士胶片配方浮层（含高光/阴影 S 曲线、白平衡偏移二维坐标网与一键复制）。
   - **`Grid (/grid)` 无框方格矩阵 & `Library (/library)` 3D `oklch` 文件夹归档**：`Grid` 视图以 4 列自适应方格展示原图比例；`Library` 视图 1:1 复刻原站档案统计卡与 **交互式 3D `oklch` 动态着色文件夹**（Hover 时前盖 3D 翻转并扇形弹出 4 张预览图，点击直达 `/shot-on/:camera`、`/lens/:lens`、`/recipe/:recipe`、`/film/:film`、`/focal/:mm`、`/tag/:tag` 过滤视图）。
3. **零布局偏移 (`CLS = 0`) 与 `RAW / PRO` 双轨暗房套件**：
   - **固定几何尺寸吸顶顶栏（`CLS = 0.00px`）**：锁死 `#btnThemeCycle`（`LIGHT` / `DARK` / `WARM`，快捷键 `T`）与 `#btnModeToggle`（`RAW` / `PRO`，快捷键 `P`）槽位宽度及全局滚动条槽位（`scrollbar-gutter: stable`），全屏详情页（`/p/:slug`）同步响应三套深浅主题，切换过程零抖动、零闪屏重绘。
   - **`PRO` 暗房遥测与本地入库套件**：开启 `PRO` 模式后，以脱离文档流的悬浮毛玻璃胶囊 `#proToolbar` 与 `.pv-pro-drawer` 呈现 **64-Bin Luma/RGB 直方图 + 5 色卡抽屉**、**`2.5×–4.5×` 滚轮变焦光学放大镜 (`createOpticalLoupe`, `L`)**、**5 态几何构图辅助网格 (`createCompositionOverlay`, `G`)**、**本地 JPEG 拖拽入库与二进制 `0xFFE1` EXIF 解析 (`POST /api/ingest`)**、**纯 Web Audio 机械镜间快门与光圈环音效 (`createShutterAudio`)**，以及带 `28×20px` 微缩略图与 `semanticDescription` AI 视觉语义检索的 **`⌘K` 全局命令面板 (`createCommandPalette`)**。
4. **跨站复用组件库 8 大导出模块 (`shared-ui/photo-vault-ui.js`)**：
   - `createExifPlate`、`createFilmRecipeCard`、`parseExif`、`extractColorPalette`、`createCompositionOverlay`、`createOpticalLoupe`、`createCommandPalette`、`createShutterAudio`。

### 2. 如何本地运行 Specimen #03

```bash
# 1. 启动本地 1:1 镜像与个人摄影资料库服务器（默认监听 http://127.0.0.1:6062/）
node sites/03-sambecker-photos/server.js

# 2. （可选）从线上同步真实元数据 / 扫描本地二进制 EXIF JPEG 样本并输出汇总清单
node sites/03-sambecker-photos/sync_photos.js
```

启动后可访问：
- **1:1 完整复刻站（含 `Full / Grid / Library` 三视图、`RAW / PRO` 暗房套件、`⌘K` 语义检索与拖拽入库）**：`http://127.0.0.1:6062/`
- **2×2 组件交互实验室 & 二进制 EXIF / 胶片配方工作台**：`http://127.0.0.1:6062/lab`

---

## ❄️ Specimen #04: Igloo Inc (`igloo.inc` by Lusion) 深度解析

### 1. 视觉、着色器与工业 HUD 工程亮点
1. **100% 原生 Lusion WebGL2 3D 引擎镜像与透明回源代理架构 (`server.js` & `sync_assets.js`)**：
   - **`server.js`（端口 `6063`）**：支持 `/shared-ui/*` 跨目录路由、`/lab` 组件实验室路由，以及 `/assets/*` 透明回源代理与本地磁盘缓存（含 `inFlightProxy` 并发去重、精确 `.wasm` / `.ktx2` / `.drc` / `.exr` / `.ogg` / `.woff2` MIME 映射、`.ogg` HTTP `Range` 分片流传输，并自动修补 `index-2e130bc1.js` 中硬编码的 `"https://www.igloo.inc/"` → `"/"`）。
   - **`sync_assets.js` 全量资产同步**：一键拉取并本地缓存全部 **108 项（18.25 MB）** 原站 WebGL2 3D 二进制资产（4 个 Web Workers `audioworker` / `msdfworker` / `bitmapworker` / `exrworker`、Draco 与 Basis Universal WASM 解码器、20 个 `.drc` 3D 几何体、46 个 `.ktx2` / `.exr` / `.png` 纹理与 3D VDB 体积云、MSDF 3D 字体图集及 18 轨 `.ogg` 空间音效），实现 100% 离线满帧秒开。
2. **默认 `RAW` 模式 100% 零外挂 DOM + 隐式键盘暗门召唤 `PRO` 极地遥测套件 (`pro-hud.js`)**：
   - **纯粹 `RAW` 体验（零额外像素）**：默认 `RAW` 模式下主屏不渲染任何可见外挂按钮或胶囊栏，并强制锁定 `data-igloo-optics="CRYO-STD"` 原生色彩，确保打开 `http://127.0.0.1:6063/` 时画面与 `https://www.igloo.inc/` 100.00% 完全一致。
   - **纯键盘暗门交互 (`P` / `Esc` / `L` / `T` / `G`)**：按 `P` 键召唤/关闭 `PRO` 极地遥测覆层（`Esc` 立即退回纯净 `RAW` 模式并自动复位滤镜，`L` 新标签页打开 `/lab`）；仅在 `PRO` 模式下响应 `T`（循环切换 `CRYO-STD` / `POLAR-NIGHT` / `THERMAL-IR` / `WIREFRAME-XRAY` 四态全局光学滤镜）与 `G`（切换极坐标激光测距网格）。
   - **非侵入式 WebGL2 管线探针与三大遥测器官**：通过拦截 `HTMLCanvasElement.prototype.getContext` 实时读取 GPU 帧率、每帧 Draw Calls / 三角形吞吐量以及 `class f3` 切屏着色器的 `uProgress` / `uProgressVel` / `uDetailProgress` uniform，驱动 **四周极地测量准星与海拔/温度标尺**、**实时 WebGL2 管线抽屉（含 4 章节平滑滚轮脉冲跃迁与合成寒风声场开关）** 以及 **展品冰块结构解剖卡片 (`Cryo-Specimen Metadata Inspector`)**。
3. **跨站复用组件库 6 大零依赖导出模块 (`shared-ui/igloo-ui.js` & `lab.html`)**：
   - **`createFrostCutShader`**：1:1 纯 WebGL2 GLSL 复刻 `App3D-d68cb154.js` 中的 `class f3` 斜向冰刀切面着色器（内置程序化 `tScroll` / `tFrost` / `tBlue` 多通道噪声纹理、还原 `slopeDisp = (scrollTex.b * 2.0 - 1.0) * 0.4` 与 `#define CA_ITERATIONS 5` 五重光谱桶形畸变色散）。
   - **`createCryoCubeWebGL`**：纯手写 WebGL2 GLSL SDF 光线步进（Raymarching）3D 倒角冰封立方体 + `shattered_ring` 环绕破碎冰环，具备菲涅尔高光、次表面散射与真实冰折射率（`IOR = 1.31`），支持切换内部 3D 发光遗迹（`01: Pudgy 0°C` / `02: Overpass -3°C` / `03: Igloo Dome -15°C`）及触发 `Explode Lattice` 冰砖爆裂分离。
   - **`createAsciiWaveLoader`**：1:1 提取 `index-2e130bc1.js` 的 100 帧 ASCII 脉冲波浪加载器（`---===+++=` → `===+++===-`）与 `////// Manifesto` 等宽字符乱码锁定解码器。
   - **`createPolarReticleHud`**：四角工业准星、黄金分割/极坐标测距网格、鼠标实时 `AZM / ELV` 方位角追踪与垂直海拔/温度刻度尺（`+32.0m -18°C` → `-48.0m -42°C`）。
   - **`createBlurTextCylinder`**：三维圆柱面环绕大写等宽字柱 (`blurrytext_cylinder`) 实时高斯景深模糊（DoF Blur）与 `dot_pattern` 点阵矩阵背景。
   - **`createCryoAudioEngine`**：零外部音频依赖，纯 `Web Audio API` 合成高频遥测脉冲音（`playBeep`）、5 泛音冰晶折射碎裂声（`playShard`）、低频下潜冰层共鸣（`playEnterCube`）与粉红噪声双二阶带通 LFO 极地寒风声场（`toggleArcticWind`）。

### 2. 如何本地运行 Specimen #04

```bash
# 1. 预同步全量 108 项 Lusion WebGL2 3D 二进制资产到本地 sites/04-igloo-inc/assets/（约 18.25 MB）
node sites/04-igloo-inc/sync_assets.js

# 2. 启动本地 1:1 WebGL2 3D 镜像与透明回源代理服务器（默认监听 http://127.0.0.1:6063/）
node sites/04-igloo-inc/server.js
```

启动后可访问：
- **1:1 原生 WebGL2 3D 极地冰屋体验（默认纯净 `RAW` 模式，按 `P` 键召唤 `PRO` 极地遥测 HUD）**：`http://127.0.0.1:6063/`
- **2×2 极地 WebGL 着色器、SDF 光线步进冰块与工业 HUD 交互实验室**：`http://127.0.0.1:6063/lab`

---

## 📦 仓库目录与分支说明 (Clean Multi-Site Architecture)

```text
decon-web (main 分支)
├── .gitignore
├── README.md                        # 博物馆总览门户文档
├── CHANGELOG.md                     # 精简演进与版本记录
├── shared-ui/                       # 提炼出的跨项目可复用零依赖组件库
│   ├── truejpeg-ui.js               # Specimen #01 点阵/半色调/光学放大镜组件库
│   ├── mfp-ui.js                    # Specimen #02 ASCII 进度条/双模频谱/环境合成器/番茄钟组件库
│   ├── photo-vault-ui.js            # Specimen #03 二进制 EXIF 解析/胶片配方铭牌/构图叠层/色彩基因组件库
│   └── igloo-ui.js                  # Specimen #04 斜向冰刀色散着色器/3D SDF 冰封立方体/极地遥测 HUD/寒风合成器组件库
└── sites/                           # 各神级网站独立自包含归档目录
    ├── 01-truejpeg/                 # Specimen #01: True JPEG 完整复刻、server (6060) 与 Prompt 手册
    ├── 02-musicforprogramming/      # Specimen #02: musicForProgramming(); 完整复刻、server (6061) 与交互实验室
    ├── 03-sambecker-photos/         # Specimen #03: Sam Becker Photos 完整复刻、server (6062) 与二进制 EXIF 实验室
    └── 04-igloo-inc/                # Specimen #04: Igloo Inc (Lusion) WebGL2 3D 镜像、server (6063) 与着色器实验室
```

- **`main` 分支**：保持根目录纯粹干净，仅包含总览文档、`shared-ui/` 通用组件库以及 `sites/` 下按编号归档的各个独立站点文件夹。
- **`truejpeg` 分支**：根目录直接作为 `True JPEG` 单站点的独立分支快照。
