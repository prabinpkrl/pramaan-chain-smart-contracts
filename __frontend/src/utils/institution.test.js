import { describe, expect, it } from "vitest";
import { normalizePublicInstitutionId } from "./institution";

describe("public institution ID", () => {
  it("normalizes a human-readable ID", () => {
    expect(normalizePublicInstitutionId(" tu-nepal ")).toBe("TU-NEPAL");
  });

  it("rejects malformed IDs", () => {
    expect(() => normalizePublicInstitutionId("TU Nepal")).toThrow();
    expect(() => normalizePublicInstitutionId("-TU-")).toThrow();
    expect(() => normalizePublicInstitutionId("A")).toThrow();
  });
});
