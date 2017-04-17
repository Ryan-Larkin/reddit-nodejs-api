"use strict"
var request = require('request-promise');
var mysql = require('promise-mysql');
var RedditAPI = require('./reddit');

function getSubreddits() {
    return request('https://www.reddit.com/.json')
        .then(response => {
            // Parse response as JSON and store in variable called result
            // var response; // continue this line
            var result = JSON.parse(response);
           
            // Use .map to return a list of subreddit names (strings) only
            return result.data.children.map(subreddits => {
                 return subreddits.data.subreddit;
            });
        });
}

function getPostsForSubreddit(subredditName) {
    return request('https://www.reddit.com/r/' + subredditName + '.json?limit=50')
        .then(
            response => {
                // Parse the response as JSON and store in variable called result
                //var response; // continue this line
                var result = JSON.parse(response);// 
                
                return result.data.children
                    .filter(posts => {
                        return !posts.data.is_self;
                    }) // Use .filter to remove self-posts
                    .map(filteredPosts => {
                        return {
                            title: filteredPosts.data.title,
                            url: filteredPosts.data.url,
                            user: filteredPosts.data.author
                        };
                    }); // Use .map to return title/url/user objects only
            }
        );
}

function checkIdFromAuthor(author) {
    var query = this.conn.query(
        `
        SELECT username 
        FROM users
        WHERE username = ` + author)
        .then(users => {
            if (users.length > 0) {
                
            }
        })
}

function checkPostFromTitle(title) {
    var query = this.conn.query(
        `
        SELECT id
        FROM posts
        WHERE title = ` + title);
    
    if (!query) {
        
    }
}

function checkCommentParent(postid) {
    // how to link child comments to parent comments without using reddit's IDs
}

function getCommentsForCrawler(postUrl) {
    return request(postUrl + ".json")
        .then(response => {
            var result = JSON.parse(response);
            
            return result.data.children
                .filter(comments => {
                    return comments.kind === 't1';
                })
                .map(filteredComment => {
                    // need functions to do queries with the name to find the ID? Create a new user instead?
                    // need functions to change the ids into ints usable by our database?
                    
                    
                    return {
                        userId: filteredComment.data.author, // need an id, not a name
                        postId: filteredComment.data.link_id, // need to convert to our database's post id
                        // return post title instead here in the fucntion
                        parentId: filteredComment.data.parentId, // returns something like t3_65bvqe, need to chang
                        text: filteredComment.data.body
                        // replies: ?
                    };
                });
        });
}

function crawl() {
    // create a connection to the DB
    var connection = mysql.createPool({
        host     : 'localhost',
        user     : 'root', // CHANGE THIS :)
        password : '',
        database: 'reddit',
        connectionLimit: 10
    });

    // create a RedditAPI object. we will use it to insert new data
    var myReddit = new RedditAPI(connection);

    // This object will be used as a dictionary from usernames to user IDs
    var users = {};

    /*
    Crawling will go as follows:

        1. Get a list of popular subreddits
        2. Loop thru each subreddit and:
            a. Use the `createSubreddit` function to create it in your database
            b. When the creation succeeds, you will get the new subreddit's ID
            c. Call getPostsForSubreddit with the subreddit's name
            d. Loop thru each post and:
                i. Create the user associated with the post if it doesn't exist
                2. Create the post using the subreddit Id, userId, title and url
     */

    // Get a list of subreddits
    getSubreddits()
        .then(subredditNames => {
            subredditNames.forEach(subredditName => {
                var subId;
                myReddit.createSubreddit({name: subredditName})
                    .then(subredditId => {
                        subId = subredditId;
                        return getPostsForSubreddit(subredditName)
                    })
                    .then(posts => {
                        posts.forEach(post => {
                            var userIdPromise;
                            if (users[post.user]) {
                                userIdPromise = Promise.resolve(users[post.user]);
                            }
                            else {
                                userIdPromise = myReddit.createUser({
                                    username: post.user,
                                    password: 'abc123'
                                })
                                .catch(err => {
                                    return users[post.user];
                                })
                            }

                            userIdPromise.then(userId => {
                                users[post.user] = userId;
                                return myReddit.createPost({
                                    subredditId: subId,
                                    userId: userId,
                                    title: post.title,
                                    url: post.url
                                });
                            });
                        });
                    });
            });
        });
}
crawl();