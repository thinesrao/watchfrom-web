"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { CountryAvailability as CountryAvailabilityType, WatchProvider } from "@/lib/types";
import { useWatchlist } from "@/lib/use-watchlist";
import CountryAvailability from "@/components/country-availability";

export default function DetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get("type") ?? "movie";
  const title = searchParams.get("title") ?? "Details";
  const poster = searchParams.get("poster");
  const year = searchParams.get("year");

  const [availability, setAvailability] = useState<CountryAvailabilityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const tmdbId = parseInt(id, 10);
  const inWatchlist = isInWatchlist(tmdbId);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/providers?id=${id}&type=${type}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setAvailability(data.availability);
      } catch {
        setError("Failed to load streaming availability. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, type]);

  const handleToggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist(tmdbId);
    } else {
      const snapshot: Record<string, WatchProvider[]> = {};
      for (const country of availability) {
        const flatrate = country.providers.filter((p) => p.providerType === "flatrate");
        if (flatrate.length > 0) {
          snapshot[country.countryCode] = flatrate;
        }
      }
      addToWatchlist({
        tmdbId,
        title,
        mediaType: type as "movie" | "tv",
        posterPath: poster,
        releaseYear: year,
        availabilitySnapshot: snapshot,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/" className="text-accent text-sm hover:text-accent-hover transition-colors">
        &larr; Back to search
      </Link>

      <div className="flex gap-4 items-start">
        {poster && (
          <div className="w-28 shrink-0 rounded-lg overflow-hidden">
            <Image
              src={`https://image.tmdb.org/t/p/w300${poster}`}
              alt={title}
              width={112}
              height={168}
              className="w-full h-auto"
            />
          </div>
        )}
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{title}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-dim uppercase tracking-wide">
              {type === "movie" ? "Movie" : "TV Show"}
            </span>
            {year && <span className="text-xs text-text-dim">{year}</span>}
          </div>
          <button
            onClick={handleToggleWatchlist}
            className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              inWatchlist
                ? "bg-surface border border-border text-text-dim hover:border-accent/40"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-surface-dim border border-border rounded-lg p-4 text-center space-y-2">
          <p className="text-text-dim">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-accent text-sm hover:text-accent-hover"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && availability.length === 0 && (
        <div className="bg-surface-dim border border-border rounded-lg p-6 text-center">
          <p className="text-text-dim">
            No streaming data available for this title.
          </p>
        </div>
      )}

      {!loading && !error && availability.length > 0 && (
        <CountryAvailability availability={availability} />
      )}
    </div>
  );
}
