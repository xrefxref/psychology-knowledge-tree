/**
 * AppData —— 站点数据层（LeanCloud 国际版实现）
 *
 * 依赖：js/av-min.js（LeanCloud Storage JS SDK 4.x，全局 AV）
 *
 * 数据模型：
 *   _User                内建用户表（用户名 + 密码，无需邮箱）
 *   _Role                内建角色表，需在控制台创建名为 admin 的角色并关联站长用户
 *   psy_comment          留言表
 *     content(String) username(String) pageKey(String)
 *     status(String: pending|featured)  featuredAt(Date|可选)  user(Pointer<_User>)
 *
 * 行级 ACL（数据库层强制，前端绕不过）：
 *   新建留言：仅作者 + role:admin 可读写，公众无任何权限（pending 状态外人不可见）
 *   站长精选：追加 public 只读（featured 状态所有访客可见）
 *   取消精选：移除 public 读
 *
 * 兼容旧调用：guestbook.js / admin.html / index.html 原通过 window.CloudBase 调用，
 * 现统一为 window.AppData，文件末尾保留 CloudBase 别名过渡。
 */
(function (window) {
    'use strict';

    /* ====== 配置：由站长在 LeanCloud 控制台创建应用后填入 ====== */
    var CONFIG = {
        appId: 'YOUR_APP_ID',
        appKey: 'YOUR_APP_KEY',
        // 形如 https://xxxxxxxx.api.lncldglobal.com（控制台「应用凭证」页可复制）
        serverURL: 'https://YOUR_APP_ID_PREFIX.api.lncldglobal.com'
    };

    var COMMENT_CLASS = 'psy_comment';
    var ADMIN_ROLE = 'admin';
    var ADMIN_NAME = 'admin';

    var AV = window.AV;
    var initialized = false;
    var ready = false;

    function init() {
        if (initialized) return;
        initialized = true;
        if (!AV) {
            console.warn('LeanCloud SDK 未加载，数据功能不可用');
            return;
        }
        if (CONFIG.appId.indexOf('YOUR_') === 0) {
            console.warn('LeanCloud 尚未配置（appId 为占位值），请在 js/appdata.js 填入应用凭证');
            return;
        }
        try {
            AV.init({
                appId: CONFIG.appId,
                appKey: CONFIG.appKey,
                serverURL: CONFIG.serverURL
            });
            ready = true;
            console.log('LeanCloud 初始化成功');
        } catch (err) {
            console.error('LeanCloud 初始化失败:', err);
        }
    }

    function isReady() { return ready; }

    /* ====== 工具 ====== */

    function currentAVUser() {
        return ready ? AV.User.current() : null;
    }

    function normUser(u) {
        if (!u) return null;
        var name = (typeof u.getUsername === 'function') ? u.getUsername() : '';
        return {
            objectId: u.id,
            uid: u.id,
            username: name,
            _username: name
        };
    }

    function mapComment(o) {
        return {
            _id: o.id,
            id: o.id,
            content: o.get('content') || '',
            username: o.get('username') || '匿名',
            pageKey: o.get('pageKey') || 'global',
            status: o.get('status') || 'pending',
            createdAt: o.createdAt || '',
            featuredAt: o.get('featuredAt') || null
        };
    }

    /* LeanCloud 错误码 → 中文提示 */
    function friendly(err, fallback) {
        if (!err) return fallback;
        var msg = fallback || '操作失败，请稍后重试';
        switch (err.code) {
            case 200: msg = '用户名不能为空'; break;
            case 201: msg = '密码不能为空'; break;
            case 202: msg = '该用户名已被注册，换一个试试'; break;
            case 210: case 211: msg = '用户名或密码错误'; break;
            case 217: msg = '用户名或密码无效'; break;
            case 60: msg = '发送过于频繁，请稍后再试'; break;
            case 137: msg = '操作过于频繁，请稍后再试'; break;
            case 100: msg = '连接服务器失败，请检查网络'; break;
            case 101: msg = '登录状态已过期，请重新登录'; break;
            default:
                if (err.rawErrorMessage) msg = err.rawErrorMessage;
                else if (err.message) msg = err.message;
        }
        return msg;
    }

    function isAdminPage() {
        try { return /(^|\/)admin\.html(\?|$)/.test(window.location.pathname); }
        catch (e) { return false; }
    }

    /* 前端仅控制 UI 入口；真正的审核权限由数据库行级 ACL（role:admin）强制 */
    function isAdmin() {
        var u = currentAVUser();
        return !!(u && u.getUsername() === ADMIN_NAME);
    }

    /* ====== 校验（index.html 使用） ====== */

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
        if (pwd.length > 32) return { valid: false, message: '密码最长 32 位' };
        return { valid: true, message: '' };
    }

    /* ====== 留言权限辅助 ====== */

    /* 新建留言的 ACL：公众不可见，作者与 admin 角色可读写 */
    function buildPrivateACL(user) {
        var acl = new AV.ACL();
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        acl.setReadAccess(user, true);
        acl.setWriteAccess(user, true);
        // 即使 admin 角色尚未创建也不影响保存（ACL 仅存 role:admin 键，
        // 站长在控制台创建角色并关联用户后，历史留言自动对站长可见）
        acl.setRoleReadAccess(ADMIN_ROLE, true);
        acl.setRoleWriteAccess(ADMIN_ROLE, true);
        return acl;
    }

    function commentQuery() {
        return new AV.Query(COMMENT_CLASS);
    }

    /* ====== 对外接口 ====== */

    var AppData = {
        init: init,
        isReady: isReady,

        /* ---- 账号 ---- */

        getUser: function () {
            return normUser(currentAVUser());
        },

        login: function (username, password) {
            init();
            if (!ready) return Promise.reject(new Error('数据服务未配置'));
            return AV.User.logIn(username, password).then(function (u) {
                return normUser(u);
            }).catch(function (err) {
                throw new Error(friendly(err, '登录失败'));
            });
        },

        register: function (username, password) {
            init();
            if (!ready) return Promise.reject(new Error('数据服务未配置'));
            // 管理员用户名只能在审核后台注册，防止被访客抢注
            if (username === ADMIN_NAME && !isAdminPage()) {
                return Promise.reject(new Error('该用户名已保留'));
            }
            var u = new AV.User();
            u.setUsername(username);
            u.setPassword(password);
            return u.signUp().then(function (saved) {
                return normUser(saved);
            }).catch(function (err) {
                throw new Error(friendly(err, '注册失败'));
            });
        },

        logout: function () {
            if (ready) {
                try { AV.User.logOut(); } catch (e) {}
            }
        },

        isAdmin: isAdmin,
        validateUsername: validateUsername,
        validatePassword: validatePassword,

        /* ---- 留言 ---- */

        /* 访客提交留言（强制 pending + 私有 ACL） */
        addComment: function (content, pageKey) {
            init();
            var user = currentAVUser();
            if (!user) return Promise.reject(new Error('请先登录'));
            content = String(content || '').trim();
            if (!content) return Promise.reject(new Error('留言内容不能为空'));
            if (content.length > 1000) return Promise.reject(new Error('留言不能超过 1000 字'));

            var c = new AV.Object(COMMENT_CLASS);
            c.setACL(buildPrivateACL(user));
            c.set('content', content);
            c.set('username', user.getUsername());
            c.set('pageKey', pageKey || 'global');
            c.set('status', 'pending');
            c.set('user', user);
            return c.save().then(function () {
                return { ok: true };
            }).catch(function (err) {
                throw new Error(friendly(err, '发布失败'));
            });
        },

        /* 公开列表：只返回 featured；行级 ACL 会在数据库层过滤掉 pending */
        getFeaturedComments: function (pageKey, limit, skip) {
            init();
            if (!ready) return Promise.resolve([]);
            var q = commentQuery();
            q.equalTo('status', 'featured');
            if (pageKey) q.equalTo('pageKey', pageKey);
            q.descending('createdAt');
            q.limit(Math.min(limit || 50, 100));
            q.skip(skip || 0);
            return q.find().then(function (list) {
                return (list || []).map(mapComment);
            }).catch(function (err) {
                console.error('获取精选留言失败:', err);
                return [];
            });
        },

        /* 兼容旧接口名 */
        getComments: function (limit, skip) {
            return this.getFeaturedComments(null, limit, skip);
        },

        /* 站长：待审列表（需属于 admin 角色，否则数据库返回空数组） */
        getPendingComments: function (pageKey) {
            init();
            if (!ready || !isAdmin()) return Promise.resolve([]);
            var q = commentQuery();
            q.equalTo('status', 'pending');
            if (pageKey) q.equalTo('pageKey', pageKey);
            q.descending('createdAt');
            q.limit(100);
            return q.find().then(function (list) {
                return (list || []).map(mapComment);
            }).catch(function (err) {
                console.error('获取待审留言失败:', err);
                return [];
            });
        },

        /* 站长：精选（追加公众只读） */
        featureComment: function (commentId) {
            init();
            if (!ready || !isAdmin()) return Promise.reject(new Error('无权限'));
            var q = commentQuery();
            return q.get(commentId).then(function (c) {
                c.set('status', 'featured');
                c.set('featuredAt', new Date());
                var acl = c.getACL() || new AV.ACL();
                acl.setPublicReadAccess(true);
                acl.setPublicWriteAccess(false);
                var u = c.get('user');
                if (u) { acl.setReadAccess(u, true); acl.setWriteAccess(u, true); }
                acl.setRoleReadAccess(ADMIN_ROLE, true);
                acl.setRoleWriteAccess(ADMIN_ROLE, true);
                c.setACL(acl);
                return c.save();
            }).then(function () {
                return { ok: true };
            }).catch(function (err) {
                throw new Error(friendly(err, '精选失败'));
            });
        },

        /* 站长：取消精选（收回公众读权限，退回待审） */
        unfeatureComment: function (commentId) {
            init();
            if (!ready || !isAdmin()) return Promise.reject(new Error('无权限'));
            var q = commentQuery();
            return q.get(commentId).then(function (c) {
                c.set('status', 'pending');
                c.unset('featuredAt');
                var acl = c.getACL() || new AV.ACL();
                acl.setPublicReadAccess(false);
                c.setACL(acl);
                return c.save();
            }).then(function () {
                return { ok: true };
            }).catch(function (err) {
                throw new Error(friendly(err, '操作失败'));
            });
        },

        /* 站长或作者删除（写权限由行级 ACL 强制） */
        deleteComment: function (commentId) {
            init();
            if (!ready || !currentAVUser()) return Promise.reject(new Error('请先登录'));
            var obj = AV.Object.createWithoutData(COMMENT_CLASS, commentId);
            return obj.destroy().then(function () {
                return { ok: true };
            }).catch(function (err) {
                throw new Error(friendly(err, '删除失败'));
            });
        },

        /* ---- 学习进度 / 笔记（index 预留，数据同样存 LeanCloud） ---- */

        saveLearnProgress: function (nodeKey, learned, notes) {
            init();
            var user = currentAVUser();
            if (!user) return Promise.reject(new Error('请先登录'));
            var q = new AV.Query('LearnProgress');
            q.equalTo('user', user);
            q.equalTo('nodeKey', nodeKey);
            return q.first().then(function (p) {
                if (!p) {
                    p = new AV.Object('LearnProgress');
                    var acl = new AV.ACL(user);
                    acl.setPublicReadAccess(false);
                    p.setACL(acl);
                    p.set('user', user);
                    p.set('nodeKey', nodeKey);
                }
                p.set('learned', !!learned);
                p.set('notes', notes || '');
                return p.save();
            }).catch(function (err) {
                throw new Error(friendly(err, '保存进度失败'));
            });
        },

        getLearnProgress: function (nodeKey) {
            init();
            var user = currentAVUser();
            if (!user) return Promise.resolve(null);
            var q = new AV.Query('LearnProgress');
            q.equalTo('user', user);
            q.equalTo('nodeKey', nodeKey);
            return q.first().then(function (p) {
                return p ? { learned: p.get('learned'), notes: p.get('notes') } : null;
            }).catch(function () { return null; });
        },

        getAllProgress: function () {
            init();
            var user = currentAVUser();
            if (!user) return Promise.resolve([]);
            var q = new AV.Query('LearnProgress');
            q.equalTo('user', user);
            return q.find().then(function (list) {
                return (list || []).map(function (p) {
                    return { nodeKey: p.get('nodeKey'), learned: p.get('learned'), notes: p.get('notes') };
                });
            }).catch(function () { return []; });
        },

        saveNote: function (nodeKey, content) {
            init();
            var user = currentAVUser();
            if (!user) return Promise.reject(new Error('请先登录'));
            var q = new AV.Query('Note');
            q.equalTo('user', user);
            q.equalTo('nodeKey', nodeKey);
            return q.first().then(function (n) {
                if (!n) {
                    n = new AV.Object('Note');
                    n.setACL(new AV.ACL(user));
                    n.set('user', user);
                    n.set('nodeKey', nodeKey);
                }
                n.set('content', content || '');
                return n.save();
            }).catch(function (err) {
                throw new Error(friendly(err, '保存笔记失败'));
            });
        },

        getNote: function (nodeKey) {
            init();
            var user = currentAVUser();
            if (!user) return Promise.resolve(null);
            var q = new AV.Query('Note');
            q.equalTo('user', user);
            q.equalTo('nodeKey', nodeKey);
            return q.first().then(function (n) {
                return n ? n.get('content') : null;
            }).catch(function () { return null; });
        },

        getLearnStats: function () {
            return this.getAllProgress().then(function (list) {
                return {
                    total: list.length,
                    learned: list.filter(function (i) { return i.learned; }).length
                };
            }).catch(function () { return { total: 0, learned: 0 }; });
        },

        /* PV 计数已由 Abacus（page-counter.js）接管，保留空实现避免引用报错 */
        recordPageView: function () { return Promise.resolve(0); },
        getPageViews: function () { return Promise.resolve(0); }
    };

    window.AppData = AppData;
    // 兼容旧引用，过渡期结束后可移除
    window.CloudBase = AppData;
})(window);
