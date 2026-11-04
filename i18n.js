(() => {
  'use strict';

  /* Interface text in English, Japanese and Chinese. Titles set in dots, section names, model names,
   * work titles and prompts stay as they are. Each entry is [en, ja, zh]; {name} is filled from vars or
   * from the values passed to t(). Elements carry data-i18n="key" (inner HTML) and
   * data-i18n-attr="attr:key,attr:key". Anything drawn by script listens for the tj:lang event. */
  const D = {
    // home
    index: ['Index', 'トップ', '首页'],
    live: ['Live', '公開中', '开放中'],
    soon: ['Soon', '準備中', '筹备中'],
    external: ['External', '外部サイト', '外部网站'],
    here: ['Here', '本サイト', '本站'],
    section: ['Section', 'セクション', '版块'],
    enter: ['Enter', '開く', '进入'],
    status: ['Status', '状態', '状态'],
    works: ['{count} works', '{count} 作品', '{count} 件作品'],
    worksGo: ['{count} works <i>→</i>', '{count} 作品を見る <i>→</i>', '查看 {count} 件作品 <i>→</i>'],
    promptDesc: ['Images with their full prompts. Copy one, paste it into your generator.',
      '画像と、それを作ったプロンプトのすべて。コピーして、お使いの生成ツールに貼り付けるだけ。',
      '每张图都附完整提示词。复制下来，粘贴到你的生图工具里。'],
    twoWays: ['Two ways', '2つの方法', '两种方式'],
    twoWaysGo: ['Two ways <i>→</i>', '2つの方法 <i>→</i>', '两种方式 <i>→</i>'],
    genDesc: ['Make images with closed models, on Higgsfield or on Yir with your own API key.',
      'クローズドモデルで画像を生成。Higgsfield で、または Yir で自分の API キーを使って。',
      '用闭源模型生成图片：去 Higgsfield，或去 Yir 用你自己的 API Key。'],
    empty: ['Empty', '空き', '空'],
    otherDesc: ['Notes, experiments and everything else.', 'メモ、実験、そのほかいろいろ。', '笔记、实验，以及其他一切。'],
    inPrepGo: ['In preparation <i>→</i>', '準備中 <i>→</i>', '筹备中 <i>→</i>'],

    // prompt
    masonry: ['Masonry', 'メイソンリー', '瀑布流'],
    rows: ['Rows', '行', '横排'],
    layoutAria: ['{name} layout', 'レイアウト：{name}', '{name}布局'],
    small: ['Small', '小', '小'],
    medium: ['Medium', '中', '中'],
    large: ['Large', '大', '大'],
    sizeAria: ['{name} size', 'サイズ：{name}', '{name}尺寸'],
    category: ['Category', 'カテゴリー', '分类'],
    catAll: ['All', 'すべて', '全部'],
    catPortrait: ['Portrait', 'ポートレート', '人像'],
    catAnime: ['Anime', 'アニメ', '动漫'],
    catPoster: ['Poster', 'ポスター', '海报'],
    catNsfw: ['NSFW', 'NSFW', 'NSFW'],
    ageTitle: ['Adults only', '成人向け', '仅限成年人'],
    ageText: ['This category contains sexually suggestive images. Please confirm you are 18 or older to continue.', 'このカテゴリーには性的な表現を含む画像があります。18歳以上の方のみご覧いただけます。', '此分类包含性感、成人向的图片，仅限年满 18 岁的用户查看。'],
    ageYes: ['I am 18 or older', '18歳以上です', '我已满 18 岁'],
    ageNo: ['Go back', '戻る', '返回'],
    catAria: ['{name}, {count} works', '{name}、{count} 作品', '{name}，{count} 件作品'],
    foot: ['© {year} {site} // All images AI-generated', '© {year} {site} // 画像はすべて AI 生成', '© {year} {site} // 所有图片均由 AI 生成'],
    follow: ['Follow {handle} on X ↗', 'X で {handle} をフォロー ↗', '在 X 上关注 {handle} ↗'],
    legal: ['Terms &amp; Privacy', '規約・プライバシー', '条款与隐私'],
    'tag.Portrait': ['Portrait', 'ポートレート', '人像'],
    'tag.AI Art': ['AI Art', 'AI アート', 'AI 艺术'],
    copy: ['Copy', 'コピー', '复制'],
    copied: ['Copied', 'コピー済み', '已复制'],
    copyPrompt: ['Copy prompt', 'プロンプトをコピー', '复制提示词'],
    showPrompt: ['Show prompt', 'プロンプトを表示', '显示提示词'],
    hidePrompt: ['Hide prompt', 'プロンプトを隠す', '收起提示词'],
    copyPromptOf: ['Copy prompt of {title}', '{title} のプロンプトをコピー', '复制 {title} 的提示词'],
    copyNeg: ['Copy negative prompt', 'ネガティブプロンプトをコピー', '复制反向提示词'],
    openWork: ['Open No.{no} {title}', 'No.{no} {title} を開く', '打开 No.{no} {title}'],
    prompt: ['Prompt', 'プロンプト', '提示词'],
    negative: ['Negative', 'ネガティブ', '反向提示词'],
    copyLink: ['Copy link', 'リンクをコピー', '复制链接'],
    useIt: ['Generate with it →', 'このプロンプトで生成 →', '用它生成 →'],
    genNow: ['Generate now', '今すぐ生成', '现在生成'],
    keysLine: ['<kbd>←</kbd><kbd>→</kbd> BROWSE // <kbd>C</kbd> COPY // <kbd>ESC</kbd> CLOSE',
      '<kbd>←</kbd><kbd>→</kbd> 移動 // <kbd>C</kbd> コピー // <kbd>ESC</kbd> 閉じる',
      '<kbd>←</kbd><kbd>→</kbd> 切换 // <kbd>C</kbd> 复制 // <kbd>ESC</kbd> 关闭'],
    prev: ['Previous', '前へ', '上一张'],
    next: ['Next', '次へ', '下一张'],
    backToTop: ['Back to top', 'トップへ戻る', '回到顶部'],
    close: ['Close', '閉じる', '关闭'],
    'meta.Date': ['Date', '日付', '日期'],
    'meta.Model': ['Model', 'モデル', '模型'],
    promptCopied: ['Prompt copied', 'プロンプトをコピーしました', '已复制提示词'],
    negCopied: ['Negative prompt copied', 'ネガティブプロンプトをコピーしました', '已复制反向提示词'],
    linkCopied: ['Link copied', 'リンクをコピーしました', '已复制链接'],
    copyFailed: ['Copy failed — select the text and copy it manually', 'コピーできませんでした。テキストを選択して手動でコピーしてください', '复制失败，请选中文字手动复制'],

    // generate
    points: ['Points', 'ポイント', '点数'],
    apiKey: ['API key', 'API キー', 'API Key'],
    account: ['Account', 'アカウント', '账户'],
    back: ['Back', '戻る', '返回'],
    onHere: ['On True JPEG', 'True JPEG で', '在 True JPEG'],
    hereDesc: ['No API key, no foreign card. Top up and go.', 'API キーも海外カードも不要。チャージしてすぐ使える。', '不用 API Key，不用外币卡，充值就能用。'],
    startGo: ['Start <i>→</i>', 'はじめる <i>→</i>', '开始 <i>→</i>'],
    onYir: ['On Yir', 'Yir で', '在 Yir'],
    onHiggs: ['On Higgsfield', 'Higgsfield で', '在 Higgsfield'],
    higgsDesc: ['Image and video models, <em>all in one app</em>.', '画像も動画も、<em>ひとつのアプリで</em>。', '图片和视频模型，<em>一个应用里全都有</em>。'],
    makes: ['Makes', '生成できるもの', '可生成'],
    imgVideo: ['Image · Video', '画像・動画', '图片 · 视频'],
    toolDesc: ['Same models, up to <em>88% cheaper</em> than official prices.', '同じモデルが、公式価格より<em>最大 88% 安い</em>。', '同样的模型，比官方价<em>最多便宜 88%</em>。'],
    visit: ['Visit', 'サイトへ', '访问'],
    // the link earns a commission, so it stays labeled (FTC / Japan's stealth-marketing rule)
    // Yir's own name for the page that makes images (its sidebar, flask icon)
    toolWhere: ['Generate in', '生成は', '生成入口'],
    toolSide: ['Sidebar', 'サイドバー', '侧栏'],
    toolPlace: ['Playground', 'Playground', '调试台'],
    toolFine: ['Affiliate link', '広告（アフィリエイトリンク）', '推广链接'],

    // studio
    signIn: ['Sign in', 'ログイン', '登录'],
    signOut: ['Sign out', 'ログアウト', '退出'],
    lead: ['Make an image. Pay per image.', '1枚ずつ生成、1枚ずつ支払い。', '生成一张，付一张的钱。'],
    studioIntro: ['Closed models from OpenAI, Google, ByteDance, xAI and Recraft. Each image costs a fixed number of points. If the model declines your prompt or the job fails, the points come back.',
      'OpenAI、Google、ByteDance、xAI、Recraft のクローズドモデル。1枚ごとに決まったポイントを使います。モデルがプロンプトを拒否した場合や生成に失敗した場合、ポイントは戻ります。',
      '来自 OpenAI、Google、字节跳动、xAI 和 Recraft 的闭源模型。每张图消耗固定点数。模型拒绝提示词或生成失败时，点数自动退回。'],
    balance: ['Balance', '残高', '余额'],
    ptsUnit: ['pts', 'pt', '点'],
    expires: ['Expires', '有効期限', '到期'],
    buyPointsGo: ['Buy points <i>→</i>', 'ポイントを購入 <i>→</i>', '购买点数 <i>→</i>'],
    model: ['Model', 'モデル', '模型'],
    size: ['Size', 'サイズ', '尺寸'],
    ref: ['Reference', '参考画像', '参考图'],
    viewRef: ['View reference image', '参考画像を見る', '查看参考图'],
    download: ['Download', 'ダウンロード', '下载'],
    aspect: ['Aspect', '比率', '比例'],
    describePh: ['DESCRIBE THE IMAGE_', '画像の内容を書いてください_', '描述你想要的图片_'],
    generate: ['Generate', '生成', '生成'],
    signToGen: ['Sign in to generate', 'ログインして生成', '登录后生成'],
    buyPoints: ['Buy points', 'ポイントを購入', '购买点数'],
    sending: ['Sending', '送信中', '提交中'],
    noteSign: ['Signing in takes one email, no password.', 'ログインはメール1通だけ。パスワードは不要です。', '登录只需一封邮件，不用密码。'],
    noteShort: ['This image costs {c} pts. You have {b}.', 'この画像は {c} pt。残高は {b} pt です。', '这张图需要 {c} 点，你有 {b} 点。'],
    noteBal: ['{b} pts now // {a} after this image', '現在 {b} pt // 生成後 {a} pt', '当前 {b} 点 // 生成后 {a} 点'],
    costPts: ['{n} PTS', '{n} PT', '{n} 点'],
    ptsN: ['{n} pts', '{n} pt', '{n} 点'],
    native: ['Native', 'ネイティブ', '原生'],
    signinText: ['Enter your email. We send a one-time link, no password.', 'メールアドレスを入力してください。1回限りのログインリンクを送ります。パスワードは不要です。', '输入你的邮箱，我们会发一个一次性登录链接，不需要密码。'],
    closeSignin: ['Close sign in', 'ログインを閉じる', '关闭登录'],
    emailPh: ['EMAIL_', 'メールアドレス_', '邮箱_'],
    emailAria: ['Email address', 'メールアドレス', '邮箱地址'],
    sendLink: ['Send link', 'リンクを送信', '发送链接'],
    checkInbox: ['Check your inbox at {email}. The link works once, for 15 minutes.', '{email} の受信箱を確認してください。リンクは1回限り、15分間有効です。', '请查看 {email} 的收件箱。链接只能用一次，15 分钟内有效。'],
    yourImages: ['Your images', 'あなたの画像', '你的图片'],
    nothingYet: ['NOTHING YET // YOUR IMAGES APPEAR HERE', 'まだありません // 生成した画像はここに表示されます', '还没有图片 // 生成的图片会显示在这里'],
    loadMore: ['Load more', 'もっと見る', '加载更多'],
    ptRate: ['1 PT = $0.01 // TAX INCLUDED', '1 PT = $0.01 // 税込', '1 点 = $0.01 // 含税'],
    packPts: ['PTS', 'PT', '点'],
    bonus: ['+{n} BONUS', '+{n} ボーナス', '加赠 {n} 点'],
    baseRate: ['BASE RATE', '基本レート', '基础价'],
    packFoot: ['≈ {n} IMAGES AT {p} PTS <i>→</i>', '{p} pt の画像で約 {n} 枚 <i>→</i>', '按每张 {p} 点约 {n} 张 <i>→</i>'],
    packNote: ["Points last {d} days from purchase and can't be cashed out. Prices are in US dollars and include tax. Payment by Stripe.",
      'ポイントの有効期限は購入から {d} 日間で、換金はできません。価格は米ドル建て・税込です。決済は Stripe。',
      '点数自购买起 {d} 天内有效，不能提现。价格以美元计、含税。由 Stripe 收款。'],
    download: ['Download', 'ダウンロード', '下载'],
    reuse: ['Reuse prompt', 'プロンプトを再利用', '再用这个提示词'],
    queued: ['Queued', '待機中', '排队中'],
    generating: ['Generating', '生成中', '生成中'],
    refundedTag: ['REFUNDED', '返還済み', '已退点'],
    openFull: ['Open full image', '元の画像を開く', '打开原图'],
    writePrompt: ['Write a prompt first', '先にプロンプトを入力してください', '请先写提示词'],
    signedOut: ['Signed out', 'ログアウトしました', '已退出'],
    signedIn: ['Signed in', 'ログインしました', '已登录'],
    pointsAdded: ['Points added', 'ポイントを追加しました', '点数已到账'],
    stillProcessing: ['Payment is still processing. Points appear once it clears.', 'お支払いを処理中です。完了するとポイントが反映されます。', '付款仍在处理中，完成后点数会到账。'],
    offline: ['The generator is offline right now.', '現在、生成ツールはオフラインです。', '生图服务暂时离线。'],
    offlineNote: ['GENERATOR OFFLINE // TRY AGAIN LATER', '生成ツールはオフライン // 後でもう一度お試しください', '生图服务离线 // 请稍后再试'],

    // generation failures; the server stores the English text, matched in failText()
    genFailed: ['Generation failed. Points refunded.', '生成に失敗しました。ポイントは返還済みです。', '生成失败，点数已退回。'],
    failedShort: ['Failed. Points refunded.', '失敗しました。ポイントは返還済みです。', '失败，点数已退回。'],
    declined: ['The model declined this prompt. Points refunded.', 'モデルがこのプロンプトを拒否しました。ポイントは返還済みです。', '模型拒绝了这个提示词，点数已退回。'],
    overCap: ['This model is not available at this price right now. Points refunded. Try again later or pick another model.',
      'このモデルは現在この価格では利用できません。ポイントは返還済みです。時間をおくか、別のモデルをお試しください。',
      '这个模型目前无法按此价格使用，点数已退回。请稍后再试，或换一个模型。'],
    tempOff: ['Generation is temporarily unavailable. Points refunded.', '生成は一時的に利用できません。ポイントは返還済みです。', '生成暂时不可用，点数已退回。'],
    refundedSuffix: [' Points refunded.', ' ポイントは返還済みです。', ' 点数已退回。'],

    // server error codes (worker fail()); English keeps the server's own message
    'err.bad_email': ['', '正しいメールアドレスを入力してください。', '请输入有效的邮箱地址。'],
    'err.too_many_links': ['', 'ログインメールの送信回数が上限に達しました。1時間後にもう一度お試しください。', '登录邮件发送次数过多，请一小时后再试。'],
    'err.mail_failed': ['', 'メールを送信できませんでした。しばらくしてからもう一度お試しください。', '邮件发送失败，请稍后再试。'],
    'err.bad_token': ['', 'このログインリンクは無効、期限切れ、または使用済みです。', '这个登录链接无效、已过期或已被使用。'],
    'err.signed_out': ['', '先にログインしてください。', '请先登录。'],
    'err.empty_prompt': ['', '先にプロンプトを入力してください。', '请先写提示词。'],
    'err.long_prompt': ['', 'プロンプトは {n} 文字までです。', '提示词最多 {n} 个字符。'],
    'err.bad_spec': ['', 'このモデルはそのサイズに対応していません。', '这个模型不支持这个尺寸。'],
    'err.generation_off': ['', '生成機能はまだ準備できていません。', '生图功能尚未开通。'],
    'err.too_many_open': ['', '同時に生成できるのは {n} 枚までです。', '最多同时生成 {n} 张。'],
    'err.no_points': ['', 'ポイントが足りません。ポイントを購入してください。', '点数不足，请购买点数包。'],
    'err.payments_off': ['', '決済はまだ準備できていません。', '支付尚未开通。'],
    'err.stripe_error': ['', '決済サービスでエラーが発生しました。しばらくしてからもう一度お試しください。', '支付服务出错，请稍后再试。'],
    'err.offline': ['', '現在、生成ツールはオフラインです。', '生图服务暂时离线。'],

    // other
    inPrep: ['In preparation.', '準備中です。', '筹备中。'],
    comingSoon: ['Coming soon', '近日公開', '即将上线'],

    // the switch itself
    language: ['Language', '言語', '语言'],
  };

  const LANGS = ['en', 'ja', 'zh'];
  const HTML_LANG = { en: 'en', ja: 'ja', zh: 'zh-Hans' };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const saved = (() => { try { return JSON.parse(localStorage.getItem('tj.lang')); } catch (_) { return null; } })();
  const guess = (navigator.languages || [navigator.language || 'en']).map((l) => String(l).slice(0, 2).toLowerCase()).find((l) => LANGS.includes(l));
  let lang = LANGS.includes(saved) ? saved : guess || 'en';
  const vars = {};

  // {name} placeholders are escaped; the dictionary text itself may hold markup
  function t(key, v = {}) {
    const row = D[key];
    let s = row ? (row[LANGS.indexOf(lang)] || row[0]) : key;
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? esc(v[k]) : k in vars ? esc(vars[k]) : m));
  }
  // plain text for textContent, toasts and attributes
  const tx = (key, v) => {
    const el = document.createElement('i');
    el.innerHTML = t(key, v);
    return el.textContent;
  };
  const has = (key) => key in D;

  function apply(root = document) {
    document.documentElement.lang = HTML_LANG[lang];
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const html = t(el.dataset.i18n);
      if (el.innerHTML !== html) el.innerHTML = html;
    });
    root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(',').forEach((pair) => {
        const [attr, key] = pair.split(':');
        el.setAttribute(attr, tx(key));
      });
    });
  }

  // server errors arrive with a code; generation failures arrive as the stored English sentence
  function errText(code, msg) {
    if (lang === 'en' || !has(`err.${code}`)) return msg;
    return tx(`err.${code}`, { n: (String(msg).match(/\d+/) || [''])[0] });
  }
  const FAIL = {
    'Generation failed. Points refunded.': 'genFailed',
    'Failed. Points refunded.': 'failedShort',
    'The model declined this prompt. Points refunded.': 'declined',
    'This model is not available at this price right now. Points refunded. Try again later or pick another model.': 'overCap',
    'Generation is temporarily unavailable. Points refunded.': 'tempOff',
  };
  function failText(msg) {
    if (!msg) return tx('failedShort');
    if (FAIL[msg]) return tx(FAIL[msg]);
    const tail = ' Points refunded.';
    return msg.endsWith(tail) ? msg.slice(0, -tail.length) + tx('refundedSuffix') : msg;
  }

  window.TJ_I18N = {
    LANGS,
    get lang() { return lang; },
    vars,
    t, tx, has, apply, errText, failText,
    // the English tagline and intro live in data.js
    setEn(key, text) { if (D[key] && text) D[key][0] = text; },
    // swap the words; the switch in app.js wraps this in the transition
    set(next) {
      if (!LANGS.includes(next) || next === lang) return false;
      lang = next;
      try { localStorage.setItem('tj.lang', JSON.stringify(lang)); } catch (_) { /* private mode */ }
      apply();
      document.dispatchEvent(new CustomEvent('tj:lang', { detail: lang }));
      return true;
    },
  };
  document.documentElement.lang = HTML_LANG[lang];
})();
