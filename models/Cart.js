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
  orderIsComplete: { type: Boolean, default: false }
});

mongoose.model("carts", cartSchema);
