const mongoose = require("mongoose");

const { Schema } = mongoose;

let clientSchema = new Schema({
  date_joined: { type: Date, default: Date.now },
  name: String,
  phone: String,
  email: String,
  profilePhoto: String,
  search: { type: String, default: "all" },
  locationState: { type: String, default: "" },
  locationCity: { type: String, default: "" },
  address: { type: String, default: "" },
  postal_code: { type: String, default: "" },
  searchByCity: { type: String, default: "" },
  searchByState: { type: String, default: "" },
  searchByGender: { type: String, default: "" },
  cards: [
    {
      cardId: { type: String, default: "" },
      last4: { type: String, default: "" },
      isDefault: { type: Boolean, default: false }
    }
  ]
});

mongoose.model("clients", clientSchema);
