"use client";

import Image from "next/image";
import Link from "next/link";
import type { SearchResult } from "@/lib/types";

export default function SearchResultCard({ result }: { result: SearchResult }) {
  const posterUrl = result.posterPath
    ? `https://image.tmdb.org/t/p/w185${result.posterPath}`
    : null;

  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${result.title} trailer`)}`;

  return (
    <Link
      href={`/detail/${result.id}?type=${result.mediaType}&title=${encodeURIComponent(result.title)}&poster=${encodeURIComponent(result.posterPath ?? "")}&year=${result.releaseYear ?? ""}`}
      className="glass relative flex gap-3 rounded-xl p-3 hover:border-accent/40 transition-colors group"
    >
      <div className="w-16 h-24 shrink-0 rounded overflow-hidden bg-surface-dim">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={result.title}
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
      <div className="flex flex-col justify-center min-w-0 pr-7">
        <h3 className="font-semibold text-sm truncate group-hover:text-accent transition-colors">
          {result.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-text-dim uppercase tracking-wide">
            {result.mediaType === "movie" ? "Movie" : "TV"}
          </span>
          {result.releaseYear && (
            <span className="text-xs text-text-dim">{result.releaseYear}</span>
          )}
          {result.voteAverage != null && result.voteAverage > 0 && (
            <span className="text-xs text-gold">
              {result.voteAverage.toFixed(1)}
            </span>
          )}
        </div>
        {result.overview && (
          <p className="text-xs text-text-dim mt-1 line-clamp-2">{result.overview}</p>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(trailerUrl, "_blank", "noopener,noreferrer");
        }}
        aria-label={`Watch ${result.title} trailer on YouTube`}
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
