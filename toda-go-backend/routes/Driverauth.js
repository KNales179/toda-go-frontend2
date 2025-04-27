// ✅ Final Correct Driverauth.js
const express = require("express");
const router = express.Router();
const Driver = require("../models/Drivers");
const Operator = require("../models/Operator");
const upload = require("../middleware/upload");
const { v4: uuidv4 } = require("uuid"); // for generating profileID

router.post(
  "/register-driver",
  upload.fields([
    { name: "selfie", maxCount: 1 },
    { name: "votersIDImage", maxCount: 1 },
    { name: "driversLicenseImage", maxCount: 1 },
    { name: "orcrImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("reach backend");

      const {
        role,
        driverEmail,
        driverPassword,
        operatorEmail,
        operatorPassword,

        franchiseNumber,
        todaName,
        sector,

        operatorFirstName,
        operatorMiddleName,
        operatorLastName,
        operatorSuffix,
        operatorBirthdate,
        operatorPhone,

        driverFirstName,
        driverMiddleName,
        driverLastName,
        driverSuffix,
        driverBirthdate,
        driverPhone,

        experienceYears,
        isLucenaVoter,
        votingLocation,
      } = req.body;

      if (!req.files.votersIDImage) {
        return res.status(400).json({ error: "Voter's ID image is required" });
      }

      const selfieImage = req.files.selfie?.[0]?.path;
      const votersIDImage = req.files.votersIDImage[0].path;
      const driversLicenseImage = req.files.driversLicenseImage?.[0]?.path;
      const orcrImage = req.files.orcrImage?.[0]?.path;

      const profileID = uuidv4(); // unique ID for linking Driver and Operator

      // Always create Operator
      const newOperator = new Operator({
        profileID,
        email: operatorEmail || undefined,
        password: operatorPassword || undefined,
        franchiseNumber,
        todaName,
        sector,
        operatorFirstName,
        operatorMiddleName,
        operatorLastName,
        operatorSuffix,
        operatorName: `${operatorFirstName} ${operatorMiddleName} ${operatorLastName} ${operatorSuffix || ""}`.trim(),
        operatorBirthdate,
        operatorPhone,
        votersIDImage,
        driversLicenseImage,
        orcrImage,
        selfieImage,
      });

      // Always create Driver
      const newDriver = new Driver({
        profileID,
        email: driverEmail || undefined,
        password: driverPassword || undefined,
        franchiseNumber,
        todaName,
        sector,
        driverFirstName,
        driverMiddleName,
        driverLastName,
        driverSuffix,
        driverName: `${driverFirstName} ${driverMiddleName} ${driverLastName} ${driverSuffix || ""}`.trim(),
        driverBirthdate,
        driverPhone,
        experienceYears,
        isLucenaVoter,
        votingLocation,
        votersIDImage,
        driversLicenseImage,
        orcrImage,
        selfieImage,
      });

      await newOperator.save();
      await newDriver.save();

      res.status(201).json({ message: "Registration successful" });
    } catch (error) {
      console.error("Driver registration failed:", error);
      res.status(500).json({ error: "Server error", details: error.message });
    }
  }
);

module.exports = router;
