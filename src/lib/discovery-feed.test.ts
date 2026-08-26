import { describe, it, expect, vi } from "vitest";
import { fetchDiscoveryFeed, mergeDiscoveryResults, TARGET_COUNT, MAX_PAGES } from "./discovery-feed";
import type { CountryAvailability, SearchResult } from "./types";

function title(id: number): SearchResult {
  return {
    id,
    title: `Title ${id}`,
    mediaType: "movie",
    posterPath: null,
    releaseYear: "2024",
    overview: null,
    voteAverage: 7,
  };
}

function availabilityWithSg(
  providerId: number | null,
  usProviderId: number
): CountryAvailability[] {
  const countries: CountryAvailability[] = [
    {
      countryCode: "US",
      countryName: "United States",
      flagEmoji: "🇺🇸",
      providers: [
        { providerId: usProviderId, providerName: "Netflix", logoPath: "/n.jpg", providerType: "flatrate" },
      ],
    },
  ];
  if (providerId !== null) {
    countries.push({
      countryCode: "SG",
      countryName: "Singapore",
      flagEmoji: "🇸🇬",
      providers: [
        { providerId, providerName: "Netflix", logoPath: "/n.jpg", providerType: "flatrate" },
      ],
    });
  }
  return countries;
}

describe("mergeDiscoveryResults", () => {
  it("merges multiple result sets deduped by id, preserving first-seen order", () => {
    const merged = mergeDiscoveryResults([
      [title(1), title(2)],
      [title(2), title(3)],
      [title(4)],
    ]);

    expect(merged.map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });

  it("returns an empty array when given no result sets", () => {
    expect(mergeDiscoveryResults([])).toEqual([]);
  });

  it("handles a single result set unchanged", () => {
    const merged = mergeDiscoveryResults([[title(1), title(2)]]);
    expect(merged.map((r) => r.id)).toEqual([1, 2]);
  });
});

describe("fetchDiscoveryFeed", () => {
  it("keeps only unlockable titles and reports pagination state", async () => {
    const page1 = { results: [title(1), title(2), title(3)], totalPages: 2 };
    const page2 = { results: [title(4)], totalPages: 2 };
    const fetchDiscoverPage = vi
      .fn()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const fetchProviders = vi.fn(async (id: number) => {
      // title 2 already streams the selected provider (8) in SG -> locked
      if (id === 2) return availabilityWithSg(8, 8);
      return availabilityWithSg(null, 8);
    });

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 3,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items.map((i) => i.id)).toEqual([1, 3, 4]);
    expect(result.items[0].matchedProviderLabel).toBe("Netflix");
    expect(result.items[0].countryCode).toBe("US");
    expect(result.lastPage).toBe(2);
    expect(result.hasMore).toBe(false);
    expect(fetchDiscoverPage).toHaveBeenCalledTimes(2);
    expect(fetchDiscoverPage).toHaveBeenNthCalledWith(1, "US", 1);
    expect(fetchDiscoverPage).toHaveBeenNthCalledWith(2, "US", 2);
  });

  it("stops paginating once the target count is reached", async () => {
    const page1 = {
      results: [title(1), title(2), title(3), title(4)],
      totalPages: 5,
    };
    const fetchDiscoverPage = vi.fn().mockResolvedValue(page1);
    const fetchProviders = vi.fn(async () => availabilityWithSg(null, 8));

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 3,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items).toHaveLength(4);
    expect(fetchDiscoverPage).toHaveBeenCalledTimes(1);
    expect(result.hasMore).toBe(true);
  });

  it("reuses cached provider lookups instead of refetching", async () => {
    const page1 = { results: [title(1)], totalPages: 1 };
    const fetchDiscoverPage = vi.fn().mockResolvedValue(page1);
    const fetchProviders = vi.fn(async () => availabilityWithSg(null, 8));
    const cache = new Map<string, CountryAvailability[]>();
    cache.set("movie-1", availabilityWithSg(8, 8));

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 3,
      selectedProviderIds: [8],
      cache,
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(fetchProviders).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(0); // title 1 is cached as already-in-SG
  });

  it("stops without error when a page returns no results", async () => {
    const fetchDiscoverPage = vi.fn().mockResolvedValue({ results: [], totalPages: 1 });
    const fetchProviders = vi.fn();

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: TARGET_COUNT,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("deduplicates items across pages when TMDB returns overlapping results", async () => {
    const page1 = { results: [title(1), title(2)], totalPages: 2 };
    const page2 = { results: [title(2), title(3)], totalPages: 2 };
    const fetchDiscoverPage = vi
      .fn()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const fetchProviders = vi.fn(async () => availabilityWithSg(null, 8));

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 5,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items.map((i) => i.id)).toEqual([1, 2, 3]);
    expect(result.items).toHaveLength(3);
  });

  it("merges results across multiple watch regions and attributes each item to the first matching region", async () => {
    const fetchDiscoverPage = vi.fn(async (region: string) => {
      if (region === "US") return { results: [title(1), title(2)], totalPages: 1 };
      if (region === "GB") return { results: [title(2), title(3)], totalPages: 1 };
      return { results: [], totalPages: 1 };
    });

    // title 2 streams the selected provider in GB but not US; title 1 and 3 stream in US-only
    const fetchProviders = vi.fn(async (id: number): Promise<CountryAvailability[]> => {
      if (id === 2) {
        return [
          { countryCode: "GB", countryName: "United Kingdom", flagEmoji: "🇬🇧", providers: [
            { providerId: 8, providerName: "Netflix", logoPath: "/n.jpg", providerType: "flatrate" },
          ] },
        ];
      }
      return availabilityWithSg(null, 8);
    });

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US", "GB"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 5,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items.map((i) => i.id).sort()).toEqual([1, 2, 3]);
    const item2 = result.items.find((i) => i.id === 2)!;
    expect(item2.countryCode).toBe("GB");
    expect(item2.matchedProviderLabel).toBe("Netflix");
    expect(fetchDiscoverPage).toHaveBeenCalledWith("US", 1);
    expect(fetchDiscoverPage).toHaveBeenCalledWith("GB", 1);
  });

  it("proceeds with successful regions when some regions fail", async () => {
    const fetchDiscoverPage = vi.fn(async (region: string) => {
      if (region === "US") return { results: [title(1)], totalPages: 1 };
      throw new Error("network error");
    });
    const fetchProviders = vi.fn(async () => availabilityWithSg(null, 8));

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US", "GB"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 5,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items.map((i) => i.id)).toEqual([1]);
  });

  it("proceeds with results from successful provider lookups when some provider lookups fail", async () => {
    const page1 = { results: [title(1), title(2), title(3)], totalPages: 1 };
    const fetchDiscoverPage = vi.fn().mockResolvedValue(page1);

    const fetchProviders = vi.fn(async (id: number) => {
      if (id === 2) throw new Error("provider lookup failed");
      return availabilityWithSg(null, 8);
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 5,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    // title 2's provider lookup failed, but is still treated as unlockable
    // (no availability data == not confirmed already-in-SG) rather than
    // aborting the whole batch.
    expect(result.items.map((i) => i.id).sort()).toEqual([1, 2, 3]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("throws when every region fails", async () => {
    const fetchDiscoverPage = vi.fn().mockRejectedValue(new Error("network error"));
    const fetchProviders = vi.fn();

    await expect(
      fetchDiscoveryFeed({
        mediaType: "movie",
        watchRegions: ["US", "GB"],
        startPage: 1,
        maxPages: MAX_PAGES,
        targetCount: 5,
        selectedProviderIds: [8],
        cache: new Map(),
        fetchDiscoverPage,
        fetchProviders,
      })
    ).rejects.toThrow();
  });

  it("includes SG-available titles when includeSingapore is true and badges them as SG", async () => {
    const page1 = { results: [title(1), title(2)], totalPages: 1 };
    const fetchDiscoverPage = vi.fn().mockResolvedValue(page1);

    const fetchProviders = vi.fn(async (id: number) => {
      // title 1 is already on the selected provider (8) in SG -> normally locked
      if (id === 1) return availabilityWithSg(8, 8);
      // title 2 is unlockable (US only, not SG)
      return availabilityWithSg(null, 8);
    });

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 5,
      selectedProviderIds: [8],
      includeSingapore: true,
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    // both titles present now (SG-available one is no longer filtered out)
    expect(result.items.map((i) => i.id).sort()).toEqual([1, 2]);

    const sgItem = result.items.find((i) => i.id === 1)!;
    expect(sgItem.countryCode).toBe("SG");
    expect(sgItem.matchedProviderLabel).toBe("Netflix");

    const foreignItem = result.items.find((i) => i.id === 2)!;
    expect(foreignItem.countryCode).toBe("US");
    expect(foreignItem.matchedProviderLabel).toBe("Netflix");
  });

  it("still excludes SG-available titles when includeSingapore is false (default)", async () => {
    const page1 = { results: [title(1), title(2)], totalPages: 1 };
    const fetchDiscoverPage = vi.fn().mockResolvedValue(page1);

    const fetchProviders = vi.fn(async (id: number) => {
      if (id === 1) return availabilityWithSg(8, 8); // locked in SG
      return availabilityWithSg(null, 8); // unlockable
    });

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 5,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items.map((i) => i.id)).toEqual([2]);
  });
});
