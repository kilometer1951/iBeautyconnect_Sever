const mongoose = require("mongoose");
const { Schema } = mongoose;

const citySchema = new Schema({
  city: String,
  state: String
});
mongoose.model("cities", citySchema);
