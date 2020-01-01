const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema({
  dateAdded: { type: Date, default: Date.now },
  client: { type: Schema.Types.ObjectId, ref: "clients" },
  partner: { type: Schema.Types.ObjectId, ref: "partners" },
  items: [{ services: {} }],
  type_of_cart: { type: String, default: "regular" },
  hasCheckedout: { type: Boolean, default: false },
  subTotal: String,
  stripeFee: { type: String, default: "2.9% + 30¢" },
  tax: String,
  total: String,
  orderIsComplete: { type: Boolean, default: false },
  booking_date: { type: Date, default: Date.now },
  booking_time: { type: String, default: "" },
  client_check_in_location: { type: String, default: "" },
  partner_complete_order_location: { type: String, default: "" },
  stripe_charge_id: { type: String, default: "" },
  comfort_fee: { type: String, default: "" }
});

mongoose.model("carts", cartSchema);
