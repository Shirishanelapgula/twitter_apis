const express = require("express");

const app = express();

app.use(express.json());

const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");

const path = require("path");

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server started!!");
    });
  } catch (e) {
    console.log(`DATABASE ERROR:${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const authenticateToken = async (request, response, next) => {
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    const jwtToken = authHeader.split(" ")[1];

    jwt.verify(jwtToken, "MY_TOKEN", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;

  const data = `SELECT * FROM user WHERE username = '${username}';`;

  const userData = await db.get(data);

  if (userData === undefined && password.length >= 6) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const addUser = `INSERT INTO 
        user (username,password,name,gender) 
        VALUES 
        ('${username}','${hashedPassword}','${name}','${gender}');`;

    await db.run(addUser);
    response.send("User created successfully");
  } else if (userData === undefined && password.length < 6) {
    response.status(400);
    response.send("Password is too short");
  } else if (userData !== undefined) {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const checkUser = `SELECT * FROM user WHERE username = '${username}';`;

  const user = await db.get(checkUser);

  if (user !== undefined) {
    const isPassword = await bcrypt.compare(password, user.password);

    if (isPassword) {
      const payload = {
        username: username,
      };

      const jwtToken = jwt.sign(payload, "MY_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { username } = request;

  const id = `SELECT * FROM user WHERE username = '${username}';`;

  const user = await db.get(id);
  const user_id = user.user_id;

  const query = `SELECT user.username ,tweet.tweet ,tweet.date_time AS dateTime FROM follower INNER JOIN tweet ON tweet.user_id = follower.following_user_id INNER JOIN user ON user.user_id = tweet.user_id WHERE follower.follower_user_id = ${user_id}
  ORDER BY tweet.date_time DESC LIMIT 4;`;

  const data1 = await db.all(query);

  response.send(data1);
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  const { username } = request;

  const id = `SELECT * FROM user WHERE username = '${username}';`;

  const user = await db.get(id);
  const user_id = user.user_id;

  const query1 = `SELECT user.name AS name FROM follower INNER JOIN user ON follower.following_user_id = user.user_id WHERE follower.follower_user_id = ${user_id};`;

  const data2 = await db.all(query1);

  response.send(data2);
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const { username } = request;

  const id = `SELECT * FROM user WHERE username = '${username}';`;

  const user = await db.get(id);
  const user_id = user.user_id;

  console.log(user_id);

  const query2 = `SELECT user.name AS name FROM follower INNER JOIN user ON follower.follower_user_id = user.user_id WHERE follower.following_user_id = ${user_id};`;

  const data3 = await db.all(query2);

  response.send(data3);
});

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { username } = request;
  const { tweetId } = request.params;

  const id = `SELECT * FROM user WHERE username = '${username}';`;

  const user = await db.get(id);
  const user_id = user.user_id;

  const tweetIds = `SELECT tweet.tweet_id,tweet.tweet,tweet.user_id,tweet.date_time FROM tweet INNER JOIN follower ON tweet.user_id = follower.following_user_id WHERE follower_user_id = ${user_id};`;

  const allTweets = await db.all(tweetIds);

  const getTweet = `SELECT * FROM tweet WHERE tweet_id = ${tweetId};`;

  const getTweetData = await db.get(getTweet);

  console.log(allTweets);

  console.log(getTweetData);

  const check = allTweets.some(
    (each) => each.tweet_id === getTweetData.tweet_id
  );

  console.log(check);

  if (check) {
    const getTweets = `SELECT tweet.tweet,COUNT(DISTINCT(like.like_id)) AS likes,COUNT(DISTINCT(reply.reply_id)) AS replies ,tweet.date_time AS dateTime FROM tweet INNER JOIN like ON tweet.tweet_id = like.tweet_id INNER JOIN reply ON like.tweet_id=reply.tweet_id WHERE tweet.tweet_id= ${tweetId};`;

    const tweetsData = await db.get(getTweets);

    response.send(tweetsData);
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { username } = request;
    const { tweetId } = request.params;

    const id = `SELECT * FROM user WHERE username = '${username}';`;

    const user = await db.get(id);
    const user_id = user.user_id;

    const tweetIds = `SELECT tweet.tweet_id,tweet.tweet,tweet.user_id,tweet.date_time FROM tweet INNER JOIN follower ON tweet.user_id = follower.following_user_id WHERE follower_user_id = ${user_id};`;

    const allTweets = await db.all(tweetIds);

    const getTweet = `SELECT * FROM tweet WHERE tweet_id = ${tweetId};`;

    const getTweetData = await db.get(getTweet);

    console.log(allTweets);

    console.log(getTweetData);

    const check = allTweets.some(
      (each) => each.tweet_id === getTweetData.tweet_id
    );

    console.log(check);

    if (check) {
      const getTweets = `SELECT user.username FROM tweet INNER JOIN like ON tweet.tweet_id = like.tweet_id INNER JOIN user ON user.user_id = like.user_id WHERE tweet.tweet_id= ${tweetId};`;

      const tweetsData = await db.all(getTweets);

      const list = [];

      for (let each of tweetsData) {
        list.push(each.username);
      }

      const obj = {
        likes: list,
      };

      response.send(obj);
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { username } = request;
    const { tweetId } = request.params;

    const id = `SELECT * FROM user WHERE username = '${username}';`;

    const user = await db.get(id);
    const user_id = user.user_id;

    const tweetIds = `SELECT tweet.tweet_id,tweet.tweet,tweet.user_id,tweet.date_time FROM tweet INNER JOIN follower ON tweet.user_id = follower.following_user_id WHERE follower_user_id = ${user_id};`;

    const allTweets = await db.all(tweetIds);

    const getTweet = `SELECT * FROM tweet WHERE tweet_id = ${tweetId};`;

    const getTweetData = await db.get(getTweet);

    console.log(allTweets);

    console.log(getTweetData);

    const check = allTweets.some(
      (each) => each.tweet_id === getTweetData.tweet_id
    );

    console.log(check);

    if (check) {
      const getTweets = `SELECT user.name,reply.reply FROM tweet INNER JOIN reply ON tweet.tweet_id = reply.tweet_id INNER JOIN user ON user.user_id = reply.user_id WHERE tweet.tweet_id= ${tweetId};`;

      const tweetsData = await db.all(getTweets);

      console.log(tweetsData);

      const list = [];

      for (let each of tweetsData) {
        list.push(each);
      }

      const obj = {
        replies: list,
      };

      response.send(obj);
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const { username } = request;

  const id = `SELECT * FROM user WHERE username = '${username}';`;

  const user = await db.get(id);

  const user_id = user.user_id;

  console.log(user_id);

  const tweets = `SELECT tweet.tweet,COUNT(DISTINCT(like.like_id)) AS likes,COUNT(DISTINCT(reply.reply_id)) AS replies,tweet.date_time AS dateTime FROM tweet INNER JOIN reply ON reply.tweet_id = tweet.tweet_id INNER JOIN like ON like.tweet_id = reply.tweet_id  INNER JOIN user ON user.user_id = tweet.user_id WHERE user.user_id = ${user_id} GROUP BY tweet.tweet_id;`;

  const userTweetsData = await db.all(tweets);

  response.send(userTweetsData);
});

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweet } = request.body;

  const { username } = request;

  const id = `SELECT * FROM user WHERE username = '${username}';`;

  const user = await db.get(id);

  const user_id = user.user_id;

  const addTweet = `INSERT INTO tweet (tweet,user_id) VALUES ('${tweet}',${user_id});`;

  await db.run(addTweet);

  response.send("Created a Tweet");
});

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const { username } = request;

    const id = `SELECT * FROM user WHERE username = '${username}';`;

    const user = await db.get(id);

    const user_id = user.user_id;

    console.log(user_id);

    const allUserTweets = `SELECT * FROM tweet WHERE user_id = ${user_id}`;

    const allTweetsData = await db.all(allUserTweets);

    console.log(allTweetsData);

    let a = [];

    for (let each of allTweetsData) {
      a.push(each.tweet_id);
    }

    console.log(a);
    console.log(tweetId);

    let ch = a.includes(parseInt(tweetId));

    console.log(typeof tweetId);

    console.log(ch);

    if (ch) {
      const deleteTweet = `DELETE FROM tweet WHERE tweet_id = ${tweetId};`;

      await db.run(deleteTweet);

      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

module.exports = app;
