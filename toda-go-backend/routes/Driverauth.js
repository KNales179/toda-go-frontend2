const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Driver = require("../models/Drivers");
const Operator = require("../models/Operator");
const upload = require("../middleware/upload");

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
      const {
        role, // "Driver", "Operator", or "Both"
        citizen_id,
        license_Id,

        franchiseNumber,
        todaName,
        sector,

        operatorFirstName,
        operatorMiddleName,
        operatorLastName,
        operatorSuffix,
        operatorBirthdate,
        operatorPhone,
        operatorVotersID,
        operatorEmail,
        operatorPassword,

        driverFirstName,
        driverMiddleName,
        driverLastName,
        driverSuffix,
        driverBirthdate,
        driverPhone,
        driverVotersID,
        driverEmail,
        driverPassword,

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

      const operatorName = `${operatorFirstName} ${operatorMiddleName} ${operatorLastName} ${operatorSuffix || ""}`.trim();
      const driverName = `${driverFirstName} ${driverMiddleName} ${driverLastName} ${driverSuffix || ""}`.trim();

      if (role === "Operator" || role === "Both") {
        const operatorExists = await Operator.findOne({ email: operatorEmail });
        if (operatorExists) return res.status(400).json({ error: "Operator already exists" });

        const hashedPassword = await bcrypt.hash(operatorPassword, 10);
        const newOperator = new Operator({
          citizen_id,
          license_Id,
          franchiseNumber,
          todaName,
          sector,
          operatorFirstName,
          operatorMiddleName,
          operatorLastName,
          operatorSuffix,
          operatorBirthdate,
          operatorName,
          operatorPhone,
          operatorVotersID,
          email: operatorEmail,
          password: hashedPassword,
          isLucenaVoter,
          votingLocation,
          selfieImage,
          votersIDImage,
          driversLicenseImage,
          orcrImage,
        });

        await newOperator.save();
      }

      if (role === "Driver" || role === "Both") {
        const driverExists = await Driver.findOne({ email: driverEmail });
        if (driverExists) return res.status(400).json({ error: "Driver already exists" });

        const hashedPassword = await bcrypt.hash(driverPassword, 10);
        const newDriver = new Driver({
          citizen_id,
          license_Id,
          franchiseNumber,
          todaName,
          sector,
          driverFirstName,
          driverMiddleName,
          driverLastName,
          driverSuffix,
          driverBirthdate,
          driverName,
          driverPhone,
          driverVotersID,
          email: driverEmail,
          password: hashedPassword,
          experienceYears,
          isLucenaVoter,
          votingLocation,
          selfieImage,
          votersIDImage,
          driversLicenseImage,
          orcrImage,
        });

        await newDriver.save();
      }

      res.status(201).json({ message: "Registration successful" });
    } catch (error) {
      console.error("Driver registration failed:", error);
      res.status(500).json({ error: "Server error", details: error.message });
    }
  }
);

module.exports = router;
