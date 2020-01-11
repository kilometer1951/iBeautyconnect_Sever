const mongoose = require("mongoose");
const { Schema } = mongoose;

const videoSchema = new Schema({
  belongsTo: { type: Schema.Types.ObjectId, ref: "partners" },
  path: String,
  videoApproval: { type: Boolean, default: true },
  cloudinaryId: String,
  date_uploaded: { type: Date, default: Date.now }
});
mongoose.model("videos", videoSchema);
