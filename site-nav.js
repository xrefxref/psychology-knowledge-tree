/* ============================================================
 * site-nav.js — 全站统一顶部导航栏注入
 * 林远见路 · shenzhen-ai.icu
 * 在 index.html 之外的每个主页面顶部注入与首页一致的深色导航栏
 * （首页自带原生导航，检测到 #navLinks 时自动跳过注入）
 * 引入方式：<script src="site-nav.js?v=20261015" defer></script>
 * ============================================================ */
(function () {
  "use strict";
  function init() {
    // 首页有原生导航栏，跳过
    if (document.getElementById("navLinks")) return;

    var HOME = "index.html";
    var MENUS = [
      { label: "测一测你的搞钱人格", href: "test-suite.html", items: [
        ["搞钱测试集", "test-suite.html", true],
        ["搞钱心智检测", "money-mind.html"],
        ["霍兰德测试", "holland-test.html"],
        ["职业锚", "career-anchor.html"],
        ["MBTI", "mbti-test.html"],
        ["优势才干", "strengths.html"],
        ["人生设计", "life-design.html"],
        ["商业模式画布", "personal-bmc.html"],
        ["创业者基因", "smart-illicit.html", true]
      ]},
      { label: "学习", href: "book-notes.html", items: [
        ["知识图谱", "knowledge-map.html"],
        ["时间树", "timeline.html"],
        ["阅读宇宙", "knowledge-graph.html"],
        ["必读书目", "book-notes.html"],
        ["3D 大脑模型", "brain-3d.html"]
      ]},
      { label: "放松", href: "mind-game.html", items: [
        ["CBT 思维挑战", "mind-game.html"],
        ["SPARX 游戏治疗", "sparx.html"],
        ["心象城市", "mind-city.html"]
      ]}
    ];

    var css = [
      ".sn-header{position:fixed;top:0;left:0;right:0;height:64px;padding:0 40px;display:flex;justify-content:space-between;align-items:center;",
      "background:rgba(7,8,10,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);",
      "border-bottom:1px solid #1b1c1e;z-index:99970;box-sizing:border-box;",
      "font-family:system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;}",
      ".sn-header *{box-sizing:border-box;}",
      ".sn-logo{font-size:18px;font-weight:700;color:#f8fafc;display:flex;align-items:center;gap:10px;text-decoration:none;}",
      ".sn-logo-icon{width:28px;height:28px;background:linear-gradient(135deg,#3d7bff,#3ef3ff);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:600;}",
      ".sn-nav{display:flex;align-items:center;gap:24px;flex-wrap:wrap;row-gap:8px;}",
      ".sn-nav > a,.sn-nav .sn-item > a{color:#9c9c9d;text-decoration:none;font-size:14px;transition:color .3s;white-space:nowrap;}",
      ".sn-nav > a:hover,.sn-nav .sn-item > a:hover{color:#f4f4f6;}",
      ".sn-item{position:relative;}",
      ".sn-item > a{display:inline-flex;align-items:center;gap:4px;}",
      ".sn-item > a::after{content:'\\25BE';font-size:10px;color:#64748b;transition:transform .3s;}",
      ".sn-item:hover > a::after{transform:rotate(180deg);}",
      "/* 悬停桥：仅板块项自身宽度，防止间隙抖动且不遮挡邻居 */",
      ".sn-item::before{content:'';position:absolute;top:100%;left:0;right:0;height:14px;}",
      ".sn-drop{position:absolute;top:100%;left:50%;transform:translateX(-50%) translateY(8px);min-width:150px;",
      "background:rgba(12,13,15,.98);border:1px solid #242728;border-radius:10px;padding:8px 0;display:flex;flex-direction:column;",
      "opacity:0;visibility:hidden;transition:opacity .25s,transform .25s,visibility .25s;box-shadow:0 12px 30px rgba(0,0,0,.4);z-index:99971;}",
      ".sn-item:hover .sn-drop{opacity:1;visibility:visible;transform:translateX(-50%) translateY(2px);}",
      ".sn-drop a{display:block;padding:9px 18px;font-size:13px;white-space:nowrap;text-decoration:none;color:#9c9c9d;transition:color .3s;}",
      ".sn-drop a:hover{background:rgba(87,193,255,.10);color:#f4f4f6;}",
      ".sn-drop a.sn-gold{color:#ffc533;}",
      ".sn-right{display:flex;align-items:center;gap:12px;}",
      ".sn-login{background:rgba(255,255,255,.85);border:none;color:#18191a;font-size:13px;font-weight:600;",
      "padding:8px 16px;border-radius:8px;cursor:pointer;font-family:inherit;white-space:nowrap;transition:background .2s;}",
      ".sn-login:hover{background:#fff;}",
      ".sn-toggle{display:none;background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;padding:4px 8px;font-family:inherit;}",
      ".sn-spacer{height:64px;}",
      "@media (max-width:768px){",
      "  .sn-header{padding:12px 20px;}",
      "  .sn-nav{display:none;position:absolute;top:100%;left:0;right:0;background:rgba(12,13,15,.98);",
      "  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);flex-direction:column;align-items:flex-start;",
      "  padding:16px 20px;gap:12px;border-bottom:1px solid #1b1c1e;}",
      "  .sn-nav.sn-open{display:flex;}",
      "  .sn-toggle{display:block;}",
      "  .sn-drop,.sn-item:hover .sn-drop{position:static;transform:none;opacity:1;visibility:visible;background:transparent;",
      "  border:none;box-shadow:none;padding:2px 0 2px 14px;min-width:0;display:flex;}",
      "  .sn-item::before{display:none;}",
      "  .sn-drop a{padding:7px 0;}",
      "}"
    ].join("");
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var nav = MENUS.map(function (m) {
      var links = m.items.map(function (it) {
        return '<a href="' + it[1] + '"' + (it[2] ? ' class="sn-gold"' : "") + ">" + it[0] + "</a>";
      }).join("");
      return '<div class="sn-item"><a href="' + m.href + '">' + m.label + "</a>" +
             '<div class="sn-drop">' + links + "</div></div>";
    }).join("");

    var header = document.createElement("header");
    header.className = "sn-header";
    header.innerHTML =
      '<a class="sn-logo" href="' + HOME + '"><span class="sn-logo-icon">心</span><span>搞钱心理学实验室</span></a>' +
      '<nav class="sn-nav" id="snNav">' +
      '  <a href="' + HOME + '">首页</a>' + nav +
      '  <a href="' + HOME + '#community">社区</a>' +
      '  <a href="' + HOME + '#host">关于我</a>' +
      "</nav>" +
      '<div class="sn-right">' +
      '  <button class="sn-login" type="button">登录 / 注册</button>' +
      '  <button class="sn-toggle" type="button" aria-label="菜单">☰</button>' +
      "</div>";

    var spacer = document.createElement("div");
    spacer.className = "sn-spacer";

    document.body.insertBefore(spacer, document.body.firstChild);
    document.body.insertBefore(header, spacer);

    header.querySelector(".sn-toggle").addEventListener("click", function () {
      header.querySelector("#snNav").classList.toggle("sn-open");
    });
    // 全部站内导航链接点击后收起移动面板
    header.querySelector("#snNav").addEventListener("click", function (e) {
      if (e.target.tagName === "A") header.querySelector("#snNav").classList.remove("sn-open");
    });
    header.querySelector(".sn-login").addEventListener("click", function () {
      if (typeof window.showAuthModal === "function") { window.showAuthModal(); }
      else {
        try { sessionStorage.setItem("sn_open_login", "1"); } catch (e) {}
        location.href = HOME;
      }
    });

    // 全站统一页脚（含备案号）：仅在没有原生 footer 的子页注入
    if (!document.querySelector("footer")) {
      var fc = ".sn-footer{padding:28px 24px 40px;text-align:center;color:rgba(154,157,160,.85);font-size:13px;line-height:1.9;border-top:1px solid #1b1c1e;margin-top:48px;}";
      fc += ".sn-footer a{color:inherit;text-decoration:none;}";
      var fstyle = document.createElement("style");
      fstyle.textContent = fc;
      document.head.appendChild(fstyle);

      var footer = document.createElement("footer");
      footer.className = "sn-footer";
      footer.innerHTML =
        '<div>搞钱心理学实验室 · 林远见路</div>' +
        '<div>把心理学变成你的搞钱地图</div>' +
        '<div style="margin-top:6px;opacity:.75;"><a href="https://beian.miit.gov.cn" target="_blank" rel="noopener">粤ICP备2026030540号-2</a></div>';
      document.body.appendChild(footer);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
