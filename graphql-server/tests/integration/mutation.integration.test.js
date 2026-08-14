import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApolloServer } from "@apollo/server";
import { createSchema } from "../../schema/createSchema.js";

const {
  mockPrisma,
  mockPubsub,
  mockBcrypt,
  mockJwt,
  mockRefreshToken,
} = vi.hoisted(() => ({
  mockPrisma: {
    author: {
      findUnique: vi.fn(),
    },

    book: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },

    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },

    refreshToken: {
      create: vi.fn(),
    },
  },

  mockRefreshToken: {
    createRefreshToken: vi.fn(),
  },

  mockPubsub: {
    publish: vi.fn(),
  },

  mockBcrypt: {
    compare: vi.fn(),
    hash: vi.fn(),
  },

  mockJwt: {
    generateToken: vi.fn(),
  },
}));

vi.mock("../../prisma/client.js", () => ({
  default: mockPrisma,
}));

vi.mock("../../auth/refreshTokenService.js", () => ({
  createRefreshToken: mockRefreshToken.createRefreshToken,
}));

vi.mock("../../pubsub/pubsub.js", () => ({
  default: mockPubsub,
}));

vi.mock("bcrypt", () => ({
  default: mockBcrypt,
}));

vi.mock("../../auth/jwt.js", () => ({
  generateToken: mockJwt.generateToken,
}));




describe("GraphQL Mutation Integration", () => {
  let server;

  beforeEach(() => {
    vi.clearAllMocks();

    server = new ApolloServer({
      schema: createSchema(),
    });
  });

  it("creates a book through the GraphQL API", async () => {
    mockPrisma.author.findUnique.mockResolvedValue({
      id: "author-1",
      name: "J.R.R. Tolkien",
    });

    mockPrisma.book.create.mockResolvedValue({
      id: "book-1",
      title: "The Hobbit",
      authorId: "author-1",
    });

    const response = await server.executeOperation({
      query: `
        mutation {
          addBook(
            input: {
              title: "The Hobbit"
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
        id: "admin-1",
        username: "admin",
        role: "ADMIN",
      },
    },
  },
);

    expect(response.body.kind).toBe("single");
    expect(response.body.singleResult.errors).toBeUndefined();

    expect(response.body.singleResult.data).toEqual({
      addBook: {
        id: "book-1",
        title: "The Hobbit",
      },
    });

    expect(mockPrisma.author.findUnique).toHaveBeenCalledWith({
      where: {
        id: "author-1",
      },
    });

    expect(mockPrisma.book.create).toHaveBeenCalled();

    expect(mockPubsub.publish).toHaveBeenCalledWith(
      "BOOK_ADDED",
      expect.objectContaining({
        bookAdded: expect.any(Object),
      }),
    );
  });

  it("returns an error when the password is incorrect", async () => {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    username: "john",
    password: "hashed-password",
    role: "USER",
  });

  mockBcrypt.compare.mockResolvedValue(false);

  const response = await server.executeOperation({
    query: `
      mutation {
        login(
          username: "john"
          password: "wrong-password"
        ) {
          ... on LoginSuccess {
            token
          }
          ... on AuthError {
            message
          }
        }
      }
    `,
  });

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeUndefined();

  expect(response.body.singleResult.data).toEqual({
    login: {
      message: "Invalid username or password",
    },
  });

  expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
    where: {
      username: "john",
    },
  });

  expect(mockBcrypt.compare).toHaveBeenCalledWith(
    "wrong-password",
    "hashed-password",
  );

  expect(mockJwt.generateToken).not.toHaveBeenCalled();
});

it("registers a new user successfully", async () => {
  mockPrisma.user.findUnique.mockResolvedValue(null);

  mockBcrypt.hash.mockResolvedValue("hashed-password");

  mockPrisma.user.create.mockResolvedValue({
    id: "user-2",
    username: "alice",
    password: "hashed-password",
    role: "USER",
  });

  mockJwt.generateToken.mockReturnValue("register-jwt-token");
  mockRefreshToken.createRefreshToken.mockResolvedValue(
  "register-refresh-token",
);

 const response = await server.executeOperation({
  query: `
    mutation {
      register(
        username: "alice"
        password: "password123"
      ) {
        ... on LoginSuccess {
            token
            refreshToken
            user {
            id
            username
            role
          }
        }
      }
    }
  `,
});

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeUndefined();

  expect(response.body.singleResult.data).toEqual({
    register: {
  token: "register-jwt-token",
  refreshToken: "register-refresh-token",
  user: {
    id: "user-2",
    username: "alice",
    role: "USER",
  },
},
  });

  expect(mockRefreshToken.createRefreshToken).toHaveBeenCalledWith(
  "user-2",
);

  expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
    where: {
      username: "alice",
    },
  });

  expect(mockBcrypt.hash).toHaveBeenCalledWith(
    "password123",
    expect.any(Number),
  );

  console.log(
  "USER.CREATE ARGUMENTS:",
  JSON.stringify(mockPrisma.user.create.mock.calls[0][0], null, 2),
);

 expect(mockPrisma.user.create).toHaveBeenCalledWith({
  data: {
    username: "alice",
    password: "hashed-password",
    role: "USER",
  },
});
  expect(mockJwt.generateToken).toHaveBeenCalledWith({
    id: "user-2",
    username: "alice",
    password: "hashed-password",
    role: "USER",
  });
});

it("returns an error when the user does not exist", async () => {
  mockPrisma.user.findUnique.mockResolvedValue(null);

  const response = await server.executeOperation({
    query: `
      mutation {
        login(
          username: "missing-user"
          password: "password123"
        ) {
          ... on LoginSuccess {
            token
          }
          ... on AuthError {
            message
          }
        }
      }
    `,
  });


 
  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeUndefined();

  expect(response.body.singleResult.data).toEqual({
    login: {
      message: "Invalid username or password",
    },
  });

  expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
    where: {
      username: "missing-user",
    },
  });

  expect(mockBcrypt.compare).not.toHaveBeenCalled();

  expect(mockJwt.generateToken).not.toHaveBeenCalled();
});

  it("logs in an existing user successfully", async () => {
  const user = {
    id: "user-1",
    username: "john",
    password: "hashed-password",
    role: "USER",
  };

  mockPrisma.user.findUnique.mockResolvedValue(user);
  mockBcrypt.compare.mockResolvedValue(true);
  mockJwt.generateToken.mockReturnValue("test-jwt-token");
  mockRefreshToken.createRefreshToken.mockResolvedValue(
  "test-refresh-token",
);
  const response = await server.executeOperation({
    query: `
      mutation {
        login(
          username: "john"
          password: "password123"
        ) {
          ... on LoginSuccess {
            token
            refreshToken
            user {
              id
              username
              role
            }
          }
        }
      }
    `,
  });

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeUndefined();

  expect(response.body.singleResult.data).toEqual({
    login: {
  token: "test-jwt-token",
  refreshToken: "test-refresh-token",
  user: {
    id: "user-1",
    username: "john",
    role: "USER",
  },
},
  });

  expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
    where: {
      username: "john",
    },
  });

  expect(mockBcrypt.compare).toHaveBeenCalledWith(
    "password123",
    "hashed-password",
  );

  expect(mockJwt.generateToken).toHaveBeenCalledWith(user);
});

  it("creates a book with the expected Prisma arguments", async () => {
  mockPrisma.author.findUnique.mockResolvedValue({
    id: "author-1",
    name: "J.R.R. Tolkien",
  });

  mockPrisma.book.create.mockResolvedValue({
    id: "book-2",
    title: "The Lord of the Rings",
    authorId: "author-1",
  });

  const response = await server.executeOperation({
    query: `
      mutation {
        addBook(
          input: {
            title: "The Lord of the Rings"
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
        id: "admin-1",
        username: "admin",
        role: "ADMIN",
      },
    },
  },
);

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeUndefined();

  expect(response.body.singleResult.data).toEqual({
    addBook: {
      id: "book-2",
      title: "The Lord of the Rings",
    },
  });

  expect(mockPrisma.book.create).toHaveBeenCalledWith({
    data: {
      title: "The Lord of the Rings",
      author: {
        connect: {
          id: "author-1",
        },
      },
    },
  });
});

 it("updates an existing book successfully", async () => {
  const existingBook = {
    id: "book-1",
    title: "Old Title",
    authorId: "author-1",
  };

  const updatedBook = {
    id: "book-1",
    title: "Updated Title",
    authorId: "author-1",
  };

  mockPrisma.book.findUnique.mockResolvedValue(existingBook);
  mockPrisma.book.update.mockResolvedValue(updatedBook);

  const response = await server.executeOperation(
  {
    query: `
      mutation {
        updateBook(
          id: "book-1"
          title: "Updated Title"
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
        id: "admin-1",
        username: "admin",
        role: "ADMIN",
      },
    },
  },
);

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeUndefined();

  expect(response.body.singleResult.data).toEqual({
    updateBook: {
      id: "book-1",
      title: "Updated Title",
    },
  });

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

it("rejects a non-admin user from updating a book", async () => {
  const response = await server.executeOperation(
    {
      query: `
        mutation {
          updateBook(
            id: "book-1"
            title: "Updated Title"
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
          role: "USER",
        },
      },
    },
  );

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeDefined();

  expect(response.body.singleResult.errors[0].message).toBe(
    "Admin access required",
  );

  expect(
    response.body.singleResult.errors[0].extensions.code,
  ).toBe("FORBIDDEN");

  expect(mockPrisma.book.findUnique).not.toHaveBeenCalled();

  expect(mockPrisma.book.update).not.toHaveBeenCalled();
});

  it("returns an error when the author does not exist", async () => {
    mockPrisma.author.findUnique.mockResolvedValue(null);

    const response = await server.executeOperation({
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
        id: "admin-1",
        username: "admin",
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
            id: "admin-1",
            username: "admin",
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

  it("rejects a non-admin user from adding a book", async () => {
    const response = await server.executeOperation(
      {
        query: `
          mutation {
            addBook(
              input: {
                title: "The Hobbit"
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
            role: "USER",
          },
        },
      },
    );

    expect(response.body.kind).toBe("single");

    expect(response.body.singleResult.errors).toBeDefined();

    expect(response.body.singleResult.errors[0].message).toBe(
      "Admin access required",
    );

    expect(
      response.body.singleResult.errors[0].extensions.code,
    ).toBe("FORBIDDEN");

    expect(mockPrisma.author.findUnique).not.toHaveBeenCalled();

    expect(mockPrisma.book.create).not.toHaveBeenCalled();

    expect(mockPubsub.publish).not.toHaveBeenCalled();
  });

  it("returns an error when updating a book that does not exist", async () => {
    mockPrisma.book.findUnique.mockResolvedValue(null);

    const response = await server.executeOperation(
  {
    query: `
      mutation {
        updateBook(
          id: "missing-book"
          title: "The Hobbit"
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
        id: "admin-1",
        username: "admin",
        role: "ADMIN",
      },
    },
  },
);
    expect(response.body.kind).toBe("single");

    expect(response.body.singleResult.errors).toBeDefined();

    expect(response.body.singleResult.errors[0].message).toBe(
      "Book not found",
    );

    expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
      where: {
        id: "missing-book",
      },
    });

    expect(mockPrisma.book.update).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated user from adding a book", async () => {
  const response = await server.executeOperation({
    query: `
      mutation {
        addBook(
          input: {
            title: "The Hobbit"
            authorId: "author-1"
          }
        ) {
          id
          title
        }
      }
    `,
  });

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeDefined();

  expect(response.body.singleResult.errors[0].message).toBe(
    "Authentication required",
  );

  expect(
    response.body.singleResult.errors[0].extensions.code,
  ).toBe("UNAUTHENTICATED");

  expect(mockPrisma.author.findUnique).not.toHaveBeenCalled();

  expect(mockPrisma.book.create).not.toHaveBeenCalled();

  expect(mockPubsub.publish).not.toHaveBeenCalled();
});

  it("rejects an unauthenticated user from updating a book", async () => {
  const response = await server.executeOperation({
    query: `
      mutation {
        updateBook(
          id: "book-1"
          title: "Updated Title"
        ) {
          id
          title
        }
      }
    `,
  });

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeDefined();

  expect(response.body.singleResult.errors[0].message).toBe(
    "Authentication required",
  );

  expect(
    response.body.singleResult.errors[0].extensions.code,
  ).toBe("UNAUTHENTICATED");

  expect(mockPrisma.book.findUnique).not.toHaveBeenCalled();

  expect(mockPrisma.book.update).not.toHaveBeenCalled();
});


  it("deletes a book through the GraphQL API as an admin", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      id: "book-1",
      title: "The Hobbit",
      authorId: "author-1",
    });

    mockPrisma.book.delete.mockResolvedValue({
      id: "book-1",
      title: "The Hobbit",
      authorId: "author-1",
    });

    const response = await server.executeOperation(
      {
        query: `
          mutation {
            deleteBook(id: "book-1") {
              id
              title
            }
          }
        `,
      },
      {
        contextValue: {
          user: {
            id: "admin-1",
            username: "admin",
            role: "ADMIN",
          },
        },
      },
    );

    expect(response.body.kind).toBe("single");

    expect(response.body.singleResult.errors).toBeUndefined();

    expect(response.body.singleResult.data).toEqual({
      deleteBook: {
        id: "book-1",
        title: "The Hobbit",
      },
    });

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

  it("deletes the expected book with Prisma", async () => {
  mockPrisma.book.findUnique.mockResolvedValue({
    id: "book-2",
    title: "The Lord of the Rings",
    authorId: "author-1",
  });

  mockPrisma.book.delete.mockResolvedValue({
    id: "book-2",
    title: "The Lord of the Rings",
    authorId: "author-1",
  });

  const response = await server.executeOperation(
    {
      query: `
        mutation {
          deleteBook(id: "book-2") {
            id
            title
          }
        }
      `,
    },
    {
      contextValue: {
        user: {
          id: "admin-1",
          username: "admin",
          role: "ADMIN",
        },
      },
    },
  );

  expect(response.body.kind).toBe("single");

  expect(response.body.singleResult.errors).toBeUndefined();

  expect(response.body.singleResult.data).toEqual({
    deleteBook: {
      id: "book-2",
      title: "The Lord of the Rings",
    },
  });

  expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
    where: {
      id: "book-2",
    },
  });

  expect(mockPrisma.book.delete).toHaveBeenCalledWith({
    where: {
      id: "book-2",
    },
  });
});

  it("rejects a non-admin user from deleting a book", async () => {
    const response = await server.executeOperation(
      {
        query: `
          mutation {
            deleteBook(id: "book-1") {
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
            role: "USER",
          },
        },
      },
    );

    expect(response.body.kind).toBe("single");

    expect(response.body.singleResult.errors).toBeDefined();

    expect(response.body.singleResult.errors[0].message).toBe(
      "Admin access required",
    );

    expect(mockPrisma.book.findUnique).not.toHaveBeenCalled();

    expect(mockPrisma.book.delete).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated user from deleting a book", async () => {
  const response = await server.executeOperation(
    {
      query: `
        mutation {
          deleteBook(id: "book-1") {
            id
            title
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
    "Authentication required",
  );

  expect(
    response.body.singleResult.errors[0].extensions.code,
  ).toBe("UNAUTHENTICATED");

  expect(mockPrisma.book.findUnique).not.toHaveBeenCalled();

  expect(mockPrisma.book.delete).not.toHaveBeenCalled();
});

  it("returns an error when an admin deletes a book that does not exist", async () => {
    mockPrisma.book.findUnique.mockResolvedValue(null);

    const response = await server.executeOperation(
      {
        query: `
          mutation {
            deleteBook(id: "missing-book") {
              id
              title
            }
          }
        `,
      },
      {
        contextValue: {
          user: {
            id: "admin-1",
            username: "admin",
            role: "ADMIN",
          },
        },
      },
    );

    expect(response.body.kind).toBe("single");

    expect(response.body.singleResult.errors).toBeDefined();

    expect(response.body.singleResult.errors[0].message).toBe(
      "Book not found",
    );

    expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
      where: {
        id: "missing-book",
      },
    });

    expect(mockPrisma.book.delete).not.toHaveBeenCalled();
  });

});


