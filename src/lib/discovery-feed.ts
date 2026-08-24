import type { CountryAvailability, MediaType, SearchResult } from "./types";
import { isUnlockable } from "./discovery-eligibility";
import { serviceLabelForProviderId } from "./providers";

export const TARGET_COUNT = 12;
export const MAX_PAGES = 5;

export interface DiscoveryItem extends SearchResult {
  countryCode: string;
  matchedProviderLabel: string;
}

export interface FetchDiscoveryFeedParams {
  mediaType: MediaType;
  watchRegion: string;
  startPage: number;
  maxPages: number;
  targetCount: number;
  selectedProviderIds: number[];
  /** Mutated in place: populated with cache misses as they are fetched. The
   * caller (hook) owns a session-lifetime cache and passes it in by reference
   * intentionally, so this map's contents change as a side effect of the call. */
  cache: Map<string, CountryAvailability[]>;
  fetchDiscoverPage: (
    page: number
  ) => Promise<{ results: SearchResult[]; totalPages: number }>;
  fetchProviders: (
    id: number,
    mediaType: MediaType
  ) => Promise<CountryAvailability[]>;
}

export interface FetchDiscoveryFeedResult {
  items: DiscoveryItem[];
  lastPage: number;
  hasMore: boolean;
}

export async function fetchDiscoveryFeed(
  params: FetchDiscoveryFeedParams
): Promise<FetchDiscoveryFeedResult> {
  const {
    mediaType,
    watchRegion,
    startPage,
    maxPages,
    targetCount,
    selectedProviderIds,
    cache,
    fetchDiscoverPage,
    fetchProviders,
  } = params;

  const items: DiscoveryItem[] = [];
  const seenItems = new Set<string>();
  let page = startPage;
  let lastFetchedPage = startPage - 1;
  let totalPages = Infinity;
  let emptyPageReached = false;

  while (items.length < targetCount && page <= Math.min(totalPages, maxPages)) {
    const { results, totalPages: pageTotalPages } = await fetchDiscoverPage(page);
    totalPages = pageTotalPages;
    lastFetchedPage = page;

    if (results.length === 0) {
      emptyPageReached = true;
      break;
    }

    const misses = results.filter((r) => !cache.has(`${mediaType}-${r.id}`));
    // Fires up to one /api/providers request per cache miss (up to ~20 per discover
    // page) concurrently with no throttling and no server-side caching. Acceptable
    // for a single-user pilot; revisit with chunked concurrency or a short-TTL
    // server cache before this sees concurrent users.
    const fetched = await Promise.all(
      misses.map((r) => fetchProviders(r.id, mediaType))
    );
    misses.forEach((r, i) => cache.set(`${mediaType}-${r.id}`, fetched[i]));

    for (const result of results) {
      const itemKey = `${mediaType}-${result.id}`;
      if (seenItems.has(itemKey)) continue;

      const availability = cache.get(itemKey) ?? [];
      if (!isUnlockable(availability, selectedProviderIds)) continue;

      const sourceCountry = availability.find((c) => c.countryCode === watchRegion);
      const matchedProviderId = sourceCountry?.providers
        .filter((p) => p.providerType === "flatrate")
        .find((p) => selectedProviderIds.includes(p.providerId))?.providerId;

      seenItems.add(itemKey);
      items.push({
        ...result,
        countryCode: watchRegion,
        matchedProviderLabel:
          matchedProviderId != null
            ? serviceLabelForProviderId(matchedProviderId)
            : "",
      });
    }

    page += 1;
  }

  const hasMore =
    !emptyPageReached && lastFetchedPage < Math.min(totalPages, maxPages);

  return { items, lastPage: lastFetchedPage, hasMore };
}
