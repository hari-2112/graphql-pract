import jwt from "jsonwebtoken";

const JWT_SECRET = "mysecret";

export function generateToken(user) {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "24h",
    }
  );

  console.log("Generated token:", token);

  return token;
}

export function verifyToken(token) {
  console.log("Verifying token:", token);
  return jwt.verify(token, JWT_SECRET);
}