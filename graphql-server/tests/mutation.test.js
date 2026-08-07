import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },

    author: {
      findUnique: vi.fn(),
    },

   book: {
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
},
  },
}));

vi.mock("../prisma/client.js", () => ({
  default: mockPrisma,
}));

vi.mock("../pubsub/pubsub.js", () => ({
  default: {
    publish: vi.fn(),
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock("../auth/jwt.js", () => ({
  generateToken: vi.fn(),
}));

import bcrypt from "bcrypt";
import { generateToken } from "../auth/jwt.js";
import Mutation from "../resolvers/mutation.js";
import pubsub from "../pubsub/pubsub.js";

describe("register mutation", () => {

    it("should reject invalid registration input", async () => {
  await expect(
    Mutation.register(null, {
      username: "jo",
      password: "12345",
    })
  ).rejects.toMatchObject({
    extensions: {
      code: "BAD_USER_INPUT",
    },
  });

  expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  expect(bcrypt.hash).not.toHaveBeenCalled();
  expect(generateToken).not.toHaveBeenCalled();
});
    it("should return an error message when username already exists", async () => {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "existing-user",
    username: "john",
    password: "hashed-password",
    role: "USER",
  });

  const result = await Mutation.register(null, {
    username: "john",
    password: "password123",
  });

  expect(result.message).toBe("Username already exists");

  expect(mockPrisma.user.create).not.toHaveBeenCalled();
  expect(bcrypt.hash).not.toHaveBeenCalled();
  expect(generateToken).not.toHaveBeenCalled();
});
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new user successfully", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    bcrypt.hash.mockResolvedValue("hashed-password");

    mockPrisma.user.create.mockResolvedValue({
      id: "user-1",
      username: "john",
      password: "hashed-password",
      role: "USER",
    });

    generateToken.mockReturnValue("fake-jwt-token");

    const result = await Mutation.register(null, {
      username: "john",
      password: "password123",
    });

    expect(result.token).toBe("fake-jwt-token");
    expect(result.user.username).toBe("john");

    expect(bcrypt.hash).toHaveBeenCalledWith(
      "password123",
      10
    );

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        username: "john",
        password: "hashed-password",
      },
    });

    expect(generateToken).toHaveBeenCalledWith(result.user);
  });
});

describe("login mutation", () => {

    it("should reject an incorrect password", async () => {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    username: "john",
    password: "hashed-password",
    role: "USER",
  });

  bcrypt.compare.mockResolvedValue(false);

  const result = await Mutation.login(null, {
    username: "john",
    password: "wrong-password",
  });

  expect(result).toEqual({
    message: "Invalid username or password",
  });

  expect(bcrypt.compare).toHaveBeenCalledWith(
    "wrong-password",
    "hashed-password"
  );

  expect(generateToken).not.toHaveBeenCalled();
});

    it("should reject an unknown username", async () => {
  mockPrisma.user.findUnique.mockResolvedValue(null);

  const result = await Mutation.login(null, {
    username: "unknown",
    password: "password123",
  });

  expect(result).toEqual({
    message: "Invalid username or password",
  });

  expect(bcrypt.compare).not.toHaveBeenCalled();
  expect(generateToken).not.toHaveBeenCalled();
});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully with valid credentials", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      username: "john",
      password: "hashed-password",
      role: "USER",
    });

    bcrypt.compare.mockResolvedValue(true);

    generateToken.mockReturnValue("fake-jwt-token");

    const result = await Mutation.login(null, {
      username: "john",
      password: "password123",
    });

    expect(result.token).toBe("fake-jwt-token");
    expect(result.user.username).toBe("john");

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        username: "john",
      },
    });

    expect(bcrypt.compare).toHaveBeenCalledWith(
      "password123",
      "hashed-password"
    );

    expect(generateToken).toHaveBeenCalledWith(result.user);
  });
});

describe("addBook mutation", () => {

    it("should reject an empty book title", async () => {
  await expect(
    Mutation.addBook(null, {
      input: {
        title: "   ",
        authorId: "author-1",
      },
    })
  ).rejects.toMatchObject({
    message: "Title cannot be empty",
  });

  expect(mockPrisma.author.findUnique).not.toHaveBeenCalled();
  expect(mockPrisma.book.create).not.toHaveBeenCalled();
  expect(pubsub.publish).not.toHaveBeenCalled();
});

it("should reject when author does not exist", async () => {
  mockPrisma.author.findUnique.mockResolvedValue(null);

  await expect(
    Mutation.addBook(null, {
      input: {
        title: "GraphQL Testing",
        authorId: "missing-author",
      },
    })
  ).rejects.toMatchObject({
    message: "Author not found",
    extensions: {
      code: "NOT_FOUND",
    },
  });

  expect(mockPrisma.book.create).not.toHaveBeenCalled();
  expect(pubsub.publish).not.toHaveBeenCalled();
});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add a book successfully", async () => {
    mockPrisma.author.findUnique.mockResolvedValue({
      id: "author-1",
      name: "Test Author",
    });

    

    mockPrisma.book.create.mockResolvedValue({
      id: "book-1",
      title: "GraphQL Testing",
      authorId: "author-1",
    });

    const result = await Mutation.addBook(null, {
      input: {
        title: "GraphQL Testing",
        authorId: "author-1",
      },
    });

    expect(result.title).toBe("GraphQL Testing");

    expect(mockPrisma.author.findUnique).toHaveBeenCalledWith({
      where: {
        id: "author-1",
      },
    });

    expect(mockPrisma.book.create).toHaveBeenCalled();

    expect(pubsub.publish).toHaveBeenCalledWith(
      "BOOK_ADDED",
      {
        bookAdded: result,
      }
    );
  });
});

describe("updateBook mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update a book successfully", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      id: "book-1",
      title: "Old Title",
    });

    mockPrisma.book.update.mockResolvedValue({
      id: "book-1",
      title: "New Title",
    });

    const result = await Mutation.updateBook(null, {
      id: "book-1",
      title: "New Title",
    });

    expect(result.title).toBe("New Title");

    expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
      where: {
        id: "book-1",
      },
    });

    expect(mockPrisma.book.update).toHaveBeenCalledWith({
      where: {
        id: "book-1",
      },
      data: {
        title: "New Title",
      },
    });
  });
});