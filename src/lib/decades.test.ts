import { describe, it, expect } from "vitest";
import { DECADES, dateRangeForDecade } from "./decades";

describe("dateRangeForDecade", () => {
  it("builds a full-year date range for a decade", () => {
    const decade = DECADES.find((d) => d.label === "2010s")!;
    expect(dateRangeForDecade(decade)).toEqual({ gte: "2010-01-01", lte: "2019-12-31" });
  });

  it("handles the open-ended earliest bucket", () => {
    const decade = DECADES.find((d) => d.label === "Before 1980")!;
    expect(dateRangeForDecade(decade)).toEqual({ gte: "1900-01-01", lte: "1979-12-31" });
  });
});
