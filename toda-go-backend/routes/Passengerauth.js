const express = require("express");
const router = express.Router();
const Passenger = require("../models/Passenger");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register Passenger
router.post("/register-passenger", async (req, res) => {
  console.log("📥 Registration route was hit");
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    let existing = await Passenger.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Passenger already exists" });
    }

    // Create passenger and save (bcrypt pre-save works)
    const passenger = new Passenger({ name, email, password });
    await passenger.save();

    // Generate token
    const payload = { id: passenger.id, name: passenger.name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Return token and user info
    res.status(201).json({
      message: "Passenger registered successfully",
      token,
      user: {
        id: passenger._id,
        name: passenger.name,
        email: passenger.email,
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Login Passenger
router.post("/login-passenger", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if passenger exists
    const passenger = await Passenger.findOne({ email });
    if (!passenger) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, passenger.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const payload = { id: passenger.id, name: passenger.name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({ message: "Passenger login successful", token });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

module.exports = router;
