var mongoose = require("mongoose");
var Schema = mongoose.Schema;

// create a schema
var refreshTokenSchema = new Schema({
    token: { type: String, required: true, unique: true },
    created_at: Date,
    updated_at: Date
});

// make this available to our users in our Node applications
module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
