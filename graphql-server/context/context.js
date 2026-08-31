import createAuthorLoader from "../loaders/authorLoader.js";
import { verifyToken } from "../auth/jwt.js";
import prisma from "../prisma/client.js";

export default async function buildContext({ req, connectionParams } = {}) {
  const authHeader =
    connectionParams?.authorization ||
    connectionParams?.Authorization ||
    req?.headers?.authorization ||
    req?.headers?.Authorization ||
    "";

  let user = null;

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    try {
      const payload = verifyToken(token);

      user = await prisma.user.findUnique({
        where: {
          id: payload.id,
        },
      });
    } catch {
      user = null;
    }
  }

  return {
    authorLoader: createAuthorLoader(),
    user,
  };
}