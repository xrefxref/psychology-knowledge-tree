(function(window) {
    var AV = window.AV;
    
    if (!AV) {
        console.error('LeanCloud SDK 未加载');
        return;
    }

    var config = {
        appId: 'YOUR_APP_ID',
        appKey: 'YOUR_APP_KEY',
        serverURL: 'https://xxx.api.lncldglobal.com'
    };

    AV.init({
        appId: config.appId,
        appKey: config.appKey,
        serverURL: config.serverURL
    });

    window.LC = {
        config: config,
        
        setConfig: function(newConfig) {
            Object.assign(config, newConfig);
            AV.init({
                appId: config.appId,
                appKey: config.appKey,
                serverURL: config.serverURL
            });
        },

        getUser: function() {
            return AV.User.current();
        },

        login: async function(username, password) {
            try {
                return await AV.User.logIn(username, password);
            } catch (error) {
                throw new Error(error.message || '登录失败');
            }
        },

        register: async function(username, password, email) {
            try {
                var user = new AV.User();
                user.setUsername(username);
                user.setPassword(password);
                if (email) {
                    user.setEmail(email);
                }
                return await user.signUp();
            } catch (error) {
                throw new Error(error.message || '注册失败');
            }
        },

        logout: async function() {
            try {
                await AV.User.logOut();
                return true;
            } catch (error) {
                throw new Error(error.message || '登出失败');
            }
        },

        saveLearnProgress: async function(nodeKey, learned, notes) {
            try {
                var user = AV.User.current();
                if (!user) {
                    throw new Error('请先登录');
                }

                var query = new AV.Query('LearnProgress');
                query.equalTo('user', user);
                query.equalTo('nodeKey', nodeKey);
                
                var progress = await query.first();
                
                if (progress) {
                    progress.set('learned', learned);
                    if (notes !== undefined) {
                        progress.set('notes', notes);
                    }
                } else {
                    progress = new AV.Object('LearnProgress');
                    progress.set('user', user);
                    progress.set('nodeKey', nodeKey);
                    progress.set('learned', learned);
                    if (notes) {
                        progress.set('notes', notes);
                    }
                }
                
                return await progress.save();
            } catch (error) {
                throw new Error(error.message || '保存进度失败');
            }
        },

        getLearnProgress: async function(nodeKey) {
            try {
                var user = AV.User.current();
                if (!user) {
                    return null;
                }

                var query = new AV.Query('LearnProgress');
                query.equalTo('user', user);
                query.equalTo('nodeKey', nodeKey);
                
                return await query.first();
            } catch (error) {
                console.error('获取进度失败:', error);
                return null;
            }
        },

        getAllLearnProgress: async function() {
            try {
                var user = AV.User.current();
                if (!user) {
                    return [];
                }

                var query = new AV.Query('LearnProgress');
                query.equalTo('user', user);
                
                return await query.find();
            } catch (error) {
                console.error('获取所有进度失败:', error);
                return [];
            }
        },

        saveNote: async function(nodeKey, content) {
            try {
                var user = AV.User.current();
                if (!user) {
                    throw new Error('请先登录');
                }

                var query = new AV.Query('Note');
                query.equalTo('user', user);
                query.equalTo('nodeKey', nodeKey);
                
                var note = await query.first();
                
                if (note) {
                    note.set('content', content);
                } else {
                    note = new AV.Object('Note');
                    note.set('user', user);
                    note.set('nodeKey', nodeKey);
                    note.set('content', content);
                }
                
                return await note.save();
            } catch (error) {
                throw new Error(error.message || '保存笔记失败');
            }
        },

        getNote: async function(nodeKey) {
            try {
                var user = AV.User.current();
                if (!user) {
                    return null;
                }

                var query = new AV.Query('Note');
                query.equalTo('user', user);
                query.equalTo('nodeKey', nodeKey);
                
                var note = await query.first();
                return note ? note.get('content') : null;
            } catch (error) {
                console.error('获取笔记失败:', error);
                return null;
            }
        },

        getAllNotes: async function() {
            try {
                var user = AV.User.current();
                if (!user) {
                    return [];
                }

                var query = new AV.Query('Note');
                query.equalTo('user', user);
                
                var notes = await query.find();
                return notes.map(function(note) {
                    return {
                        nodeKey: note.get('nodeKey'),
                        content: note.get('content'),
                        updatedAt: note.get('updatedAt')
                    };
                });
            } catch (error) {
                console.error('获取所有笔记失败:', error);
                return [];
            }
        },

        addComment: async function(content) {
            try {
                var user = AV.User.current();
                if (!user) {
                    throw new Error('请先登录');
                }

                var comment = new AV.Object('Comment');
                comment.set('user', user);
                comment.set('content', content);
                comment.set('username', user.getUsername());
                
                return await comment.save();
            } catch (error) {
                throw new Error(error.message || '发表评论失败');
            }
        },

        getComments: async function(limit, skip) {
            try {
                var query = new AV.Query('Comment');
                query.descending('createdAt');
                query.include('user');
                query.limit(limit || 20);
                query.skip(skip || 0);
                
                var comments = await query.find();
                return comments.map(function(comment) {
                    return {
                        id: comment.id,
                        content: comment.get('content'),
                        username: comment.get('username'),
                        createdAt: comment.get('createdAt')
                    };
                });
            } catch (error) {
                console.error('获取评论失败:', error);
                return [];
            }
        },

        incrementVisitCount: async function() {
            try {
                var user = AV.User.current();
                if (!user) {
                    return;
                }

                var query = new AV.Query('UserStats');
                query.equalTo('user', user);
                
                var stats = await query.first();
                
                if (stats) {
                    stats.increment('visitCount');
                } else {
                    stats = new AV.Object('UserStats');
                    stats.set('user', user);
                    stats.set('visitCount', 1);
                }
                
                await stats.save();
            } catch (error) {
                console.error('更新访问计数失败:', error);
            }
        }
    };
})(window);