const mongoose = require("mongoose");

const { Schema } = mongoose;

let professionSchema = new Schema({
  name: String
});

mongoose.model("professions", professionSchema);
