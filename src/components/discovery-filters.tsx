// src/components/discovery-filters.tsx
"use client";

import { DISCOVERY_COUNTRIES, countryName, flagEmoji } from "@/lib/countries";
import { genresForMediaType } from "@/lib/genres";
import { MOODS } from "@/lib/moods";
import { SORT_LABELS, type SortKey } from "@/lib/sort-options";
import type { MediaType } from "@/lib/types";

export interface DiscoveryFiltersProps {
  mediaType: MediaType;
  country: string;
  onCountryChange: (code: string) => void;
  genreMode: "genre" | "mood";
  onGenreModeChange: (mode: "genre" | "mood") => void;
  genreId: number | null;
  onGenreChange: (id: number | null) => void;
  moodKey: string | null;
  onMoodChange: (key: string | null) => void;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  activeMoreFiltersCount: number;
  onOpenMoreFilters: () => void;
}

export default function DiscoveryFilters({
  mediaType,
  country,
  onCountryChange,
  genreMode,
  onGenreModeChange,
  genreId,
  onGenreChange,
  moodKey,
  onMoodChange,
  sortKey,
  onSortChange,
  activeMoreFiltersCount,
  onOpenMoreFilters,
}: DiscoveryFiltersProps) {
  const genres = genresForMediaType(mediaType);
  const sortKeys = Object.keys(SORT_LABELS) as SortKey[];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={country}
        onChange={(e) => onCountryChange(e.target.value)}
        className="bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
      >
        <option value="ALL">🌐 All countries</option>
        {DISCOVERY_COUNTRIES.map((code) => (
          <option key={code} value={code}>
            {flagEmoji(code)} {countryName(code)}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => onGenreModeChange("genre")}
            className={`px-2.5 py-2 text-xs font-medium transition-colors ${
              genreMode === "genre"
                ? "bg-accent text-white"
                : "bg-surface text-text-dim hover:border-accent/40"
            }`}
          >
            Genre
          </button>
          <button
            type="button"
            onClick={() => onGenreModeChange("mood")}
            className={`px-2.5 py-2 text-xs font-medium transition-colors ${
              genreMode === "mood"
                ? "bg-accent text-white"
                : "bg-surface text-text-dim hover:border-accent/40"
            }`}
          >
            Mood
          </button>
        </div>

        {genreMode === "genre" ? (
          <select
            value={genreId ?? ""}
            onChange={(e) => onGenreChange(e.target.value ? Number(e.target.value) : null)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
          >
            <option value="">Any genre</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={moodKey ?? ""}
            onChange={(e) => onMoodChange(e.target.value || null)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
          >
            <option value="">Any mood</option>
            {MOODS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <select
        value={sortKey}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        className="bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
      >
        {sortKeys.map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onOpenMoreFilters}
        className="relative px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-text-dim hover:border-accent/40 transition-colors"
      >
        More filters
        {activeMoreFiltersCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-accent text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {activeMoreFiltersCount}
          </span>
        )}
      </button>
    </div>
  );
}
