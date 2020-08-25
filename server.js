if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }
  
  var mongoose = require("mongoose");
  var port = process.env.PORT || 5000;
  if (port == 5000)
    mongoose.connect(process.env.LOCAL_DATABASE_URL, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
  else
    mongoose.connect(process.env.DATABASE_URL, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
  
  const User = require("./models/user");
  const RefreshToken = require("./models/refreshToken");
  
  const express = require("express");
  const app = express();
  const jwt = require("jsonwebtoken");
  
  var cors = require("cors");
  app.use(cors());
  
  app.use(express.json());
  
  
  async function saveRefreshToken(token) {
    var newToken = new RefreshToken();
    newToken.token = token;
    try {
      await newToken.save();
      //return res.json({ success: true, token: token });
    } catch (err) {
      res.status(501).json({
        success: false,
        msg: "Database error.",
      });
    }
  }
  
  
  app.post("/token", async (req, res) => {
    const token = req.body.token;
    try {
      const refreshToken = await RefreshToken.findOne({ token: token });
      if (!refreshToken) {
        return res.sendStatus(403);
      }
      jwt.verify(
        refreshToken.token,
        process.env.REFRESH_TOKEN_SECRET,
        (err, user) => {
          if (err) return res.sendStatus(403);
          var payLoad = {
            //sub: user._id,
            //iat: Date.now(), //issued at time
            username: user.username,
          };
          const accessToken = generateAccessToken(payLoad);
          return res.json({ accessToken: accessToken });
        }
      );
    } catch (err) {
      res.status(501).json({
        success: false,
        msg: "Database error.",
      });
    }
  });
  
  app.delete("/logout", async (req, res) => {
    await RefreshToken.deleteOne({ token: req.body.token });
    //Uncomment the code below to see if logout clears the token from the database
    /* RefreshToken.find(function (err, data) {
      console.log("Number of refresh tokens after logout:", data.length);
    });   */
    //res.sendStatus(204);
    res.json({ success: true, msg: "Logged out" });    
  });
  
  app.post("/register", async function (req, res) {
    if (!req.body.username || !req.body.password) {
      return res.status(401).json({
        success: false,
        msg: "Invalid username or password.",
      });
    }
    try {
      var user = await User.findOne({ username: req.body.username });
      if (user) {
        return res.status(401).json({
          success: false,
          msg: "Username already taken.",
        });
      }
      var userData = {
        username: req.body.username,
        password: req.body.password,
      };
      var newUser = new User();
      newUser.username = req.body.username;
      newUser.password = req.body.password;
  
      try {
        await newUser.save();
        var payLoad = {
         // sub: newUser._id,
          //iat: Date.now(), //issued at time
          username: newUser.username,
        };
        const accessToken = generateAccessToken(payLoad);
        const refreshToken = jwt.sign(payLoad, process.env.REFRESH_TOKEN_SECRET);      
        await saveRefreshToken(refreshToken);
  
        //Uncomment the code below to see if logout clears the token from the database
       /*  RefreshToken.find(function (err, data) {
          console.log("Number of refresh tokens after login:", data.length);
        });  */
  
        return res.json({ accessToken: accessToken, refreshToken: refreshToken });
      } catch (err) {
        res.status(501).json({
          success: false,
          msg: "Database error.",
        });
      }
    } catch (err) {
      res.status(501).json({
        success: false,
        msg: "Database error.",
      });
    }
  });
  
  app.post("/login", async (req, res) => {
    //console.log(req.body)
    try {
      var user = await User.findOne({ username: req.body.username });
      if (!user) {
        //wrong user name
        return res.status(401).json({
          success: false,
          msg: "Authentication failed. Incorrect username.",
        });
      }
      //console.log(req.body)
      if (user.validPassword(req.body.password)) {
        //console.log(req.body)
        var payLoad = {
          //sub: user._id,
          //iat: Date.now(), //issued at time
          username: user.username,
        };
        const accessToken = generateAccessToken(payLoad);
        const refreshToken = jwt.sign(payLoad, process.env.REFRESH_TOKEN_SECRET);   
        //console.log("accessToken:", accessToken)  
        //console.log("refreshToken:", refreshToken)  
        await saveRefreshToken(refreshToken);
  
        //Uncomment the code below to see if logout clears the token from the database
        /* RefreshToken.find(function (err, data) {
          console.log("Number of refresh tokens after login:", data.length);
        }); */ 
  
        return res.json({ accessToken: accessToken, refreshToken: refreshToken });
      }
  
      return res.status(401).json({
        success: false,
        msg: "Authentication failed. Wrong password.",
      });
    } catch (err) {
      res.status(501).json({
        success: false,
        msg: "Database error.",
      });
    }
  });
  
  app.post(
    "/editProfile",
    authenticateToken,
    async function (req, res) {
      //console.log("user:", req.user);
      try {
        var user = await User.findOne({ username: req.user.username });
        if (!user) {
          return res.status(401).json({
            success: false,
            msg: "User not found.",
          });
        }
        //console.log("req.body", req.body)
        user.meta.firstname = req.body.firstname;
        user.meta.lastname = req.body.lastname;
        user.meta.hobby = req.body.hobby;
        user.meta.occupation = req.body.occupation;
        user.meta.country = req.body.country;
        user.meta.email = req.body.email;
        User.update({ _id: user._id }, user, function (err, _data) {
          if (err) throw err;
          //console.log(478, user)
          res.json(_data);
        });
  
      } catch (err) {
        return res.status(501).json({
          success: false,
          msg: "Database error.",
        });
      }
    }
  );
  
  app.get(
    "/profile",
    authenticateToken,
    function (req, res) {
      //console.log("user:", req.user);
      User.findOne({ username: req.user.username }, function (err, user) {
        if (err) return err;
        //var user = req.user;
        //console.log("user", user)
        user.password = undefined;
        res.json(user);
      });
    }
  );
  
  app.get(
    "/leaderProfile/:leaderName",
    authenticateToken,
    function (req, res) {
      //console.log("Name:", req.params.leaderName);
      var name = req.params.leaderName;
      //console.log("Name:", name);
      if (name === undefined){
        throw "Level leader unknown. Make sure the level route is called at least once.";
      }
      User.findOne({ username: name }, function (err, leader) {
        if (err) return err;
  
        User.findOne({ username: req.user.username }, function (err, user) {      
            if (leader) {
              if (user && user.username !== name) {
                //Store the last vistor username and email in leader
                leader.meta.last_visitor.name = user.username;
                leader.meta.last_visitor.email = user.meta.email || "No email";
                leader.meta.last_visitor.date = new Date();
                leader.updated_at = new Date();
  
                User.update({ _id: leader._id }, leader, function (err, data) {
                  if (err) throw err;
                });
              }
              leader.password = undefined;
              res.json(leader);
            } else {
              console.log(
                "2-Level leader unknown. Make sure the level route is called at least once."
              );
            }
          })
      });
    }
  );
  
  function authenticateToken(req, res, next) {
   
    const authHeader = req.headers["authorization"];
    
    const token = authHeader && authHeader.split(" ")[1];
    
    if (token == null) return res.sendStatus(401);
    //console.log(455, token)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      //console.log("user", user)
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  }
  
  function generateAccessToken(payLoad) {
    return jwt.sign(payLoad, process.env.ACCESS_TOKEN_SECRET , {
      expiresIn: "15s",
    } );
  }
  
  app.listen(5000, function () {
    console.log("Listening on port", 5000);
  });
  