const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  cdlNumber: { type: String, required: true },
  mcNumber: { type: String, required: true },
  gstNumber: { type: String, required: true },
  panNumber: { type: String, required: true },
  files: {
    vehicleCert: { type: String, required: true },
    insuranceCert: { type: String, required: true },
    panCard: { type: String, required: true },
    transportLicense: { type: String, required: true },
    cdlDocument: { type: String, required: true },
    mcDocument: { type: String, required: true },
  },
});

module.exports = mongoose.model("Document", documentSchema);
