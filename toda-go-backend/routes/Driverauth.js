const express = require("express");
const router = express.Router();
const Driver = require("../models/Drivers");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register Driver
router.post("/register-driver", async (req, res) => {
  try {
    const { name, email, password, licenseNumber, vehicleType, address } = req.body;

    const existing = await Driver.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Driver already exists" });
    }

    const newDriver = new Driver({ name, email, password, licenseNumber, vehicleType, address });
    await newDriver.save();
    res.status(201).json({ message: "Driver registered successfully" });
  } catch (error) {
    res.status(400).json({ error: "Driver registration failed", details: error });
  }
});

// Login Driver
router.post("/login-driver", async (req, res) => {
  const { email, password } = req.body;
  const driver = await Driver.findOne({ email });
  if (!driver) {
    return res.status(401).json({ error: "Driver not found" });
  }

  const isMatch = await bcrypt.compare(password, driver.password);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const payload = { id: driver.id, name: driver.name };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

  res.status(200).json({ message: "Driver login successful", token });
});

module.exports = router;
