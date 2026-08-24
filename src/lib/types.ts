export type MediaType = "movie" | "tv";

export interface SearchResult {
  id: number;
  title: string;
  mediaType: MediaType;
  posterPath: string | null;
  releaseYear: string | null;
  overview: string | null;
  voteAverage: number | null;
}

export interface WatchProvider {
  providerId: number;
  providerName: string;
  logoPath: string;
  providerType: "flatrate" | "rent" | "buy";
}

export interface CountryAvailability {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  providers: WatchProvider[];
}

export interface WatchlistItem {
  tmdbId: number;
  title: string;
  mediaType: MediaType;
  posterPath: string | null;
  releaseYear: string | null;
  savedAt: string;
  availabilitySnapshot: Record<string, WatchProvider[]>;
}
