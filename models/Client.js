const mongoose = require("mongoose");

const { Schema } = mongoose;

let clientSchema = new Schema({
  date_joined: { type: Date, default: Date.now },
  name: String,
  phone: String,
  email: String,
  profilePhoto: {
    type: String,
    default: "https://oarnation.com/content/no-picture.jpg"
  },
  search: { type: String, default: "all" },
  locationState: { type: String, default: "" },
  locationCity: { type: String, default: "" },
  address: { type: String, default: "" },
  postal_code: { type: String, default: "" },
  searchByCity: { type: String, default: "" },
  searchByState: { type: String, default: "" },
  searchByGender: { type: String, default: "" },
  stripeId: { type: String, default: "" },
  points: { type: Number, default: 0 }
});

mongoose.model("clients", clientSchema);
