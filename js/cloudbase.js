var CloudBase = (function() {
    var db = null;
    var auth = null;
    var app = null;
    var initialized = false;
    var currentUser = null;
    var useLocalStorage = false;

    function init() {
        if (initialized) return;
        
        useLocalStorage = true;
        loadLocalUser();
        initialized = true;
        console.log('使用本地存储模式，登录功能已就绪');
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

    function hashPassword(password) {
        var hash = 0;
        var prime = 31;
        for (var i = 0; i < password.length; i++) {
            var char = password.charCodeAt(i);
            hash = (hash * prime + char) & 0xFFFFFFFF;
        }
        var salt = 'psy_salt_2024';
        var saltHash = 0;
        for (var j = 0; j < salt.length; j++) {
            saltHash = (saltHash * prime + salt.charCodeAt(j)) & 0xFFFFFFFF;
        }
        return 'psy_' + (hash ^ saltHash).toString(36);
    }

    function validateUsername(username) {
        if (!username || username.length < 3) {
            return { valid: false, message: '用户名至少需要3个字符' };
        }
        if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
            return { valid: false, message: '用户名只能包含字母、数字、下划线和中文' };
        }
        return { valid: true, message: '' };
    }

    function validatePassword(password) {
        if (!password || password.length < 6) {
            return { valid: false, message: '密码至少需要6个字符', strength: 0 };
        }
        var strength = 0;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        var messages = ['', '密码强度：弱', '密码强度：一般', '密码强度：强', '密码强度：非常强'];
        return { valid: true, message: messages[strength], strength: strength };
    }

    function showToast(message, type) {
        type = type || 'success';
        var colors = {
            success: 'rgba(16, 185, 129, 0.9)',
            error: 'rgba(239, 68, 68, 0.9)',
            warning: 'rgba(245, 158, 11, 0.9)',
            info: 'rgba(99, 102, 241, 0.9)'
        };
        
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type]};
            color: white;
            padding: 14px 28px;
            border-radius: 10px;
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 8px 24px rgba(0,0,0,0.25);
            animation: fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            backdrop-filter: blur(8px);
        `;
        document.body.appendChild(toast);
        
        setTimeout(function() {
            toast.style.animation = 'fadeOutUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            setTimeout(function() {
                document.body.removeChild(toast);
            }, 300);
        }, 2500);
    }

    function loginLocal(username, password) {
        return new Promise(function(resolve, reject) {
            var users = getLocalUsers();
            var hashedPassword = hashPassword(password);
            var user = users.find(function(u) {
                return u.username === username && u.password === hashedPassword;
            });
            
            if (user) {
                saveLocalUser({
                    uid: user.uid,
                    email: username + '@psychology.com',
                    username: user.username,
                    avatar: user.avatar,
                    createdAt: user.createdAt
                });
                showToast('欢迎回来，' + username + '！');
                resolve(currentUser);
            } else {
                showToast('用户名或密码错误', 'error');
                reject(new Error('用户名或密码错误'));
            }
        });
    }

    function registerLocal(username, password) {
        return new Promise(function(resolve, reject) {
            var validation = validateUsername(username);
            if (!validation.valid) {
                showToast(validation.message, 'warning');
                reject(new Error(validation.message));
                return;
            }
            
            validation = validatePassword(password);
            if (!validation.valid) {
                showToast(validation.message, 'warning');
                reject(new Error(validation.message));
                return;
            }

            var users = getLocalUsers();
            var exists = users.find(function(u) {
                return u.username === username;
            });
            
            if (exists) {
                showToast('该用户名已被注册', 'warning');
                reject(new Error('该用户名已被注册'));
            } else {
                var avatarColors = ['#ef4444', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6', '#06b6d4', '#ec4899', '#f97316'];
                var newUser = {
                    uid: 'local_' + Date.now(),
                    username: username,
                    password: hashPassword(password),
                    avatar: avatarColors[Math.floor(Math.random() * avatarColors.length)],
                    createdAt: new Date().toISOString(),
                    learnStats: { total: 0, learned: 0 },
                    settings: {
                        theme: 'dark',
                        notifications: true
                    }
                };
                users.push(newUser);
                saveLocalUsers(users);
                
                saveLocalUser({
                    uid: newUser.uid,
                    email: username + '@psychology.com',
                    username: newUser.username,
                    avatar: newUser.avatar,
                    createdAt: newUser.createdAt
                });
                showToast('注册成功！欢迎加入心理学学习之旅');
                resolve(currentUser);
            }
        });
    }

    function logoutLocal() {
        currentUser = null;
        localStorage.removeItem('psy_local_user');
        showToast('已安全退出');
    }

    function updateUserProfile(data) {
        return new Promise(function(resolve, reject) {
            if (!currentUser) {
                showToast('请先登录', 'warning');
                reject(new Error('请先登录'));
                return;
            }
            
            var users = getLocalUsers();
            var index = users.findIndex(function(u) {
                return u.uid === currentUser.uid;
            });
            
            if (index !== -1) {
                users[index] = Object.assign(users[index], data);
                saveLocalUsers(users);
                
                currentUser = Object.assign(currentUser, data);
                saveLocalUser(currentUser);
                
                showToast('个人信息已更新');
                resolve(currentUser);
            } else {
                showToast('更新失败', 'error');
                reject(new Error('更新失败'));
            }
        });
    }

    function getLeaderboard() {
        var users = getLocalUsers();
        var leaderboard = users.map(function(user) {
            return {
                username: user.username,
                avatar: user.avatar,
                learned: user.learnStats ? user.learnStats.learned : 0,
                total: user.learnStats ? user.learnStats.total : 0
            };
        }).sort(function(a, b) {
            return b.learned - a.learned;
        }).slice(0, 10);
        
        return Promise.resolve(leaderboard);
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
        
        var users = getLocalUsers();
        var index = users.findIndex(function(u) {
            return u.uid === currentUser.uid;
        });
        
        if (index !== -1) {
            if (!users[index].learnStats) users[index].learnStats = { total: 0, learned: 0 };
            var allProgress = JSON.parse(localStorage.getItem('psy_local_progress') || '{}');
            var allProgressArray = Object.values(allProgress).filter(function(p) { return p.uid === currentUser.uid; });
            users[index].learnStats.total = allProgressArray.length;
            users[index].learnStats.learned = allProgressArray.filter(function(p) { return p.learned; }).length;
            saveLocalUsers(users);
        }
        
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
            id: 'comment_' + Date.now(),
            uid: currentUser.uid,
            content: content,
            username: currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : '匿名用户'),
            avatar: currentUser.avatar || '#6366f1',
            createdAt: new Date().toISOString(),
            likes: 0,
            replies: []
        });
        localStorage.setItem('psy_local_comments', JSON.stringify(comments));
        showToast('评论已发布');
        return Promise.resolve();
    }

    function getCommentsLocal(limit, skip) {
        var comments = JSON.parse(localStorage.getItem('psy_local_comments') || '[]');
        return Promise.resolve(comments.slice(skip || 0, (skip || 0) + (limit || 20)));
    }

    function likeCommentLocal(commentId) {
        var comments = JSON.parse(localStorage.getItem('psy_local_comments') || '[]');
        var comment = comments.find(function(c) {
            return c.id === commentId;
        });
        if (comment) {
            comment.likes++;
            localStorage.setItem('psy_local_comments', JSON.stringify(comments));
            showToast('点赞成功');
        }
        return Promise.resolve();
    }

    function getLearnStatsLocal() {
        var progress = JSON.parse(localStorage.getItem('psy_local_progress') || '{}');
        var data = Object.values(progress).filter(function(p) { return p.uid === currentUser.uid; });
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
                            showToast('用户名或密码错误', 'error');
                        } else {
                            showToast('登录失败: ' + (err.message || err.code), 'error');
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
                            avatar: '#6366f1',
                            createdAt: new Date().toISOString()
                        }).then(function() {
                            currentUser = user;
                            showToast('注册成功');
                            resolve(user);
                        }).catch(function(err) {
                            console.error('保存用户信息失败:', err);
                            showToast('注册失败: ' + (err.message || err.code), 'error');
                            reject(err);
                        });
                    })
                    .catch(function(err) {
                        console.error('注册错误:', err);
                        if (err.code === 'EMAIL_ALREADY_EXISTS') {
                            showToast('该用户名已被注册', 'warning');
                        } else {
                            showToast('注册失败: ' + (err.message || err.code), 'error');
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
                showToast('已安全退出');
            } catch (err) {
                console.error('退出登录失败:', err);
                currentUser = null;
                showToast('已安全退出');
            }
        },

        getUser: function() {
            return currentUser;
        },

        updateProfile: function(data) {
            init();
            if (useLocalStorage) {
                return updateUserProfile(data);
            }
            return Promise.resolve();
        },

        getLeaderboard: function() {
            init();
            if (useLocalStorage) {
                return getLeaderboard();
            }
            return Promise.resolve([]);
        },

        validateUsername: validateUsername,
        
        validatePassword: validatePassword,

        saveLearnProgress: function(nodeKey, learned, notes) {
            init();
            if (!currentUser) {
                showToast('请先登录', 'warning');
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
                showToast('保存失败: ' + (err.message || err.code), 'error');
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
                showToast('请先登录', 'warning');
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
                showToast('保存失败: ' + (err.message || err.code), 'error');
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
                showToast('请先登录', 'warning');
                return Promise.reject('请先登录');
            }
            if (useLocalStorage) {
                return addCommentLocal(content);
            }
            return db.collection('psy_users').where({
                uid: currentUser.uid
            }).get().then(function(res) {
                var username = res.data.length > 0 ? res.data[0].username : '匿名用户';
                var avatar = res.data.length > 0 ? res.data[0].avatar : '#6366f1';
                return db.collection('psy_comments').add({
                    uid: currentUser.uid,
                    content: content,
                    username: username,
                    avatar: avatar,
                    createdAt: new Date().toISOString(),
                    likes: 0
                });
            }).then(function() {
                showToast('评论已发布');
            }).catch(function(err) {
                console.error('发布评论失败:', err);
                showToast('发布失败: ' + (err.message || err.code), 'error');
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

        likeComment: function(commentId) {
            init();
            if (useLocalStorage) {
                return likeCommentLocal(commentId);
            }
            return Promise.resolve();
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
        }
    };
})();

window.CloudBase = CloudBase;