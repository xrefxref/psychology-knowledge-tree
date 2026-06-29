var CloudBase = (function() {
    var db = null;
    var auth = null;
    var initialized = false;
    var currentUser = null;

    function init() {
        if (initialized) return;
        
        window.Tcb.init({
            env: 'yunkaifa20260626-d0el5yg4df33bbf'
        });

        db = window.Tcb.database();
        auth = window.Tcb.auth();
        initialized = true;
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

    return {
        init: init,
        
        login: function(username, password) {
            init();
            return new Promise(function(resolve, reject) {
                auth.signInWithEmailAndPassword(username + '@psychology.com', password)
                    .then(function(user) {
                        currentUser = user;
                        showToast('登录成功');
                        resolve(user);
                    })
                    .catch(function(err) {
                        if (err.code === 'INVALID_CREDENTIALS') {
                            showToast('用户名或密码错误');
                        } else {
                            showToast('登录失败: ' + err.message);
                        }
                        reject(err);
                    });
            });
        },

        register: function(username, password) {
            init();
            return new Promise(function(resolve, reject) {
                auth.createUserWithEmailAndPassword(username + '@psychology.com', password)
                    .then(function(user) {
                        db.collection('users').add({
                            username: username,
                            uid: user.uid,
                            createdAt: new Date().toISOString()
                        }).then(function() {
                            currentUser = user;
                            showToast('注册成功');
                            resolve(user);
                        }).catch(function(err) {
                            showToast('注册失败: ' + err.message);
                            reject(err);
                        });
                    })
                    .catch(function(err) {
                        if (err.code === 'EMAIL_ALREADY_EXISTS') {
                            showToast('该用户名已被注册');
                        } else {
                            showToast('注册失败: ' + err.message);
                        }
                        reject(err);
                    });
            });
        },

        logout: function() {
            init();
            auth.signOut();
            currentUser = null;
            showToast('已退出登录');
        },

        getUser: function() {
            return currentUser;
        },

        saveLearnProgress: function(nodeKey, learned, notes) {
            if (!currentUser) {
                showToast('请先登录');
                return Promise.reject('请先登录');
            }
            init();
            return db.collection('learn_progress').where({
                uid: currentUser.uid,
                nodeKey: nodeKey
            }).get().then(function(res) {
                if (res.data.length > 0) {
                    return db.collection('learn_progress').doc(res.data[0]._id).update({
                        learned: learned,
                        notes: notes || '',
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    return db.collection('learn_progress').add({
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
                showToast('保存失败: ' + err.message);
                return Promise.reject(err);
            });
        },

        getLearnProgress: function(nodeKey) {
            if (!currentUser) {
                return Promise.resolve(null);
            }
            init();
            return db.collection('learn_progress').where({
                uid: currentUser.uid,
                nodeKey: nodeKey
            }).get().then(function(res) {
                return res.data.length > 0 ? res.data[0] : null;
            });
        },

        getAllProgress: function() {
            if (!currentUser) {
                return Promise.resolve([]);
            }
            init();
            return db.collection('learn_progress').where({
                uid: currentUser.uid
            }).get().then(function(res) {
                return res.data || [];
            });
        },

        saveNote: function(nodeKey, content) {
            if (!currentUser) {
                showToast('请先登录');
                return Promise.reject('请先登录');
            }
            init();
            return db.collection('notes').where({
                uid: currentUser.uid,
                nodeKey: nodeKey
            }).get().then(function(res) {
                if (res.data.length > 0) {
                    return db.collection('notes').doc(res.data[0]._id).update({
                        content: content,
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    return db.collection('notes').add({
                        uid: currentUser.uid,
                        nodeKey: nodeKey,
                        content: content,
                        createdAt: new Date().toISOString()
                    });
                }
            }).then(function() {
                showToast('笔记已保存');
            }).catch(function(err) {
                showToast('保存失败: ' + err.message);
                return Promise.reject(err);
            });
        },

        getNote: function(nodeKey) {
            if (!currentUser) {
                return Promise.resolve(null);
            }
            init();
            return db.collection('notes').where({
                uid: currentUser.uid,
                nodeKey: nodeKey
            }).get().then(function(res) {
                return res.data.length > 0 ? res.data[0].content : null;
            });
        },

        addComment: function(content) {
            if (!currentUser) {
                showToast('请先登录');
                return Promise.reject('请先登录');
            }
            init();
            return db.collection('users').where({
                uid: currentUser.uid
            }).get().then(function(res) {
                var username = res.data.length > 0 ? res.data[0].username : '匿名用户';
                return db.collection('comments').add({
                    uid: currentUser.uid,
                    content: content,
                    username: username,
                    createdAt: new Date().toISOString()
                });
            }).then(function() {
                showToast('评论已发布');
            }).catch(function(err) {
                showToast('发布失败: ' + err.message);
                return Promise.reject(err);
            });
        },

        getComments: function(limit, skip) {
            init();
            return db.collection('comments').orderBy('createdAt', 'desc')
                .limit(limit || 20)
                .skip(skip || 0)
                .get().then(function(res) {
                    return res.data || [];
                });
        },

        getLearnStats: function() {
            if (!currentUser) {
                return Promise.resolve({ total: 0, learned: 0 });
            }
            init();
            return db.collection('learn_progress').where({
                uid: currentUser.uid
            }).get().then(function(res) {
                var data = res.data || [];
                return {
                    total: data.length,
                    learned: data.filter(function(item) { return item.learned; }).length
                };
            });
        }
    };
})();

window.CloudBase = CloudBase;