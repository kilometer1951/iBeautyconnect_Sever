const mongoose = require("mongoose");
const { Schema } = mongoose;

const rateSchema = new Schema({
  dateReviewed: { type: Date, default: Date.now },
  partner: { type: Schema.Types.ObjectId, ref: "partners" },
  client: { type: Schema.Types.ObjectId, ref: "clients" },
  cart: { type: Schema.Types.ObjectId, ref: "carts" },
  comment: { type: String, default: "" },
  rateNumber: { type: Number, default: 0 }
});
mongoose.model("rates", rateSchema);
