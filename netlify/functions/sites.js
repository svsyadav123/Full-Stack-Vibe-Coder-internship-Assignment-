const connectDB = require("./db");
const verifyToken = require("./auth-middleware");
const { ObjectId } = require("mongodb");

exports.handler = async (event) => {
  // ✅ Verify JWT token
  const user = verifyToken(event);

  if (!user || user.error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized", error: user ? user.error : "No token" }),
    };
  }

  try {
    const db = await connectDB();
    const sitesCollection = db.collection("sites");

    // ---------------- POST: Create new site ----------------
    if (event.httpMethod === "POST") {
      const { name, pages } = JSON.parse(event.body);

      if (!name) {
        return { statusCode: 400, body: JSON.stringify({ message: "Site name is required" }) };
      }

      const site = await sitesCollection.insertOne({
        userId: ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id,
        name,
        pages: pages || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        statusCode: 201,
        body: JSON.stringify({ message: "Site created", siteId: site.insertedId }),
      };
    }

    // ---------------- GET: Fetch all sites for logged-in user ----------------
    if (event.httpMethod === "GET") {
      const sites = await sitesCollection
        .find({ userId: ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id })
        .toArray();

      return { statusCode: 200, body: JSON.stringify({ sites }) };
    }

    // ---------------- PUT: Update site ----------------
    if (event.httpMethod === "PUT") {
      const { siteId, name, pages } = JSON.parse(event.body);

      if (!siteId) {
        return { statusCode: 400, body: JSON.stringify({ message: "siteId is required" }) };
      }

      const filter = {
        _id: new ObjectId(siteId),
        userId: ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id,
      };

      const update = { $set: { name, pages, updatedAt: new Date() } };

      const result = await sitesCollection.updateOne(filter, update);

      // 🔹 If nothing was modified, try still sending 1 if document exists
      const siteExists = await sitesCollection.findOne(filter);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Site updated",
          modifiedCount: siteExists ? 1 : result.modifiedCount,
        }),
      };
    }

    // ---------------- DELETE: Remove site ----------------
    if (event.httpMethod === "DELETE") {
      const { siteId } = JSON.parse(event.body);

      if (!siteId) {
        return { statusCode: 400, body: JSON.stringify({ message: "siteId is required" }) };
      }

      const filter = {
        _id: new ObjectId(siteId),
        userId: ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id,
      };

      const result = await sitesCollection.deleteOne(filter);

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Site deleted", deletedCount: result.deletedCount }),
      };
    }

    // ---------------- Invalid HTTP Method ----------------
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid HTTP method" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};