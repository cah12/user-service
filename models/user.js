var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var bcrypt = require("bcrypt");

// create a schema
var userSchema = new Schema({
  name: String,
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  admin: Boolean,
  location: String,
  meta: {
    firstname: String,
    lastname: String,
    email: String,
    occupation: String,
    hobby: String,
    country: String,
    last_visitor: {
      name: String,
      email: String,
      date: Date,
    },
    category: {
      type: String,
      default: "",
    },
  },
  created_at: Date,
  updated_at: Date,
});

// on every save, hash the password and add the date
userSchema.pre("save", function (next) {
  var user = this;
  if (this.isModified("password") || this.isNew) {
    user.password = this.generateHash(user.password);
    // get the current date
    var currentDate = new Date();
    // change the updated_at field to current date
    this.updated_at = currentDate;
    // if created_at doesn't exist, add to that field
    if (!this.created_at) this.created_at = currentDate;
  }
  next();
});

userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(9));
};

userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

// make this available to our users in our Node applications
module.exports = mongoose.model("User", userSchema);
