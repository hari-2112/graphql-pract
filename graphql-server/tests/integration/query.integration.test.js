import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApolloServer } from "@apollo/server";
import { createSchema } from "../../schema/createSchema.js";
import createAuthorLoader from "../../loaders/authorLoader.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    book: {
      findMany: vi.fn(),
    },
    author: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("../../prisma/client.js", () => ({
  default: mockPrisma,
}));

describe("GraphQL Query Integration", () => {
  let server;

  beforeEach(() => {
    vi.clearAllMocks();

    server = new ApolloServer({
      schema: createSchema(),
    });
  });

  it("returns books through the GraphQL API", async () => {
    mockPrisma.book.findMany.mockResolvedValue([
  {
    id: "1",
    title: "The Hobbit",
    authorId: "1",
  },
]);

    mockPrisma.author.findMany.mockResolvedValue([
      {
        id: "1",
        name: "J.R.R. Tolkien",
      },
    ]);

    const response = await server.executeOperation(
  {
    query: `
      query {
        books {
          id
          title
          author {
            id
            name
          }
        }
      }
    `,
  },
  {
    contextValue: {
      authorLoader: createAuthorLoader(),
      user: null,
    },
  },
);
    expect(response.body.kind).toBe("single");

    expect(response.body.singleResult.errors).toBeUndefined();

    expect(response.body.singleResult.data).toEqual({
  books: [
    {
      id: "1",
      title: "The Hobbit",
      author: {
        id: "1",
        name: "J.R.R. Tolkien",
      },
    },
  ],
});

    expect(mockPrisma.book.findMany).toHaveBeenCalled();
  });

  describe("GraphQL Authentication Integration", () => {
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
});

