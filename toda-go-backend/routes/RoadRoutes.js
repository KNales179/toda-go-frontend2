// routes/RoadRoutes.js

const express = require('express');
const router = express.Router();
const Road = require('../models/Road');

// POST - Create a road
router.post('/add-road', async (req, res) => {
  try {
    const newRoad = new Road(req.body);
    await newRoad.save();
    res.status(201).json({ message: "Road saved successfully", road: newRoad });
  } catch (error) {
    res.status(400).json({ message: "Error saving road", error: error.message });
  }
});

// GET - Fetch all roads
router.get('/get-roads', async (req, res) => {
  try {
    const roads = await Road.find();
    res.status(200).json(roads);
  } catch (error) {
    res.status(400).json({ message: "Error fetching roads", error: error.message });
  }
});

module.exports = router;
