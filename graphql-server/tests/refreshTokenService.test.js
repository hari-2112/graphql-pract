import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashRefreshToken } from "../auth/refreshToken.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    refreshToken: {
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
},
  },
}));

vi.mock("../prisma/client.js", () => ({
  default: mockPrisma,
}));


import {
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  consumeRefreshToken,
  revokeTokenFamily,
} from "../auth/refreshTokenService.js";


describe("Refresh Token Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create and store a refresh token", async () => {
    mockPrisma.refreshToken.create.mockResolvedValue({
      id: "refresh-id",
      token: "hashed-token",
      userId: "user-123",
      expiresAt: new Date(),
      revokedAt: null,
    });

    const token = await createRefreshToken("user-123");

    expect(token).toBeTypeOf("string");
    expect(token.length).toBe(128);

    expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);

    const call = mockPrisma.refreshToken.create.mock.calls[0][0];

    expect(call.data.userId).toBe("user-123");
    expect(call.data.token).toBeTypeOf("string");
    expect(call.data.token.length).toBe(64);
    expect(call.data.token).toBe(hashRefreshToken(token));
    expect(call.data.expiresAt).toBeInstanceOf(Date);
  });

  it("should find a refresh token", async () => {
    const storedToken = {
      id: "refresh-id",
      token: "hashed-token",
      userId: "user-123",
      expiresAt: new Date(),
      revokedAt: null,
    };

    mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);

    const result = await findRefreshToken("raw-refresh-token");

    expect(result).toEqual(storedToken);
    expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledTimes(1);

    const call = mockPrisma.refreshToken.findUnique.mock.calls[0][0];

    expect(call.where.token).toBe(hashRefreshToken("raw-refresh-token"));
  });

  it("should revoke a refresh token", async () => {
    mockPrisma.refreshToken.update.mockResolvedValue({
      id: "refresh-id",
      revokedAt: new Date(),
    });

    const result = await revokeRefreshToken("raw-refresh-token");

    expect(result.revokedAt).toBeInstanceOf(Date);

    expect(mockPrisma.refreshToken.update).toHaveBeenCalledTimes(1);

    const call = mockPrisma.refreshToken.update.mock.calls[0][0];

    expect(call.data.revokedAt).toBeInstanceOf(Date);
    expect(call.where.token).toBe(
  hashRefreshToken("raw-refresh-token")
    );
  });

  it("should atomically consume an active refresh token", async () => {
  mockPrisma.refreshToken.updateMany.mockResolvedValue({
    count: 1,
  });

  const result = await consumeRefreshToken("raw-refresh-token");

  expect(result.count).toBe(1);

  expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);

  const call = mockPrisma.refreshToken.updateMany.mock.calls[0][0];

  expect(call.where.token).toBe(
    hashRefreshToken("raw-refresh-token")
  );

  expect(call.where.revokedAt).toBeNull();

  expect(call.data.revokedAt).toBeInstanceOf(Date);
});

});