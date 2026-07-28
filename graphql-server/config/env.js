import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is missing in .env");
}

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
};