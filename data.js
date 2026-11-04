/*
 * 站点信息在这个文件里，改完刷新页面即可。
 *
 * 作品列表在 works.js，由 tools/import_export.py 从 gallery-export.zip 生成，不要手改。
 * 每一项可用字段：
 *   id        链接里的编号，分享链接形如 index.html#001
 *   title     标题
 *   image     原图路径；thumb 缩略图路径（网格用缩略图、详情用原图）
 *   width / height  原图像素尺寸
 *   prompt    提示词（点击复制的内容）；negative 反向提示词（可选）
 *   tags      分类，会自动生成顶部筛选
 *   params    任意参数，按键值显示在详情里，如 { Model: "..." }
 *   date      日期；post 原帖链接
 *   slot      空位预览（如 "16:9"），只占位置、不可点开，以后换成真图即可
 */
window.GALLERY = {
  site: {
    name: "True JPEG",
    handle: "@RTJLDR",
    x: "https://x.com/RTJLDR",
    tagline: "Images, and the words that made them.",
    intro: "Every piece here ships with its full prompt. Hit copy, paste it into your generator, and make it yours.",
    // 本站生图（Generate 里的 On True JPEG）是否开放。false：卡片亮红灯、显示筹备中、点不进去，图片页的"用它生成"也隐藏。
    // 真正开放时这里改成 true，并把 wrangler.jsonc 里的 STUDIO_OPEN 改成 "1"（服务器那边的开关）
    studio: false,
    // Generate 页面的推荐链接（佣金链接），key 对应 index.html 里的卡片。url 留空，那张卡片就不显示
    tools: [
      { key: "higgsfield", name: "Higgsfield", url: "https://higgsfield.ai?fpr=rtjldr" },
      { key: "yir", name: "Yir", url: "https://yir.ai/?ref=RTJLDR" },
    ],
  },

  works: window.GALLERY_WORKS || [],
};
