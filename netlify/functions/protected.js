const verifyToken = require("./auth-middleware");

exports.handler = async (event) => {
  const user = verifyToken(event);

  if (!user || user.error) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Unauthorized",
        error: user ? user.error : "No token provided",
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Protected data accessed",
      user,
    }),
  };
};