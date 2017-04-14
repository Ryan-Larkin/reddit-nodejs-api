-- This creates the users table. The username field is constrained to unique
-- values only, by using a UNIQUE KEY on that column
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(60) NOT NULL, -- why 60??? ask me :)
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY username (username)
);

-- This creates the posts table. The userId column references the id column of
-- users. If a user is deleted, the corresponding posts' userIds will be set NULL.
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(300) DEFAULT NULL,
  url VARCHAR(2000) DEFAULT NULL,
  userId INT DEFAULT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  KEY userId (userId), -- why did we add this here? ask me :)
  CONSTRAINT validUser FOREIGN KEY (userId) REFERENCES users (id) ON DELETE SET NULL
);


CREATE TABLE subreddits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(30) NOT NULL,
  description VARCHAR(200),
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY name (name)
);

ALTER TABLE reddit.posts
ADD COLUMN subredditId INT,
ADD FOREIGN KEY subreddit_fk(subredditId) REFERENCES subreddits(id) ON DELETE CASCADE;

CREATE TABLE votes (
  userId INT,
  postId INT,
  voteDirection TINYINT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (userId, postId),
  KEY userId (userId),
  KEY postId (postId),
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (postId) REFERENCES posts (id) ON DELETE CASCADE
);


CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  postId INT,
  parentId INT,
  text VARCHAR(10000),
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE SET NULL,
  FOREIGN KEY (userId) REFERENCES posts (id) ON DELETE SET NULL,
  FOREIGN KEY (parentId) REFERENCES comments (id)
);