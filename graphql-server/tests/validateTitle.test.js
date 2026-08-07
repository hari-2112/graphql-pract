import { describe, it, expect } from "vitest";
import validateTitle from "../utils/validateTitle.js";

describe("validateTitle", () => {
  it("should accept a valid title", () => {
    expect(() => validateTitle("GraphQL Book")).not.toThrow();
  });

  it("should reject an empty title", () => {
    expect(() => validateTitle("")).toThrow("Title cannot be empty");
  });

  it("should reject a whitespace-only title", () => {
    expect(() => validateTitle("   ")).toThrow("Title cannot be empty");
  });
});