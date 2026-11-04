# decon-web // 解构网页

> **Deconstructing craft-obsessed, god-tier websites.**
> 拆解与复刻全球极具审美统治力、微交互巧思与工程美学的「神级独立网站」，提炼可复用的零依赖 UI 组件与设计心法。

---

## ⚠️ Educational Attribution & Disclaimer (致敬与声明)

本项目仅作为**前端视觉工程、Canvas/Web Audio 物理交互与 UI 架构的拆解学习仓库（Educational Deconstruction & UI Study）**：
- **Specimen #01 (`True JPEG`)**：原始网站设计、前端架构与 AI 图像/提示词作品版权均归原作者 **TJ ([@RTJLDR](https://x.com/RTJLDR))** 及官方站点 **[truejpeg.com](https://truejpeg.com/)** 所有。
- **Specimen #02 (`musicForProgramming();`)**：原始网站设计、理念宣言与混音电台企划版权均归原作者 **Datassette ([datassette.net](https://datassette.net/))**、各期客座艺术家及官方站点 **[musicforprogramming.net](https://musicforprogramming.net/)** 所有。
- 为保持 Git 仓库轻量与合规，本仓库**不包含**原站的大体积媒体资产（`images/` 目录已在 `.gitignore` 中忽略，MP3 音频采用官方直链流式播放 + 本地 Web Audio 合成器离线兜底）。

---

## 🗂️ Specimens Catalog (已收录标本)

| 编号 | 网站名称 | 核心美学 / 技术标签 | 1:1 复刻实现 | 独立组件库 | 深度拆解 / 实验室 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#01** | **[True JPEG](https://truejpeg.com/)** (`@RTJLDR`) | 点阵工业风 / 半色调显影 / 硬件标尺 / Vanilla JS + OffscreenCanvas | [`sites/01-truejpeg/`](./sites/01-truejpeg/) (或 `truejpeg` 分支) | [`shared-ui/truejpeg-ui.js`](./shared-ui/truejpeg-ui.js) | [`PROMPTS_CATALOG.md`](./sites/01-truejpeg/PROMPTS_CATALOG.md) · [`lab.html`](./sites/01-truejpeg/lab.html) |
| **#02** | **[musicForProgramming();](https://musicforprogramming.net/)** (`Datassette`) | 代码编辑器 IDE 美学 / 纯 ASCII 控件 / Web Audio 频谱与环境合成器 | [`sites/02-musicforprogramming/`](./sites/02-musicforprogramming/) | [`shared-ui/mfp-ui.js`](./shared-ui/mfp-ui.js) | [`episodes.js`](./sites/02-musicforprogramming/episodes.js) · [`lab.html`](./sites/02-musicforprogramming/lab.html) |

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

## 📦 仓库目录与分支说明 (Clean Multi-Site Architecture)

```text
decon-web (main 分支)
├── .gitignore
├── README.md                        # 博物馆总览门户文档
├── CHANGELOG.md                     # 精简演进与版本记录
├── shared-ui/                       # 提炼出的跨项目可复用零依赖组件库
│   ├── truejpeg-ui.js               # Specimen #01 点阵/半色调/光学放大镜组件库
│   └── mfp-ui.js                    # Specimen #02 ASCII 进度条/双模频谱/环境合成器/番茄钟组件库
└── sites/                           # 各神级网站独立自包含归档目录
    ├── 01-truejpeg/                 # Specimen #01: True JPEG 完整复刻、server 与 Prompt 手册
    └── 02-musicforprogramming/      # Specimen #02: musicForProgramming(); 完整复刻、server 与交互实验室
```

- **`main` 分支**：保持根目录纯粹干净，仅包含总览文档、`shared-ui/` 通用组件库以及 `sites/` 下按编号归档的各个独立站点文件夹。
- **`truejpeg` 分支**：根目录直接作为 `True JPEG` 单站点的独立分支快照。
