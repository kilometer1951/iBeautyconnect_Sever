const mongoose = require("mongoose");

const { Schema } = mongoose;

let userSchema = new Schema({
  fName: String,
  lName: String,
  phone: String,
  email: String,
  password: String,
  profilePhoto: { type: String, default: "" },
  hasGoneThroughFinalScreen: { type: Boolean, default: false },
  introScreen: { type: Boolean, default: false },
  profession: { type: String, default: "" },
  online: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  locationState: { type: String, default: "" },
  locationCity: { type: String, default: "" },
  businessAddress: { type: String, default: "" },
  ssnNumber: { type: String, default: "" },
  licenseDocument: [
    {
      licenseNumber: { type: String, default: "" },
      path: { type: String, default: "" },
      approved: { type: Boolean, default: false },
      needsAttention: { type: Boolean, default: false },
      issuedState: { type: String, default: "" },
      expirationDate: { type: Date, default: Date.now }
    }
  ],
  services: [
    {
      serviceName: { type: String, default: "" },
      serviceHour: { type: String, default: "" },
      servicePricePerHour: { type: String, default: "" },
      serviceDescription: { type: String, default: "" }
    }
  ]
});

mongoose.model("users", userSchema);
