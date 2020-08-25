if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

var mongoose = require("mongoose");
var port = process.env.PORT || 3000;
if (port == 3000)
  mongoose.connect(process.env.LOCAL_DATABASE_URL, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  });
else
  mongoose.connect(process.env.DATABASE_URL, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  });

const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const SSE = require("sse");

const Level = require("./models/level");

var cors = require("cors");
app.use(cors());

app.use(express.json());
// var bodyParser = require("body-parser");
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));

let clients = [];

//prepare response header
var prepareResponseHeader = function (req, response, next) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  //the following 2 lines were added for IE support: 2kb padding, and a retry param
  response.write(":" + new Array(2049).join(" ") + "\n");
  response.write("retry: 2000\n");

  next();
};

app.get("/scoreChanged", prepareResponseHeader, eventsHandler);

// Middleware for GET /scoreChanged endpoint
function eventsHandler(req, res) {
  // Generate an id based on timestamp and save res
  // object of client connection on clients list
  // Later we'll iterate it and send updates to each client
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res,
  };
  clients.push(newClient);
  //console.log(`${clientId} Connection opened`);
  // When client closes connection we update the clients list
  // avoiding the disconnected one
  req.on("close", () => {
    //console.log(`${clientId} Connection closed`);
    clients = clients.filter((c) => c.id !== clientId);
  });
}

//Iterate clients list and use write res object method to send new leader
function sendEventsToAll(newLeader) {
  clients.forEach((c) => c.res.write(`data: ${JSON.stringify(newLeader)}\n\n`));
}


const levels = ["level_1", "level_2", "level_3", "level_4"];

//gets the current leader
app.post("/level", async function (req, res) {
  //if(req.cookies)
  //console.log("req.body.levelIndex", req.body);
  try {
    var leader = await Level.findOne({ level: levels[req.body.levelIndex] });
    if (!leader) {
      return res.status(501).json({
        success: false,
        msg: "Database error.",
      });
    }
    //app.locals.leader = leader.name;
    return res.json(leader);
  } catch (err) {
    res.status(501).json({
      success: false,
      msg: "Database error.",
    });
  }
});

app.post("/score", authenticateToken, async function (req, res) {
  //console.log(req.user)
  //console.log("req.body.username", req.body.username)
  //set the leader for a particular level
  try {
    await Level.updateOne(
      { level: levels[req.body.levelIndex] },
      { name: req.user.username, score: req.body.score }
    );
    const newLeader = {
      level: levels[req.body.levelIndex],
      name: req.user.username,
      score: req.body.score,
    };
    //console.log("newLeader", newLeader)
    sendEventsToAll(newLeader);
    return res.json(newLeader);
  } catch (err) {
    res.status(501).json({
      success: false,
      msg: "Database error.",
    });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

var server = app.listen(3000, function () {
  console.log("Listening on port", 3000);
});

var sse = new SSE(server);
sse.on("connection", function (client) {
  console.log(111, client);
});
