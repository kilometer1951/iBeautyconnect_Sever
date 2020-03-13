const mongoose = require("mongoose");

const { Schema } = mongoose;

let partnerSchema = new Schema({
  date_joined: { type: Date, default: Date.now },
  fName: String,
  lName: String,
  phone: String,
  email: String,
  password: String,
  profilePhoto: {
    type: String,
    default: "https://oarnation.com/content/no-picture.jpg"
  },
  profilePhotoCloudinaryId: { type: String, default: "" },
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
  country_code: { type: String, default: "+1" },
  locationLat: { type: String, default: "" },
  locationLng: { type: String, default: "" },
  ssnNumber: { type: String, default: "" },
  salesVideo: { type: String, default: "" },
  licenseDocument: [
    {
      licenseNumber: { type: String, default: "" },
      path: { type: String, default: "" },
      approved: { type: Boolean, default: false },
      needsAttention: { type: Boolean, default: false },
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
  comfortFee: { type: String, default: "0.00" },
  stripeAccountId: { type: String, default: "" },
  cardId: { type: String, default: "" },
  bankId: { type: String, default: "" },
  isDeactivated: { type: Boolean, default: false },
  isDeactivatedNote: { type: String, default: "" },
  debitCardLastFour: { type: String, default: "" },
  bankLastFour: { type: String, default: "" },
  deactivationNote: "",
  staffHandler: { type: String, default: "" },
  dob: { type: Date, default: Date.now },
  service_gender: { type: String, default: "" },
  photoId: { type: String, default: "" },
  photoId_back: { type: String, default: "" },
  points: { type: Number, default: 0 },
  image1: { type: String, default: "" },
  cloudinaryId_image1: { type: String, default: "" },
  image2: { type: String, default: "" },
  cloudinaryId_image2: { type: String, default: "" },
  image3: { type: String, default: "" },
  cloudinaryId_image3: { type: String, default: "" },
  image4: { type: String, default: "" },
  cloudinaryId_image4: { type: String, default: "" },
  image5: { type: String, default: "" },
  cloudinaryId_image5: { type: String, default: "" },
  cloudinaryId_video: { type: String, default: "" },
  country: { type: String, default: "" }
});

mongoose.model("partners", partnerSchema);
