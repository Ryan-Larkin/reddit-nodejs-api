"use strict";
var bcrypt = require('bcrypt-as-promised');
var HASH_ROUNDS = 10;

class RedditAPI {
    constructor(conn) {
        this.conn = conn;
    }

    createUser(user) {
        /*
        first we have to hash the password. we will learn about hashing next week.
        the goal of hashing is to store a digested version of the password from which
        it is infeasible to recover the original password, but which can still be used
        to assess with great confidence whether a provided password is the correct one or not
         */
        return bcrypt.hash(user.password, HASH_ROUNDS)
            .then(hashedPassword => {
                return this.conn.query('INSERT INTO users (username,password, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())', [user.username, hashedPassword]);
            })
            .then(result => {
                return result.insertId;
            })
            .catch(error => {
                // Special error handling for duplicate entry
                if (error.code === 'ER_DUP_ENTRY') {
                    throw new Error('A user with this username already exists');
                }
                else {
                    throw error;
                }
            });
    }

    createPost(post) {
        if (post.subredditId == null) {
            return "There is no subreddit id";
        }
        
        else {
            return this.conn.query(
                `
                INSERT INTO posts (userId, title, url, createdAt, updatedAt, subredditId)
                VALUES (?, ?, ?, NOW(), NOW(), ?)`,
                [post.userId, post.title, post.url, post.subredditId]
                )
                .then(result => {
                        return result.insertId;
                }).catch(error => {
                    throw error;
                });
        }
    }

    getAllPosts() {
        /*
        strings delimited with ` are an ES2015 feature called "template strings".
        they are more powerful than what we are using them for here. one feature of
        template strings is that you can write them on multiple lines. if you try to
        skip a line in a single- or double-quoted string, you would get a syntax error.

        therefore template strings make it very easy to write SQL queries that span multiple
        lines without having to manually split the string line by line.
         */
         
        var posts = this.conn.query(
            `
            SELECT p.id AS PostsId, p.title AS PostTitle, p.url AS PostURL, p.createdAt AS PostCreation, p.updatedAt AS PostUpdate, p.userId AS PostsUserId, 
            u.id AS UsersId, u.username AS Username, u.createdAt AS UserCreation, u.updatedAt AS UserUpdate,
            s.id AS SubredditsId, s.name AS SubredditName, s.description AS SubredditDescription, s.createdAt AS subredditCreation, s.updatedAt AS subredditUpdate,
            v.postId AS VotesPostId, v.userId AS VotesUserId, SUM(v.voteDirection) AS VoteScore
            FROM posts p
            INNER JOIN users u ON p.userId = u.id
            INNER JOIN subreddits s ON p.subredditId = s.id
            LEFT JOIN votes v ON p.id = v.postId
            GROUP BY vPId ORDER BY voteScore DESC`
            // Check query
    
            // Now that we have voting, we need to add the voteScore of each post by doing an extra JOIN to the votes table, grouping by postId, and doing a 
            // SUM on the voteDirection column.
            // To make the output more interesting, we need to ORDER the posts by the highest voteScore first instead of creation time.
            
            
        );
        
        // Changes the output of the SQL query, into a nested array rather than a flat array
        return posts.map(function(post) {
            return {
                "id": post.PostsId,
                "title": post.PostTitle,
                "url": post.PostURL,
                "createdAt": post.PostCreation,
                "updatedAt": post.PostUpdate,
                "userId": post.PostsUserId,
                "user": {
                    "id": post.UsersId,
                    "username": post.Username,
                    "createdAt": post.UserCreation,
                    "updatedAt": post.UserUpdate
                },
                "subreddit": {
                    "id": post.SubredditsId,
                    "name": post.SubredditName,
                    "description": post.SubredditDescription,
                    "createdAt": post.subredditCreation,
                    "updatedAt": post.subredditUpdate 
                },
                "votes": {
                    "userId": post.VotesUserId,
                    "postId": post.VotesPostId,
                    "voteScore": post.VoteScore
                }
            };
        });
    }

    createSubreddit(subreddit) {
        return this.conn.query(
            `INSERT INTO subreddits (name, description, createdAt, updatedAt)
            VALUES(?, ?, NOW(), NOW())`, [subreddit.name, subreddit.description])
            .then(function(result) {
                return result.insertId;
            }).catch(error => {
                 if (error.code === 'ER_DUP_ENTRY') {
                    throw new Error('A subreddit with this name already exists');
                }
                else {
                    throw error;
                }
            });
    }
    
    getAllSubreddits() {
        return this.conn.query(
            `SELECT * FROM subreddits 
            ORDER BY createdAt`);
    }
    
    createVote(vote) {
        if (vote.voteDirection !== 1 || vote.voteDirection !== -1 || vote.voteDirection !== 0) {
            return "This is not a valid vote";
        }
        else {
            return this.conn.query(
                `
                INSERT INTO votes (postId, userId, voteDirection)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE voteDirection=?`, // fourth ?, need fourth entry in array even if already assigned earlier?
                [vote.postId, vote.userId, vote.voteDirection, vote.voteDirection]);
        }
    
    }
        
    createComment(comment) {
        var parentId; 
        if (comment.parentId === 'null') {
            parentId = null;
        }
        return this.conn.query(
            `
            INSERT INTO comments (userId, postId, parentId, text, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [comment.userId, comment.postId, parentId, comment.text])
        .then(result => {
            return result.insertId;
        })
        .catch(error => {
            throw error;
        });
    }
    
    getChildComments(parentId, levels) {
        var query = this.conn.query(
            `
            SELECT id, text, createdAt, updatedAt
            FROM comments
            WHERE parentId = ` + parentId);
        
        return query.map(subcomments => {
            return {
                id: subcomments.id,
                text: subcomments.text,
                createdAt: subcomments.createdAt,
                updatedAt: subcomments.updatedAt,
                replies: this.getChildComments(subcomments.id, levels-1)
            };
        });
    }
    
    getCommentsForPost(postId, levels) {
        
        var queryComments = this.conn.query(
            `
            SELECT id, text, createdAt, updatedAt
            FROM comments
            WHERE postId = ` + postId.id + ` AND parentId IS NULL`)
            .map(comments => {
                return  {
                    id: comments.id,
                    text: comments.text,
                    createdAt: comments.createdAt,
                    updatedAt: comments.updatedAt,
                    replies: this.getChildComments(comments.id, levels)
                }
            });
    }
}

module.exports = RedditAPI;

// In the reddit.js API, add a getCommentsForPost(postId, levels) function. It should return a thread of comments in an array. 
// The array should contain the top-level comments, and each comment can optionally have a replies array. This array will contain 
// the comments that are replies to the current one.

// We can do this by using a recursive function. The steps will be like this:

// Retrieve the top-level comments for a given post ID. These are the ones where parent_id is NULL.
// Gather up all the unique IDs of the top-level comments, and retrieve those comments where the parentId is equal to one of those IDs
// Keep going until either you have no more comments at a certain level, or you have reached level levels of replies.


    // getSubreddits()
    //     .then(subredditNames => {
    //         subredditNames.forEach(subredditName => {
    //             var subId;
    //             myReddit.createSubreddit({name: subredditName})
    //                 .then(subredditId => {
    //                     subId = subredditId;
    //                     return getPostsForSubreddit(subredditName)
    //                 })
    //                 .then(posts => {
    //                     posts.forEach(post => {
    //                         var userIdPromise;
    //                         if (users[post.user]) {
    //                             userIdPromise = Promise.resolve(users[post.user]);
    //                         }
    //                         else {
    //                             userIdPromise = myReddit.createUser({
    //                                 username: post.user,
    //                                 password: 'abc123'
    //                             })
    //                             .catch(err => {
    //                                 return users[post.user];
    //                             })
    //                         }

    //                         userIdPromise.then(userId => {
    //                             users[post.user] = userId;
    //                             return myReddit.createPost({
    //                                 subredditId: subId,
    //                                 userId: userId,
    //                                 title: post.title,
    //                                 url: post.url
    //                             });
    //                         });
    //                     });
    //                 });
    //         });
    //     });