const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema({
  dateAdded: { type: Date, default: Date.now },
  cart_belongs_to: { type: Schema.Types.ObjectId, ref: "clients" },
  cart_is_for: { type: Schema.Types.ObjectId, ref: "partners" },
  items: [{ services: {} }],
  type_of_cart: { type: String, default: "regular" },
  hasCheckedout: { type: Boolean, default: false },
  subTotal: String,
  stripeFee: String,
  tax: String,
  total: String,
  orderIsComplete: { type: Boolean, default: false },
  booking_date: { type: Date, default: Date.now },
  booking_time: { type: String, default: "" },
  client_check_in_location: { type: String, default: "" },
  partner_complete_order_location: { type: String, default: "" }
});

mongoose.model("carts", cartSchema);
