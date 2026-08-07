import { describe, it, expect } from "vitest";
import { generateToken, verifyToken } from "../auth/jwt.js";

describe("JWT utilities", () => {
  const user = {
    id: "test-user-123",
    username: "testuser",
    role: "USER",
  };

  it("should generate a valid token", () => {
    const token = generateToken(user);

    expect(token).toBeTypeOf("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("should verify a generated token", () => {
    const token = generateToken(user);
    const decoded = verifyToken(token);

    expect(decoded.id).toBe(user.id);
    expect(decoded.username).toBe(user.username);
    expect(decoded.role).toBe(user.role);
  });

  it("should reject an invalid token", () => {
    expect(() => verifyToken("invalid-token")).toThrow();
  });
});