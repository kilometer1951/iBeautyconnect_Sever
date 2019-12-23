const mongoose = require("mongoose");

const { Schema } = mongoose;

let clientSchema = new Schema({
  date_joined: { type: Date, default: Date.now },
  name: String,
  phone: String,
  email: String,
  profilePhoto: String,
  locationSearch: { type: String, default: "all" },
  locationState: { type: String, default: "" },
  locationCity: { type: String, default: "" },
  address: { type: String, default: "" },
  postal_code: { type: String, default: "" }
});

mongoose.model("clients", clientSchema);
