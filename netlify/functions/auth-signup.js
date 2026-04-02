const connectDB = require("./db");
const bcrypt = require("bcryptjs");

exports.handler = async (event) => {
  try {
    console.log("Signup function started");

    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Email and password required" }),
      };
    }

    const db = await connectDB();
    console.log("DB connected inside signup");

    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "User already exists" }),
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection("users").insertOne({
      email,
      password: hashedPassword,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "User created successfully" }),
    };
  } catch (error) {
    console.error("Signup Error:", error); // 🔥 important
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};