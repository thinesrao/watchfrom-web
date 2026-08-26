import type { MediaType } from "./types";

export type DiscoverSortBy =
  | "popularity.desc"
  | "vote_average.desc"
  | "primary_release_date.desc"
  | "first_air_date.desc";

export type SortKey = "trending" | "top-rated" | "newest";

export const SORT_LABELS: Record<SortKey, string> = {
  trending: "Trending",
  "top-rated": "Top Rated",
  newest: "Newest",
};

export const TOP_RATED_VOTE_COUNT_GTE = 100;

export function resolveSortBy(key: SortKey, mediaType: MediaType): DiscoverSortBy {
  switch (key) {
    case "trending":
      return "popularity.desc";
    case "top-rated":
      return "vote_average.desc";
    case "newest":
      return mediaType === "movie" ? "primary_release_date.desc" : "first_air_date.desc";
  }
}
