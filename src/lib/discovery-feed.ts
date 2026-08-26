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
  /** Countries to search, in priority order. A single-element array is the
   * existing single-country mode; multiple entries fan out one discover
   * call per country per page and merge the results. The first region in
   * this list whose availability has a matching flatrate provider is used
   * to attribute each item's badge (countryCode/matchedProviderLabel),
   * independent of which region's discover page it was found on. */
  watchRegions: string[];
  startPage: number;
  maxPages: number;
  targetCount: number;
  selectedProviderIds: number[];
  /** When true, titles already streaming on the selected services in
   * Singapore are NOT filtered out (the default "unlockable-only" behavior).
   * SG-available titles are then badged with their SG provider so they read
   * as "watchable here now" alongside the unlockable foreign ones. */
  includeSingapore?: boolean;
  /** Mutated in place: populated with cache misses as they are fetched. The
   * caller (hook) owns a session-lifetime cache and passes it in by reference
   * intentionally, so this map's contents change as a side effect of the call. */
  cache: Map<string, CountryAvailability[]>;
  fetchDiscoverPage: (
    watchRegion: string,
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

export function mergeDiscoveryResults(resultSets: SearchResult[][]): SearchResult[] {
  const seen = new Set<number>();
  const merged: SearchResult[] = [];
  for (const results of resultSets) {
    for (const result of results) {
      if (seen.has(result.id)) continue;
      seen.add(result.id);
      merged.push(result);
    }
  }
  return merged;
}

export async function fetchDiscoveryFeed(
  params: FetchDiscoveryFeedParams
): Promise<FetchDiscoveryFeedResult> {
  const {
    mediaType,
    watchRegions,
    startPage,
    maxPages,
    targetCount,
    selectedProviderIds,
    includeSingapore = false,
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
    const pageResultsPerRegion = await Promise.allSettled(
      watchRegions.map((region) => fetchDiscoverPage(region, page))
    );

    pageResultsPerRegion.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(
          `Discovery feed: failed to fetch region ${watchRegions[i]} page ${page}:`,
          r.reason
        );
      }
    });

    const fulfilled = pageResultsPerRegion.filter(
      (r): r is PromiseFulfilledResult<{ results: SearchResult[]; totalPages: number }> =>
        r.status === "fulfilled"
    );

    if (fulfilled.length === 0) {
      throw new Error("Failed to load discovery feed for any region");
    }

    totalPages = Math.min(...fulfilled.map((r) => r.value.totalPages));
    lastFetchedPage = page;

    const merged = mergeDiscoveryResults(fulfilled.map((r) => r.value.results));

    if (merged.length === 0) {
      emptyPageReached = true;
      break;
    }

    const misses = merged.filter((r) => !cache.has(`${mediaType}-${r.id}`));
    // Fires up to one /api/providers request per cache miss (up to ~20 per discover
    // page, multiplied by however many regions are being searched in "All countries"
    // mode) concurrently with no throttling and no server-side caching. Acceptable
    // for a single-user pilot; revisit with chunked concurrency or a short-TTL
    // server cache before this sees concurrent users.
    const fetchedSettled = await Promise.allSettled(
      misses.map((r) => fetchProviders(r.id, mediaType))
    );
    fetchedSettled.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(
          `Discovery feed: failed to fetch providers for ${mediaType}-${misses[i].id}:`,
          r.reason
        );
        // Treat as no availability data for this pass (consistent with the
        // `cache.get(itemKey) ?? []` fallback below for missing entries), but
        // do NOT cache the failure so a later page/retry can fetch it again.
        return;
      }
      cache.set(`${mediaType}-${misses[i].id}`, r.value);
    });

    for (const result of merged) {
      const itemKey = `${mediaType}-${result.id}`;
      if (seenItems.has(itemKey)) continue;

      const availability = cache.get(itemKey) ?? [];
      if (!includeSingapore && !isUnlockable(availability, selectedProviderIds)) continue;

      // Badge attribution: when including SG, an SG-available title is
      // watchable here now — attribute it to SG (checked first) so it badges
      // as SG. Otherwise (or when the title is not in SG) attribute it to the
      // first browsed region with a matching flatrate provider.
      const attributionRegions = includeSingapore
        ? ["SG", ...watchRegions]
        : watchRegions;
      const sourceCountry = attributionRegions
        .map((region) => availability.find((c) => c.countryCode === region))
        .find((c) =>
          c?.providers.some(
            (p) => p.providerType === "flatrate" && selectedProviderIds.includes(p.providerId)
          )
        );
      const matchedProviderId = sourceCountry?.providers
        .filter((p) => p.providerType === "flatrate")
        .find((p) => selectedProviderIds.includes(p.providerId))?.providerId;

      seenItems.add(itemKey);
      items.push({
        ...result,
        countryCode: sourceCountry?.countryCode ?? watchRegions[0],
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
