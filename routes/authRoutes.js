const express = require("express");
const User2 = require("../models/User2");
const router = express.Router();

// Register User
router.post("/register", async (req, res) => {
  const { registrationNumber, email, password, confirmPassword, serviceType } = req.body;

  // Validation
  if (!registrationNumber || !email || !password || !confirmPassword || !serviceType) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    // Check if user already exists
    const existingUser = await User2.findOne({ registrationNumber });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create and save new user
    const newUser = new User2({ registrationNumber, confirmPassword, email, password, serviceType });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login User
router.post("/login", async (req, res) => {
  const { registrationNumber, password } = req.body;

  if (!registrationNumber || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Find user
    const user = await User2.findOne({ registrationNumber });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Send success response
    res.status(200).json({
      message: "Login successful",
      user: {
        registrationNumber: user.registrationNumber,
        email: user.email,
        serviceType: user.serviceType,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
