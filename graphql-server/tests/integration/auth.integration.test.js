import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from "vitest";

import { ApolloServer } from "@apollo/server";
import { createSchema } from "../../schema/createSchema.js";
import { generateToken } from "../../auth/jwt.js";
import buildContext from "../../context/context.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },
    author: {
      findUnique: vi.fn(),
    },
    book: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../../prisma/client.js", () => ({
  default: mockPrisma,
}));
vi.mock("../../lib/prisma.js", () => ({
  default: mockPrisma,
}));

describe("GraphQL Authentication Integration", () => {
 let server;

beforeEach(() => {
  vi.clearAllMocks();

  server = new ApolloServer({
    schema: createSchema(),
  });
});

  it("returns the authenticated user through the me query", async () => {
    const response = await server.executeOperation(
      {
        query: `
          query {
            me {
              id
              username
              role
            }
          }
        `,
      },
      {
        contextValue: {
          user: {
            id: "user-1",
            username: "john",
            role: "USER",
          },
        },
      },
    );

    expect(response.body.kind).toBe("single");

    expect(response.body.singleResult.errors).toBeUndefined();

    expect(response.body.singleResult.data).toEqual({
      me: {
        id: "user-1",
        username: "john",
        role: "USER",
      },
    });
  });

 it("returns a validation error for an invalid book title", async () => {
  const response = await server.executeOperation(
    {
      query: `
        mutation {
          addBook(
            input: {
              title: ""
              authorId: "author-1"
            }
          ) {
            id
            title
          }
        }
      `,
    },
    {
      contextValue: {
        user: {
          id: "user-1",
          username: "john",
          role: "ADMIN",
        },
      },
    },
  );

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeDefined();

  expect(response.body.singleResult.errors[0].message).toBe(
    "Title cannot be empty",
  );

  expect(mockPrisma.author.findUnique).not.toHaveBeenCalled();

  expect(mockPrisma.book.create).not.toHaveBeenCalled();
});

 it("returns an error when the author does not exist", async () => {
  mockPrisma.author.findUnique.mockResolvedValue(null);

  const response = await server.executeOperation(
    {
      query: `
        mutation {
          addBook(
            input: {
              title: "The Hobbit"
              authorId: "missing-author"
            }
          ) {
            id
            title
          }
        }
      `,
    },
    {
      contextValue: {
        user: {
          id: "user-1",
          username: "john",
          role: "ADMIN",
        },
      },
    },
  );

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeDefined();

  expect(response.body.singleResult.errors[0].message).toBe(
    "Author not found",
  );

  expect(mockPrisma.book.create).not.toHaveBeenCalled();
});

  it("authenticates a user through JWT and GraphQL context", async () => {
  const user = {
    id: "user-1",
    username: "john",
    role: "USER",
  };

  const token = generateToken(user);

  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    username: "john",
    role: "ADMIN",
  });

  const context = await buildContext({
    req: {
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  });

  const response = await server.executeOperation(
    {
      query: `
        query {
          me {
            id
            username
            role
          }
        }
      `,
    },
    {
      contextValue: context,
    },
  );

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeUndefined();

  expect(response.body.singleResult.data).toEqual({
    me: {
      id: "user-1",
      username: "john",
      role: "ADMIN",
    },
  });

  expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
    where: {
      id: "user-1",
    },
  });
});

  it("rejects an unauthenticated me query", async () => {
    const response = await server.executeOperation(
      {
        query: `
          query {
            me {
              id
              username
              role
            }
          }
        `,
      },
      {
        contextValue: {
          user: null,
        },
      },
    );

    expect(response.body.kind).toBe("single");

    expect(response.body.singleResult.errors).toBeDefined();

    expect(response.body.singleResult.errors[0].message).toBe(
      "Not authenticated",
    );

    expect(response.body.singleResult.data).toEqual({
      me: null,
    });
  });
});
