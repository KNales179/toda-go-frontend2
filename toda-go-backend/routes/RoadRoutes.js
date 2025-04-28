// routes/RoadRoutes.js

const express = require('express');
const router = express.Router();
const Road = require('../models/Road');

// POST - Create a road
// routes/RoadRoutes.js (example)

router.post('/add-road', async (req, res) => {
    try {
      const { roadName, path, oneWay, allowedForTricycle } = req.body;
  
      if (!roadName || !path || path.length < 2) {
        return res.status(400).json({ message: "Invalid road data" });
      }
  
      const newRoad = new Road({
        roadName,
        path,
        oneWay,
        allowedForTricycle
      });
  
      await newRoad.save();
  
      res.status(201).json({ message: "Road saved successfully", road: newRoad });
    } catch (error) {
      res.status(500).json({ message: "Failed to save road", error: error.message });
    }
  });
  

module.exports = router;
