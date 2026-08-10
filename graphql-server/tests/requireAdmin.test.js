import { describe, it, expect } from "vitest";
import requireAdmin from "../auth/requireAdmin.js";

describe("requireAdmin", () => {
  it("should allow an ADMIN user", () => {
    const context = {
      user: {
        id: "admin-1",
        username: "admin",
        role: "ADMIN",
      },
    };

    expect(() => requireAdmin(context)).not.toThrow();
  });

  it("rejects a non-admin user", () => {
  expect(() =>
    requireAdmin({
      id: "user-1",
      username: "john",
      role: "USER",
    })
  ).toThrow();
});

  it("rejects when no user is authenticated", () => {
  expect(() => requireAdmin(null)).toThrow();
});

  it("should reject a USER", () => {
    const context = {
      user: {
        id: "user-1",
        username: "user",
        role: "USER",
      },
    };

    expect(() => requireAdmin(context)).toThrowError(
      "Admin access required"
    );

    try {
      requireAdmin(context);
    } catch (error) {
      expect(error.extensions.code).toBe("FORBIDDEN");
    }
  });

  it("should reject an unauthenticated user", () => {
    const context = {
      user: null,
    };

    expect(() => requireAdmin(context)).toThrow();

    try {
      requireAdmin(context);
    } catch (error) {
      expect(error.extensions.code).toBe("UNAUTHENTICATED");
    }
  });
});