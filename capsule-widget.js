/* ============================================================
 * 搞钱锦囊 · 悬浮抽取插件 (capsule-widget.js)
 * 林远见路 · shenzhen-ai.icu
 * 悬浮按钮 + 弹层抽取，与 money-capsule.html 共用每日 3 次额度
 * 引入方式：<script src="capsule-widget.js?v=20261015" defer></script>
 * ============================================================ */
(function () {
  "use strict";
  if (window.__CAPSULE_WIDGET__) return;
  window.__CAPSULE_WIDGET__ = true;

  /* ── 锦囊内容：与 money-capsule.html 保持同步 ── */
  var TIPS = [
    "先给钱安排岗位再让它上岗：工资到账先分三份——生存、成长、享乐。",
    "把\u201c我买不起\u201d换成\u201c我怎样才能买得起\u201d，大脑才肯开工找答案。",
    "冲动消费的克星不是意志力，是\u201c放进购物车睡一觉再决定\u201d。",
    "存钱不是抠门，是给未来那个更值钱的自己发工资。",
    "别用消费制造勤奋的错觉：买课程不等于学习，买装备不等于开始。",
    "记账三天，你就会发现钱是怎么替你做决定的。",
    "你的注意力花在哪，你的钱迟早跟到哪——先管好刷手机的手。",
    "涨薪最快的人不是最忙的，是最能说清自己值多少钱的。",
    "每月留一笔\u201c犯傻额度\u201d，允许小错，才能避免大错。",
    "账户余额，就是你对不喜欢的事说\u201c不\u201d的底气。",
    "情绪上头时别做大额决定：先处理心情，再处理账单。",
    "把大目标拆成\u201c每天 50 块\u201d，坚持比金额更重要。",
    "免费的东西最贵——用你的时间和注意力去衡量一下。",
    "先让一部分钱动起来，钱才愿意跟你走。",
    "别在深夜下单，别在兴奋时签约，别在沮丧时清仓。",
    "技能是你唯一不会贬值的资产，持续给它复利。",
    "你身边最常来往的五个人，正在校准你的赚钱标准。",
    "赚钱的本质是帮别人解决问题——问题越大，回报越高。",
    "报价时先沉默三秒，你会惊讶于自己的底气值多少钱。",
    "把\u201c等有钱了再说\u201d改成\u201c先做到再说\u201d，顺序反了就永远等不到。",
    "消费让你爽一次，投资让你爽很多次——分配比例暴露你的未来。",
    "小钱大方的样子很贵，大钱谨慎的样子才值钱。",
    "复盘比努力便宜，却比努力值钱：每月花一小时看账单。",
    "\u201c懂\u201d和\u201c会\u201d之间隔着一万次练习，搞钱也一样。",
    "拒绝一次无效社交，你就多了一小时自我增值的时间。",
    "钱是工具不是主人：让它为你工作，别为它工作一辈子。",
    "复利的朋友是时间，敌人是中断——先做到不断，再谈多少。",
    "今天能留住的钱，就是你明天的选择权。"
  ];
  var KEY = "capsule_daily";
  var MAX = 3;

  function today() { return new Date().toISOString().slice(0, 10); }
  function getUsed() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || "{}");
      return d.date === today() ? (d.count || 0) : 0;
    } catch (e) { return 0; }
  }
  function useOne() {
    var n = getUsed() + 1;
    try { localStorage.setItem(KEY, JSON.stringify({ date: today(), count: n })); } catch (e) {}
    return n;
  }
  var lastTip = "";
  function drawTip() {
    var t;
    var guard = 0;
    do { t = TIPS[Math.floor(Math.random() * TIPS.length)]; guard++; } while (t === lastTip && guard < 10);
    lastTip = t;
    return t;
  }

  /* ── 样式注入 ── */
  var css = [
    ".cw-btn{position:fixed;right:16px;bottom:calc(56px + env(safe-area-inset-bottom));z-index:99990;",
    "width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;",
    "background:linear-gradient(160deg,#a03a24,#7c2c1a);color:#f7ecd8;",
    "box-shadow:0 6px 18px rgba(124,44,26,.4);display:flex;flex-direction:column;align-items:center;justify-content:center;",
    "font-family:inherit;line-height:1.1;transition:transform .15s;-webkit-tap-highlight-color:transparent;}",
    ".cw-btn:active{transform:scale(.92);}",
    ".cw-btn .cw-ico{font-size:22px;}",
    ".cw-btn .cw-txt{font-size:9px;letter-spacing:1px;margin-top:1px;}",
    ".cw-btn .cw-badge{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;border-radius:9px;",
    "background:#2f5d50;color:#f3efe4;font-size:10px;display:flex;align-items:center;justify-content:center;padding:0 4px;",
    "box-shadow:0 2px 5px rgba(0,0,0,.25);}",
    ".cw-btn .cw-badge.zero{background:#8a7f6d;}",
    ".cw-mask{position:fixed;inset:0;background:rgba(30,25,18,.55);z-index:99995;display:none;",
    "align-items:center;justify-content:center;padding:20px;}",
    ".cw-mask.show{display:flex;}",
    ".cw-modal{width:100%;max-width:340px;background:linear-gradient(180deg,#151823,#10121b);border-radius:12px;",
    "box-shadow:0 18px 48px rgba(0,0,0,.3);padding:26px 22px 20px;position:relative;",
    "font-family:'Noto Serif SC','Source Han Serif SC','Songti SC',STSong,SimSun,serif;color:#f2f4f8;",
    "animation:cwPop .25s cubic-bezier(.2,.9,.3,1.2);}",
    "@keyframes cwPop{from{opacity:0;transform:scale(.85) translateY(14px)}to{opacity:1;transform:none}}",
    ".cw-close{position:absolute;top:10px;right:12px;border:none;background:none;font-size:20px;color:#8a94a6;cursor:pointer;line-height:1;}",
    ".cw-kicker{display:block;text-align:center;font-size:10px;letter-spacing:5px;color:#b98a2f;margin-bottom:8px;}",
    ".cw-title{text-align:center;font-size:22px;letter-spacing:8px;text-indent:8px;font-weight:700;margin-bottom:4px;}",
    ".cw-quota{text-align:center;font-size:11px;color:#8a94a6;letter-spacing:2px;margin-bottom:14px;}",
    ".cw-quota b{color:#ffb347;}",
    ".cw-stage{min-height:170px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;}",
    ".cw-front{width:100%;padding:34px 16px;border-radius:10px;text-align:center;cursor:pointer;",
    "background:repeating-linear-gradient(45deg,rgba(185,138,47,.07) 0 2px,transparent 2px 14px),linear-gradient(160deg,#a03a24,#7c2c1a);",
    "color:#f7ecd8;box-shadow:0 10px 26px rgba(58,50,38,.18);transition:transform .12s;}",
    ".cw-front:active{transform:scale(.97);}",
    ".cw-front .cw-pouch{font-size:40px;display:block;margin-bottom:10px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.25));}",
    ".cw-front .cw-hint{font-size:11px;letter-spacing:3px;border:1px solid rgba(247,236,216,.4);border-radius:999px;padding:6px 16px;display:inline-block;",
    "animation:cwBreathe 2.2s ease-in-out infinite;}",
    ".cw-front.disabled{opacity:.5;cursor:default;}",
    "@keyframes cwBreathe{0%,100%{opacity:.55}50%{opacity:1}}",
    ".cw-result{width:100%;border-radius:10px;padding:24px 18px;text-align:center;",
    "background:repeating-linear-gradient(0deg,rgba(58,50,38,.02) 0 1px,transparent 1px 4px),linear-gradient(180deg,#12141d,#10121b);",
    "border:1px solid #232634;box-shadow:0 10px 26px rgba(0,0,0,.5);}",
    ".cw-result .cw-label{font-size:10px;letter-spacing:5px;color:#ffb347;}",
    ".cw-result .cw-seal{width:30px;height:2px;background:linear-gradient(90deg,#7c5cff,#ff4d6d,#ffb347);margin:10px auto 14px;}",
    ".cw-result .cw-tip{font-size:15px;line-height:1.9;font-weight:600;}",
    ".cw-acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}",
    ".cw-acts button{font-family:inherit;font-size:13px;letter-spacing:2px;padding:9px 20px;border-radius:999px;cursor:pointer;transition:transform .1s;}",
    ".cw-acts button:active{transform:scale(.95);}",
    ".cw-draw{background:#2f5d50;color:#f3efe4;border:none;box-shadow:0 4px 12px rgba(47,93,80,.3);}",
    ".cw-draw:disabled{opacity:.4;box-shadow:none;cursor:default;}",
    ".cw-copy,.cw-full{background:transparent;color:#8a94a6;border:1px solid #2a3040;text-decoration:none;display:inline-block;}",
    ".cw-foot{text-align:center;font-size:10px;color:#697080;letter-spacing:2px;margin-top:12px;line-height:1.8;}",
    ".cw-foot a{color:#ffb347;text-decoration:none;}",
    ".cw-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%) translateY(14px);z-index:99999;",
    "background:rgba(18,20,29,.95);color:#f2f4f8;font-size:12px;letter-spacing:2px;padding:8px 18px;border-radius:999px;",
    "opacity:0;pointer-events:none;transition:all .3s;}",
    ".cw-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}",
    "@media (max-width:400px){.cw-btn{width:52px;height:52px;right:12px;bottom:calc(52px + env(safe-area-inset-bottom));}.cw-btn .cw-ico{font-size:19px;}}"
  ].join("");
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* ── DOM ── */
  var btn = document.createElement("button");
  btn.className = "cw-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "搞钱锦囊今日一抽");
  btn.innerHTML = '<span class="cw-ico">🧧</span><span class="cw-txt">锦囊</span><span class="cw-badge"></span>';
  document.body.appendChild(btn);

  var mask = document.createElement("div");
  mask.className = "cw-mask";
  mask.innerHTML =
    '<div class="cw-modal" role="dialog" aria-label="搞钱锦囊">' +
    '  <button class="cw-close" type="button" aria-label="关闭">×</button>' +
    '  <span class="cw-kicker">搞钱心理学</span>' +
    '  <div class="cw-title">搞钱锦囊</div>' +
    '  <p class="cw-quota"></p>' +
    '  <div class="cw-stage"></div>' +
    '  <div class="cw-acts">' +
    '    <button class="cw-draw" type="button">抽一条</button>' +
    '    <button class="cw-copy" type="button">复制</button>' +
    '    <a class="cw-full" href="money-capsule.html">完整版</a>' +
    '  </div>' +
    '  <div class="cw-foot">林远见路 · 每天三次机会<br>关注公众号「林远见路」，每周拆解一条金钱心法</div>' +
    "</div>";
  document.body.appendChild(mask);

  var toast = document.createElement("div");
  toast.className = "cw-toast";
  document.body.appendChild(toast);

  var badge = btn.querySelector(".cw-badge");
  var quotaEl = mask.querySelector(".cw-quota");
  var stageEl = mask.querySelector(".cw-stage");
  var drawBtn = mask.querySelector(".cw-draw");
  var copyBtn = mask.querySelector(".cw-copy");
  var currentTip = "";

  function renderBadge() {
    var left = MAX - getUsed();
    badge.textContent = left > 0 ? left : "0";
    badge.className = "cw-badge" + (left > 0 ? "" : " zero");
  }
  function renderQuota() {
    var left = MAX - getUsed();
    quotaEl.innerHTML = left > 0
      ? "今日还可抽 <b>" + left + "</b> 次"
      : "今日 3 次已用完，明天再来";
  }
  function showFront() {
    var left = MAX - getUsed();
    stageEl.innerHTML = left > 0
      ? '<div class="cw-front"><span class="cw-pouch">🧧</span><span class="cw-hint">轻触抽取今日锦囊</span></div>'
      : '<div class="cw-front disabled"><span class="cw-pouch">🧧</span><span class="cw-hint">今日已抽完 · 明天再来</span></div>';
    var front = stageEl.querySelector(".cw-front");
    if (front && left > 0) front.addEventListener("click", doDraw);
  }
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(function () { toast.classList.remove("show"); }, 1800);
  }
  function doDraw() {
    if (getUsed() >= MAX) { renderQuota(); showFront(); drawBtn.disabled = true; return; }
    currentTip = drawTip();
    useOne();
    renderBadge();
    renderQuota();
    stageEl.innerHTML =
      '<div class="cw-result"><div class="cw-label">今日锦囊</div><div class="cw-seal"></div><div class="cw-tip"></div></div>';
    stageEl.querySelector(".cw-tip").textContent = currentTip;
    drawBtn.disabled = getUsed() >= MAX;
  }
  function open() {
    renderQuota();
    showFront();
    drawBtn.disabled = getUsed() >= MAX;
    mask.classList.add("show");
  }
  function close() { mask.classList.remove("show"); }

  btn.addEventListener("click", open);
  drawBtn.addEventListener("click", doDraw);
  mask.querySelector(".cw-close").addEventListener("click", close);
  mask.addEventListener("click", function (e) { if (e.target === mask) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  copyBtn.addEventListener("click", function () {
    if (!currentTip) { showToast("先抽一条锦囊吧"); return; }
    var text = "【搞钱锦囊】" + currentTip + " ——来自公众号「林远见路」";
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); showToast("已复制，去粘贴给朋友吧"); }
      catch (e) { showToast("复制失败，请长按手动复制"); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast("已复制，去粘贴给朋友吧"); }, fallback);
    } else { fallback(); }
  });
  renderBadge();
})();
