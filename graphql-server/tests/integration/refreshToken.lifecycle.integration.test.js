import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { ApolloServer } from "@apollo/server";
import { createSchema } from "../../schema/createSchema.js";
import prisma from "../../prisma/client.js";

import { createRefreshToken } from "../../auth/refreshTokenService.js";
import { hashRefreshToken } from "../../auth/refreshToken.js";

describe("Refresh Token Lifecycle", () => {
  let server;
  let testUserId;

  beforeEach(async () => {
    server = new ApolloServer({
      schema: createSchema(),
    });

    const user = await prisma.user.create({
      data: {
        username: `refresh-test-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,
        password: "test-password",
        role: "USER",
      },
    });

    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: {
        userId: testUserId,
      },
    });

    await prisma.user.delete({
      where: {
        id: testUserId,
      },
    });

    await prisma.$disconnect();
  });

  it("rejects reuse of a refresh token after successful rotation", async () => {
    // Create the initial refresh token using the real service.
    

    const oldRefreshToken = await createRefreshToken(testUserId);

    // First use: token should rotate successfully.
    const firstResponse = await server.executeOperation({
      query: `
        mutation {
          refreshToken(refreshToken: "${oldRefreshToken}") {
            ... on LoginSuccess {
              token
              refreshToken
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

    expect(firstResponse.body.kind).toBe("single");
    expect(firstResponse.body.singleResult.errors).toBeUndefined();

    const firstResult =
      firstResponse.body.singleResult.data.refreshToken;

    expect(firstResult).toHaveProperty("token");
    expect(firstResult).toHaveProperty("refreshToken");
    expect(firstResult).toHaveProperty("user");

    const newRefreshToken = firstResult.refreshToken;

    expect(newRefreshToken).not.toBe(oldRefreshToken);

    // Verify the old token is actually revoked in PostgreSQL.
    const revokedToken = await prisma.refreshToken.findUnique({
      where: {
        token: (
          await import("../../auth/refreshToken.js")
        ).hashRefreshToken(oldRefreshToken),
      },
    });

    expect(revokedToken).not.toBeNull();
    expect(revokedToken.userId).toBe(testUserId);
    expect(revokedToken.revokedAt).not.toBeNull();

    // Verify the newly rotated token is active.
    const activeToken = await prisma.refreshToken.findUnique({
      where: {
        token: (
          await import("../../auth/refreshToken.js")
        ).hashRefreshToken(newRefreshToken),
      },
    });

    expect(activeToken).not.toBeNull();
    expect(activeToken.userId).toBe(testUserId);
    expect(activeToken.revokedAt).toBeNull();

    // Second use of the old token must be rejected.
    const reuseResponse = await server.executeOperation({
      query: `
        mutation {
          refreshToken(refreshToken: "${oldRefreshToken}") {
            ... on LoginSuccess {
              token
              refreshToken
            }
            ... on AuthError {
              message
            }
          }
        }
      `,
    });

    expect(reuseResponse.body.kind).toBe("single");
    expect(reuseResponse.body.singleResult.errors).toBeUndefined();

    expect(
      reuseResponse.body.singleResult.data.refreshToken,
    ).toEqual({
      message: "Refresh token has been revoked",
    });

    // Confirm no additional refresh token was created.
   // Confirm the entire token family has been revoked.
const tokens = await prisma.refreshToken.findMany({
  where: {
    userId: testUserId,
  },
});

expect(tokens).toHaveLength(2);

expect(tokens.every((token) => token.revokedAt !== null)).toBe(true);
  });

  it("allows only one concurrent refresh to consume the same token", async () => {
  const oldRefreshToken = await createRefreshToken(testUserId);

  const refreshMutation = `
    mutation {
      refreshToken(refreshToken: "${oldRefreshToken}") {
        ... on LoginSuccess {
          token
          refreshToken
        }
        ... on AuthError {
          message
        }
      }
    }
  `;

  const [response1, response2] = await Promise.all([
    server.executeOperation({
      query: refreshMutation,
    }),
    server.executeOperation({
      query: refreshMutation,
    }),
  ]);

  expect(response1.body.kind).toBe("single");
  expect(response2.body.kind).toBe("single");

  expect(response1.body.singleResult.errors).toBeUndefined();
  expect(response2.body.singleResult.errors).toBeUndefined();

  const result1 = response1.body.singleResult.data.refreshToken;
  const result2 = response2.body.singleResult.data.refreshToken;

  const successfulResults = [result1, result2].filter(
    (result) => result.token && result.refreshToken,
  );

  const rejectedResults = [result1, result2].filter(
    (result) => result.message,
  );

  expect(successfulResults).toHaveLength(1);
  expect(rejectedResults).toHaveLength(1);

  expect(rejectedResults[0]).toEqual({
    message: "Refresh token has been revoked",
  });

  const tokens = await prisma.refreshToken.findMany({
    where: {
      userId: testUserId,
    },
  });

  expect(tokens).toHaveLength(2);

  const oldToken = tokens.find(
    (token) => token.token === hashRefreshToken(oldRefreshToken),
  );

  const newToken = tokens.find(
    (token) => token.token !== hashRefreshToken(oldRefreshToken),
  );

  expect(oldToken).not.toBeUndefined();
  expect(oldToken.revokedAt).not.toBeNull();

  expect(newToken).not.toBeUndefined();
  expect(newToken.revokedAt).not.toBeNull();
  expect(newToken.familyId).toBe(oldToken.familyId);
});

});