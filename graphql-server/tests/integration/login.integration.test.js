import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApolloServer } from "@apollo/server";
import { createSchema } from "../../schema/createSchema.js";

const {
  mockPrisma,
  mockBcrypt,
  mockJwt,
  mockRefreshToken,
} = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },

    refreshToken: {
      create: vi.fn(),
    },
  },

  mockBcrypt: {
    compare: vi.fn(),
  },

  mockJwt: {
    generateToken: vi.fn(),
  },

  mockRefreshToken: {
    createRefreshToken: vi.fn(),
  },
}));

vi.mock("../../auth/refreshTokenService.js", () => ({
  createRefreshToken: mockRefreshToken.createRefreshToken,
}));

vi.mock("../../prisma/client.js", () => ({
  default: mockPrisma,
}));

vi.mock("bcrypt", () => ({
  default: mockBcrypt,
}));

vi.mock("../../auth/jwt.js", () => ({
  generateToken: mockJwt.generateToken,
}));

describe("GraphQL Login Integration", () => {
  let server;

  beforeEach(() => {
    vi.clearAllMocks();

    server = new ApolloServer({
      schema: createSchema(),
    });
  });

  it("logs in successfully through the GraphQL API", async () => {
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
              user {
                id
                username
                role
              }
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
        token: "test-jwt-token",
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

  it("returns an authentication error for invalid credentials", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const response = await server.executeOperation({
      query: `
        mutation {
          login(
            username: "unknown"
            password: "wrong-password"
          ) {
            ... on LoginSuccess {
              token
              user {
                id
                username
                role
              }
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
        username: "unknown",
      },
    });

    expect(mockBcrypt.compare).not.toHaveBeenCalled();

    expect(mockJwt.generateToken).not.toHaveBeenCalled();
  });


  it("returns an authentication error for an incorrect password", async () => {
    const user = {
      id: "user-1",
      username: "john",
      password: "hashed-password",
      role: "USER",
    };

    mockPrisma.user.findUnique.mockResolvedValue(user);

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
              user {
                id
                username
                role
              }
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


  it("returns a validation error for invalid login input", async () => {
    const response = await server.executeOperation({
      query: `
        mutation {
          login(
            username: ""
            password: ""
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

    expect(response.body.singleResult.errors).toBeDefined();

    expect(response.body.singleResult.errors[0].extensions.code).toBe(
      "BAD_USER_INPUT",
    );

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();

    expect(mockBcrypt.compare).not.toHaveBeenCalled();

    expect(mockJwt.generateToken).not.toHaveBeenCalled();
  });

});
