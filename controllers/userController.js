const User = require('../models/User');

// Register a new user
const registerUser = async (req, res) => {
  const { userType, name, email, phone, address, additionalInfo } = req.body;

  try {
    // Check if user already exists by email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = new User({
      userType,
      name,
      email,
      phone,
      address,
      additionalInfo,
    });

    await newUser.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering user', error });
  }
};

module.exports = { registerUser };
