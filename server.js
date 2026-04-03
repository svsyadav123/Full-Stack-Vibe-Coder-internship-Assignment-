const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors({ origin: "*" }));
app.use(express.json());

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ MONGODB_URI not found");
  process.exit(1);
}

const client = new MongoClient(uri);

let usersCollection;
let sitesCollection;

async function startServer() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("vibekit");
    usersCollection = db.collection("users");
    sitesCollection = db.collection("sites");

    // ===== SIGNUP =====
    app.post("/api/signup", async (req, res) => {
      try {
        const { username, email, password } = req.body;

        if (!username || !email || !password)
          return res.status(400).json({ message: "All fields required" });

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser)
          return res.status(400).json({ message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await usersCollection.insertOne({
          username,
          email,
          password: hashedPassword,
        });

        res.json({ message: "Signup successful", userId: result.insertedId });
      } catch (err) {
        res.status(500).json({ message: "Server error" });
      }
    });

    // ===== LOGIN =====
    app.post("/api/login", async (req, res) => {
      try {
        const { email, password } = req.body;

        const user = await usersCollection.findOne({ email });
        if (!user)
          return res.status(400).json({ message: "Invalid credentials" });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid)
          return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, JWT_SECRET, {
          expiresIn: "1h",
        });

        res.json({ token });
      } catch {
        res.status(500).json({ message: "Server error" });
      }
    });

    // ===== AUTH MIDDLEWARE =====
    function verifyToken(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

      const token = authHeader.split(" ")[1];

      try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
      } catch {
        res.status(401).json({ message: "Invalid token" });
      }
    }

    // ===== DASHBOARD =====
    app.get("/api/dashboard", verifyToken, async (req, res) => {
      const user = await usersCollection.findOne({
        _id: new ObjectId(req.user.id),
      });

      if (!user) return res.status(401).json({ message: "Unauthorized" });

      res.json({ user });
    });

    // ===== CREATE SITE =====
    app.post("/api/createsite", verifyToken, async (req, res) => {
      const { name, description } = req.body;

      if (!name)
        return res.status(400).json({ message: "Site name required" });

      const result = await sitesCollection.insertOne({
        userId: new ObjectId(req.user.id),
        name,
        description: description || "",
        pages: [],
        createdAt: new Date(),
      });

      res.json({ message: "Site created", siteId: result.insertedId });
    });

    // ===== GET SITES =====
    app.get("/api/mysites", verifyToken, async (req, res) => {
      const sites = await sitesCollection
        .find({ userId: new ObjectId(req.user.id) })
        .toArray();

      res.json({ sites });
    });

    // ===== DELETE SITE =====
    app.delete("/api/deletesite/:id", verifyToken, async (req, res) => {
      const siteId = req.params.id;

      const site = await sitesCollection.findOne({
        _id: new ObjectId(siteId),
      });

      if (!site || site.userId.toString() !== req.user.id)
        return res.status(403).json({ message: "Forbidden" });

      await sitesCollection.deleteOne({ _id: new ObjectId(siteId) });

      res.json({ message: "Deleted" });
    });

    // ===== EDIT SITE =====
    app.put("/api/editsite/:id", verifyToken, async (req, res) => {
      const { name, description } = req.body;
      const siteId = req.params.id;

      const site = await sitesCollection.findOne({
        _id: new ObjectId(siteId),
      });

      if (!site || site.userId.toString() !== req.user.id)
        return res.status(403).json({ message: "Forbidden" });

      await sitesCollection.updateOne(
        { _id: new ObjectId(siteId) },
        { $set: { name, description } }
      );

      res.json({ message: "Updated successfully" });
    });

    // ===== ADD PAGE =====
    app.post("/api/addpage/:siteId", verifyToken, async (req, res) => {
      const { pageId } = req.body;
      const { siteId } = req.params;

      const site = await sitesCollection.findOne({
        _id: new ObjectId(siteId),
      });

      if (!site || site.userId.toString() !== req.user.id)
        return res.status(403).json({ message: "Forbidden" });

      const pages = site.pages || [];

      if (pages.find((p) => p.pageId === pageId))
        return res.status(400).json({ message: "Page exists" });

      pages.push({ pageId, content: "" });

      await sitesCollection.updateOne(
        { _id: new ObjectId(siteId) },
        { $set: { pages } }
      );

      res.json({ message: "Page added" });
    });

    app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  } catch (err) {
    console.error("❌ Server failed:", err);
  }
}

startServer();