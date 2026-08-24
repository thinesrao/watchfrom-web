"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "watchfrom_search_history";
const MAX_ENTRIES = 50;

interface HistoryEntry {
  query: string;
  searchedAt: string;
}

function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function useSearchHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(readHistory());
  }, []);

  const addEntry = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length === 0) return;
      const filtered = entries.filter(
        (e) => e.query.toLowerCase() !== trimmed.toLowerCase()
      );
      const updated = [
        { query: trimmed, searchedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_ENTRIES);
      writeHistory(updated);
      setEntries(updated);
    },
    [entries]
  );

  const removeEntry = useCallback(
    (query: string) => {
      const updated = entries.filter((e) => e.query !== query);
      writeHistory(updated);
      setEntries(updated);
    },
    [entries]
  );

  const clearAll = useCallback(() => {
    writeHistory([]);
    setEntries([]);
  }, []);

  return { entries, addEntry, removeEntry, clearAll };
}
