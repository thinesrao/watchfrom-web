"use client";

import { useState, useEffect, useCallback } from "react";
import type { WatchlistItem, WatchProvider } from "./types";

const STORAGE_KEY = "watchfrom_watchlist";

function readWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeWatchlist(items: WatchlistItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    setItems(readWatchlist());
  }, []);

  const isInWatchlist = useCallback(
    (tmdbId: number) => items.some((item) => item.tmdbId === tmdbId),
    [items]
  );

  const addToWatchlist = useCallback(
    (item: Omit<WatchlistItem, "savedAt">) => {
      const updated = [
        ...items.filter((i) => i.tmdbId !== item.tmdbId),
        { ...item, savedAt: new Date().toISOString() },
      ];
      writeWatchlist(updated);
      setItems(updated);
    },
    [items]
  );

  const removeFromWatchlist = useCallback(
    (tmdbId: number) => {
      const updated = items.filter((i) => i.tmdbId !== tmdbId);
      writeWatchlist(updated);
      setItems(updated);
    },
    [items]
  );

  const updateSnapshot = useCallback(
    (tmdbId: number, snapshot: Record<string, WatchProvider[]>) => {
      const updated = items.map((item) =>
        item.tmdbId === tmdbId
          ? { ...item, availabilitySnapshot: snapshot }
          : item
      );
      writeWatchlist(updated);
      setItems(updated);
    },
    [items]
  );

  return { items, isInWatchlist, addToWatchlist, removeFromWatchlist, updateSnapshot };
}
