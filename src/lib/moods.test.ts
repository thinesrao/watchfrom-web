import { describe, it, expect } from "vitest";
import { MOODS, genreIdsForMood } from "./moods";

describe("genreIdsForMood", () => {
  it("returns the movie genre ids for a known mood", () => {
    expect(genreIdsForMood("feel-good", "movie")).toEqual(
      MOODS.find((m) => m.key === "feel-good")!.movieGenreIds
    );
  });

  it("returns the tv genre ids for a known mood", () => {
    expect(genreIdsForMood("intense", "tv")).toEqual(
      MOODS.find((m) => m.key === "intense")!.tvGenreIds
    );
  });

  it("returns an empty array for an unknown mood key", () => {
    expect(genreIdsForMood("not-a-mood", "movie")).toEqual([]);
  });
});
