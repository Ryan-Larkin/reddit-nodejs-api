"use strict"
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
        if (post.subredditId === 'null') {
            return "There is no subreddit id";
        }
        
        else {
            return this.conn.query(
                `
                INSERT INTO posts (userId, title, url, createdAt, updatedAt, subredditId)
                VALUES (?, ?, ?, NOW(), NOW(), ?)`,
                [post.userId, post.title, post.url, post.subredditid]
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
            SELECT p.id AS pId, p.title, p.url, p.createdAt AS PostCreation, p.updatedAt AS PostUpdate, p.userId, 
            u.id AS uId, u.username, u.createdAt AS UserCreation, u.updatedAt AS UserUpdate,
            s.id AS sId, s.name AS subredditName, s.description, s.createdAt AS subredditCreation, s.updatedAt AS subredditUpdate,
            v.postId AS vPId, v.userId AS vUId, SUM(v.voteDirection) AS voteScore
            FROM posts p
            INNER JOIN users u ON p.userId = u.id
            INNER JOIN subreddits s ON p.subredditId = s.id
            INNER JOIN votes v ON p.id = v.postId
            GROUP BY v.postId ORDER BY voteScore DESC`
            // Check query
    
            // Now that we have voting, we need to add the voteScore of each post by doing an extra JOIN to the votes table, grouping by postId, and doing a 
            // SUM on the voteDirection column.
            // To make the output more interesting, we need to ORDER the posts by the highest voteScore first instead of creation time.
            
            
        );
        
        // Changes the output of the SQL query, into a nested array rather than a flat array
        return posts.map(function(post) {
            return {
                "id": post.pId,
                "title": post.title,
                "url": post.url,
                "createdAt": post.PostCreation,
                "updatedAt": post.PostUpdate,
                "userId": post.userId,
                "user": {
                    "id": post.uId,
                    "username": post.username,
                    "createdAt": post.UserCreation,
                    "updatedAt": post.UserUpdate
                },
                "subreddit": {
                    "id": post.sId,
                    "name": post.subredditName,
                    "description": post.description,
                    "createdAt": post.subredditCreation,
                    "updatedAt": post.subredditUpdate 
                },
                "votes": {
                    "userId": post.vUId,
                    "postId": post.vPId,
                    "voteScore": post.voteScore
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
        
    
}

module.exports = RedditAPI;
    
 


// //createVote(vote) {
//     if (vote.voteDirection !== 1 || vote.voteDirection !== -1 || vote.voteDirection !== 0) {
//         return "This is not a valid vote";
//     }
//     else {
//         return this.conn.query(
//             `
//             INSERT INTO votes (postId, userId, voteDirection)
//             VALUES (?, ?, ?)
//             ON DUPLICATE KEY UPDATE voteDirection=?`, // fourth ?, need fourth entry in array even if already assigned earlier?
//             [vote.postId, vote.userId, vote.voteDirection, vote.voteDirection]);
//     }
// }

//  query 

      `SELECT p.id AS pId, p.title, p.url, p.createdAt AS PostCreation, p.updatedAt AS PostUpdate, p.userId, 
            u.id AS uId, u.username, u.createdAt AS UserCreation, u.updatedAt AS UserUpdate,
            s.id AS sId, s.name AS subredditName, s.decription, s.createdAt AS subredditCreation, s.updatedAt AS subredditUpdate
            postId as vpostId, SUM(voteDirection) 
            FROM posts p
            INNER JOIN users u ON p.userId = u.id
            INNER JOIN subreddits s ON p.subredditId = s.id
            INNER JOIN  votes v ON pId = vpostId
            ORDER BY voteScore DESC`
            