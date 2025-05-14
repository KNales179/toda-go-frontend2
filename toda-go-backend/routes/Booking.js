const express = require('express');
const router = express.Router();

// Simulate a database or in-memory store for now
let bookings = [];

router.post('/book', (req, res) => {
  const {
    pickupLat,
    pickupLng,
    destinationLat,
    destinationLng,
    fare,
    paymentMethod,
    notes,
  } = req.body;

  const bookingData = {
    id: bookings.length + 1,
    pickupLat,
    pickupLng,
    destinationLat,
    destinationLng,
    fare,
    paymentMethod,
    notes,
    status: "pending", // Status of the booking (pending, accepted, completed)
    createdAt: new Date(),
  };

  // Store booking data (this will be saved to DB eventually)
  bookings.push(bookingData);

  console.log("📥 Booking data received and stored:", bookingData);

  return res.status(200).json({
    message: "Booking received successfully!",
    booking: bookingData,
  });
});

// GET route to view all bookings (for debugging purposes, can be removed later)
router.get('/bookings', (req, res) => {
  return res.status(200).json(bookings);
});

module.exports = router;
