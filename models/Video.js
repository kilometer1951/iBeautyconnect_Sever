const mongoose = require("mongoose");
const { Schema } = mongoose;

const videoSchema = new Schema({
  belongsTo: { type: Schema.Types.ObjectId, ref: "users" },
  path: String,
  videoApproval: { type: Boolean, default: true }
});
mongoose.model("videos", videoSchema);
