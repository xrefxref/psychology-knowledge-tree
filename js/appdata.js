/**
 * AppData —— 站点数据层（Supabase 实现）
 *
 * 依赖：js/supabase.min.js（@supabase/supabase-js v2 UMD，全局 window.supabase）
 *
 * 数据模型：
 *   auth.users                Supabase 内建用户表（邮箱+密码登录）
 *   public.psy_comment        留言表
 *     id, user_id, username, content, page_key,
 *     status(pending|featured), featured_at, created_at
 *
 * 行级安全（RLS，数据库层强制，前端绕不过）：
 *   SELECT：status='featured' 或 作者本人 或 站长（is_admin()）
 *   INSERT：仅作者本人
 *   UPDATE/DELETE：作者或站长
 *
 * 账号适配：Supabase Auth 只支持邮箱登录，本层对调用方隐藏该差异
 *   注册/登录时把 username 拼成 `username@shenzhen-ai.icu` 作为邮箱
 *   站长判定：邮箱本地部分 === 'admin'
 *
 * 兼容旧调用：guestbook.js / admin.html / index.html 通过 window.AppData 调用
 * （window.CloudBase 作为别名保留，过渡期结束后可移除）
 */
(function (window) {
    'use strict';

    /* ====== 配置 ====== */
    var SUPABASE_URL = 'https://rvfsrrlnyidpcdlncqwu.supabase.co';
    var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8zESiRAchW5m8Meiym16wg_dizkj2vi';

    var COMMENT_TABLE = 'psy_comment';
    var ADMIN_NAME = 'admin';
    var FAKE_DOMAIN = 'shenzhen-ai.icu';

    var sb = null;        // Supabase client
    var initialized = false;
    var cachedUser = null; // 同步缓存：guestbook.js 等同步调用需要

    /* Supabase 项目 ref（从 URL 提取），用于读 localStorage 的会话键 */
    function projectRef() {
        try {
            var m = SUPABASE_URL.match(/^https:\/\/([^.]+)\.supabase\.co/);
            return m ? m[1] : '';
        } catch (e) { return ''; }
    }

    /* 同步从 localStorage 读取缓存的 session.user */
    function readCachedUserFromStorage() {
        try {
            var key = 'sb-' + projectRef() + '-auth-token';
            var raw = localStorage.getItem(key);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            // v2 存储格式：{ access_token, user, expires_at, ... }
            return (parsed && parsed.user) ? parsed.user : null;
        } catch (e) { return null; }
    }

    function init() {
        if (initialized) return;
        initialized = true;
        var lib = window.supabase || (window.supabaseJS && window.supabaseJS);
        if (!lib || typeof lib.createClient !== 'function') {
            console.warn('Supabase SDK 未加载，数据功能不可用');
            return;
        }
        if (SUPABASE_URL.indexOf('YOUR_') === 0 || SUPABASE_PUBLISHABLE_KEY.indexOf('YOUR_') === 0) {
            console.warn('Supabase 尚未配置（占位值），请在 js/appdata.js 填入凭证');
            return;
        }
        try {
            sb = lib.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false
                }
            });
            // 同步读缓存，保证页面加载后立即拿到登录态
            cachedUser = readCachedUserFromStorage();
            // 后续异步刷新缓存
            sb.auth.onAuthStateChange(function (event, session) {
                cachedUser = (session && session.user) ? session.user : null;
            });
            // 异步刷新一次（防止 localStorage 旧格式不一致）
            sb.auth.getUser().then(function (r) {
                if (r && r.data && r.data.user) cachedUser = r.data.user;
                else if (r && r.data && !r.data.user) cachedUser = null;
            }).catch(function () {});
            console.log('Supabase 初始化成功');
        } catch (err) {
            console.error('Supabase 初始化失败:', err);
        }
    }

    function isReady() { return !!sb; }

    /* ====== 工具 ====== */

    function toEmail(username) {
        // 站长用户名固定映射到 admin@shenzhen-ai.icu
        if (username === ADMIN_NAME) return ADMIN_NAME + '@' + FAKE_DOMAIN;
        // 普通用户：用户名 + 域名后缀（不会真的收到邮件）
        return username + '@' + FAKE_DOMAIN;
    }

    /* 同步获取当前用户（guestbook.js 同步调用需要） */
    function currentSBUser() {
        return cachedUser || readCachedUserFromStorage();
    }

    function normUser(u) {
        if (!u) return null;
        var email = u.email || '';
        var name = email.split('@')[0] || '';
        return {
            objectId: u.id,
            uid: u.id,
            username: name,
            email: email,
            _username: name
        };
    }

    function mapComment(r) {
        return {
            _id: r.id,
            id: r.id,
            content: r.content || '',
            username: r.username || '匿名',
            pageKey: r.page_key || 'global',
            status: r.status || 'pending',
            createdAt: r.created_at || '',
            featuredAt: r.featured_at || null
        };
    }

    function friendly(err, fallback) {
        if (!err) return fallback;
        var msg = fallback || '操作失败，请稍后重试';
        // Supabase 错误：{ message, code, status }
        if (err.message) {
            var m = err.message;
            if (/invalid credentials/i.test(m) || /invalid login/i.test(m)) return '用户名或密码错误';
            if (/already registered/i.test(m) || /already been registered/i.test(m)) return '该用户名已被注册';
            if (/rate limit/i.test(m)) return '操作过于频繁，请稍后再试';
            if (/password/i.test(m) && /weak|short/i.test(m)) return '密码至少 6 位';
            if (/network|fetch/i.test(m)) return '网络连接失败，请检查网络';
            msg = m;
        }
        return msg;
    }

    function isAdminPage() {
        try { return /(^|\/)admin\.html(\?|$)/.test(window.location.pathname); }
        catch (e) { return false; }
    }

    /* 前端仅控制 UI 入口；真正权限由数据库 RLS 强制 */
    function isAdmin() {
        var u = currentSBUser();
        return !!(u && u.email && u.email.split('@')[0] === ADMIN_NAME);
    }

    /* ====== 校验 ====== */
    function validateUsername(name) {
        if (!name) return { valid: false, message: '请输入用户名' };
        if (name.length < 2 || name.length > 20) {
            return { valid: false, message: '用户名长度为 2-20 个字符' };
        }
        if (!/^[一-龥A-Za-z0-9_-]+$/.test(name)) {
            return { valid: false, message: '用户名仅支持中英文、数字、下划线和横线' };
        }
        return { valid: true, message: '' };
    }

    function validatePassword(pwd) {
        if (!pwd) return { valid: false, message: '请输入密码' };
        if (pwd.length < 6) return { valid: false, message: '密码至少 6 位' };
        if (pwd.length > 72) return { valid: false, message: '密码过长（最多 72 位）' };
        return { valid: true, message: '' };
    }

    /* ====== 对外接口 ====== */

    var AppData = {
        init: init,
        isReady: isReady,

        /* ---- 账号 ---- */

        /* 异步获取当前用户（推荐用此方法，等价 CloudBase.getUser()） */
        getUser: function () {
            return normUser(currentSBUser());
        },

        /* 异步获取当前用户（带 await，Supabase 推荐） */
        getUserAsync: function () {
            if (!sb) return Promise.resolve(null);
            return sb.auth.getUser().then(function (r) {
                return normUser(r.data && r.data.user ? r.data.user : null);
            }).catch(function () { return null; });
        },

        login: function (username, password) {
            init();
            if (!sb) return Promise.reject(new Error('数据服务未配置'));
            var v = validateUsername(username);
            if (!v.valid) return Promise.reject(new Error(v.message));
            return sb.auth.signInWithPassword({
                email: toEmail(username),
                password: password
            }).then(function (res) {
                if (res.error) throw res.error;
                return normUser(res.data.user);
            }).catch(function (err) {
                throw new Error(friendly(err, '登录失败'));
            });
        },

        register: function (username, password) {
            init();
            if (!sb) return Promise.reject(new Error('数据服务未配置'));
            // admin 用户名仅在 admin.html 可注册
            if (username === ADMIN_NAME && !isAdminPage()) {
                return Promise.reject(new Error('该用户名已保留'));
            }
            var v = validateUsername(username);
            if (!v.valid) return Promise.reject(new Error(v.message));
            var vp = validatePassword(password);
            if (!vp.valid) return Promise.reject(new Error(vp.message));
            return sb.auth.signUp({
                email: toEmail(username),
                password: password
            }).then(function (res) {
                if (res.error) throw res.error;
                // 关掉邮箱验证后，注册即视为登录
                return normUser(res.data.user);
            }).catch(function (err) {
                throw new Error(friendly(err, '注册失败'));
            });
        },

        logout: function () {
            if (sb) {
                try { sb.auth.signOut(); } catch (e) {}
            }
        },

        isAdmin: isAdmin,
        validateUsername: validateUsername,
        validatePassword: validatePassword,

        /* ---- 留言 ---- */

        addComment: function (content, pageKey) {
            init();
            var u = currentSBUser();
            if (!u) return Promise.reject(new Error('请先登录'));
            content = String(content || '').trim();
            if (!content) return Promise.reject(new Error('留言内容不能为空'));
            if (content.length > 1000) return Promise.reject(new Error('留言不能超过 1000 字'));

            var row = {
                user_id: u.id,
                username: u.email ? u.email.split('@')[0] : '匿名',
                content: content,
                page_key: pageKey || 'global',
                status: 'pending'
            };
            return sb.from(COMMENT_TABLE).insert(row).then(function (res) {
                if (res.error) throw res.error;
                return { ok: true };
            }).catch(function (err) {
                throw new Error(friendly(err, '发布失败'));
            });
        },

        /* 公开列表：RLS 自动过滤，前端只查 featured */
        getFeaturedComments: function (pageKey, limit, skip) {
            init();
            if (!sb) return Promise.resolve([]);
            var q = sb.from(COMMENT_TABLE)
                .select('id,user_id,username,content,page_key,status,featured_at,created_at')
                .eq('status', 'featured')
                .order('created_at', { ascending: false })
                .limit(Math.min(limit || 50, 100));
            if (pageKey) q = q.eq('page_key', pageKey);
            if (skip) q = q.range(skip, skip + (limit || 50) - 1);
            return q.then(function (res) {
                if (res.error) { console.error('获取精选留言失败:', res.error); return []; }
                return (res.data || []).map(mapComment);
            }).catch(function (err) {
                console.error('获取精选留言失败:', err);
                return [];
            });
        },

        /* 兼容旧接口名 */
        getComments: function (limit, skip) {
            return this.getFeaturedComments(null, limit, skip);
        },

        /* 站长：待审列表（RLS 自动校验站长身份，否则返回空） */
        getPendingComments: function (pageKey) {
            init();
            if (!sb || !isAdmin()) return Promise.resolve([]);
            var q = sb.from(COMMENT_TABLE)
                .select('id,user_id,username,content,page_key,status,featured_at,created_at')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(100);
            if (pageKey) q = q.eq('page_key', pageKey);
            return q.then(function (res) {
                if (res.error) { console.error('获取待审留言失败:', res.error); return []; }
                return (res.data || []).map(mapComment);
            }).catch(function (err) {
                console.error('获取待审留言失败:', err);
                return [];
            });
        },

        /* 站长：精选（更新 status=featured + featured_at；RLS 校验站长） */
        featureComment: function (commentId) {
            init();
            if (!sb || !isAdmin()) return Promise.reject(new Error('无权限'));
            return sb.from(COMMENT_TABLE)
                .update({ status: 'featured', featured_at: new Date().toISOString() })
                .eq('id', commentId)
                .then(function (res) {
                    if (res.error) throw res.error;
                    return { ok: true };
                }).catch(function (err) {
                    throw new Error(friendly(err, '精选失败'));
                });
        },

        /* 站长：取消精选（退回 pending；RLS 校验站长） */
        unfeatureComment: function (commentId) {
            init();
            if (!sb || !isAdmin()) return Promise.reject(new Error('无权限'));
            return sb.from(COMMENT_TABLE)
                .update({ status: 'pending', featured_at: null })
                .eq('id', commentId)
                .then(function (res) {
                    if (res.error) throw res.error;
                    return { ok: true };
                }).catch(function (err) {
                    throw new Error(friendly(err, '操作失败'));
                });
        },

        /* 站长或作者删除（RLS 强制权限） */
        deleteComment: function (commentId) {
            init();
            if (!sb || !currentSBUser()) return Promise.reject(new Error('请先登录'));
            return sb.from(COMMENT_TABLE)
                .delete()
                .eq('id', commentId)
                .then(function (res) {
                    if (res.error) throw res.error;
                    return { ok: true };
                }).catch(function (err) {
                    throw new Error(friendly(err, '删除失败'));
                });
        },

        /* ---- 学习进度 / 笔记（保留接口占位，前端不报错） ---- */
        saveLearnProgress: function () { return Promise.resolve({ ok: true }); },
        getLearnProgress: function () { return Promise.resolve(null); },
        getAllProgress: function () { return Promise.resolve([]); },
        saveNote: function () { return Promise.resolve({ ok: true }); },
        getNote: function () { return Promise.resolve(null); },
        getLearnStats: function () { return Promise.resolve({ total: 0, learned: 0 }); },

        /* PV 计数由 Abacus（page-counter.js）接管 */
        recordPageView: function () { return Promise.resolve(0); },
        getPageViews: function () { return Promise.resolve(0); }
    };

    window.AppData = AppData;
    window.CloudBase = AppData; // 旧别名过渡
})(window);
