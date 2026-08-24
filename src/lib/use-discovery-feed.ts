"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchDiscoveryFeed,
  MAX_PAGES,
  TARGET_COUNT,
  type DiscoveryItem,
} from "./discovery-feed";
import type { CountryAvailability, MediaType } from "./types";

async function fetchDiscoverPage(
  mediaType: MediaType,
  watchRegion: string,
  providerIds: number[],
  page: number
) {
  const res = await fetch(
    `/api/discover?mediaType=${mediaType}&watchRegion=${watchRegion}&providerIds=${providerIds.join(",")}&page=${page}`
  );
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
  watchRegion: string,
  providerIds: number[]
) {
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cacheRef = useRef<Map<string, CountryAvailability[]>>(new Map());
  const nextPageRef = useRef(1);
  const providerIdsKey = providerIds.join(",");

  const run = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const startPage = reset ? 1 : nextPageRef.current;
        const result = await fetchDiscoveryFeed({
          mediaType,
          watchRegion,
          startPage,
          maxPages: MAX_PAGES,
          targetCount: TARGET_COUNT,
          selectedProviderIds: providerIds,
          cache: cacheRef.current,
          fetchDiscoverPage: (page) =>
            fetchDiscoverPage(mediaType, watchRegion, providerIds, page),
          fetchProviders,
        });
        setItems((prev) => (reset ? result.items : [...prev, ...result.items]));
        nextPageRef.current = result.lastPage + 1;
        setHasMore(result.hasMore);
      } catch {
        setError("Failed to load the discovery feed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    // providerIdsKey stands in for providerIds (array identity is unstable across renders)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaType, watchRegion, providerIdsKey]
  );

  useEffect(() => {
    cacheRef.current = new Map();
    nextPageRef.current = 1;
    run(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, watchRegion, providerIdsKey]);

  const loadMore = useCallback(() => run(false), [run]);

  return { items, loading, error, hasMore, loadMore };
}
