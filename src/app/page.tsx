"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { SearchResult } from "@/lib/types";
import { useSearchHistory } from "@/lib/use-search-history";
import SearchResultCard from "@/components/search-result-card";
import PinLoader from "@/components/pin-loader";

const SEARCH_CACHE_KEY = "watchfrom:search-cache";

function loadSearchCache(): {
  query: string;
  results: SearchResult[];
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SEARCH_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSearchCache(query: string, results: SearchResult[]) {
  try {
    sessionStorage.setItem(
      SEARCH_CACHE_KEY,
      JSON.stringify({ query, results })
    );
  } catch {
    /* quota exceeded — ignore */
  }
}

function clearSearchCache() {
  try {
    sessionStorage.removeItem(SEARCH_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export default function SearchPage() {
  const cached = useRef(loadSearchCache());
  const [query, setQuery] = useState(cached.current?.query ?? "");
  const [results, setResults] = useState<SearchResult[]>(
    cached.current?.results ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(!!cached.current?.results.length);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { entries, addEntry, removeEntry, clearAll } = useSearchHistory();

  const doSearch = useCallback(
    (q: string, saveHistory = false) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (q.trim().length === 0) {
        setResults([]);
        setSearched(false);
        setError(null);
        clearSearchCache();
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(q.trim())}`
          );
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();
          setResults(data.results);
          setSearched(true);
          saveSearchCache(q.trim(), data.results);
          if (saveHistory) addEntry(q.trim());
        } catch {
          setError("Something went wrong. Please try again.");
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 500);
    },
    [addEntry]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    doSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim().length > 0) {
      addEntry(query.trim());
    }
  };

  const handleHistoryTap = (q: string) => {
    setQuery(q);
    setFocused(false);
    doSearch(q, true);
  };

  const showHistory =
    entries.length > 0 && (query.trim().length === 0 || focused) && !searched;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Find where to watch</h1>
        <p className="text-text-dim text-sm">
          Search for any movie or TV show to see streaming availability in
          Singapore and worldwide.
        </p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search movies & TV shows..."
          className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-accent transition-colors"
          autoFocus
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <PinLoader size={18} halo={false} />
          </div>
        )}
      </div>

      {showHistory && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <p className="text-xs text-text-dim uppercase tracking-wide">
              Recent Searches
            </p>
            <button
              onClick={clearAll}
              className="text-xs text-text-dim hover:text-accent transition-colors"
            >
              Clear all
            </button>
          </div>
          {entries.slice(0, 10).map((entry) => (
            <div
              key={entry.query}
              className="flex items-center justify-between px-3 py-2 hover:bg-surface-dim transition-colors"
            >
              <button
                onClick={() => handleHistoryTap(entry.query)}
                className="text-sm text-left flex-1 truncate"
              >
                {entry.query}
              </button>
              <button
                onClick={() => removeEntry(entry.query)}
                className="text-text-dim hover:text-accent text-xs ml-2 shrink-0 transition-colors"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-text-dim">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map((result) => (
            <SearchResultCard
              key={`${result.mediaType}-${result.id}`}
              result={result}
            />
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <p className="text-text-dim">
            No results found. Try a different search.
          </p>
        </div>
      )}
    </div>
  );
}
