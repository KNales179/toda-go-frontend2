const express = require("express");
const router = express.Router();
const Driver = require("../models/Drivers");
const upload = require("../middleware/upload"); // handles multipart uploads

// Register Driver (with optional selfie)
router.post(
  "/register-driver",
  upload.fields([
    { name: "votersIDImage", maxCount: 1 },
    { name: "driversLicenseImage", maxCount: 1 },
    { name: "orcrImage", maxCount: 1 },
    { name: "selfieImage", maxCount: 1 }, // Optional
  ]),
  async (req, res) => {
    try {
      const {
        isSamePerson,
        franchiseNumber,
        todaName,
        sector,
        operatorName,
        operatorVotersID,
        operatorAddress,
        operatorPhone,
        driverName,
        driverVotersID,
        driverAddress,
        driverPhone,
        experienceYears,
        isLucenaVoter,
        votingLocation,
        commentOrSuggestion,
      } = req.body;

      // Required file validations
      if (!req.files.votersIDImage) {
        return res.status(400).json({ error: "Voter's ID image is required" });
      }

      const newDriver = new Driver({
        isSamePerson: isSamePerson === "true", // form data is string
        franchiseNumber,
        todaName,
        sector,
        operatorName,
        operatorVotersID,
        operatorAddress,
        operatorPhone,
        driverName,
        driverVotersID,
        driverAddress,
        driverPhone,
        experienceYears,
        isLucenaVoter,
        votingLocation,
        commentOrSuggestion,
        votersIDImage: req.files.votersIDImage[0].path,
        driversLicenseImage: req.files.driversLicenseImage?.[0]?.path,
        orcrImage: req.files.orcrImage?.[0]?.path,
        selfieImage: req.files.selfieImage?.[0]?.path,
      });

      await newDriver.save();
      res.status(201).json({ message: "Driver registered successfully!" });
    } catch (error) {
      console.error("Driver registration failed:", error);
      res.status(500).json({ error: "Server error", details: error.message });
    }
  }
);

module.exports = router;
