const express = require("express");
const cors = require("cors"); // Import the CORS middleware
const app = express();
const http = require("http");
const socketio = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require("uuid"); // For unique route IDs
const bodyParser = require("body-parser");
const server = http.createServer(app);
const io = socketio(server);

// Enable CORS for all origins
app.use(cors());
app.use(bodyParser.json()); // To parse JSON request bodies

// Temporary in-memory storage for route sharing
const routesDB = {};

// Socket.io connections
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle receiving location data
  socket.on("send-location", (data) => {
    console.log(`Location received from ${socket.id}: ${data.latitude}, ${data.longitude}`);
    io.emit("receive-location", { id: socket.id, ...data });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    io.emit("user-disconnected", socket.id);
  });
});

// Route to save a route
app.post("/api/routes", (req, res) => {
  const { startPoint, endPoint, routes } = req.body;
  if (!startPoint || !endPoint || !routes) {
    return res.status(400).json({ error: "Invalid data provided" });
  }
  const id = uuidv4();
  routesDB[id] = { startPoint, endPoint, routes, createdAt: new Date() };
  res.json({ id });
});

// Route to retrieve a shared route
app.get("/api/routes/:id", (req, res) => {
  const { id } = req.params;
  const routeData = routesDB[id];
  if (!routeData) {
    return res.status(404).json({ error: "Route not found" });
  }
  res.json(routeData);
});

// Default route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
