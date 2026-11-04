# decon-web // 解构网页

> **Deconstructing craft-obsessed, god-tier websites.**
> 拆解与复刻全球极具审美统治力、微交互巧思与工程美学的「神级独立网站」，提炼可复用的零依赖 UI 组件与设计心法。

---

## ⚠️ Educational Attribution & Disclaimer (致敬与声明)

本项目仅作为**前端视觉工程、Canvas 物理交互与 UI 架构的拆解学习仓库（Educational Deconstruction & UI Study）**：
- **Specimen #01 (`True JPEG`)**：原始网站设计、前端架构与 AI 图像/提示词作品版权均归原作者 **TJ ([@RTJLDR](https://x.com/RTJLDR))** 及官方站点 **[truejpeg.com](https://truejpeg.com/)** 所有。
- 为保持 Git 仓库轻量与合规，本仓库**不包含**原站的图像资产（`images/` 目录已在 `.gitignore` 中忽略）。本地运行 `server.js` 时支持按需回源缓存，或通过 `node sync_images.js` 脚本在本地拉取离线缓存。

---

## 🗂️ Specimens Catalog (已收录标本)

| 编号 | 网站名称 | 核心美学 / 技术标签 | 1:1 复刻实现 | 独立组件库 | 深度拆解手册 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#01** | **[True JPEG](https://truejpeg.com/)** (`@RTJLDR`) | 点阵工业风 / 半色调显影 / 硬件标尺 / Vanilla JS + OffscreenCanvas | [`sites/01-truejpeg/`](./sites/01-truejpeg/) (或切换至 `truejpeg` 分支) | [`shared-ui/truejpeg-ui.js`](./shared-ui/truejpeg-ui.js) | [`PROMPTS_CATALOG.md`](./sites/01-truejpeg/PROMPTS_CATALOG.md) |

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

### 2. 如何本地运行 (Quick Start)

```bash
# 1. 启动本地 1:1 镜像服务器（默认监听 http://127.0.0.1:6060/）
node server.js

# 2. （可选）全量下载 727 个图像文件到本地 images/ 目录以实现 100% 离线秒开
node sync_images.js
```

启动后可访问：
- **1:1 完整复刻站（含 `INK / PAPER` 主题切换）**：`http://127.0.0.1:6060/`
- **抽离组件交互实验室 & 154 组 Prompt 检索库**：`http://127.0.0.1:6060/lab.html`

---

## 📦 仓库分支说明 (Hybrid Architecture)

- **`main` 分支**：作为 `decon-web` 的总览门户，按 `sites/01-truejpeg/`、`sites/02-.../` 归档各个神级网站的复刻实现，并在 `shared-ui/` 中沉淀抽离出的零依赖原生组件。
- **`truejpeg` 分支**：纯粹对应 `True JPEG` 单站点的独立分支。
