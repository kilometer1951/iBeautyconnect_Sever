const mongoose = require("mongoose");

const { Schema } = mongoose;

let partnerSchema = new Schema({
  date_joined: { type: Date, default: Date.now },
  fName: String,
  lName: String,
  phone: String,
  email: String,
  password: String,
  profilePhoto: { type: String, default: "" },
  hasGoneThroughFinalScreen: { type: Boolean, default: false },
  introScreen: { type: Boolean, default: false },
  profession: { type: String, default: "" },
  liveRequest: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  isApprovedNote: { type: String, default: "pending approval" },
  locationState: { type: String, default: "" },
  locationCity: { type: String, default: "" },
  address: { type: String, default: "" },
  postal_code: { type: String, default: "" },
  ssnNumber: { type: String, default: "" },
  salesVideo: { type: String, default: "" },
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
  ],
  comfortFee: { type: String, default: "" },
  stripeAccountId: { type: String, default: "" },
  cardId: { type: String, default: "" },
  bankId: { type: String, default: "" },
  isDeactivated: { type: Boolean, default: false },
  isDeactivatedNote: { type: String, default: "" },
  debitCardLastFour: { type: String, default: "" },
  bankLastFour: { type: String, default: "" },
  deactivationNote: "",
  staffHandler: String,
  dob: { type: Date, default: Date.now },
  service_gender: { type: String, default: "" },
  photoId: { type: String, default: "" }
});

mongoose.model("partners", partnerSchema);
