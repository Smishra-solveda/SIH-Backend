const express = require('express');
const router = express.Router();
const Office = require('../models/Office');

// Route to register office
router.post('/register', async (req, res) => {
    const { name, code, address, region, circle, confirmPassword } = req.body;

    if (!name || !code || !address || !region || !circle || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const office = new Office({
            name,
            code,
            address,
            region,
            circle,
            confirmPassword
        });

        await office.save();
        res.status(201).json({ success: true, message: 'Registration successful!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

module.exports = router;
