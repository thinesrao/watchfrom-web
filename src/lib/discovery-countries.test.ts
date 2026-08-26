import { describe, it, expect } from "vitest";
import { DISCOVERY_COUNTRIES } from "./countries";

describe("DISCOVERY_COUNTRIES", () => {
  it("includes the previous default set of countries", () => {
    for (const code of ["US", "GB", "JP", "KR", "DE", "CA", "AU"]) {
      expect(DISCOVERY_COUNTRIES).toContain(code);
    }
  });

  it("has no duplicate codes", () => {
    expect(new Set(DISCOVERY_COUNTRIES).size).toBe(DISCOVERY_COUNTRIES.length);
  });

  it("has between 15 and 30 countries", () => {
    expect(DISCOVERY_COUNTRIES.length).toBeGreaterThanOrEqual(15);
    expect(DISCOVERY_COUNTRIES.length).toBeLessThanOrEqual(30);
  });
});
