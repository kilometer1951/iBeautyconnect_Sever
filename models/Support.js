const mongoose = require("mongoose");
const { Schema } = mongoose;

const supportSchema = new Schema({
  date: { type: Date, default: Date.now },
  partner: { type: Schema.Types.ObjectId, ref: "partners" },
  client: { type: Schema.Types.ObjectId, ref: "clients" },
  message_data: [
    {
      dateMessaged: { type: Date, default: Date.now },
      to: { type: String, default: "" },
      from: { type: String, default: "" },
      message: String
    }
  ],
  rateSupport: { type: Number, default: 0 },
  ticketStatus: { type: String, default: "open" },
  category: { type: String, default: "" },
  supportReplied: { type: String, default: "" }
});
mongoose.model("supports", supportSchema);
