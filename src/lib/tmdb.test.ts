import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { discoverTitles } from "./tmdb";

const originalFetch = global.fetch;
const originalEnv = process.env.TMDB_API_READ_ACCESS_TOKEN;

function mockFetchOnce(body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.TMDB_API_READ_ACCESS_TOKEN = "test-token";
});

afterAll(() => {
  global.fetch = originalFetch;
  process.env.TMDB_API_READ_ACCESS_TOKEN = originalEnv;
});

describe("discoverTitles", () => {
  it("builds a base URL with only the required params by default", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({ mediaType: "movie", watchRegion: "US", providerIds: [8], page: 1 });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("watch_region=US");
    expect(calledUrl).toContain("with_watch_providers=8");
    expect(calledUrl).toContain("sort_by=popularity.desc");
    expect(calledUrl).not.toContain("with_genres");
    expect(calledUrl).not.toContain("with_crew");
  });

  it("adds with_genres when genreIds is provided", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "movie",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      genreIds: [28, 53],
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("with_genres=28%7C53");
  });

  it("overrides sort_by and adds vote_count.gte when provided", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "movie",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      sortBy: "vote_average.desc",
      voteCountGte: 100,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("sort_by=vote_average.desc");
    expect(calledUrl).toContain("vote_count.gte=100");
  });

  it("adds a movie-specific date range param", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "movie",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      dateGte: "2010-01-01",
      dateLte: "2019-12-31",
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("primary_release_date.gte=2010-01-01");
    expect(calledUrl).toContain("primary_release_date.lte=2019-12-31");
  });

  it("adds a tv-specific date range param", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "tv",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      dateGte: "2010-01-01",
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("first_air_date.gte=2010-01-01");
  });

  it("adds with_crew for movie when crewId is provided", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "movie",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      crewId: 525,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("with_crew=525");
  });

  it("ignores crewId for tv (with_crew is a movie-only TMDB param)", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "tv",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      crewId: 525,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("with_crew");
  });
});
