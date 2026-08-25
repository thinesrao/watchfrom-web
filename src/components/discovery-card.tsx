"use client";

import Image from "next/image";
import Link from "next/link";
import type { DiscoveryItem } from "@/lib/discovery-feed";
import { flagEmoji } from "@/lib/countries";

export default function DiscoveryCard({ item }: { item: DiscoveryItem }) {
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w185${item.posterPath}`
    : null;

  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} trailer`)}`;

  return (
    <Link
      href={`/detail/${item.id}?type=${item.mediaType}&title=${encodeURIComponent(item.title)}&poster=${encodeURIComponent(item.posterPath ?? "")}&year=${item.releaseYear ?? ""}&vote=${item.voteAverage ?? ""}&overview=${encodeURIComponent(item.overview ?? "")}`}
      className="glass relative flex gap-3 rounded-xl p-3 hover:border-accent/40 transition-colors group"
    >
      <div className="w-16 h-24 shrink-0 rounded overflow-hidden bg-surface-dim">
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
      </div>
      <div className="flex flex-col justify-center min-w-0 gap-1 pr-7">
        <h3 className="font-semibold text-sm truncate group-hover:text-accent transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center gap-2">
          {item.releaseYear && (
            <span className="text-xs text-text-dim">{item.releaseYear}</span>
          )}
          {item.voteAverage != null && item.voteAverage > 0 && (
            <span className="text-xs text-gold">{item.voteAverage.toFixed(1)}</span>
          )}
        </div>
        {item.overview && (
          <p className="text-xs text-text-dim line-clamp-2">{item.overview}</p>
        )}
        {item.matchedProviderLabel && (
          <span className="inline-flex w-fit items-center gap-1 bg-accent/10 border border-accent/25 text-accent rounded-full px-2 py-0.5 text-xs">
            {flagEmoji(item.countryCode)} {item.countryCode} {item.matchedProviderLabel}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(trailerUrl, "_blank", "noopener,noreferrer");
        }}
        aria-label={`Watch ${item.title} trailer on YouTube`}
        className="absolute top-3 right-3 text-text-dim hover:text-accent transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" strokeLinejoin="round" />
          <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </Link>
  );
}
