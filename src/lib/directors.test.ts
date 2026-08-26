import { describe, it, expect } from "vitest";
import { DIRECTORS, directorName } from "./directors";

describe("directorName", () => {
  it("returns the name for a known director id", () => {
    const nolan = DIRECTORS.find((d) => d.name === "Christopher Nolan")!;
    expect(directorName(nolan.id)).toBe("Christopher Nolan");
  });

  it("returns an empty string for an unknown id", () => {
    expect(directorName(-1)).toBe("");
  });

  it("has no duplicate ids", () => {
    const ids = DIRECTORS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
