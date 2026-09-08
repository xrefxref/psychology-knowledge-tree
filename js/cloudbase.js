var CloudBase = (function() {
    var db = null;
    var auth = null;
    var app = null;
    var initialized = false;
    var currentUser = null;
    var useLocalStorage = false;
    var anonymousPromise = null;
    var PV_COLLECTION = 'page_views';

    function init() {
        if (initialized) return;

        if (typeof window.tcb === 'undefined') {
            console.warn('CloudBase SDK未加载，使用本地存储模式');
            useLocalStorage = true;
            initialized = true;
            loadLocalUser();
            return;
        }

        try {
            app = window.tcb.init({
                env: 'yunkaifa20260626-d0el5yg4df33bbf'
            });

            db = app.database();
            auth = app.auth();
            initialized = true;
            console.log('CloudBase初始化成功');
        } catch (err) {
            console.error('CloudBase初始化失败，使用本地存储模式:', err);
            useLocalStorage = true;
            initialized = true;
            loadLocalUser();
        }
    }

    /**
     * 匿名登录（用于无需注册即可记录页面访问）
     * 失败时返回 reject，调用方自行降级
     */
    function ensureAnonymous() {
        if (anonymousPromise) return anonymousPromise;
        anonymousPromise = new Promise(function (resolve, reject) {
            if (useLocalStorage || !auth) { reject(new Error('CloudBase 不可用')); return; }
            try {
                var cur = (typeof auth.currentUser !== 'undefined') ? auth.currentUser : null;
                if (cur) { resolve(cur); return; }
            } catch (e) {}
            var p;
            if (typeof auth.signInAnonymously === 'function') {
                p = auth.signInAnonymously();
            } else if (auth.anonymousAuthProvider && typeof auth.anonymousAuthProvider().signIn === 'function') {
                p = auth.anonymousAuthProvider().signIn();
            } else {
                reject(new Error('当前 SDK 不支持匿名登录'));
                return;
            }
            p.then(function (u) { currentUser = u; resolve(u); })
             .catch(function (err) { reject(err); });
        });
        return anonymousPromise;
    }

    function localGetPV(pageKey) {
        var v = JSON.parse(localStorage.getItem('psy_local_page_views') || '{}');
        return v[pageKey] || 0;
    }
    function localIncrementPV(pageKey) {
        var v = JSON.parse(localStorage.getItem('psy_local_page_views') || '{}');
        v[pageKey] = (v[pageKey] || 0) + 1;
        localStorage.setItem('psy_local_page_views', JSON.stringify(v));
        return v[pageKey];
    }

    function loadLocalUser() {
        var saved = localStorage.getItem('psy_local_user');
        if (saved) {
            currentUser = JSON.parse(saved);
        }
    }

    function saveLocalUser(user) {
        currentUser = user;
        localStorage.setItem('psy_local_user', JSON.stringify(user));
    }

    function getLocalUsers() {
        var saved = localStorage.getItem('psy_local_users');
        return saved ? JSON.parse(saved) : [];
    }

    function saveLocalUsers(users) {
        localStorage.setItem('psy_local_users', JSON.stringify(users));
    }

    function showToast(message) {
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(168, 85, 247, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
            animation: fadeInDown 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(function() {
            toast.style.animation = 'fadeOutUp 0.3s ease';
            setTimeout(function() {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }

    function loginLocal(username, password) {
        return new Promise(function(resolve, reject) {
            var users = getLocalUsers();
            var user = users.find(function(u) {
                return u.username === username && u.password === password;
            });
            
            if (user) {
                saveLocalUser({
                    uid: user.uid,
                    email: username + '@psychology.com'
                });
                showToast('登录成功');
                resolve(currentUser);
            } else {
                showToast('用户名或密码错误');
                reject(new Error('用户名或密码错误'));
            }
        });
    }

    function registerLocal(username, password) {
        return new Promise(function(resolve, reject) {
            var users = getLocalUsers();
            var exists = users.find(function(u) {
                return u.username === username;
            });
            
            if (exists) {
                showToast('该用户名已被注册');
                reject(new Error('该用户名已被注册'));
            } else {
                var newUser = {
                    uid: 'local_' + Date.now(),
                    username: username,
                    password: password,
                    createdAt: new Date().toISOString()
                };
                users.push(newUser);
                saveLocalUsers(users);
                
                saveLocalUser({
                    uid: newUser.uid,
                    email: username + '@psychology.com'
                });
                showToast('注册成功');
                resolve(currentUser);
            }
        });
    }

    function logoutLocal() {
        currentUser = null;
        localStorage.removeItem('psy_local_user');
        showToast('已退出登录');
    }

    function saveLearnProgressLocal(nodeKey, learned, notes) {
        var progress = JSON.parse(localStorage.getItem('psy_local_progress') || '{}');
        progress[nodeKey] = {
            uid: currentUser.uid,
            nodeKey: nodeKey,
            learned: learned,
            notes: notes || '',
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('psy_local_progress', JSON.stringify(progress));
        showToast('学习进度已保存');
        return Promise.resolve();
    }

    function getLearnProgressLocal(nodeKey) {
        var progress = JSON.parse(localStorage.getItem('psy_local_progress') || '{}');
        return Promise.resolve(progress[nodeKey] || null);
    }

    function getAllProgressLocal() {
        var progress = JSON.parse(localStorage.getItem('psy_local_progress') || '{}');
        return Promise.resolve(Object.values(progress) || []);
    }

    function saveNoteLocal(nodeKey, content) {
        var notes = JSON.parse(localStorage.getItem('psy_local_notes') || '{}');
        notes[nodeKey] = {
            uid: currentUser.uid,
            nodeKey: nodeKey,
            content: content,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('psy_local_notes', JSON.stringify(notes));
        showToast('笔记已保存');
        return Promise.resolve();
    }

    function getNoteLocal(nodeKey) {
        var notes = JSON.parse(localStorage.getItem('psy_local_notes') || '{}');
        return Promise.resolve(notes[nodeKey] ? notes[nodeKey].content : null);
    }

    function addCommentLocal(content) {
        var comments = JSON.parse(localStorage.getItem('psy_local_comments') || '[]');
        comments.unshift({
            uid: currentUser.uid,
            content: content,
            username: currentUser.email ? currentUser.email.split('@')[0] : '匿名用户',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('psy_local_comments', JSON.stringify(comments));
        showToast('评论已发布');
        return Promise.resolve();
    }

    function getCommentsLocal(limit, skip) {
        var comments = JSON.parse(localStorage.getItem('psy_local_comments') || '[]');
        return Promise.resolve(comments.slice(skip || 0, (skip || 0) + (limit || 20)));
    }

    function getLearnStatsLocal() {
        var progress = JSON.parse(localStorage.getItem('psy_local_progress') || '{}');
        var data = Object.values(progress);
        return Promise.resolve({
            total: data.length,
            learned: data.filter(function(item) { return item.learned; }).length
        });
    }

    return {
        init: init,
        
        login: function(username, password) {
            init();
            if (useLocalStorage) {
                return loginLocal(username, password);
            }
            return new Promise(function(resolve, reject) {
                auth.signInWithEmailAndPassword(username + '@psychology.com', password)
                    .then(function(user) {
                        currentUser = user;
                        showToast('登录成功');
                        resolve(user);
                    })
                    .catch(function(err) {
                        console.error('登录错误:', err);
                        if (err.code === 'INVALID_CREDENTIALS') {
                            showToast('用户名或密码错误');
                        } else {
                            showToast('登录失败: ' + (err.message || err.code));
                        }
                        reject(err);
                    });
            });
        },

        register: function(username, password) {
            init();
            if (useLocalStorage) {
                return registerLocal(username, password);
            }
            return new Promise(function(resolve, reject) {
                auth.createUserWithEmailAndPassword(username + '@psychology.com', password)
                    .then(function(user) {
                        db.collection('psy_users').add({
                            username: username,
                            uid: user.uid,
                            createdAt: new Date().toISOString()
                        }).then(function() {
                            currentUser = user;
                            showToast('注册成功');
                            resolve(user);
                        }).catch(function(err) {
                            console.error('保存用户信息失败:', err);
                            showToast('注册失败: ' + (err.message || err.code));
                            reject(err);
                        });
                    })
                    .catch(function(err) {
                        console.error('注册错误:', err);
                        if (err.code === 'EMAIL_ALREADY_EXISTS') {
                            showToast('该用户名已被注册');
                        } else {
                            showToast('注册失败: ' + (err.message || err.code));
                        }
                        reject(err);
                    });
            });
        },

        logout: function() {
            init();
            if (useLocalStorage) {
                logoutLocal();
                return;
            }
            try {
                auth.signOut();
                currentUser = null;
                showToast('已退出登录');
            } catch (err) {
                console.error('退出登录失败:', err);
                currentUser = null;
                showToast('已退出登录');
            }
        },

        getUser: function() {
            return currentUser;
        },

        saveLearnProgress: function(nodeKey, learned, notes) {
            init();
            if (!currentUser) {
                showToast('请先登录');
                return Promise.reject('请先登录');
            }
            if (useLocalStorage) {
                return saveLearnProgressLocal(nodeKey, learned, notes);
            }
            return db.collection('psy_learn_progress').where({
                uid: currentUser.uid,
                nodeKey: nodeKey
            }).get().then(function(res) {
                if (res.data.length > 0) {
                    return db.collection('psy_learn_progress').doc(res.data[0]._id).update({
                        learned: learned,
                        notes: notes || '',
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    return db.collection('psy_learn_progress').add({
                        uid: currentUser.uid,
                        nodeKey: nodeKey,
                        learned: learned,
                        notes: notes || '',
                        createdAt: new Date().toISOString()
                    });
                }
            }).then(function() {
                showToast('学习进度已保存');
            }).catch(function(err) {
                console.error('保存学习进度失败:', err);
                showToast('保存失败: ' + (err.message || err.code));
                return Promise.reject(err);
            });
        },

        getLearnProgress: function(nodeKey) {
            init();
            if (!currentUser) {
                return Promise.resolve(null);
            }
            if (useLocalStorage) {
                return getLearnProgressLocal(nodeKey);
            }
            return db.collection('psy_learn_progress').where({
                uid: currentUser.uid,
                nodeKey: nodeKey
            }).get().then(function(res) {
                return res.data.length > 0 ? res.data[0] : null;
            }).catch(function(err) {
                console.error('获取学习进度失败:', err);
                return Promise.resolve(null);
            });
        },

        getAllProgress: function() {
            init();
            if (!currentUser) {
                return Promise.resolve([]);
            }
            if (useLocalStorage) {
                return getAllProgressLocal();
            }
            return db.collection('psy_learn_progress').where({
                uid: currentUser.uid
            }).get().then(function(res) {
                return res.data || [];
            }).catch(function(err) {
                console.error('获取所有进度失败:', err);
                return Promise.resolve([]);
            });
        },

        saveNote: function(nodeKey, content) {
            init();
            if (!currentUser) {
                showToast('请先登录');
                return Promise.reject('请先登录');
            }
            if (useLocalStorage) {
                return saveNoteLocal(nodeKey, content);
            }
            return db.collection('psy_notes').where({
                uid: currentUser.uid,
                nodeKey: nodeKey
            }).get().then(function(res) {
                if (res.data.length > 0) {
                    return db.collection('psy_notes').doc(res.data[0]._id).update({
                        content: content,
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    return db.collection('psy_notes').add({
                        uid: currentUser.uid,
                        nodeKey: nodeKey,
                        content: content,
                        createdAt: new Date().toISOString()
                    });
                }
            }).then(function() {
                showToast('笔记已保存');
            }).catch(function(err) {
                console.error('保存笔记失败:', err);
                showToast('保存失败: ' + (err.message || err.code));
                return Promise.reject(err);
            });
        },

        getNote: function(nodeKey) {
            init();
            if (!currentUser) {
                return Promise.resolve(null);
            }
            if (useLocalStorage) {
                return getNoteLocal(nodeKey);
            }
            return db.collection('psy_notes').where({
                uid: currentUser.uid,
                nodeKey: nodeKey
            }).get().then(function(res) {
                return res.data.length > 0 ? res.data[0].content : null;
            }).catch(function(err) {
                console.error('获取笔记失败:', err);
                return Promise.resolve(null);
            });
        },

        addComment: function(content) {
            init();
            if (!currentUser) {
                showToast('请先登录');
                return Promise.reject('请先登录');
            }
            if (useLocalStorage) {
                return addCommentLocal(content);
            }
            return db.collection('psy_users').where({
                uid: currentUser.uid
            }).get().then(function(res) {
                var username = res.data.length > 0 ? res.data[0].username : '匿名用户';
                return db.collection('psy_comments').add({
                    uid: currentUser.uid,
                    content: content,
                    username: username,
                    createdAt: new Date().toISOString()
                });
            }).then(function() {
                showToast('评论已发布');
            }).catch(function(err) {
                console.error('发布评论失败:', err);
                showToast('发布失败: ' + (err.message || err.code));
                return Promise.reject(err);
            });
        },

        getComments: function(limit, skip) {
            init();
            if (useLocalStorage) {
                return getCommentsLocal(limit, skip);
            }
            return db.collection('psy_comments').orderBy('createdAt', 'desc')
                .limit(limit || 20)
                .skip(skip || 0)
                .get().then(function(res) {
                    return res.data || [];
                }).catch(function(err) {
                    console.error('获取评论失败:', err);
                    return Promise.resolve([]);
                });
        },

        getLearnStats: function() {
            init();
            if (!currentUser) {
                return Promise.resolve({ total: 0, learned: 0 });
            }
            if (useLocalStorage) {
                return getLearnStatsLocal();
            }
            return db.collection('psy_learn_progress').where({
                uid: currentUser.uid
            }).get().then(function(res) {
                var data = res.data || [];
                return {
                    total: data.length,
                    learned: data.filter(function(item) { return item.learned; }).length
                };
            }).catch(function(err) {
                console.error('获取学习统计失败:', err);
                return Promise.resolve({ total: 0, learned: 0 });
            });
        },

        /**
         * 记录页面访问（+1）。需要 CloudBase 后台已启用匿名登录，
         * 且 page_views 集合权限设为"所有用户可读，登录用户可写"。
         * 失败时返回 0，调用方应降级到 localStorage。
         */
        recordPageView: function(pageKey) {
            init();
            if (useLocalStorage || !db) {
                return Promise.resolve(0);
            }
            return ensureAnonymous().then(function() {
                var _ = db.command;
                return db.collection(PV_COLLECTION).where({ pageKey: pageKey }).get();
            }).then(function(res) {
                if (res.data && res.data.length > 0) {
                    var doc = res.data[0];
                    var newCount = (doc.count || 0) + 1;
                    return db.collection(PV_COLLECTION).doc(doc._id).update({
                        count: newCount,
                        lastViewAt: new Date().toISOString()
                    }).then(function() { return newCount; });
                } else {
                    return db.collection(PV_COLLECTION).add({
                        pageKey: pageKey,
                        count: 1,
                        createdAt: new Date().toISOString(),
                        lastViewAt: new Date().toISOString()
                    }).then(function() { return 1; });
                }
            }).catch(function(err) {
                console.warn('记录页面访问失败（降级到本地）:', err && err.message ? err.message : err);
                return 0;
            });
        },

        /**
         * 读取页面累计访问数。失败返回 0。
         */
        getPageViews: function(pageKey) {
            init();
            if (useLocalStorage || !db) {
                return Promise.resolve(0);
            }
            return ensureAnonymous().then(function() {
                return db.collection(PV_COLLECTION).where({ pageKey: pageKey }).get();
            }).then(function(res) {
                return (res.data && res.data.length > 0) ? (res.data[0].count || 0) : 0;
            }).catch(function() {
                return 0;
            });
        }
    };
})();

window.CloudBase = CloudBase;