"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchDiscoveryFeed,
  MAX_PAGES,
  TARGET_COUNT,
  type DiscoveryItem,
} from "./discovery-feed";
import type { CountryAvailability, MediaType } from "./types";
import type { DiscoverSortBy } from "./sort-options";

export interface DiscoveryFilterParams {
  genreIds?: number[];
  sortBy?: DiscoverSortBy;
  voteCountGte?: number;
  dateGte?: string;
  dateLte?: string;
  crewId?: number;
}

async function fetchDiscoverPage(
  mediaType: MediaType,
  watchRegion: string,
  providerIds: number[],
  page: number,
  filters: DiscoveryFilterParams
) {
  const query = new URLSearchParams({
    mediaType,
    watchRegion,
    providerIds: providerIds.join(","),
    page: String(page),
  });
  if (filters.genreIds && filters.genreIds.length > 0) {
    query.set("genreIds", filters.genreIds.join(","));
  }
  if (filters.sortBy) query.set("sortBy", filters.sortBy);
  if (filters.voteCountGte != null) query.set("voteCountGte", String(filters.voteCountGte));
  if (filters.dateGte) query.set("dateGte", filters.dateGte);
  if (filters.dateLte) query.set("dateLte", filters.dateLte);
  if (filters.crewId != null) query.set("crewId", String(filters.crewId));

  const res = await fetch(`/api/discover?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to load discovery feed");
  return res.json();
}

async function fetchProviders(
  id: number,
  mediaType: MediaType
): Promise<CountryAvailability[]> {
  const res = await fetch(`/api/providers?id=${id}&type=${mediaType}`);
  if (!res.ok) throw new Error("Failed to load providers");
  const data = await res.json();
  return data.availability;
}

export function useDiscoveryFeed(
  mediaType: MediaType,
  watchRegions: string[],
  providerIds: number[],
  filters: DiscoveryFilterParams = {}
) {
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cacheRef = useRef<Map<string, CountryAvailability[]>>(new Map());
  const nextPageRef = useRef(1);
  const generationRef = useRef<number>(0);
  const watchRegionsKey = watchRegions.join(",");
  const providerIdsKey = providerIds.join(",");
  const genreIdsKey = (filters.genreIds ?? []).join(",");
  const filtersKey = [
    filters.sortBy ?? "",
    filters.voteCountGte ?? "",
    filters.dateGte ?? "",
    filters.dateLte ?? "",
    filters.crewId ?? "",
  ].join("|");

  const run = useCallback(
    async (reset: boolean) => {
      const requestId = ++generationRef.current;
      setLoading(true);
      setError(null);
      if (reset) {
        // Clear stale results from a prior filter selection immediately so a
        // failed fetch after a filter change doesn't leave old-filter items
        // rendered underneath the error box.
        setItems([]);
        setHasMore(true);
      }
      try {
        const startPage = reset ? 1 : nextPageRef.current;
        const result = await fetchDiscoveryFeed({
          mediaType,
          watchRegions,
          startPage,
          maxPages: MAX_PAGES,
          targetCount: TARGET_COUNT,
          selectedProviderIds: providerIds,
          cache: cacheRef.current,
          fetchDiscoverPage: (watchRegion, page) =>
            fetchDiscoverPage(mediaType, watchRegion, providerIds, page, filters),
          fetchProviders,
        });
        if (requestId === generationRef.current) {
          setItems((prev) => {
            if (reset) return result.items;
            const seen = new Set(prev.map((i) => `${i.mediaType}-${i.id}`));
            return [
              ...prev,
              ...result.items.filter((i) => !seen.has(`${i.mediaType}-${i.id}`)),
            ];
          });
          nextPageRef.current = result.lastPage + 1;
          setHasMore(result.hasMore);
        }
      } catch {
        if (requestId === generationRef.current) {
          setError("Failed to load the discovery feed. Please try again.");
        }
      } finally {
        if (requestId === generationRef.current) {
          setLoading(false);
        }
      }
    },
    // watchRegionsKey/providerIdsKey/genreIdsKey/filtersKey stand in for their
    // corresponding array/object args (identity is unstable across renders)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaType, watchRegionsKey, providerIdsKey, genreIdsKey, filtersKey]
  );

  useEffect(() => {
    cacheRef.current = new Map();
    nextPageRef.current = 1;
    run(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, watchRegionsKey, providerIdsKey, genreIdsKey, filtersKey]);

  const loadMore = useCallback(() => run(false), [run]);
  const retry = useCallback(() => run(true), [run]);

  return { items, loading, error, hasMore, loadMore, retry };
}
