const connectDB = require("./db"); // your MongoDB connection
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
  try {
    // Parse request body
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email and password required" }),
      };
    }

    const db = await connectDB();

    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid credentials" }),
      };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid credentials" }),
      };
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login successful",
        token, // 🔑 token sent in response
      }),
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: error.message }),
    };
  }
};