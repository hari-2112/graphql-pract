import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    book: {
      findMany: vi.fn(),
    },
    movie: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../prisma/client.js", () => ({
  default: mockPrisma,
}));

import Query from "../resolvers/query.js";

describe("books query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all books", async () => {
    const books = [
      {
        id: "book-1",
        title: "GraphQL Basics",
        authorId: "author-1",
        author: {
          id: "author-1",
          name: "John",
        },
      },
      {
        id: "book-2",
        title: "Advanced GraphQL",
        authorId: "author-2",
        author: {
          id: "author-2",
          name: "Jane",
        },
      },
    ];

    mockPrisma.book.findMany.mockResolvedValue(books);

    const result = await Query.books();

    expect(result).toEqual(books);

    expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
      include: {
        author: true,
      },
    });
  });

  it("should handle a database error", async () => {
  mockPrisma.book.findMany.mockRejectedValue(
    new Error("Database connection failed"),
  );

  await expect(Query.books()).rejects.toThrow(
    "Database connection failed",
  );
});

});

describe("movies query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all movies", async () => {
    const movies = [
      {
        id: "movie-1",
        title: "Inception",
      },
      {
        id: "movie-2",
        title: "Interstellar",
      },
    ];

    mockPrisma.movie.findMany.mockResolvedValue(movies);

    const result = await Query.movies();

    expect(result).toEqual(movies);

    expect(mockPrisma.movie.findMany).toHaveBeenCalledWith();
  });

  it("should handle a database error", async () => {
  mockPrisma.movie.findMany.mockRejectedValue(
    new Error("Database connection failed"),
  );

  await expect(Query.movies()).rejects.toThrow(
    "Database connection failed",
  );
});
});

describe("currentTime query", () => {
  it("should return the current date and time", () => {
    const result = Query.currentTime();

    expect(result).toBeInstanceOf(Date);
  });
});

describe("search query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return books and movies", async () => {
    const books = [
      {
        id: "book-1",
        title: "GraphQL Basics",
        author: {
          id: "author-1",
          name: "John",
        },
      },
    ];

    const movies = [
      {
        id: "movie-1",
        title: "Inception",
      },
    ];

    mockPrisma.book.findMany.mockResolvedValue(books);
    mockPrisma.movie.findMany.mockResolvedValue(movies);

    const result = await Query.search();

    expect(result).toEqual([
      ...books,
      ...movies,
    ]);

    expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
      include: {
        author: true,
      },
    });

    expect(mockPrisma.movie.findMany).toHaveBeenCalledWith();
  });

it("should handle a database error when fetching books", async () => {
  mockPrisma.book.findMany.mockRejectedValue(
    new Error("Database connection failed"),
  );

  await expect(Query.search()).rejects.toThrow(
    "Database connection failed",
  );

  expect(mockPrisma.movie.findMany).not.toHaveBeenCalled();
});

it("should handle a database error when fetching movies", async () => {
  mockPrisma.book.findMany.mockResolvedValue([]);

  mockPrisma.movie.findMany.mockRejectedValue(
    new Error("Database connection failed"),
  );

  await expect(Query.search()).rejects.toThrow(
    "Database connection failed",
  );
});
});

describe("me query", () => {
  it("should return the authenticated user", () => {
    const user = {
      id: "user-1",
      username: "john",
      role: "USER",
    };

    const result = Query.me(null, null, { user });

    expect(result).toEqual(user);
  });

  it("should reject an unauthenticated user", () => {
    expect(() => {
      Query.me(null, null, { user: null });
    }).toThrow("Not authenticated");
  });
});