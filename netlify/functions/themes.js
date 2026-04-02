const connectDB = require("./db");
const verifyToken = require("./auth-middleware");
const { ObjectId } = require("mongodb");

exports.handler = async (event) => {
  const user = verifyToken(event);

  if (!user || user.error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized", error: user ? user.error : "No token" }),
    };
  }

  try {
    const db = await connectDB();
    const themesCollection = db.collection("themes");

    // ---------------- POST: Create theme ----------------
    if (event.httpMethod === "POST") {
      const { name, colors, fonts, layout } = JSON.parse(event.body);

      if (!colors || !fonts) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Colors and fonts required" }),
        };
      }

      const theme = await themesCollection.insertOne({
        userId: new ObjectId(user.id),
        name: name || "Untitled Theme",
        colors,
        fonts,
        layout: layout || "default",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        statusCode: 201,
        body: JSON.stringify({ message: "Theme created", themeId: theme.insertedId }),
      };
    }

    // ---------------- GET: Get all themes of user ----------------
    if (event.httpMethod === "GET") {
      const themes = await themesCollection
        .find({ userId: new ObjectId(user.id) })
        .toArray();

      return {
        statusCode: 200,
        body: JSON.stringify({ themes }),
      };
    }

    // ---------------- PUT: Update theme ----------------
    if (event.httpMethod === "PUT") {
      const { themeId, name, colors, fonts, layout } = JSON.parse(event.body);

      if (!themeId) {
        return { statusCode: 400, body: JSON.stringify({ message: "themeId required" }) };
      }

      const result = await themesCollection.updateOne(
        { _id: new ObjectId(themeId), userId: new ObjectId(user.id) },
        {
          $set: {
            name,
            colors,
            fonts,
            layout,
            updatedAt: new Date(),
          },
        }
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Theme updated", modifiedCount: result.modifiedCount }),
      };
    }

    // ---------------- DELETE: Delete theme ----------------
    if (event.httpMethod === "DELETE") {
      const { themeId } = JSON.parse(event.body);

      if (!themeId) {
        return { statusCode: 400, body: JSON.stringify({ message: "themeId required" }) };
      }

      const result = await themesCollection.deleteOne({
        _id: new ObjectId(themeId),
        userId: new ObjectId(user.id),
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Theme deleted", deletedCount: result.deletedCount }),
      };
    }

    return { statusCode: 400, body: JSON.stringify({ message: "Invalid HTTP method" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};