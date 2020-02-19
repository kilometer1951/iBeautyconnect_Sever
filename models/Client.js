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
  deviceToken: { type: String, default: "" },
  search: { type: String, default: "all" },
  locationState: { type: String, default: "" },
  locationCity: { type: String, default: "" },
  address: { type: String, default: "" },
  country: { type: String, default: "" },
  postal_code: { type: String, default: "" },
  searchByCity: { type: String, default: "" },
  searchByState: { type: String, default: "" },
  searchByGender: { type: String, default: "" },
  searchByProfession: { type: String, default: "" },
  stripeId: { type: String, default: "" },
  points: { type: Number, default: 0 },
  cloudinaryId: { type: String, default: "" },
  hasViewedIntroModal: { type: Boolean, default: false },
  updateNeeded: { type: Boolean, default: false }
});

mongoose.model("clients", clientSchema);
