const { MongoClient } = require("mongodb");
require("dotenv").config();

let client;
let db;

async function connectDB() {
  try {
    // ✅ Return existing connection (prevents reconnect spam)
    if (db) return db;

    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("❌ MONGODB_URI is not defined in environment variables");
    }

    console.log("🔄 Connecting to MongoDB...");

    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();

    db = client.db("vibekit");

    console.log("✅ Connected to MongoDB");

    return db;

  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    throw error;
  }
}

module.exports = connectDB;