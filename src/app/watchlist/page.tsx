"use client";

import Link from "next/link";
import Image from "next/image";
import { useWatchlist } from "@/lib/use-watchlist";
import type { WatchlistItem } from "@/lib/types";

function topProviderSummary(item: WatchlistItem): string | null {
  const snapshot = item.availabilitySnapshot;
  const countryCodes = Object.keys(snapshot);
  if (countryCodes.length === 0) return null;

  const providerCounts = new Map<string, string[]>();
  for (const code of countryCodes) {
    for (const provider of snapshot[code]) {
      const existing = providerCounts.get(provider.providerName) ?? [];
      providerCounts.set(provider.providerName, [...existing, code]);
    }
  }

  let topName = "";
  let topCodes: string[] = [];
  for (const [name, codes] of providerCounts) {
    if (codes.length > topCodes.length) {
      topName = name;
      topCodes = codes;
    }
  }

  if (topName.length === 0) return null;

  const preview = topCodes.slice(0, 3).join(", ");
  const remaining = topCodes.length - 3;
  return remaining > 0
    ? `${topName}: ${preview} +${remaining}`
    : `${topName}: ${preview}`;
}

export default function WatchlistPage() {
  const { items, removeFromWatchlist } = useWatchlist();

  const sorted = [...items].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <p className="text-text-dim text-sm">
          {items.length === 0
            ? "Your watchlist is empty. Search for something to watch."
            : `${items.length} ${items.length === 1 ? "title" : "titles"} saved`}
        </p>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-dim mb-4">Nothing here yet.</p>
          <Link
            href="/"
            className="text-accent hover:text-accent-hover transition-colors text-sm"
          >
            Start searching
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((item) => {
          const posterUrl = item.posterPath
            ? `https://image.tmdb.org/t/p/w185${item.posterPath}`
            : null;

          const summary = topProviderSummary(item);
          const detailUrl = `/detail/${item.tmdbId}?type=${item.mediaType}&title=${encodeURIComponent(item.title)}&poster=${encodeURIComponent(item.posterPath ?? "")}&year=${item.releaseYear ?? ""}`;

          return (
            <div
              key={item.tmdbId}
              className="flex gap-3 bg-surface border border-border rounded-lg p-3"
            >
              <Link
                href={detailUrl}
                className="w-16 h-24 shrink-0 rounded overflow-hidden bg-surface-dim block"
              >
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={item.title}
                    width={64}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-dim text-xs">
                    No image
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <Link
                    href={detailUrl}
                    className="font-semibold text-sm hover:text-accent transition-colors"
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-dim uppercase tracking-wide">
                      {item.mediaType === "movie" ? "Movie" : "TV"}
                    </span>
                    {item.releaseYear && (
                      <span className="text-xs text-text-dim">
                        {item.releaseYear}
                      </span>
                    )}
                  </div>
                  {summary && (
                    <p className="text-xs text-text-dim mt-1">{summary}</p>
                  )}
                </div>
                <button
                  onClick={() => removeFromWatchlist(item.tmdbId)}
                  className="self-start text-xs text-text-dim hover:text-accent transition-colors mt-1"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
