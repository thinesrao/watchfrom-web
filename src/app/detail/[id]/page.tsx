"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import type { CountryAvailability as CountryAvailabilityType, WatchProvider } from "@/lib/types";
import { useWatchlist } from "@/lib/use-watchlist";
import SgAvailability from "@/components/sg-availability";
import WorldwideAvailability from "@/components/worldwide-availability";
import PinLoader from "@/components/pin-loader";

function hasAvailabilityChanged(
  snapshot: Record<string, WatchProvider[]>,
  live: CountryAvailabilityType[]
): boolean {
  const liveSnapshot: Record<string, number[]> = {};
  for (const country of live) {
    const flatrate = country.providers
      .filter((p) => p.providerType === "flatrate")
      .map((p) => p.providerId)
      .sort();
    if (flatrate.length > 0) {
      liveSnapshot[country.countryCode] = flatrate;
    }
  }

  const savedKeys = Object.keys(snapshot).sort();
  const liveKeys = Object.keys(liveSnapshot).sort();

  if (savedKeys.length !== liveKeys.length) return true;
  if (savedKeys.join(",") !== liveKeys.join(",")) return true;

  for (const key of savedKeys) {
    const savedIds = snapshot[key].map((p) => p.providerId).sort();
    const liveIds = liveSnapshot[key];
    if (savedIds.length !== liveIds.length) return true;
    if (savedIds.join(",") !== liveIds.join(",")) return true;
  }

  return false;
}

export default function DetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Return to wherever the user came from (search, discovery, or watchlist),
  // preserving that page's scroll position and filter state — falling back to
  // the search page only when there's no in-app history (e.g. a shared deep
  // link opened directly).
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };
  const id = params.id as string;
  const type = searchParams.get("type") ?? "movie";
  const title = searchParams.get("title") ?? "Details";
  const poster = searchParams.get("poster");
  const year = searchParams.get("year");
  const overview = searchParams.get("overview");
  const voteAverage = searchParams.get("vote") ? parseFloat(searchParams.get("vote")!) : null;

  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}`;

  const [availability, setAvailability] = useState<CountryAvailabilityType[]>([]);
  const [directors, setDirectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { items, isInWatchlist, addToWatchlist, removeFromWatchlist, updateSnapshot } =
    useWatchlist();

  const tmdbId = parseInt(id, 10);
  const inWatchlist = isInWatchlist(tmdbId);

  const watchlistItem = useMemo(
    () => items.find((i) => i.tmdbId === tmdbId),
    [items, tmdbId]
  );

  const changed = useMemo(() => {
    if (!watchlistItem || availability.length === 0) return false;
    return hasAvailabilityChanged(watchlistItem.availabilitySnapshot, availability);
  }, [watchlistItem, availability]);

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

  // Director/creator credits load independently of availability — a credits
  // failure should not block the streaming data or surface a page error.
  useEffect(() => {
    let active = true;
    async function loadCredits() {
      if (active) setDirectors([]);
      try {
        const res = await fetch(`/api/credits?id=${id}&type=${type}`);
        if (!res.ok) return;
        const data = await res.json();
        if (active) setDirectors(data.directors ?? []);
      } catch {
        // Non-critical: leave directors empty on failure.
      }
    }
    loadCredits();
    return () => {
      active = false;
    };
  }, [id, type]);

  const directorLabel =
    directors.length > 0
      ? `${type === "tv" ? "Created by" : directors.length > 1 ? "Directors" : "Directed by"} ${directors.join(", ")}`
      : null;

  const buildSnapshot = (): Record<string, WatchProvider[]> => {
    const snapshot: Record<string, WatchProvider[]> = {};
    for (const country of availability) {
      const flatrate = country.providers.filter((p) => p.providerType === "flatrate");
      if (flatrate.length > 0) {
        snapshot[country.countryCode] = flatrate;
      }
    }
    return snapshot;
  };

  const handleToggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist(tmdbId);
    } else {
      addToWatchlist({
        tmdbId,
        title,
        mediaType: type as "movie" | "tv",
        posterPath: poster,
        releaseYear: year,
        availabilitySnapshot: buildSnapshot(),
      });
    }
  };

  const handleUpdateSnapshot = () => {
    updateSnapshot(tmdbId, buildSnapshot());
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="group -ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-text-dim hover:text-accent hover:bg-surface transition-colors"
        aria-label="Go back"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="transition-transform group-hover:-translate-x-0.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

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
        <div className="space-y-2 min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-text-dim uppercase tracking-wide">
              {type === "movie" ? "Movie" : "TV Show"}
            </span>
            {year && <span className="text-sm text-text-dim">{year}</span>}
            {voteAverage != null && voteAverage > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-gold">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l2.9 6.26 6.1.53-4.6 4.02 1.38 6.19L12 15.9 6.22 19l1.38-6.19-4.6-4.02 6.1-.53L12 2z" />
                </svg>
                {voteAverage.toFixed(1)}
              </span>
            )}
            <a
              href={trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Watch ${title} trailer on YouTube`}
              className="-my-1 ml-auto inline-flex items-center justify-center rounded-lg p-1.5 text-text-dim hover:text-accent hover:bg-surface transition-colors"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" strokeLinejoin="round" />
                <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
          {directorLabel && (
            <p className="text-sm text-text-dim">{directorLabel}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleToggleWatchlist}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inWatchlist
                  ? "bg-surface border border-border text-text-dim hover:border-accent/40"
                  : "bg-accent text-white hover:bg-accent-hover"
              }`}
            >
              {inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
            </button>
          </div>
        </div>
      </div>

      {overview && (
        <p className="text-sm text-text-dim leading-relaxed">{overview}</p>
      )}

      {changed && (
        <div className="bg-gold/10 border border-gold/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gold">Availability has changed since you saved this.</p>
          <button
            onClick={handleUpdateSnapshot}
            className="text-xs text-gold hover:text-gold/80 underline transition-colors"
          >
            Update snapshot
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <PinLoader size={32} />
        </div>
      )}

      {error && (
        <div className="glass rounded-xl p-4 text-center space-y-2">
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
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-text-dim">
            No streaming data available for this title.
          </p>
        </div>
      )}

      {!loading && !error && availability.length > 0 && (
        <>
          <SgAvailability availability={availability} />
          <WorldwideAvailability availability={availability} />
        </>
      )}
    </div>
  );
}
