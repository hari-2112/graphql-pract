import createAuthorLoader from "../loaders/authorLoader.js";
import { verifyToken } from "../auth/jwt.js";

export default function buildContext({ req, connectionParams } = {}) {
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
      user = verifyToken(token);
    } catch {
      user = null;
    }
  }

  return {
    authorLoader: createAuthorLoader(),
    user,
  };
}