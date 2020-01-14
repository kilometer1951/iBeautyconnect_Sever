const mongoose = require("mongoose");
const { Schema } = mongoose;

const stateSchema = new Schema({
  state: String,
  country: String
});
mongoose.model("states", stateSchema);
