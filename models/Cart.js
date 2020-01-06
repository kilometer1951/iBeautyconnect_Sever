const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema({
  dateAdded: { type: Date, default: Date.now },
  dateCheckedIn: { type: Date, default: Date.now },
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
  stripe_charge_id: { type: String, default: "" },
  stripe_refund_id: { type: String, default: "" },
  ibeauty_connect_takes: { type: String, default: "" },
  comfort_fee: { type: String, default: "" },
  stripe_transfer_id: { type: String, default: "" },
  hasCanceled: { type: Boolean, default: false },
  hasRescheduled: { type: Boolean, default: false },
  iBeautyConnect_cancellation_fee_received: { type: String, default: "" },
  partner_cancellation_fee_received: { type: String, default: "" },
  client_cancellation_fee_received: { type: String, default: "" }
});

mongoose.model("carts", cartSchema);
