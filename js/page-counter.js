/**
 * 页面访问计数器 - 右下角显示"本页累计访问 X 次"
 *
 * 数据源（按优先级）：
 *  1. Abacus 免费计数 API（https://abacus.jasoncameron.dev），JSONP 方式调用，
 *     无需注册、无需 CORS、无需任何后台配置，跨用户真实计数
 *  2. 网络失败时降级到 localStorage（仅本浏览器计数，徽章标注"本地"）
 *
 * 防刷：同一会话内同一页面只 +1（sessionStorage），之后仅读取最新值
 */
(function () {
    'use strict';

    var BADGE_ID = 'psy-page-counter-badge';
    var SESSION_KEY = 'psy_pv_session';
    var LOCAL_KEY = 'psy_local_page_views';

    /* Abacus 计数服务配置（命名空间全站唯一即可，计数器自动创建） */
    var API_HOST = 'https://abacus.jasoncameron.dev';
    var NAMESPACE = 'shenzhen-ai-icu';
    var JSONP_TIMEOUT = 8000;

    /* ---------- 本地兜底计数 ---------- */
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
        } catch (e) { return localGet(pageKey) + 1; }
    }

    /* ---------- 会话内防刷 ---------- */
    function isCounted(pageKey) {
        try { return !!JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}')[pageKey]; }
        catch (e) { return false; }
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
        return p.replace(/\.html?$/, '');
    }

    /* ---------- 徽章渲染 ---------- */
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
        var suffix = source === 'local' ? '（本地）' : '';
        badge.textContent = '👁 本页累计访问 ' + (count || 0) + ' 次' + suffix;
        badge.title = source === 'local'
            ? '网络计数服务暂不可用，当前显示本浏览器内的访问次数'
            : '数据来自 Abacus 计数服务，为全站用户真实累计访问量';
    }

    /* ---------- JSONP 请求（独立触发，不依赖其他接口） ---------- */
    function jsonp(path, cb) {
        var done = false;
        var cbName = '__pv_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
        var script = document.createElement('script');

        var timer = setTimeout(function () { finish(new Error('timeout'), null); }, JSONP_TIMEOUT);

        function finish(err, data) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
            if (script.parentNode) script.parentNode.removeChild(script);
            cb(err, data);
        }

        window[cbName] = function (data) { finish(null, data); };
        script.onerror = function () { finish(new Error('network error'), null); };
        script.src = API_HOST + path + '?callback=' + cbName;
        document.head.appendChild(script);
    }

    function remoteHit(pageKey, cb) {
        jsonp('/hit/' + NAMESPACE + '/' + encodeURIComponent(pageKey), function (err, data) {
            if (err || !data || typeof data.value !== 'number') { cb(err || new Error('bad response'), null); }
            else { cb(null, data.value); }
        });
    }
    function remoteGet(pageKey, cb) {
        jsonp('/get/' + NAMESPACE + '/' + encodeURIComponent(pageKey), function (err, data) {
            // 404（计数不存在）在 JSONP 下走 onerror，等同于 0
            if (err) { cb(null, 0); return; }
            cb(null, (data && typeof data.value === 'number') ? data.value : 0);
        });
    }

    /* ---------- 主流程 ---------- */
    function run() {
        var pageKey = getPageKey();
        var counted = isCounted(pageKey);

        // 先立刻显示本地计数，保证徽章即时可见
        var localCount = localGet(pageKey);
        if (!counted) {
            localCount = localIncrement(pageKey);
            markCounted(pageKey);
        }
        renderBadge(localCount, 'local');

        // 独立触发远端计数：成功后用真实累计值覆盖显示；失败则保留本地显示
        if (counted) {
            remoteGet(pageKey, function (err, value) {
                if (!err && value > 0) renderBadge(value, 'cloud');
            });
        } else {
            remoteHit(pageKey, function (err, value) {
                if (!err && value > 0) renderBadge(value, 'cloud');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
