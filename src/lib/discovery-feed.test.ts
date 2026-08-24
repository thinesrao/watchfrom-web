import { describe, it, expect, vi } from "vitest";
import { fetchDiscoveryFeed, TARGET_COUNT, MAX_PAGES } from "./discovery-feed";
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
      watchRegion: "US",
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
      watchRegion: "US",
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
      watchRegion: "US",
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
      watchRegion: "US",
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
});
