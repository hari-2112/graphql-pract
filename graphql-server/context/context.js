import createAuthorLoader from "../loaders/authorLoader.js";
import { verifyToken } from "../auth/jwt.js";
import prisma from "../lib/prisma.js";

export default async function buildContext({ req, connectionParams } = {}) {
  const authHeader =
    connectionParams?.authorization ||
    connectionParams?.Authorization ||
    req?.headers?.authorization ||
    req?.headers?.Authorization ||
    "";
console.log("Authorization Header:", authHeader);
  let user = null;

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

  try {
  console.log("Authorization Header:", authHeader);

  const payload = verifyToken(token);
  console.log("JWT Payload:", payload);

  user = await prisma.user.findUnique({
    where: {
      id: payload.id,
    },
  });

  console.log("User from DB:", user);
} catch (err) {
  console.error("Context Error:", err);
  user = null;
}
  }
console.log("Returning context user:", user);
  return {
    authorLoader: createAuthorLoader(),
    user,
  };
  
}