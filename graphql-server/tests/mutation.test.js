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
  delete: vi.fn(),
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

it("rejects registration with an empty username", async () => {
  await expect(
    Mutation.register(
      null,
      {
        username: "",
        password: "password123",
      },
      {}
    )
  ).rejects.toThrow();
});

it("handles a database error during registration", async () => {
  mockPrisma.user.findUnique.mockResolvedValue(null);

  mockPrisma.user.create.mockRejectedValue(
    new Error("Database connection failed")
  );

  await expect(
    Mutation.register(
      null,
      {
        username: "newuser",
        password: "password123",
      },
      {}
    )
  ).rejects.toThrow("Database connection failed");
});

it("rejects registration with an empty password", async () => {
  await expect(
    Mutation.register(
      null,
      {
        username: "testuser",
        password: "",
      },
      {}
    )
  ).rejects.toThrow();
});

it("returns an error for a duplicate username", async () => {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "existing-user",
    username: "john",
  });

  const result = await Mutation.register(
    null,
    {
      username: "john",
      password: "password123",
    },
    {}
  );

  expect(result).toEqual({
    message: "Username already exists",
  });
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
    role: "USER",
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

it("rejects login with an empty username", async () => {
  await expect(
    Mutation.login(
      null,
      {
        username: "",
        password: "password123",
      },
      {}
    )
  ).rejects.toThrow();
});

it("handles a database error during login", async () => {
  mockPrisma.user.findUnique.mockRejectedValue(
    new Error("Database connection failed")
  );

  await expect(
    Mutation.login(
      null,
      {
        username: "john",
        password: "password123",
      },
      {}
    )
  ).rejects.toThrow("Database connection failed");
});



it("rejects login with an empty password", async () => {
  await expect(
    Mutation.login(
      null,
      {
        username: "john",
        password: "",
      },
      {}
    )
  ).rejects.toThrow();
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
   Mutation.addBook(
  null,
  {
    input: {
      title: "   ",
      authorId: "author-1",
    },
  },
  {
    user: {
      role: "ADMIN",
    },
  }
)
  ).rejects.toMatchObject({
    message: "Title cannot be empty",
  });

  expect(mockPrisma.author.findUnique).not.toHaveBeenCalled();
  expect(mockPrisma.book.create).not.toHaveBeenCalled();
  expect(pubsub.publish).not.toHaveBeenCalled();
});

it("handles a database error when creating a book", async () => {
  mockPrisma.author.findUnique.mockResolvedValue({
    id: "author-1",
  });

  mockPrisma.book.create.mockRejectedValue(
    new Error("Database connection failed")
  );

  await expect(
    Mutation.addBook(
      null,
      {
        input: {
          title: "Test Book",
          authorId: "author-1",
        },
      },
      {
        user: {
          role: "ADMIN",
        },
      }
    )
  ).rejects.toThrow("Database connection failed");
});

it("handles a database error when finding the author", async () => {
  mockPrisma.author.findUnique.mockRejectedValue(
    new Error("Database connection failed")
  );

  await expect(
  Mutation.addBook(
    null,
    {
      input: {
        title: "Test Book",
        authorId: "author-1",
      },
    },
    {
      user: {
        role: "ADMIN",
      },
    }
  )
).rejects.toThrow("Database connection failed");
});

it("should reject when author does not exist", async () => {
  mockPrisma.author.findUnique.mockResolvedValue(null);

  await expect(
   Mutation.addBook(
  null,
  {
    input: {
      title: "Test Book",
      authorId: "missing-author",
    },
  },
  {
    user: {
      role: "ADMIN",
    },
  }
)
  ).rejects.toThrow("Author not found");

  expect(mockPrisma.book.create).not.toHaveBeenCalled();
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

    const result = await Mutation.addBook(
      null,
      {
        input: {
          title: "GraphQL Testing",
          authorId: "author-1",
        },
      },
      {
        user: {
          id: "admin-1",
          username: "admin",
          role: "ADMIN",
        },
      }
    );


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
      title: "Updated Title",
    });

    const result = await Mutation.updateBook(
      null,
      {
        id: "book-1",
        title: "Updated Title",
      },
      {
        user: {
          role: "ADMIN",
        },
      }
    );

    expect(result.title).toBe("Updated Title");

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
        title: "Updated Title",
      },
    });
  });

  it("rejects unauthenticated users", async () => {
  await expect(
    Mutation.updateBook(
      null,
      {
        id: "book-1",
        title: "Updated Title",
      },
      {}
    )
  ).rejects.toThrow("Authentication required");

  expect(mockPrisma.book.findUnique).not.toHaveBeenCalled();
  expect(mockPrisma.book.update).not.toHaveBeenCalled();
});

it("rejects a non-admin user", async () => {
  await expect(
    Mutation.updateBook(
      null,
      {
        id: "book-1",
        title: "Updated Title",
      },
      {
        user: {
          role: "USER",
        },
      }
    )
  ).rejects.toThrow("Admin access required");

  expect(mockPrisma.book.findUnique).not.toHaveBeenCalled();
  expect(mockPrisma.book.update).not.toHaveBeenCalled();
});

  it("handles a database error when updating a book", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      id: "book-1",
      title: "Old Title",
    });

    mockPrisma.book.update.mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(
      Mutation.updateBook(
        null,
        {
          id: "book-1",
          title: "Updated Title",
        },
        {
          user: {
            role: "ADMIN",
          },
        }
      )
    ).rejects.toThrow("Database connection failed");
  });

  it("handles a database error when finding a book", async () => {
    mockPrisma.book.findUnique.mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(
      Mutation.updateBook(
        null,
        {
          id: "book-1",
          title: "Updated Title",
        },
        {
          user: {
            role: "ADMIN",
          },
        }
      )
    ).rejects.toThrow("Database connection failed");
  });

  it("rejects updating a book that does not exist", async () => {
    mockPrisma.book.findUnique.mockResolvedValue(null);

    await expect(
      Mutation.updateBook(
        null,
        {
          id: "missing-book",
          title: "Updated Title",
        },
        {
          user: {
            role: "ADMIN",
          },
        }
      )
    ).rejects.toThrow("Book not found");

    expect(mockPrisma.book.update).not.toHaveBeenCalled();
  });

  it("should reject updating a book with an empty title", async () => {
    await expect(
      Mutation.updateBook(
        null,
        {
          id: "book-1",
          title: "   ",
        },
        {
          user: {
            role: "ADMIN",
          },
        }
      )
    ).rejects.toThrow("Title cannot be empty");

    expect(mockPrisma.book.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.book.update).not.toHaveBeenCalled();
  });
});

describe("deleteBook mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles a database error when deleting a book", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      id: "book-1",
      title: "Test Book",
    });

    mockPrisma.book.delete.mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(
      Mutation.deleteBook(
        null,
        {
          id: "book-1",
        },
        {
          user: {
            id: "admin-1",
            username: "admin",
            role: "ADMIN",
          },
        }
      )
    ).rejects.toThrow("Database connection failed");
    });

    it("rejects deleting a book that does not exist", async () => {
  mockPrisma.book.findUnique.mockResolvedValue(null);

  await expect(
    Mutation.deleteBook(
      null,
      {
        id: "missing-book",
      },
      {
        user: {
          id: "admin-1",
          username: "admin",
          role: "ADMIN",
        },
      }
    )
  ).rejects.toThrow("Book not found");

  expect(mockPrisma.book.delete).not.toHaveBeenCalled();
  });

it("should delete a book successfully", async () => {
  const deletedBook = {
    id: "book-1",
    title: "Test Book",
  };

  mockPrisma.book.findUnique.mockResolvedValue(deletedBook);
  mockPrisma.book.delete.mockResolvedValue(deletedBook);

  const result = await Mutation.deleteBook(
    null,
    {
      id: "book-1",
    },
    {
      user: {
        id: "admin-1",
        username: "admin",
        role: "ADMIN",
      },
    }
  );

  expect(result).toEqual(deletedBook);

  expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
    where: {
      id: "book-1",
    },
  });

  expect(mockPrisma.book.delete).toHaveBeenCalledWith({
    where: {
      id: "book-1",
    },
  });
  });

  it("rejects a non-admin user from deleting a book", async () => {
  await expect(
    Mutation.deleteBook(
      null,
      {
        id: "book-1",
      },
      {
        user: {
          id: "user-1",
          username: "john",
          role: "USER",
        },
      }
    )
  ).rejects.toThrow();

  expect(mockPrisma.book.findUnique).not.toHaveBeenCalled();
  expect(mockPrisma.book.delete).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated users from deleting a book", async () => {
  await expect(
    Mutation.deleteBook(
      null,
      {
        id: "book-1",
      },
      {
        user: null,
      }
    )
  ).rejects.toThrow();

  expect(mockPrisma.book.findUnique).not.toHaveBeenCalled();
  expect(mockPrisma.book.delete).not.toHaveBeenCalled();
  });
});
