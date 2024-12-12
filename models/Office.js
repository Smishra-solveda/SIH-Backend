const mongoose = require('mongoose');

const officeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true },
    address: { type: String, required: true },
    region: { type: String, required: true },
    circle: { type: String, required: true },
    confirmPassword: { type: String, required: true }
});

module.exports = mongoose.model('Office', officeSchema);
