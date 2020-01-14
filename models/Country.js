const mongoose = require("mongoose");
const { Schema } = mongoose;

const countrySchema = new Schema({
  country: String
});
mongoose.model("countries", countrySchema);
