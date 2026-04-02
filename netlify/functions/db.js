const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "../../.env" });

let client;
let db;

async function connectDB() {
  if (db) return db;

  console.log("Connecting to MongoDB...");

  client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // 🔥 prevents 30s freeze
  });

  await client.connect();

  console.log("Connected ✅");

  db = client.db("vibekit");

  return db;
}

module.exports = connectDB;