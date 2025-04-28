const mongoose = require('mongoose');

const RoadSchema = new mongoose.Schema({
  roadName: { type: String, required: true },
  path: [
    {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      isIntersection: { type: Boolean, default: false }
    }
  ],
  oneWay: { type: Boolean, default: false },
  allowedForTricycle: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Road', RoadSchema);
