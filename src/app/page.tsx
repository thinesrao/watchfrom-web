"use client";

import { useState, useCallback, useRef } from "react";
import type { SearchResult } from "@/lib/types";
import SearchResultCard from "@/components/search-result-card";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length === 0) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data.results);
        setSearched(true);
      } catch {
        setError("Something went wrong. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    search(value);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Find where to watch</h1>
        <p className="text-text-dim text-sm">
          Search for any movie or TV show to see streaming availability worldwide.
        </p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search movies & TV shows..."
          className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-accent transition-colors"
          autoFocus
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-surface-dim border border-border rounded-lg p-4 text-center">
          <p className="text-text-dim">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map((result) => (
            <SearchResultCard key={`${result.mediaType}-${result.id}`} result={result} />
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <p className="text-text-dim">No results found. Try a different search.</p>
        </div>
      )}
    </div>
  );
}
