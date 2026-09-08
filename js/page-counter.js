/**
 * 页面访问计数器 - 在右下角显示"本页累计访问 X 次"
 *
 * 工作机制：
 *  1. 优先使用 CloudBase 数据库做跨用户统计（需后台启用匿名登录 + page_views 集合权限配置）
 *  2. CloudBase 不可用时，自动降级到 localStorage（仅本浏览器内的访问次数）
 *  3. 同一会话内对同一页面只计一次，避免刷新刷量
 *
 * 引入方式：在 HTML 的 </body> 前加 <script src="js/page-counter.js" defer></script>
 */
(function () {
    'use strict';

    var BADGE_ID = 'psy-page-counter-badge';
    var SESSION_KEY = 'psy_pv_session';   // sessionStorage 防同会话重复
    var LOCAL_KEY = 'psy_local_page_views'; // 本地兜底（与 cloudbase.js 一致）
    var CB_SDK = 'https://imgcache.qq.com/qcloud/cloudbase-js-sdk/1.7.0/cloudbase.full.js';
    var CB_APP_JS = 'js/cloudbase.js';
    var SCRIPT_BASE = (function () {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            var src = scripts[i].src || '';
            var m = src.match(/^(.*\/)js\/page-counter\.js/);
            if (m) return m[1];
        }
        return './';
    })();

    /* ---------- 本地计数兜底 ---------- */
    function localGet(pageKey) {
        try { return (JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'))[pageKey] || 0; }
        catch (e) { return 0; }
    }
    function localIncrement(pageKey) {
        try {
            var v = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
            v[pageKey] = (v[pageKey] || 0) + 1;
            localStorage.setItem(LOCAL_KEY, JSON.stringify(v));
            return v[pageKey];
        } catch (e) { return 0; }
    }

    /* ---------- 会话内防刷 ---------- */
    function isCounted(pageKey) {
        try {
            var s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
            return !!s[pageKey];
        } catch (e) { return false; }
    }
    function markCounted(pageKey) {
        try {
            var s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
            s[pageKey] = Date.now();
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
        } catch (e) {}
    }

    /* ---------- 页面标识 ---------- */
    function getPageKey() {
        var p = location.pathname.split('/').pop();
        if (!p || p === '') p = 'index.html';
        return p;
    }

    /* ---------- 显示徽章 ---------- */
    function renderBadge(count, source) {
        var badge = document.getElementById(BADGE_ID);
        if (!badge) {
            badge = document.createElement('div');
            badge.id = BADGE_ID;
            badge.style.cssText = [
                'position:fixed', 'right:16px', 'bottom:16px',
                'background:rgba(15,23,42,.82)', 'color:#a5b4fc',
                'font-size:12px', 'padding:8px 14px', 'border-radius:999px',
                'z-index:99999', 'font-family:system-ui,-apple-system,sans-serif',
                'box-shadow:0 4px 12px rgba(0,0,0,.25)',
                'backdrop-filter:blur(6px)', '-webkit-backdrop-filter:blur(6px)',
                'user-select:none', 'cursor:default',
                'transition:opacity .3s ease', 'opacity:0'
            ].join(';');
            document.body.appendChild(badge);
            requestAnimationFrame(function () { badge.style.opacity = '1'; });
        }
        var label = '本页累计访问';
        var suffix = source === 'local' ? '（本地）' : '';
        badge.textContent = '👁 ' + label + ' ' + (count || 0) + ' 次' + suffix;
        badge.title = source === 'local'
            ? '当前为本地计数（CloudBase 未配置跨用户计数），仅本浏览器可见'
            : '数据来自 CloudBase，跨用户累计';
    }

    /* ---------- 动态加载脚本 ---------- */
    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src; s.async = true;
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(new Error('load fail: ' + src)); };
            document.head.appendChild(s);
        });
    }

    /* ---------- 获取 CloudBase（自动加载依赖） ---------- */
    var cbPromise = null;
    function getCloudBase() {
        if (cbPromise) return cbPromise;
        cbPromise = new Promise(function (resolve, reject) {
            if (window.CloudBase && typeof window.CloudBase.recordPageView === 'function') {
                resolve(window.CloudBase); return;
            }
            var chain = (typeof window.tcb === 'undefined')
                ? loadScript(CB_SDK).then(function () { return loadScript(SCRIPT_BASE + CB_APP_JS); })
                : (typeof window.CloudBase === 'undefined')
                    ? loadScript(SCRIPT_BASE + CB_APP_JS) : Promise.resolve();
            chain.then(function () {
                if (window.CloudBase && typeof window.CloudBase.recordPageView === 'function') {
                    resolve(window.CloudBase);
                } else {
                    reject(new Error('CloudBase 模块未就绪'));
                }
            }).catch(reject);
        });
        return cbPromise;
    }

    /* ---------- 主流程 ---------- */
    function run() {
        var pageKey = getPageKey();
        var counted = isCounted(pageKey);

        // 本地兜底：先显示本地数，让用户立刻看到徽章
        var localCount = counted ? localGet(pageKey) : (localGet(pageKey) + 1);
        renderBadge(localCount, 'local');

        if (counted) {
            // 同会话已计过：只尝试读取云端最新值
            getCloudBase().then(function (CB) {
                return CB.getPageViews(pageKey);
            }).then(function (c) {
                if (c && c > 0) renderBadge(c, 'cloud');
            }).catch(function () {});
            return;
        }

        markCounted(pageKey);
        localIncrement(pageKey);

        // 尝试写入 CloudBase
        getCloudBase().then(function (CB) {
            return CB.recordPageView(pageKey);
        }).then(function (c) {
            if (c && c > 0) renderBadge(c, 'cloud');
        }).catch(function () {
            // CloudBase 不可用，保持本地显示
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
