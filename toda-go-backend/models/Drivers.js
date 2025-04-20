const mongoose = require("mongoose");

const DriverSchema = new mongoose.Schema({
  citizen_id: {
    type: String, // Matches UUID from external Citizen table
  },
  license_Id: {
    type: String, // Optional: links to Citizen table
  },

  isSamePerson: {
    type: Boolean,
    required: true,
  },

  // Shared info
  franchiseNumber: {
    type: String,
    required: true,
  },
  todaName: {
    type: String,
    required: true,
  },
  sector: {
    type: String,
    enum: ["East", "West", "North", "South", "Other"],
    required: true,
  },

  // Operator details
  operatorName: {
    type: String,
    required: true,
  },
  operatorAddress: {
    type: String,
    required: true,
  },
  operatorPhone: {
    type: String,
    required: true,
  },
  operatorVotersID: {
    type: String,
    required: true,
  },

  // Driver details
  driverName: {
    type: String,
    required: function () {
      return this.isSamePerson === false;
    },
  },
  driverAddress: {
    type: String,
    required: function () {
      return this.isSamePerson === false;
    },
  },
  driverPhone: {
    type: String,
    required: function () {
      return this.isSamePerson === false;
    },
  },
  driverVotersID: {
    type: String,
    required: function () {
      return this.isSamePerson === false;
    },
  },

  // Experience and voting
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
  votingLocation: {
    type: String,
  },

  // Uploaded images
  votersIDImage: {
    type: String,
    required: true,
  },
  driversLicenseImage: {
    type: String,
  },
  orcrImage: {
    type: String,
  },
  selfieImage: {
    type: String,
  },

  commentOrSuggestion: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model("Driver", DriverSchema);
