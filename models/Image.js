const mongoose = require("mongoose");
const { Schema } = mongoose;

const imageSchema = new Schema({
  belongsTo: { type: Schema.Types.ObjectId, ref: "users" },
  path: String,
  imageApproval: { type: Boolean, default: true },
  cloudinaryId: String,
  date_uploaded: { type: Date, default: Date.now }
});
mongoose.model("images", imageSchema);
