require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");
const { type } = require("os");
const { Schema } = mongoose;
const { BrowserQRCodeReader } = require('@zxing/library');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5000"], // Allow multiple origins
    methods: ["GET", "POST"], // Specify allowed methods
  },
});


// **MongoDB Connection**
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/centralDatabase";
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// **Middleware**
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.options("*", (req, res) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Credentials", "true");
    res.sendStatus(200);
});

// **Schemas and Models**


const registrationSchema = new mongoose.Schema({
  cdlNumber: String,
  mcNumber: String,
  gstNumber: String,
  panNumber: String,
  vehicleCert: String,
  insuranceCert: String,
  panCard: String,
  transportLicense: String,
  cdlDocument: String,
  mcDocument: String,
});

{/*const User = mongoose.model("User", userSchema);
const Parcel = mongoose.model("Parcel", parcelSchema);
const Schedule = mongoose.model("Schedule", scheduleSchema);*/}
const Registration = mongoose.model("Registration", registrationSchema);

// **User Registration**
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Schema for the user
const userSchemaa = new Schema({
  registrationNumber: { type: String, required: true },
  emailid: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  serviceType: { type: String, required: true },
});

const User4 = mongoose.model("User4", userSchemaa);

// Registration route (POST)
app.post("/api/auth/register", async (req, res) => {
  const { registrationNumber, emailid, password, confirmPassword, serviceType } = req.body;

  // Basic validation
  if (!registrationNumber || !emailid || !password || !confirmPassword || !serviceType) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  try {
    // Check if the user already exists
    const existingUser = await User4.findOne({ emailid });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User4({
      registrationNumber,
      emailid,
      password: hashedPassword,
      serviceType,
    });

    // Save the user to the database
    await newUser.save();

    res.status(201).json({ message: "Registration successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "There was a problem with the registration." });
  }
});

// **User Login**
app.post("/api/auth/login1", async (req, res) => {
  const { emailid, password } = req.body;

  try {
    const user = await User.findOne({ emailid });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });

    res.status(200).json({ message: "Login successful", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// **Save Parcel Data**
app.post("/api/parcels", async (req, res) => {
  try {
    const parcel = new Parcel(req.body);
    await parcel.save();
    res.status(201).json({ message: "Parcel saved successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to save parcel data", error });
  }
});

// **Fetch Parcels**
app.get("/api/parcels", async (req, res) => {
  try {
    const parcels = await Parcel.find();
    res.json(parcels);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch parcels", error });
  }
});





// **Save Schedule Data**
app.post("/api/schedules", async (req, res) => {
  try {
    const schedule = new Schedule(req.body);
    await schedule.save();
    res.status(201).send({ message: "Schedule saved successfully" });
  } catch (error) {
    res.status(500).send({ message: "Failed to save schedule", error });
  }
});

app.get("/api/schedules", async (req, res) => {
  try {
    const schedules = await Schedule.find();
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch schedules", error });
  }
}); 

// **File Upload**
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

app.post("/api/upload", upload.single("file"), (req, res) => {
  res.json({ message: "File uploaded successfully", file: req.file });
});

// **POST /api/documents for registration form submission**
app.post(
  "/api/documents",
  upload.fields([
    { name: "vehicleCert", maxCount: 1 },
    { name: "insuranceCert", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "transportLicense", maxCount: 1 },
    { name: "cdlDocument", maxCount: 1 },
    { name: "mcDocument", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { cdlNumber, mcNumber, gstNumber, panNumber } = req.body;

      // Validate required fields
      if (!cdlNumber || !mcNumber || !gstNumber || !panNumber) {
        return res.status(400).json({ error: "All fields are required." });
      }

      // Save registration details
      const registration = new Registration({
        cdlNumber,
        mcNumber,
        gstNumber,
        panNumber,
        vehicleCert: req.files.vehicleCert[0].path,
        insuranceCert: req.files.insuranceCert[0].path,
        panCard: req.files.panCard[0].path,
        transportLicense: req.files.transportLicense[0].path,
        cdlDocument: req.files.cdlDocument[0].path,
        mcDocument: req.files.mcDocument[0].path,
      });

      await registration.save();
      res.status(201).json({ message: "Registration successful!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error. Please try again." });
    }
  }
);

// **WebSocket for Real-Time Location**
let connectedUsers = 0;

// Set up server to listen for location updates and track connections
io.on("connection", (socket) => {
  connectedUsers++;
  console.log("A new user connected. Connected users:", connectedUsers);

  // Broadcast the number of connected users to all clients
  io.emit("connected-users", connectedUsers);

  // Listen for location data from the client (Aopt component)
  socket.on("send-location", (data) => {
    console.log("Received location:", data);
    // Emit the location to all connected clients (Live component)
    io.emit("receive-location", data);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    connectedUsers--;
    console.log("A user disconnected. Connected users:", connectedUsers);
    // Broadcast the updated number of connected users
    io.emit("connected-users", connectedUsers);
  });
});




mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// User Schema (Mongoose Model)




// Routes

// POST route for registration


// Handle errors in routes
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: "Something went wrong!" });
});
//login for dop


app.post("/api/auth/login2", async (req, res) => {
  const { emailid, password } = req.body;

  if (!emailid || !password) {
      return res.status(400).json({ message: "All fields are required." });
  }

  try {
      // Find the user by email
      const user = await User4.findOne({ emailid });

      if (!user) {
          return res.status(401).json({ message: "Invalid email or password." });
      }

      // Compare the password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
          return res.status(401).json({ message: "Invalid email or password." });
      }

      // Store the user ID in the session to maintain the session
      req.session.userId = user._id;

      res.status(200).json({ message: "Login successful!" });
  } catch (error) {
      console.error("Login error: ", error);
      res.status(500).json({ message: "Server error." });
  }
});

//3pl
app.use(express.json()); // Middleware to parse JSON request bodies

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define the User schema
const newUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  companyName: { type: String, required: true },
  password: { type: String, required: true },
  confirmPassword: { type: String, required: true },
});

const NewUser = mongoose.model("NewUser", newUserSchema);

// Registration route
app.post("/api/auth/reg", async (req, res) => {
  const { name, email, phone, companyName, password, confirmPassword } = req.body;

  // Validate all fields
  if (!name || !email || !phone || !companyName || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required." });
  }
    
  // Check if passwords match
  if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
  }

  try {
      // Check if email already exists3
      const existingUser = await NewUser.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ message: "Email already registered." });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = new NewUser({
          name,
          email,
          phone,
          companyName,
          password: hashedPassword,
          confirmPassword: hashedPassword,
      });

      // Save the user to the database
      await newUser.save();

      res.status(201).json({ message: "Registration successful!" });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error. Please try again later." });
  }
});


//reg and login dop

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDBase"))
  .catch((err) => console.error("MongoDB connection error:", err));

  const userSchema = new mongoose.Schema({
    registrationNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    serviceType: { type: String, required: true },
  });
  
  const User = mongoose.model("User", userSchema);
  
  // Routes
  app.post("/api/registers", async (req, res) => {
    const { registrationNumber, email, password, confirmPassword, serviceType } = req.body;
  
    if (!registrationNumber || !email || !password || !confirmPassword || !serviceType) {
      return res.status(400).json({ message: "All fields are required" });
    }
  
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
  
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newUser = new User({
        registrationNumber,
        email,
        password: hashedPassword,
        serviceType,
      });
  
      await newUser.save();
      res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  //login 

app.post("/api/login2", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found. Please register first." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        res.status(200).json({ message: "Login successful", companyName: "Example Company" });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
 
  // threepl register

  mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Define Register model
const registerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    companyName: { type: String, required: true },
    password: { type: String, required: true },
});

const Register = mongoose.model("Register", registerSchema);

// API routes
app.post("/api/register", async (req, res) => {
    const { name, email, phone, companyName, password } = req.body;

    try {
        // Check if email already exists
        const existingRegister = await Register.findOne({ email });
        if (existingRegister) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newRegister = new Register({
            name,
            email,
            phone,
            companyName,
            password: hashedPassword,
        });

        // Save the user to the database
        await newRegister.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Server error" });
    }
});


app.post("/api/login3", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
  }

  try {
      const user = await Register.findOne({ email });
      if (!user) {
          return res.status(404).json({ message: "User not found. Please register first." });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid credentials" });
      }

      res.status(200).json({ message: "Login successful", companyName: "Example Company" });
  } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
  }
});


// driver reg and login


  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Driver Schema and Model
const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  aadhaarNumber: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  truckCapacity: { type: String, required: true },
});

const Driver = mongoose.model("Driver", driverSchema);

// Routes
// Registration
app.post("/api/drive", async (req, res) => {
  const { name, address, aadhaarNumber, phoneNumber, email, password, vehicleNumber,truckCapacity } = req.body;

  if (!name || !address || !aadhaarNumber || !phoneNumber || !email || !password || !vehicleNumber|| !truckCapacity) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if the driver already exists
    const existingDriver = await Driver.findOne({ email });
    if (existingDriver) {
      return res.status(400).json({ message: "Driver already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new driver
    const newDriver = new Driver({
      name,
      address,
      aadhaarNumber,
      phoneNumber,
      email,
      password: hashedPassword,
      vehicleNumber,
      truckCapacity,
    });
   console.log("new driver", newDriver);
    await newDriver.save();
    res.status(201).json({ message: "Driver registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Login
app.post("/api/login4", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Find the driver by email
    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if the password is correct
    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.status(200).json({ message: "Login successful", driver: { name: driver.name, email: driver.email } });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});



// Create User model


// Register user controller



// qr data save

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })


const qrSchema = new mongoose.Schema({
  qrData: String, // Store the QR code data
  createdAt: { type: Date, default: Date.now },
  driver: String,
});

const QR = mongoose.model("QR", qrSchema);

// Save QR data endpoint
app.post("/api/saveQr", async (req, res) => {
  try {
      const { qrData } = req.body;
      const newQR = new QR({ qrData,  });  
      await newQR.save();
      res.status(201).json({ message: "QR Code data saved successfully!" });
  } catch (error) {
      res.status(500).json({ error: "Failed to save QR Code data." });
  }
});


//fetch the destination login

//fo reg
{/*
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

// Define a schema and model for form data
const FormDataSchema = new mongoose.Schema({
  name: String,
  city: String,
  phone: String,
  companyName: String,
  password: String,
  truck: String,
  preferredFrom: String,
  preferredTo: String,
  preferredCost: String,
});

const FormData = mongoose.model("FormData", FormDataSchema);

// Route to handle form submissions
app.post("/api/partner", async (req, res) => {
  try {
    const { companyName, password, ...otherDetails } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newData = new FormData({ ...otherDetails, companyName, password: hashedPassword });
    const savedData = await newData.save();
    res.status(201).json({ message: "Registration successful!", userId: savedData._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Route to get a specific user's data by their unique ID
app.get("/api/partner/:id", async (req, res) => {
  const { id } = req.params;

  // Validate the id
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid User ID" });
  }

  try {
    const user = await FormData.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// Route to get all data (optional)
app.get("/api/data", async (req, res) => {
  try {
    const data = await FormData.find(); // Fetch all data from the database
    res.status(200).json(data); // Ensure this is an array of objects
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}); 

// login fleet
app.post("/api/login", async (req, res) => {
  const { companyName, password } = req.body;

  try {
    const user = await FormData.findOne({ companyName });
    if (!user) {
      return res.status(404).json({ message: "Company not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.status(200).json({ message: "Login successful", companyName: user.companyName, userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
*/}


//message function

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

// Message Schema & Model
const messageSchema = new mongoose.Schema({
  partnerId: String,       // For identifying the partner (fleet owner)
  message: String,         // Message content
  recipient: String,       // For specifying the recipient (e.g., DOP Admin)
  status: { type: String, default: "Pending" }, // Status of the message
});

const Message = mongoose.model('Message', messageSchema);

// Routes

// Endpoint to send a message
app.post('/api/sendMessage', async (req, res) => {
  const { partnerId, message, recipient } = req.body;

  try {
    const newMessage = await Message.create({ partnerId, message, recipient });
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error while sending message:", error.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Endpoint to get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (error) {
    console.error("Error while fetching messages:", error.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Endpoint to update the status of a message
app.patch('/api/messages/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updatedMessage = await Message.findByIdAndUpdate(
      id,
      { status },
      { new: true } // Return the updated document
    );
    res.json(updatedMessage);
  } catch (error) {
    console.error("Error while updating message status:", error.message);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

// Endpoint to handle forwarding a message to a recipient (e.g., DOP Admin)
app.post('/api/messages', async (req, res) => {
  const { message, recipient } = req.body;

  console.log("Received message:", { message, recipient }); // Log the received message

  try {
    const newMessage = new Message({ message, recipient });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error while saving message:", error.message);
    res.status(500).json({ error: "Failed to forward message" });
  }
});


//qr save

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

const dasSchema = new mongoose.Schema({
  email: String,
});

const Das = mongoose.model('Das', dasSchema);

const dashSchema = new mongoose.Schema({
  driver: String,
  pickup: String,
  destination: String,
});

const Dash = mongoose.model('Dash', dashSchema);

// Get unique emails
app.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await Schedule.distinct('email');
    res.json({ emails: schedules });
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update dashboard details
app.put('/api/dashboard/update', async (req, res) => {
  const { driver, pickup, destination } = req.body;
  try {
    const updatedDashboard = await Dashboard.findOneAndUpdate(
      { driver },
      { pickup, destination },
      { new: true }
    );
    res.json({ message: "Details updated successfully", data: updatedDashboard });
  } catch (error) {
    console.error("Error updating dashboard details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});






//socket

app.get("/", (req, res) => {
  res.send("WebSocket Server Running");
});

// Handle incoming location updates from clients 
io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("locationUpdate", (location) => {
    console.log("Location Update:", location);
    // Broadcast the location update to all connected clients
    socket.broadcast.emit("newLocation", location);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});


//bhiya location
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));


  app.post('/api/update-location', (req, res) => {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    console.log(`Received location: Lat ${latitude}, Lng ${longitude}`);
    // Here, you can save the location to a database or perform other actions
    res.status(200).json({ message: 'Location updated successfully' });
  });

  //again tryingg

  mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

  const coordinateSchema = new mongoose.Schema({
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  });
  
  const Coordinate = mongoose.model("Coordinate", coordinateSchema);
  

  let userLocations = {};

  // POST endpoint to save coordinates
  app.post("/api/coordinates", (req, res) => {
    const { lat, lng, name } = req.body;
    if (!lat || !lng || !name) {
      return res.status(400).send("Invalid data");
    }
  
    const userId = req.headers["user-id"] || "default-user";
    userLocations[userId] = { lat, lng, name };
  
    // Broadcast location to all clients
    io.emit("receive-location", { id: userId, name, latitude: lat, longitude: lng });
  
    res.status(200).send("Location received");
  });
  
  // Socket.IO to track connected users
  io.on("connection", (socket) => {
    console.log("A user connected");
  
    // Emit connected users count
    io.emit("connected-users", io.engine.clientsCount);
  
    socket.on("disconnect", () => {
      console.log("A user disconnected");
      io.emit("connected-users", io.engine.clientsCount);
    });
  });
  //schedule hoga process

  mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Define Schedule schema
const scheduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  entities: { type: Number, required: true },
  weight: { type: Number, required: true },
  destination: { type: String, required: true },
  pickupDate: { type: Date, required: true },
  dropDate: { type: Date, required: true },
  uniqueId: { type: String, unique: true, required: true },
  location: {type: String, required: true},
  email: {type: String, required: true},
});

// Schedule model
const Schedule = mongoose.model("Schedule", scheduleSchema);

// Routes
app.post("/api/schedule", async (req, res) => {
  const { name, entities, weight, destination, pickupDate, dropDate, uniqueId, location , email } = req.body;

  try {
    // Save schedule data to the database
    const newSchedule = new Schedule({
      name,
      entities,
      weight,
      destination,
      pickupDate,
      dropDate,
      uniqueId,
      location,
      email,
    });

    await newSchedule.save();
    res.status(201).json({ message: "Schedule created successfully", data: newSchedule });
  } catch (err) {
    console.error("Error saving schedule:", err);
    res.status(500).json({ message: "Failed to create schedule", error: err.message });
  }
});

// Route to fetch all schedules
app.get("/api/schedule", async (req, res) => {
  try {
    const schedules = await Schedule.find();
    res.status(200).json(schedules);
  } catch (err) {
    console.error("Error fetching schedules:", err);
    res.status(500).json({ message: "Failed to fetch schedules", error: err.message });
  }
});
// sensor and humidity
app.post('/api/data', (req, res) => {
  console.log(req.body);
  res.status(200).send('Data received');
});
/// again dashboard

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define Schema and Model
const FormDataSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    companyName: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    truck: { type: String, required: true },
    preferredFrom: { type: String, required: true },
    preferredTo: { type: String, required: true },
    preferredCost: { type: String, required: true },
  },
  { timestamps: true }
);

const FormData = mongoose.model("FormData", FormDataSchema);

// Routes

// Registration
app.post("/api/partner", async (req, res) => {
  try {
    const { companyName, password, ...otherDetails } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newData = new FormData({ ...otherDetails, companyName, password: hashedPassword });
    const savedData = await newData.save();
    res.status(201).json({ message: "Registration successful!", userId: savedData._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/api/partner/login", async (req, res) => {
  const { companyName, password } = req.body;

  try {
    // Check if the user exists
    const user = await FormData.findOne({ companyName });
    if (!user) return res.status(404).json({ message: "Company not found" });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    res.status(200).json({ message: "Login successful", userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { companyName, password } = req.body;

  try {
    const user = await FormData.findOne({ companyName });
    if (!user) {
      return res.status(404).json({ message: "Company not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.status(200).json({ message: "Login successful", companyName: user.companyName, userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a specific user by ID
app.get("/api/partner/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Find user by ID
    const user = await FormData.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users
app.get("/api/partner", async (req, res) => {
  try {
    // Get all users
    const users = await FormData.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}); 


//upload

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define Schema and Model
const qrDataSchema = new mongoose.Schema({
  qrrData: { type: String, required: true, unique: true },
});

const QrData = mongoose.model("QrData", qrDataSchema);

// API Endpoint for handling QR Data
app.post("/api/handleQrData", async (req, res) => {
  const { qrrData } = req.body;
  console.log("Received QR data:", qrrData);

  if (!qrrData) {
    console.error("QR data is missing.");
    return res.status(400).json({ message: "QR data is required." });
  }

  try {
    const existingData = await QrData.findOne({ qrrData });
    console.log("Existing Data:", existingData);

    if (existingData) {
      await QrData.deleteOne({ qrrData });
      console.log("Deleted existing QR data.");
      return res.json({ message: "QR data deleted successfully." });
    } else {
      const newQrData = new QrData({ qrrData });
      await newQrData.save();
      console.log("Saved new QR data.");
      return res.json({ message: "QR data saved successfully." });
    }
  } catch (error) {
    console.error("Error handling QR data:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// API Endpoint for fetching QR data
app.get("/api/fetchQrData", async (req, res) => {
  try {
    const qrData = await QrData.find({});
    console.log("Fetched QR data:", qrData);
    res.json(qrData);
  } catch (error) {
    console.error("Error fetching QR data:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});








  

// **Fallback Route**
app.use((req, res) => res.status(404).json({ message: "Routesss not found" }));

// **Start Server**
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
