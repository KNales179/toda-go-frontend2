const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const DriverSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  citizen_id: { type: String },
  license_Id: { type: String },

  franchiseNumber: { type: String, required: true },
  todaName: { type: String, required: true },
  sector: {
    type: String,
    enum: ["East", "West", "North", "South", "Other"],
    required: true,
  },

  driverFirstName: { type: String, required: true },
  driverMiddleName: { type: String, required: true },
  driverLastName: { type: String, required: true },
  driverSuffix: { type: String },
  driverName: { type: String, required: true },
  driverBirthdate: { type: String, required: true },
  driverPhone: { type: String, required: true },
  driverAddress: { type: String, required: true },
  driverVotersID: { type: String, required: true },

  experienceYears: {
    type: String,
    enum: ["1-5 taon", "6-10 taon", "16-20 taon", "20 taon pataas", "Other"],
    required: true,
  },
  isLucenaVoter: {
    type: String,
    enum: ["Oo", "Hindi", "Other"],
    required: true,
  },
  votingLocation: { type: String },

  votersIDImage: { type: String, required: true },
  driversLicenseImage: { type: String },
  orcrImage: { type: String },
  selfieImage: { type: String },

}, { timestamps: true });

// Hash password before saving
DriverSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("Driver", DriverSchema);
