const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema({
  dateAdded: { type: Date, default: Date.now },
  dateModified: { type: Date, default: Date.now },
  client: { type: Schema.Types.ObjectId, ref: "clients" },
  partner: { type: Schema.Types.ObjectId, ref: "partners" },
  recentMesage: { type: String, default: "" },
  deleted: { type: Boolean, default: false },
  message_data: [
    {
      dateMessaged: { type: Date, default: Date.now },
      to: { type: String, default: "" },
      from: { type: String, default: "" },
      message: String,
      type_of_message: { type: Schema.Types.ObjectId, ref: "regular" }
    }
  ],
  clientHasViewMessage: { type: Boolean, default: true },
  partnerHasViewed: { type: Boolean, default: false }
});

mongoose.model("messages", messageSchema);
