import { describe, it, expect } from "vitest";
import { resolveSortBy } from "./sort-options";

describe("resolveSortBy", () => {
  it("maps trending to popularity for both media types", () => {
    expect(resolveSortBy("trending", "movie")).toBe("popularity.desc");
    expect(resolveSortBy("trending", "tv")).toBe("popularity.desc");
  });

  it("maps top-rated to vote average for both media types", () => {
    expect(resolveSortBy("top-rated", "movie")).toBe("vote_average.desc");
    expect(resolveSortBy("top-rated", "tv")).toBe("vote_average.desc");
  });

  it("maps newest to the media-type-specific date field", () => {
    expect(resolveSortBy("newest", "movie")).toBe("primary_release_date.desc");
    expect(resolveSortBy("newest", "tv")).toBe("first_air_date.desc");
  });
});
