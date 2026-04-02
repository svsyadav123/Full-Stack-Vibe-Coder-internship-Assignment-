const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

app.use(cors());
app.use(bodyParser.json());

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

let usersCollection;
let sitesCollection;

client.connect()
  .then(() => {
    const db = client.db("vibekit");
    usersCollection = db.collection("users");
    sitesCollection = db.collection("sites");
    console.log("Connected to MongoDB");
  })
  .catch(err => console.error("MongoDB connection error:", err));

// ===== SIGNUP =====
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  const existingUser = await usersCollection.findOne({ email });
  if (existingUser)
    return res.status(400).json({ message: "Email already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await usersCollection.insertOne({ username, email, password: hashedPassword });
  res.json({ message: "Signup successful", userId: result.insertedId });
});

// ===== LOGIN =====
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await usersCollection.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid email or password" });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return res.status(400).json({ message: "Invalid email or password" });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// ===== DASHBOARD =====
app.get("/api/dashboard", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.id) });
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    res.json({ user: { username: user.username, email: user.email } });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// ===== CREATE NEW SITE =====
app.post("/api/createsite", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Site name is required" });

    const newSite = await sitesCollection.insertOne({
      userId: new ObjectId(decoded.id),
      name,
      description: description || "",
      createdAt: new Date()
    });

    res.json({ message: "Site created successfully", siteId: newSite.insertedId });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// ===== GET USER'S SITES =====
app.get("/api/mysites", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const sites = await sitesCollection.find({ userId: new ObjectId(decoded.id) }).toArray();
    res.json({ sites });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// ===== EDIT SITE =====
app.put("/api/editsite/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const siteId = req.params.id;
    const { name, description } = req.body;

    // Check if the site belongs to the user
    const site = await sitesCollection.findOne({ _id: new ObjectId(siteId) });
    if (!site || site.userId.toString() !== decoded.id)
      return res.status(403).json({ message: "Forbidden" });

    // Update site
    await sitesCollection.updateOne(
      { _id: new ObjectId(siteId) },
      { $set: { name, description } }
    );

    res.json({ message: "Site updated successfully" });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// ===== DELETE SITE =====
app.delete("/api/deletesite/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const siteId = req.params.id;

    // Check if the site belongs to the user
    const site = await sitesCollection.findOne({ _id: new ObjectId(siteId) });
    if (!site || site.userId.toString() !== decoded.id)
      return res.status(403).json({ message: "Forbidden" });

    // Delete site
    await sitesCollection.deleteOne({ _id: new ObjectId(siteId) });
    res.json({ message: "Site deleted successfully" });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// ===== GET SITE PAGE =====
app.get("/api/getpage/:siteId/:pageId", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const { siteId, pageId } = req.params;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const site = await sitesCollection.findOne({ _id: new ObjectId(siteId) });

        if (!site || site.userId.toString() !== decoded.id)
            return res.status(403).json({ message: "Forbidden" });

        const page = site.pages?.find(p => p.pageId === pageId) || { pageId, content: "" };
        res.json({ page });
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
});

// ===== UPDATE SITE PAGE =====
app.put("/api/updatepage/:siteId/:pageId", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const { siteId, pageId } = req.params;
    const { content } = req.body;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const site = await sitesCollection.findOne({ _id: new ObjectId(siteId) });

        if (!site || site.userId.toString() !== decoded.id)
            return res.status(403).json({ message: "Forbidden" });

        // Update or add page
        const pages = site.pages || [];
        const pageIndex = pages.findIndex(p => p.pageId === pageId);
        if (pageIndex >= 0) {
            pages[pageIndex].content = content;
        } else {
            pages.push({ pageId, content });
        }

        await sitesCollection.updateOne(
            { _id: new ObjectId(siteId) },
            { $set: { pages, updatedAt: new Date() } }
        );

        res.json({ message: "Page updated successfully" });
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
});

// ===== ADD NEW PAGE =====
app.post("/api/addpage/:siteId", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const { siteId } = req.params;
    const { pageId } = req.body;  // e.g., 'about'

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const site = await sitesCollection.findOne({ _id: new ObjectId(siteId) });

        if (!site || site.userId.toString() !== decoded.id)
            return res.status(403).json({ message: "Forbidden" });

        const pages = site.pages || [];
        if (pages.find(p => p.pageId === pageId))
            return res.status(400).json({ message: "Page ID already exists" });

        pages.push({ pageId, content: "" });

        await sitesCollection.updateOne(
            { _id: new ObjectId(siteId) },
            { $set: { pages, updatedAt: new Date() } }
        );

        res.json({ message: "Page added successfully" });
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: "Invalid token" });
    }
});
// ===== START SERVER =====
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));