const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const passengerRoutes = require("./routes/Passengerauth");
const driverRoutes = require("./routes/Driverauth");

// Use them with separate prefixes
app.use("/api/auth/passenger", passengerRoutes);
app.use("/api/auth/driver", driverRoutes);

// DB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection failed:", err));

// Base route
app.get("/", (req, res) => {
  res.send("Welcome to the Toda-Go Backend!");
});

// Run server for local/dev
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://Localhost:${PORT}`);
});

app.use("/uploads", express.static("uploads"));
