import { describe, it, expect } from "vitest";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../auth/refreshToken.js";

describe("Refresh Token utilities", () => {
  it("should generate a random refresh token", () => {
    const token = generateRefreshToken();

    expect(token).toBeTypeOf("string");
    expect(token.length).toBe(128);
  });

  it("should generate different tokens", () => {
    const token1 = generateRefreshToken();
    const token2 = generateRefreshToken();

    expect(token1).not.toBe(token2);
  });

  it("should hash a refresh token", () => {
    const token = generateRefreshToken();
    const hash = hashRefreshToken(token);

    expect(hash).toBeTypeOf("string");
    expect(hash.length).toBe(64);
  });

  it("should generate the same hash for the same token", () => {
    const token = generateRefreshToken();

    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it("should generate different hashes for different tokens", () => {
    const token1 = generateRefreshToken();
    const token2 = generateRefreshToken();

    expect(hashRefreshToken(token1)).not.toBe(hashRefreshToken(token2));
  });
});