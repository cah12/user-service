// grab the things we need
var mongoose = require("mongoose");

var Schema = mongoose.Schema;

// create a schema
var levelSchema = new Schema({
  level: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  score: { type: Number, required: true },
  created_at: Date,
  updated_at: Date,
});

// custom method to add string to end of name
// you can create more important methods like name validations or formatting
// you can also do queries and find similar users
levelSchema.methods.dudify = function () {
  // add some stuff to the users name
  this.name = this.name + "-dude";

  return this.name;
};

var Level = mongoose.model("AsteroidLevel", levelSchema);

function doCreate(data) {
  var newLevel = new Level({
    level: data.level,
    name: data.name,
    score: data.score,
  });
  newLevel.save(function (err) {
    if (!err) throw err;
  });
}

//This utility function allows us to quickly init the database
function init() {
  doCreate({ level: "level_1", name: "sam", score: 10 });
  doCreate({ level: "level_2", name: "tom", score: 20 });
  doCreate({ level: "level_3", name: "harry", score: 30 });
  function cb() {}
  Level.updateOne({ level: "level_1" }, { name: "sam", score: 10 }, cb);
  Level.updateOne({ level: "level_2" }, { name: "tom", score: 20 }, cb);
  Level.updateOne({ level: "level_3" }, { name: "harry", score: 30 }, cb);
}

//init();

module.exports = Level;
