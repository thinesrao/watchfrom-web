// src/app/discovery/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useDiscoveryFeed } from "@/lib/use-discovery-feed";
import { SERVICES } from "@/lib/providers";
import { DISCOVERY_COUNTRIES } from "@/lib/countries";
import { genreLabel } from "@/lib/genres";
import { MOODS } from "@/lib/moods";
import { DECADES, dateRangeForDecade } from "@/lib/decades";
import { directorName } from "@/lib/directors";
import { resolveSortBy, TOP_RATED_VOTE_COUNT_GTE, type SortKey } from "@/lib/sort-options";
import DiscoveryCard from "@/components/discovery-card";
import DiscoveryFilters from "@/components/discovery-filters";
import MoreFiltersSheet from "@/components/more-filters-sheet";
import ActiveFilterChips, { type FilterChip } from "@/components/active-filter-chips";
import PinLoader from "@/components/pin-loader";
import type { MediaType } from "@/lib/types";

export default function DiscoveryPage() {
  const [country, setCountry] = useState("US");
  const [serviceKey, setServiceKey] = useState<string>("all");
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [genreMode, setGenreMode] = useState<"genre" | "mood">("genre");
  const [genreId, setGenreId] = useState<number | null>(null);
  const [moodKey, setMoodKey] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("trending");
  const [decadeLabel, setDecadeLabel] = useState<string | null>(null);
  const [directorId, setDirectorId] = useState<number | null>(null);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  // Reset the genre filter when switching movie<->TV: genre ids are not
  // shared between the two TMDB genre taxonomies (e.g. movie-only Horror=27
  // doesn't exist in TV_GENRES), so a stale id would silently produce no
  // results and an invisible/empty active-filter chip. Adjusted during
  // render (not an effect) per the React "adjusting state when a prop
  // changes" pattern, since it must happen before the discovery feed fetch
  // fires with the new mediaType.
  const [prevMediaType, setPrevMediaType] = useState(mediaType);
  if (mediaType !== prevMediaType) {
    setPrevMediaType(mediaType);
    setGenreId(null);
  }

  const providerIds =
    serviceKey === "all"
      ? SERVICES.flatMap((s) => s.providerIds)
      : (SERVICES.find((s) => s.key === serviceKey)?.providerIds as
          | readonly number[]
          | undefined) ?? [];

  const watchRegions = country === "ALL" ? [...DISCOVERY_COUNTRIES] : [country];

  const effectiveGenreIds = useMemo(() => {
    if (genreMode === "genre") return genreId != null ? [genreId] : undefined;
    if (!moodKey) return undefined;
    const mood = MOODS.find((m) => m.key === moodKey);
    if (!mood) return undefined;
    return mediaType === "movie" ? mood.movieGenreIds : mood.tvGenreIds;
  }, [genreMode, genreId, moodKey, mediaType]);

  const sortBy = resolveSortBy(sortKey, mediaType);
  const voteCountGte = sortKey === "top-rated" ? TOP_RATED_VOTE_COUNT_GTE : undefined;

  const decade = DECADES.find((d) => d.label === decadeLabel);
  const dateRange = decade ? dateRangeForDecade(decade) : undefined;

  const effectiveDirectorId = mediaType === "movie" ? directorId ?? undefined : undefined;

  const { items, loading, error, hasMore, loadMore, retry } = useDiscoveryFeed(
    mediaType,
    watchRegions,
    [...providerIds],
    {
      genreIds: effectiveGenreIds,
      sortBy,
      voteCountGte,
      dateGte: dateRange?.gte,
      dateLte: dateRange?.lte,
      crewId: effectiveDirectorId,
    }
  );

  const activeMoreFiltersCount =
    (serviceKey !== "all" ? 1 : 0) +
    (decadeLabel ? 1 : 0) +
    (effectiveDirectorId ? 1 : 0);

  const chips: FilterChip[] = [
    serviceKey !== "all" && {
      key: "service",
      label: SERVICES.find((s) => s.key === serviceKey)?.label ?? "",
      onRemove: () => setServiceKey("all"),
    },
    decadeLabel && {
      key: "decade",
      label: decadeLabel,
      onRemove: () => setDecadeLabel(null),
    },
    effectiveDirectorId && {
      key: "director",
      label: directorName(effectiveDirectorId),
      onRemove: () => setDirectorId(null),
    },
    genreMode === "genre" && genreId != null && {
      key: "genre",
      label: genreLabel(mediaType, genreId),
      onRemove: () => setGenreId(null),
    },
    genreMode === "mood" && moodKey && {
      key: "mood",
      label: MOODS.find((m) => m.key === moodKey)?.label ?? "",
      onRemove: () => setMoodKey(null),
    },
  ].filter((c): c is FilterChip => Boolean(c));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Discovery</h1>
        <p className="text-text-dim text-sm">
          Titles popular abroad on your services that aren&apos;t streaming
          here in Singapore yet.
        </p>
      </div>

      <div className="flex gap-1.5">
        {(["movie", "tv"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setMediaType(type)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              mediaType === type
                ? "bg-accent text-white"
                : "bg-surface border border-border text-text-dim hover:border-accent/40"
            }`}
          >
            {type === "movie" ? "Movies" : "TV Shows"}
          </button>
        ))}
      </div>

      <DiscoveryFilters
        mediaType={mediaType}
        country={country}
        onCountryChange={setCountry}
        genreMode={genreMode}
        onGenreModeChange={setGenreMode}
        genreId={genreId}
        onGenreChange={setGenreId}
        moodKey={moodKey}
        onMoodChange={setMoodKey}
        sortKey={sortKey}
        onSortChange={setSortKey}
        activeMoreFiltersCount={activeMoreFiltersCount}
        onOpenMoreFilters={() => setMoreFiltersOpen(true)}
      />

      <ActiveFilterChips chips={chips} />

      <MoreFiltersSheet
        open={moreFiltersOpen}
        onClose={() => setMoreFiltersOpen(false)}
        mediaType={mediaType}
        serviceKey={serviceKey}
        onServiceChange={setServiceKey}
        decadeLabel={decadeLabel}
        onDecadeChange={setDecadeLabel}
        directorId={directorId}
        onDirectorChange={setDirectorId}
      />

      {error && (
        <div className="glass rounded-xl p-4 text-center space-y-2">
          <p className="text-text-dim">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="text-accent text-sm hover:text-accent-hover"
          >
            Retry
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <DiscoveryCard key={`${item.mediaType}-${item.id}`} item={item} />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-dim">
            No unlockable titles found for these filters.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <PinLoader size={32} />
        </div>
      )}

      {!loading && hasMore && !error && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-text-dim hover:border-accent/40 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
