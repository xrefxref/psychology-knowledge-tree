/**
 * 留言墙组件 - 可复用，每个工具页接入一个
 *
 * 用法：在 HTML 中放一个容器并引入本脚本
 *   <div id="guestbook" data-page-key="life-design"></div>
 *   <script src="js/cloudbase.js?v=20260910a"></script>
 *   <script src="js/guestbook.js?v=20260910a" defer></script>
 *
 * 访客：浏览精选留言；登录后可留言（默认进待审，站长精选后公开）
 * 站长（username === 'admin'）：在 admin.html 审核
 */
(function () {
    'use strict';

    var GB_ID = 'guestbook';
    var CSS_INJECTED = false;

    function injectCSS() {
        if (CSS_INJECTED) return;
        CSS_INJECTED = true;
        var s = document.createElement('style');
        s.textContent = [
            '.gb-wrap{background:var(--gb-paper,#fbf8f1);border:1px solid var(--gb-line,#e3dac8);border-radius:16px;padding:26px 28px;margin:40px 0;box-shadow:0 12px 40px rgba(43,39,34,.08);}',
            '.gb-wrap *{box-sizing:border-box;}',
            '.gb-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--gb-line,#e3dac8);}',
            '.gb-title{font-family:var(--gb-serif,"Songti SC","Noto Serif SC",Georgia,serif);font-size:20px;color:var(--gb-ink,#2b2722);display:flex;align-items:center;gap:8px;}',
            '.gb-count{font-size:13px;color:var(--gb-faint,#8a8074);}',
            '.gb-list{display:flex;flex-direction:column;gap:14px;margin-bottom:20px;min-height:40px;}',
            '.gb-empty{text-align:center;color:var(--gb-faint,#8a8074);font-size:14px;padding:24px 0;font-style:italic;}',
            '.gb-item{background:var(--gb-paper2,#f6f1e7);border:1px solid var(--gb-line,#e3dac8);border-left:3px solid var(--gb-accent,#9a3b2e);border-radius:10px;padding:14px 18px;}',
            '.gb-item .gb-meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}',
            '.gb-item .gb-who{font-family:var(--gb-serif,"Songti SC",serif);font-size:14px;color:var(--gb-accent,#9a3b2e);font-weight:600;}',
            '.gb-item .gb-when{font-size:12px;color:var(--gb-faint,#8a8074);}',
            '.gb-item .gb-body{font-size:14.5px;line-height:1.8;color:var(--gb-inksoft,#5c554b);white-space:pre-wrap;word-break:break-word;}',
            '.gb-form textarea{width:100%;font-family:inherit;font-size:14.5px;color:var(--gb-ink,#2b2722);background:var(--gb-paper2,#f6f1e7);border:1px solid var(--gb-line,#e3dac8);border-radius:10px;padding:12px 14px;resize:vertical;line-height:1.7;min-height:90px;outline:none;transition:.18s;}',
            '.gb-form textarea:focus{border-color:var(--gb-accent,#9a3b2e);box-shadow:0 0 0 3px rgba(154,59,46,.1);}',
            '.gb-form .gb-row{display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:10px;}',
            '.gb-form .gb-hint{font-size:12.5px;color:var(--gb-faint,#8a8074);}',
            '.gb-btn{font-family:inherit;font-size:14px;padding:9px 22px;border-radius:24px;cursor:pointer;transition:.18s;border:1px solid var(--gb-line,#e3dac8);background:var(--gb-paper2,#f6f1e7);color:var(--gb-inksoft,#5c554b);}',
            '.gb-btn:hover{border-color:var(--gb-accent,#9a3b2e);color:var(--gb-accent,#9a3b2e);}',
            '.gb-btn.primary{background:var(--gb-accent,#9a3b2e);color:#fff;border-color:var(--gb-accent,#9a3b2e);font-weight:600;}',
            '.gb-btn.primary:hover{background:#7f2f24;}',
            '.gb-btn[disabled]{opacity:.5;cursor:not-allowed;}',
            '.gb-auth{background:var(--gb-paper2,#f6f1e7);border:1px dashed var(--gb-accent2,#b8794a);border-radius:12px;padding:18px 20px;text-align:center;}',
            '.gb-auth p{color:var(--gb-inksoft,#5c554b);font-size:14px;margin-bottom:14px;line-height:1.7;}',
            '.gb-auth .gb-tabs{display:flex;gap:8px;justify-content:center;margin-bottom:14px;}',
            '.gb-auth .gb-tab{font-size:13px;padding:7px 18px;border-radius:24px;cursor:pointer;border:1px solid var(--gb-line,#e3dac8);background:var(--gb-paper,#fbf8f1);color:var(--gb-inksoft,#5c554b);transition:.16s;}',
            '.gb-auth .gb-tab.active{background:var(--gb-accent,#9a3b2e);color:#fff;border-color:var(--gb-accent,#9a3b2e);}',
            '.gb-auth .gb-fields{display:flex;flex-direction:column;gap:10px;max-width:320px;margin:0 auto;}',
            '.gb-auth input{width:100%;font-family:inherit;font-size:14px;padding:10px 14px;border:1px solid var(--gb-line,#e3dac8);border-radius:10px;background:var(--gb-paper,#fbf8f1);outline:none;}',
            '.gb-auth input:focus{border-color:var(--gb-accent,#9a3b2e);}',
            '.gb-auth .gb-err{color:var(--gb-accent,#9a3b2e);font-size:12.5px;min-height:18px;}',
            '.gb-userbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding:10px 14px;background:var(--gb-paper2,#f6f1e7);border-radius:10px;}',
            '.gb-userbar .gb-uname{font-family:var(--gb-serif,"Songti SC",serif);color:var(--gb-accent,#9a3b2e);font-size:14px;}',
            '.gb-userbar .gb-logout{font-size:12px;color:var(--gb-faint,#8a8074);cursor:pointer;text-decoration:underline;background:none;border:none;}'
        ].join('');
        document.head.appendChild(s);
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function fmtDate(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        if (isNaN(d)) return '';
        var now = new Date();
        var diff = (now - d) / 1000;
        if (diff < 60) return '刚刚';
        if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
        if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
        if (diff < 604800) return Math.floor(diff / 86400) + ' 天前';
        var M = d.getMonth() + 1, D = d.getDate();
        return (d.getFullYear() === now.getFullYear() ? '' : d.getFullYear() + '.') + M + '.' + D;
    }

    function Guestbook(el) {
        this.el = el;
        this.pageKey = el.getAttribute('data-page-key') || 'global';
        this.comments = [];
        this.user = null;
        this.authMode = 'login'; // login | register
        this.init();
    }

    Guestbook.prototype.init = function () {
        var self = this;
        if (window.CloudBase) {
            CloudBase.init();
            var u = CloudBase.getUser();
            if (u) {
                this.user = u;
                if (!u._username && u.email) u._username = u.email.split('@')[0];
            }
        }
        this.render();
        this.loadComments();
    };

    Guestbook.prototype.render = function () {
        injectCSS();
        var self = this;
        var html = '<div class="gb-wrap">' +
            '<div class="gb-head"><div class="gb-title">💬 留言墙</div>' +
            '<div class="gb-count" id="gb-count-' + this.pageKey + '">加载中…</div></div>' +
            '<div class="gb-list" id="gb-list-' + this.pageKey + '"></div>' +
            '<div id="gb-form-' + this.pageKey + '"></div>' +
            '</div>';
        this.el.innerHTML = html;
        this.renderFormArea();
    };

    Guestbook.prototype.renderFormArea = function () {
        var box = document.getElementById('gb-form-' + this.pageKey);
        if (!box) return;
        if (!this.user || !window.CloudBase) {
            box.innerHTML = this.renderAuth();
            this.bindAuth(box);
            return;
        }
        var name = this.user._username || (this.user.email ? this.user.email.split('@')[0] : '我');
        var adminBadge = CloudBase.isAdmin() ? ' · 站长' : '';
        box.innerHTML =
            '<div class="gb-userbar"><span class="gb-uname">👤 ' + esc(name) + adminBadge + '</span>' +
            '<button class="gb-logout" id="gb-logout-' + this.pageKey + '">退出登录</button></div>' +
            '<div class="gb-form">' +
            '<textarea id="gb-input-' + this.pageKey + '" placeholder="写下你的想法…（提交后由站长精选后公开显示）"></textarea>' +
            '<div class="gb-row"><span class="gb-hint">留言精选后将展示在这里</span>' +
            '<button class="gb-btn primary" id="gb-submit-' + this.pageKey + '">提交留言</button></div>' +
            '</div>';
        var self = this;
        var btn = document.getElementById('gb-submit-' + this.pageKey);
        if (btn) btn.addEventListener('click', function () { self.submitComment(); });
        var out = document.getElementById('gb-logout-' + this.pageKey);
        if (out) out.addEventListener('click', function () {
            if (window.CloudBase) { CloudBase.logout(); self.user = null; self.renderFormArea(); }
        });
    };

    Guestbook.prototype.renderAuth = function () {
        var isLogin = this.authMode === 'login';
        return '<div class="gb-auth">' +
            '<p>💬 登录后即可留言，你的留言经站长精选后会展示在这里</p>' +
            '<div class="gb-tabs">' +
            '<span class="gb-tab' + (isLogin ? ' active' : '') + '" data-mode="login">登录</span>' +
            '<span class="gb-tab' + (!isLogin ? ' active' : '') + '" data-mode="register">注册</span>' +
            '</div>' +
            '<div class="gb-fields">' +
            '<input type="text" id="gb-uname-' + this.pageKey + '" placeholder="用户名" maxlength="20">' +
            '<input type="password" id="gb-pwd-' + this.pageKey + '" placeholder="密码（至少 6 位）">' +
            '<button class="gb-btn primary" id="gb-authbtn-' + this.pageKey + '">' + (isLogin ? '登录' : '注册') + '</button>' +
            '<div class="gb-err" id="gb-err-' + this.pageKey + '"></div>' +
            '</div></div>';
    };

    Guestbook.prototype.bindAuth = function (box) {
        var self = this;
        box.querySelectorAll('.gb-tab').forEach(function (t) {
            t.addEventListener('click', function () {
                self.authMode = t.getAttribute('data-mode');
                self.renderFormArea();
            });
        });
        var btn = document.getElementById('gb-authbtn-' + this.pageKey);
        if (btn) btn.addEventListener('click', function () { self.handleAuth(); });
    };

    Guestbook.prototype.handleAuth = function () {
        var self = this;
        var nameEl = document.getElementById('gb-uname-' + this.pageKey);
        var pwdEl = document.getElementById('gb-pwd-' + this.pageKey);
        var errEl = document.getElementById('gb-err-' + this.pageKey);
        var name = nameEl.value.trim();
        var pwd = pwdEl.value;
        if (!name) { if (errEl) errEl.textContent = '请输入用户名'; return; }
        if (pwd.length < 6) { if (errEl) errEl.textContent = '密码至少 6 位'; return; }
        if (errEl) errEl.textContent = '';
        var fn = this.authMode === 'login' ? CloudBase.login : CloudBase.register;
        fn.call(CloudBase, name, pwd).then(function (user) {
            user._username = name;
            self.user = user;
            self.renderFormArea();
        }).catch(function (err) {
            if (errEl) errEl.textContent = (err && err.message) ? err.message : '操作失败';
        });
    };

    Guestbook.prototype.loadComments = function () {
        var self = this;
        if (!window.CloudBase) { this.renderComments([]); return; }
        CloudBase.getFeaturedComments(this.pageKey, 50).then(function (list) {
            self.comments = list || [];
            self.renderComments(self.comments);
        });
    };

    Guestbook.prototype.renderComments = function (list) {
        var box = document.getElementById('gb-list-' + this.pageKey);
        var cnt = document.getElementById('gb-count-' + this.pageKey);
        if (cnt) cnt.textContent = list.length ? (list.length + ' 条精选留言') : '暂无精选留言';
        if (!list.length) {
            if (box) box.innerHTML = '<div class="gb-empty">还没有精选留言，期待你的分享 🌱</div>';
            return;
        }
        var html = list.map(function (c) {
            return '<div class="gb-item"><div class="gb-meta">' +
                '<span class="gb-who">' + esc(c.username || '匿名') + '</span>' +
                '<span class="gb-when">' + fmtDate(c.createdAt) + '</span></div>' +
                '<div class="gb-body">' + esc(c.content) + '</div></div>';
        }).join('');
        if (box) box.innerHTML = html;
    };

    Guestbook.prototype.submitComment = function () {
        var self = this;
        var ta = document.getElementById('gb-input-' + this.pageKey);
        var btn = document.getElementById('gb-submit-' + this.pageKey);
        if (!ta) return;
        var content = ta.value.trim();
        if (!content) return;
        if (btn) { btn.disabled = true; btn.textContent = '提交中…'; }
        CloudBase.addComment(content, this.pageKey).then(function () {
            ta.value = '';
            if (btn) { btn.disabled = false; btn.textContent = '提交留言'; }
        }).catch(function () {
            if (btn) { btn.disabled = false; btn.textContent = '提交留言'; }
        });
    };

    /* 自动挂载所有 [data-guestbook] 容器 */
    function autoMount() {
        var els = document.querySelectorAll('[data-guestbook], #guestbook');
        els.forEach(function (el) {
            if (el._gbMounted) return;
            el._gbMounted = true;
            new Guestbook(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoMount);
    } else {
        autoMount();
    }

    window.Guestbook = { mount: autoMount, Guestbook: Guestbook };
})();
