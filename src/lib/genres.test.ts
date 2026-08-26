import { describe, it, expect } from "vitest";
import { MOVIE_GENRES, TV_GENRES, genresForMediaType, genreLabel } from "./genres";

describe("genresForMediaType", () => {
  it("returns the movie genre list for movie", () => {
    expect(genresForMediaType("movie")).toBe(MOVIE_GENRES);
  });

  it("returns the tv genre list for tv", () => {
    expect(genresForMediaType("tv")).toBe(TV_GENRES);
  });
});

describe("genreLabel", () => {
  it("returns the label for a known movie genre id", () => {
    expect(genreLabel("movie", 35)).toBe("Comedy");
  });

  it("returns the label for a known tv genre id", () => {
    expect(genreLabel("tv", 10759)).toBe("Action & Adventure");
  });

  it("returns an empty string for an unknown id", () => {
    expect(genreLabel("movie", 999999)).toBe("");
  });
});
