const mongoose = require("mongoose");
const { Schema } = mongoose;

const agendaJobSchema = new Schema({
  name: String
});
mongoose.model("agendaJobs", agendaJobSchema);
