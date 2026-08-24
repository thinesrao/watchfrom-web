import Image from "next/image";
import Link from "next/link";
import type { DiscoveryItem } from "@/lib/discovery-feed";
import { flagEmoji } from "@/lib/countries";

export default function DiscoveryCard({ item }: { item: DiscoveryItem }) {
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w185${item.posterPath}`
    : null;

  return (
    <Link
      href={`/detail/${item.id}?type=${item.mediaType}&title=${encodeURIComponent(item.title)}&poster=${encodeURIComponent(item.posterPath ?? "")}&year=${item.releaseYear ?? ""}`}
      className="flex gap-3 bg-surface border border-border rounded-lg p-3 hover:border-accent/40 transition-colors group"
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
      <div className="flex flex-col justify-center min-w-0 gap-1">
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
        {item.matchedProviderLabel && (
          <span className="inline-flex w-fit items-center gap-1 bg-surface-dim rounded px-2 py-0.5 text-xs">
            {flagEmoji(item.countryCode)} {item.countryCode} {item.matchedProviderLabel}
          </span>
        )}
      </div>
    </Link>
  );
}
