const mongoose = require("mongoose");
const { Schema } = mongoose;

const itemSchema = new Schema({
  serviceName: { type: String, default: "" },
  serviceHour: { type: String, default: "" },
  servicePricePerHour: { type: String, default: "" },
  serviceDescription: { type: String, default: "" }
});

module.exports = itemSchema;
