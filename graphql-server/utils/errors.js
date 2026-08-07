import { GraphQLError } from "graphql";

export function badUserInput(message) {
  throw new GraphQLError(message, {
    extensions: {
      code: "BAD_USER_INPUT",
    },
  });
}

export function notFound(message) {
  throw new GraphQLError(message, {
    extensions: {
      code: "NOT_FOUND",
    },
  });
}

export function unauthenticated(message = "Authentication required") {
  throw new GraphQLError(message, {
    extensions: {
      code: "UNAUTHENTICATED",
    },
  });
}

export function forbidden(message = "Access denied") {
  throw new GraphQLError(message, {
    extensions: {
      code: "FORBIDDEN",
    },
  });
}