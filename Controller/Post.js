// postShuffle -- web forum software for node.js
// Copyright (c) 2012 Mooneer Salem

var ControllerBase = require("../Utility/ControllerBase");
var util           = require("util");
var DataModel      = require("../DataModel");
var Sequelize      = require('sequelize');

module.exports = (function() {
    /**
     * Creates new Controller object.
     * @param {Object} app Express app object.
     * @return {Object} The new object.
     */
    var Post = function(app) {
        Post.super_.call(this, app);
    };
    
    util.inherits(Post, ControllerBase);
    
    /**
     * Links controller's routes to application.
     */
    Post.prototype.link_routes = function() {
        var self = this;
        
        this.__app.get(
            /^\/$/, 
            this.html(
                this.get_posts, 
                'index', 
                'PostShuffle: home'));
                
        this.__app.get(
            /^\/t\/(\w+)(?:\/(\w+))*$/,
           function(req, res)
            {
                self.get_posts({
                    'tag_list': req.params, 
                    'offset': 0
                    }, req.session).success(function(data) {
                    res.render('index', {
                        'title': 'PostShuffle: home',
                        'data': JSON.stringify(data)
                    });
                });
            });
            
        this.__app.put("/post", this.json(this.add_new_post));
        this.__app.get("/post", this.json(this.get_posts));
    };
    
    /**
     * Adds a new post.
     * @param {Object} json_args Arguments passed in by browser.
     * @param {Object} session_data Current session data.
     * @returns {Array} Data corresponding to the new post.
     */
    Post.prototype.add_new_post = function(json_args, session_data, query_args) {
        var self = this;
        var tags = json_args.tags || [];
        var error_f = function(err) {
            self.emitFailure(err);
        };
        
        if (!session_data.user)
        {
            error_f("Must log in to post.");
        }
        else if (!json_args.title || !json_args.body)
        {
            error_f("Must provide a title and body.");
        }
        else 
        {
            DataModel.Users.findAll({
                where: {
                    username: session_data.user.username
                }
            }).success(function(users) {
                var user = users[0];
                DataModel.Posts.create({
                    'title': json_args.title,
                    'body': json_args.body
                }).success(function(post) {
                    DataModel.Tags.findAll({where: {'tag': tags}}).success(function(tagObjs) {
                        var non_exist_list = [];
                        
                        var tag_exist_f = function() {
                            // Add the tags that exist.
                            var chainer = new Sequelize.Utils.QueryChainer();
                            for (var i in tagObjs)
                            {
                                chainer.add(post.addTag(tagObjs[i]));
                            }
                            
                            chainer.add(user.addPost(post));
                            chainer.runSerially({ skipOnError: true }).success(function() {
                                self.emitSuccess({
                                    'tags': tags,
                                    'title': post.title,
                                    'author': {
                                        'username': user.username,
                                        'title': user.title,
                                        'is_moderator': user.is_moderator,
                                        'is_admin': user.is_admin,
                                        'joined': user.createdAt
                                    },
                                    'body': post.body,
                                    'id': post.id,
                                    'create_date': post.createdAt.toUTCString(),
                                    'update_date': post.updatedAt.toUTCString(),
                                    'num_comments': 0
                                });
                            }).error(error_f);
                        };
                        
                        var tag_f = function(idx, tag)
                        {
                            DataModel.Tags.create({
                                tag: tag
                            }).success(function(t) {
                                post.addTag(t).success(function() {
                                    if (idx + 1 < non_exist_list.length)
                                    {
                                        tag_f(idx + 1, non_exist_list[idx + 1]);
                                    }
                                    else
                                    {
                                        tag_exist_f();
                                    }
                                }).error(error_f);
                            }).error(error_f);
                        };
                        
                        // Find and add the tags that don't already exist.
                        for (var k in tags)
                        {
                            if (!tags[k]) continue;
                            
                            var containsItem = false;
                            for (var j in tagObjs)
                            {
                                if (j.tag == tags[k])
                                {
                                    containsItem = true;
                                    break;
                                }
                            }
                            
                            if (!containsItem)
                            {                                    
                                non_exist_list.push(tags[k]);
                            }
                        }
                        
                        if (non_exist_list.length > 0)
                        {
                            tag_f(0, non_exist_list[0]);
                        }
                        else
                        {
                            tag_exist_f();
                        }
                    });
                });
            });
        }
        
        return this;
    };
    
    /**
     * Retrieves posts, given a list of tags and an offset.
     * @param {Object} json_args Dictionary of arguments (offset and tag_list).
     * @param {Object} session_data Session data.
     * @return {Array} The list of posts.
     */
    Post.prototype.get_posts = function(json_args, session_data, query_args) {
        var self = this;
        var tag_list = json_args.tag_list || query_args.tag_list || [];
        var offset = json_args.offset || query_args.offset || 0;
        
        var query = {
            'offset': offset, 
            'limit': 5,
            'order': 'createdAt DESC'
        };
        
        var failure_f = function(err) {
            self.emitFailure(err);
        };
        
        var success_f = function(list) {
            var result = [];
            var tag_f = function(idx, tags) {
                var tag_strings = [];
                
                for (var i in tags)
                {
                    tag_strings.push(tags[i].tag);
                }
                
                list[idx].getUser().success(function(u) {
                    list[idx].getComments().success(function(c) {
                        result.push({
                            'tags': tag_strings,
                            'title': list[idx].title,
                            'author': {
                                'username': u.username,
                                'title': u.title,
                                'is_moderator': u.is_moderator,
                                'is_admin': u.is_admin,
                                'joined': u.createdAt
                            },
                            'body': list[idx].body,
                            'id': list[idx].id,
                            'create_date': list[idx].createdAt.toUTCString(),
                            'update_date': list[idx].updatedAt.toUTCString(),
                            'num_comments': c.length
                        });
                        
                        if (idx + 1 < list.length)
                        {
                            list[idx + 1].getTags().success(function(v) {
                                tag_f(idx + 1, v);
                            }).error(failure_f);
                        }
                        else 
                        {
                            self.emitSuccess({
                                'posts': result
                            });
                        }
                    }).error(failure_f);
                }).error(failure_f);
            };
            
            // recursive. not sure if this is good for large result sets.
            if (list.length > 0)
            {
                list[0].getTags().success(function(v) {
                    tag_f(0, v);
                }).error(failure_f);
            }
            else 
            {
                self.emitSuccess({
                    'posts': result
                });
            }
        };
        
        if (tag_list.length > 0)
        {
            query.include = [ 'Tag' ];
            query.where = {
                'Tags.tag': tag_list
            };
            DataModel.Posts.findAll(query).success(success_f).error(failure_f);
        }
        else
        {
            DataModel.Posts.findAll(query).success(success_f).error(failure_f);
        }
        
        return self;
    };
    
    return Post;
})();