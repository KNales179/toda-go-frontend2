const express = require("express");
const router = express.Router();
const Driver = require("../models/Drivers");
const Operator = require("../models/Operator");
const upload = require("../middleware/upload");
const { v4: uuidv4 } = require("uuid");

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
        email,
        password,
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

      const profileID = uuidv4();

      // Check if email already exists for Driver or Operator
      if (role === "Driver" || role === "Both") {
        if (email) {
          const driverExists = await Driver.findOne({ email });
          if (driverExists) return res.status(400).json({ error: "Driver already exists" });
        }
      }
      
      if (role === "Operator" || role === "Both") {
        if (email) {
          const operatorExists = await Operator.findOne({ email });
          if (operatorExists) return res.status(400).json({ error: "Operator already exists" });
        }
      }

      // Create Operator
      const newOperator = new Operator({
        profileID,
        email: role === "Operator" || role === "Both" ? operatorEmail : undefined,
        password: role === "Operator" || role === "Both" ? operatorPassword : undefined,
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

      // Create Driver
      const newDriver = new Driver({
        profileID,
        email: role === "Driver" || role === "Both" ? driverEmail : undefined,
        password: role === "Driver" || role === "Both" ? driverPassword : undefined,
        franchiseNumber,
        todaName,
        sector,
        driverFirstName: role === "Both" ? operatorFirstName : driverFirstName,
        driverMiddleName: role === "Both" ? operatorMiddleName : driverMiddleName,
        driverLastName: role === "Both" ? operatorLastName : driverLastName,
        driverSuffix: role === "Both" ? operatorSuffix : driverSuffix,
        driverName: `${role === "Both" ? operatorFirstName : driverFirstName} ${role === "Both" ? operatorMiddleName : driverMiddleName} ${role === "Both" ? operatorLastName : driverLastName} ${role === "Both" ? operatorSuffix : driverSuffix || ""}`.trim(),
        driverBirthdate: role === "Both" ? operatorBirthdate : driverBirthdate,
        driverPhone: role === "Both" ? operatorPhone : driverPhone,
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
