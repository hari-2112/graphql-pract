import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
} from "../validation/authValidation.js";

describe("registerSchema", () => {
  it("should accept valid registration data", () => {
    const result = registerSchema.safeParse({
      username: "john",
      password: "password123",
    });

    expect(result.success).toBe(true);
  });

  it("should reject a username shorter than 3 characters", () => {
    const result = registerSchema.safeParse({
      username: "jo",
      password: "password123",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(
      "Username must be at least 3 characters"
    );
  });

  it("should reject a password shorter than 6 characters", () => {
    const result = registerSchema.safeParse({
      username: "john",
      password: "12345",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(
      "Password must be at least 6 characters"
    );
  });
});

describe("loginSchema", () => {
  it("should accept valid login data", () => {
    const result = loginSchema.safeParse({
      username: "john",
      password: "password123",
    });

    expect(result.success).toBe(true);
  });

  it("should reject an empty username", () => {
    const result = loginSchema.safeParse({
      username: "",
      password: "password123",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Username is required");
  });

  it("should reject an empty password", () => {
    const result = loginSchema.safeParse({
      username: "john",
      password: "",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Password is required");
  });
});