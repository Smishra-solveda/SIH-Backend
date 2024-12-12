const express = require("express");
const multer = require("multer");
const Document = require("../models/Document");
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

// Upload documents
router.post("/", upload.fields([
  { name: "vehicleCert" },
  { name: "insuranceCert" },
  { name: "panCard" },
  { name: "transportLicense" },
  { name: "cdlDocument" },
  { name: "mcDocument" },
]), async (req, res) => {
  try {
    const files = {
      vehicleCert: req.files.vehicleCert[0].path,
      insuranceCert: req.files.insuranceCert[0].path,
      panCard: req.files.panCard[0].path,
      transportLicense: req.files.transportLicense[0].path,
      cdlDocument: req.files.cdlDocument[0].path,
      mcDocument: req.files.mcDocument[0].path,
    };

    const document = new Document({ ...req.body, files });
    await document.save();
    res.status(201).json({ message: "Documents uploaded successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
