import type { MediaType } from "./types";
import type { SortKey } from "./sort-options";

const DISCOVERY_FILTERS_KEY = "watchfrom:discovery-filters";

/** The full set of user-chosen discovery filters, persisted so navigating to
 * a title's detail page and back doesn't reset them. Transient UI state (e.g.
 * whether the More Filters sheet is open) is intentionally excluded. */
export interface DiscoveryFiltersState {
  country: string;
  serviceKey: string;
  mediaType: MediaType;
  genreMode: "genre" | "mood";
  genreId: number | null;
  moodKey: string | null;
  sortKey: SortKey;
  decadeLabel: string | null;
  directorId: number | null;
  includeSingapore: boolean;
}

export function loadDiscoveryFilters(): Partial<DiscoveryFiltersState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DISCOVERY_FILTERS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<DiscoveryFiltersState>;
  } catch {
    return null;
  }
}

export function saveDiscoveryFilters(state: DiscoveryFiltersState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DISCOVERY_FILTERS_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded — ignore */
  }
}
