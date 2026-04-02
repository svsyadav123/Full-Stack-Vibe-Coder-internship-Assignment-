const jwt = require("jsonwebtoken");

function verifyToken(event) {
  try {
    // Accept lowercase or capital Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (!authHeader) {
      return { error: "No Authorization header found" };
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return { error: "Invalid token format" };
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded; // ✅ token is valid
    } catch (err) {
      return { error: err.name + ": " + err.message }; // JWT error (invalid/expired)
    }
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = verifyToken;