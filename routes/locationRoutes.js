// backend/routes/locationRoutes.js

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

router.post('/update-location', locationController.updateLocation);  // Update a device's location
router.get('/locations', locationController.getAllLocations);        // Get all devices' locations

module.exports = router;
