"use client";

import { useState } from "react";
import { useDiscoveryFeed } from "@/lib/use-discovery-feed";
import { SERVICES } from "@/lib/providers";
import { countryName, flagEmoji } from "@/lib/countries";
import DiscoveryCard from "@/components/discovery-card";
import type { MediaType } from "@/lib/types";

const COUNTRIES = ["US", "GB", "JP", "KR", "DE", "CA", "AU"];

export default function DiscoveryPage() {
  const [country, setCountry] = useState("US");
  const [serviceKey, setServiceKey] = useState<string>("all");
  const [mediaType, setMediaType] = useState<MediaType>("movie");

  const providerIds =
    serviceKey === "all"
      ? SERVICES.flatMap((s) => s.providerIds)
      : (SERVICES.find((s) => s.key === serviceKey)?.providerIds as
          | readonly number[]
          | undefined) ?? [];

  const { items, loading, error, hasMore, loadMore } = useDiscoveryFeed(
    mediaType,
    country,
    [...providerIds]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Discovery</h1>
        <p className="text-text-dim text-sm">
          Titles popular abroad on your services that aren&apos;t streaming
          here in Singapore yet.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        >
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {flagEmoji(code)} {countryName(code)}
            </option>
          ))}
        </select>

        <div className="flex gap-1.5">
          {[{ key: "all", label: "All My Services" }, ...SERVICES].map((s) => (
            <button
              key={s.key}
              onClick={() => setServiceKey(s.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                serviceKey === s.key
                  ? "bg-accent text-white"
                  : "bg-surface border border-border text-text-dim hover:border-accent/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {(["movie", "tv"] as const).map((type) => (
            <button
              key={type}
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
      </div>

      {error && (
        <div className="glass rounded-xl p-4 text-center space-y-2">
          <p className="text-text-dim">{error}</p>
          <button
            onClick={loadMore}
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
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && hasMore && !error && (
        <div className="flex justify-center">
          <button
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
