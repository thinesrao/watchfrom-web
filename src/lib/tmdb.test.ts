import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { discoverTitles, getDirectors } from "./tmdb";

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

  it("drops results where the person's only credit is not a Director job, even though TMDB's with_crew matched them", async () => {
    // TMDB's with_crew param matches ANY crew credit (e.g. a "Thanks" credit),
    // so discover can return a title the person didn't actually direct.
    global.fetch = vi.fn(async (url: string) => {
      if (url.includes("/discover/")) {
        return {
          ok: true,
          json: async () => ({
            results: [
              { id: 1, title: "Directed Film", release_date: "2020-01-01" },
              { id: 2, title: "Thanked Film", release_date: "2023-01-01" },
            ],
            total_pages: 1,
          }),
        };
      }
      if (url.includes("/movie/1/credits")) {
        return {
          ok: true,
          json: async () => ({
            crew: [{ id: 525, job: "Director" }],
          }),
        };
      }
      if (url.includes("/movie/2/credits")) {
        return {
          ok: true,
          json: async () => ({
            crew: [{ id: 525, job: "Thanks" }],
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as unknown as typeof fetch;

    const result = await discoverTitles({
      mediaType: "movie",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      crewId: 525,
    });

    expect(result.results.map((r) => r.id)).toEqual([1]);
  });

  it("does not fetch credits when crewId is not provided", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [{ id: 1, title: "Some Film", release_date: "2020-01-01" }],
        total_pages: 1,
      }),
    })) as unknown as typeof fetch;

    await discoverTitles({ mediaType: "movie", watchRegion: "US", providerIds: [8], page: 1 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("getDirectors", () => {
  it("returns the movie's Director crew credits, deduped", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        crew: [
          { job: "Director", name: "Christopher Nolan" },
          { job: "Writer", name: "Christopher Nolan" },
          { job: "Producer", name: "Emma Thomas" },
        ],
      }),
    })) as unknown as typeof fetch;

    const directors = await getDirectors(157336, "movie");
    expect(directors).toEqual(["Christopher Nolan"]);
    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/movie/157336/credits");
  });

  it("returns co-directors for movies with more than one Director", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        crew: [
          { job: "Director", name: "Joel Coen" },
          { job: "Director", name: "Ethan Coen" },
        ],
      }),
    })) as unknown as typeof fetch;

    expect(await getDirectors(1, "movie")).toEqual(["Joel Coen", "Ethan Coen"]);
  });

  it("returns the show's created_by names for TV", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        created_by: [{ name: "Vince Gilligan" }, { name: "Peter Gould" }],
      }),
    })) as unknown as typeof fetch;

    const directors = await getDirectors(1396, "tv");
    expect(directors).toEqual(["Vince Gilligan", "Peter Gould"]);
    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/tv/1396");
    expect(calledUrl).not.toContain("/credits");
  });

  it("returns an empty array when there is no director credit", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ crew: [{ job: "Producer", name: "Someone" }] }),
    })) as unknown as typeof fetch;

    expect(await getDirectors(1, "movie")).toEqual([]);
  });
});
