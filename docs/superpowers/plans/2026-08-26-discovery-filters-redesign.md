# Discovery Filters Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Discovery page's filters — expanded/curated country list with an "All countries" option, Genre/Mood browsing, Sort, Decade, and a curated Director filter — on top of the existing "unlockable titles" eligibility logic, using a two-tier mobile-friendly filter UI (primary pills + a "more filters" sheet) instead of today's flat control row.

**Architecture:** TMDB's `/discover` endpoint natively supports genre, sort, date-range, and crew (director) query params, so new filters are passed straight through the existing `/api/discover` → `discoverTitles` → `fetchDiscoveryFeed` → `useDiscoveryFeed` pipeline rather than filtered client-side. "All countries" mode fans out one `/discover` call per curated country in parallel per page, merges/dedupes the results, and runs them through the same (already country-agnostic) provider-availability cache and `isUnlockable` check used today.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest (unit tests for pure logic — no React Testing Library is installed, so hook/component wiring is verified manually in the browser, matching this codebase's existing test coverage pattern).

**Spec:** [docs/superpowers/specs/2026-08-26-discovery-filters-redesign-design.md](../specs/2026-08-26-discovery-filters-redesign-design.md)

## Global Constraints

- Director filtering applies to movies only (`/discover/tv` has no `with_crew` param) — the Director control must be disabled/hidden whenever the Movie/TV toggle is set to TV.
- "All countries" means the curated `DISCOVERY_COUNTRIES` list (~20-25 major markets), never every TMDB region.
- If some per-country `/discover` calls fail in "All countries" mode, proceed with the successful results; only surface the page-level error state if every country call fails.
- No URL-persisted filter state and no server-side/shared caching in this pass (existing pilot-scope limitations, unchanged).
- Follow existing code style: Tailwind utility classes matching current components (`bg-surface`, `border-border`, `text-text-dim`, `bg-accent`, `glass`, etc.), no `console.log`, `console.error` only for the existing catch-and-log pattern already used in `route.ts` and now in the multi-region partial-failure path.

---

## Task 1: Genre and Mood static data

**Files:**
- Create: `src/lib/genres.ts`
- Create: `src/lib/genres.test.ts`
- Create: `src/lib/moods.ts`
- Create: `src/lib/moods.test.ts`

**Interfaces:**
- Consumes: `MediaType` from `src/lib/types.ts` (already exists: `"movie" | "tv"`).
- Produces: `Genre` interface `{ id: number; label: string }`; `MOVIE_GENRES: Genre[]`; `TV_GENRES: Genre[]`; `genresForMediaType(mediaType: MediaType): Genre[]`; `genreLabel(mediaType: MediaType, id: number): string`. `Mood` interface `{ key: string; label: string; movieGenreIds: number[]; tvGenreIds: number[] }`; `MOODS: Mood[]`; `genreIdsForMood(key: string, mediaType: MediaType): number[]`.

- [ ] **Step 1: Write the failing tests for genres.ts**

```ts
// src/lib/genres.test.ts
import { describe, it, expect } from "vitest";
import { MOVIE_GENRES, TV_GENRES, genresForMediaType, genreLabel } from "./genres";

describe("genresForMediaType", () => {
  it("returns the movie genre list for movie", () => {
    expect(genresForMediaType("movie")).toBe(MOVIE_GENRES);
  });

  it("returns the tv genre list for tv", () => {
    expect(genresForMediaType("tv")).toBe(TV_GENRES);
  });
});

describe("genreLabel", () => {
  it("returns the label for a known movie genre id", () => {
    expect(genreLabel("movie", 35)).toBe("Comedy");
  });

  it("returns the label for a known tv genre id", () => {
    expect(genreLabel("tv", 10759)).toBe("Action & Adventure");
  });

  it("returns an empty string for an unknown id", () => {
    expect(genreLabel("movie", 999999)).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/genres.test.ts`
Expected: FAIL — `Cannot find module './genres'`

- [ ] **Step 3: Write genres.ts**

```ts
// src/lib/genres.ts
import type { MediaType } from "./types";

export interface Genre {
  id: number;
  label: string;
}

export const MOVIE_GENRES: Genre[] = [
  { id: 28, label: "Action" },
  { id: 12, label: "Adventure" },
  { id: 16, label: "Animation" },
  { id: 35, label: "Comedy" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentary" },
  { id: 18, label: "Drama" },
  { id: 10751, label: "Family" },
  { id: 14, label: "Fantasy" },
  { id: 36, label: "History" },
  { id: 27, label: "Horror" },
  { id: 10402, label: "Music" },
  { id: 9648, label: "Mystery" },
  { id: 10749, label: "Romance" },
  { id: 878, label: "Science Fiction" },
  { id: 53, label: "Thriller" },
  { id: 10752, label: "War" },
];

export const TV_GENRES: Genre[] = [
  { id: 10759, label: "Action & Adventure" },
  { id: 16, label: "Animation" },
  { id: 35, label: "Comedy" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentary" },
  { id: 18, label: "Drama" },
  { id: 10751, label: "Family" },
  { id: 9648, label: "Mystery" },
  { id: 10765, label: "Sci-Fi & Fantasy" },
  { id: 10768, label: "War & Politics" },
];

export function genresForMediaType(mediaType: MediaType): Genre[] {
  return mediaType === "movie" ? MOVIE_GENRES : TV_GENRES;
}

export function genreLabel(mediaType: MediaType, id: number): string {
  return genresForMediaType(mediaType).find((g) => g.id === id)?.label ?? "";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/genres.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Write the failing tests for moods.ts**

```ts
// src/lib/moods.test.ts
import { describe, it, expect } from "vitest";
import { MOODS, genreIdsForMood } from "./moods";

describe("genreIdsForMood", () => {
  it("returns the movie genre ids for a known mood", () => {
    expect(genreIdsForMood("feel-good", "movie")).toEqual(
      MOODS.find((m) => m.key === "feel-good")!.movieGenreIds
    );
  });

  it("returns the tv genre ids for a known mood", () => {
    expect(genreIdsForMood("intense", "tv")).toEqual(
      MOODS.find((m) => m.key === "intense")!.tvGenreIds
    );
  });

  it("returns an empty array for an unknown mood key", () => {
    expect(genreIdsForMood("not-a-mood", "movie")).toEqual([]);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run src/lib/moods.test.ts`
Expected: FAIL — `Cannot find module './moods'`

- [ ] **Step 7: Write moods.ts**

```ts
// src/lib/moods.ts
import type { MediaType } from "./types";

export interface Mood {
  key: string;
  label: string;
  movieGenreIds: number[];
  tvGenreIds: number[];
}

export const MOODS: Mood[] = [
  { key: "feel-good", label: "Feel-good", movieGenreIds: [35, 10751], tvGenreIds: [35, 10751] },
  { key: "intense", label: "Intense", movieGenreIds: [28, 53], tvGenreIds: [10759, 80] },
  { key: "mind-bending", label: "Mind-bending", movieGenreIds: [878, 9648], tvGenreIds: [10765, 9648] },
  { key: "dark", label: "Dark", movieGenreIds: [27, 80], tvGenreIds: [80, 9648] },
  { key: "light-easy", label: "Light & Easy", movieGenreIds: [35, 10402], tvGenreIds: [35] },
];

export function genreIdsForMood(key: string, mediaType: MediaType): number[] {
  const mood = MOODS.find((m) => m.key === key);
  if (!mood) return [];
  return mediaType === "movie" ? mood.movieGenreIds : mood.tvGenreIds;
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/lib/moods.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add src/lib/genres.ts src/lib/genres.test.ts src/lib/moods.ts src/lib/moods.test.ts
git commit -m "feat: add genre and mood static data for discovery filters"
```

---

## Task 2: Sort helper

**Files:**
- Create: `src/lib/sort-options.ts`
- Create: `src/lib/sort-options.test.ts`

**Interfaces:**
- Consumes: `MediaType` from `src/lib/types.ts`.
- Produces: `DiscoverSortBy` type (`"popularity.desc" | "vote_average.desc" | "primary_release_date.desc" | "first_air_date.desc"`); `SortKey` type (`"trending" | "top-rated" | "newest"`); `SORT_LABELS: Record<SortKey, string>`; `TOP_RATED_VOTE_COUNT_GTE: number`; `resolveSortBy(key: SortKey, mediaType: MediaType): DiscoverSortBy`. **Task 6 (`src/lib/tmdb.ts`) imports `DiscoverSortBy` from this file.**

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/sort-options.test.ts
import { describe, it, expect } from "vitest";
import { resolveSortBy } from "./sort-options";

describe("resolveSortBy", () => {
  it("maps trending to popularity for both media types", () => {
    expect(resolveSortBy("trending", "movie")).toBe("popularity.desc");
    expect(resolveSortBy("trending", "tv")).toBe("popularity.desc");
  });

  it("maps top-rated to vote average for both media types", () => {
    expect(resolveSortBy("top-rated", "movie")).toBe("vote_average.desc");
    expect(resolveSortBy("top-rated", "tv")).toBe("vote_average.desc");
  });

  it("maps newest to the media-type-specific date field", () => {
    expect(resolveSortBy("newest", "movie")).toBe("primary_release_date.desc");
    expect(resolveSortBy("newest", "tv")).toBe("first_air_date.desc");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/sort-options.test.ts`
Expected: FAIL — `Cannot find module './sort-options'`

- [ ] **Step 3: Write sort-options.ts**

```ts
// src/lib/sort-options.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/sort-options.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sort-options.ts src/lib/sort-options.test.ts
git commit -m "feat: add discovery sort key mapping"
```

---

## Task 3: Decade static data

**Files:**
- Create: `src/lib/decades.ts`
- Create: `src/lib/decades.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `DecadeRange` interface `{ label: string; startYear: number; endYear: number }`; `DECADES: DecadeRange[]`; `dateRangeForDecade(decade: DecadeRange): { gte: string; lte: string }`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/decades.test.ts
import { describe, it, expect } from "vitest";
import { DECADES, dateRangeForDecade } from "./decades";

describe("dateRangeForDecade", () => {
  it("builds a full-year date range for a decade", () => {
    const decade = DECADES.find((d) => d.label === "2010s")!;
    expect(dateRangeForDecade(decade)).toEqual({ gte: "2010-01-01", lte: "2019-12-31" });
  });

  it("handles the open-ended earliest bucket", () => {
    const decade = DECADES.find((d) => d.label === "Before 1980")!;
    expect(dateRangeForDecade(decade)).toEqual({ gte: "1900-01-01", lte: "1979-12-31" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/decades.test.ts`
Expected: FAIL — `Cannot find module './decades'`

- [ ] **Step 3: Write decades.ts**

```ts
// src/lib/decades.ts
export interface DecadeRange {
  label: string;
  startYear: number;
  endYear: number;
}

export const DECADES: DecadeRange[] = [
  { label: "2020s", startYear: 2020, endYear: 2029 },
  { label: "2010s", startYear: 2010, endYear: 2019 },
  { label: "2000s", startYear: 2000, endYear: 2009 },
  { label: "1990s", startYear: 1990, endYear: 1999 },
  { label: "1980s", startYear: 1980, endYear: 1989 },
  { label: "Before 1980", startYear: 1900, endYear: 1979 },
];

export function dateRangeForDecade(decade: DecadeRange): { gte: string; lte: string } {
  return {
    gte: `${decade.startYear}-01-01`,
    lte: `${decade.endYear}-12-31`,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/decades.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/decades.ts src/lib/decades.test.ts
git commit -m "feat: add decade filter data"
```

---

## Task 4: Director static data

**Files:**
- Create: `src/lib/directors.ts`
- Create: `src/lib/directors.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Director` interface `{ id: number; name: string }`; `DIRECTORS: Director[]`; `directorName(id: number): string`.

- [ ] **Step 1: Verify TMDB person IDs for the curated director list**

The ids below are a best-effort starting list. Before writing the file, confirm each id against the TMDB API (requires `TMDB_API_READ_ACCESS_TOKEN` set in your shell — the same variable `src/lib/tmdb.ts` reads via `.env.local`):

```bash
for name in "Christopher Nolan" "Steven Spielberg" "Martin Scorsese" "Quentin Tarantino" \
  "Denis Villeneuve" "Greta Gerwig" "Bong Joon-ho" "Wes Anderson" "David Fincher" \
  "Ridley Scott" "James Cameron" "Jordan Peele" "Taika Waititi" "Sofia Coppola" \
  "Guillermo del Toro" "Christopher McQuarrie"; do
  echo "== $name =="
  curl -s -H "Authorization: Bearer $TMDB_API_READ_ACCESS_TOKEN" \
    "https://api.themoviedb.org/3/search/person?query=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$name")" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); r=d['results'][0]; print(r['id'], r['name'])"
done
```

For each name, use the id returned for the most popular (first) result. Correct any id in Step 3 below that doesn't match what this command returns.

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/directors.test.ts
import { describe, it, expect } from "vitest";
import { DIRECTORS, directorName } from "./directors";

describe("directorName", () => {
  it("returns the name for a known director id", () => {
    const nolan = DIRECTORS.find((d) => d.name === "Christopher Nolan")!;
    expect(directorName(nolan.id)).toBe("Christopher Nolan");
  });

  it("returns an empty string for an unknown id", () => {
    expect(directorName(-1)).toBe("");
  });

  it("has no duplicate ids", () => {
    const ids = DIRECTORS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/directors.test.ts`
Expected: FAIL — `Cannot find module './directors'`

- [ ] **Step 4: Write directors.ts**

Use the ids confirmed in Step 1 (correcting any that differ from this draft):

```ts
// src/lib/directors.ts
export interface Director {
  id: number;
  name: string;
}

export const DIRECTORS: Director[] = [
  { id: 525, name: "Christopher Nolan" },
  { id: 488, name: "Steven Spielberg" },
  { id: 1032, name: "Martin Scorsese" },
  { id: 138, name: "Quentin Tarantino" },
  { id: 137427, name: "Denis Villeneuve" },
  { id: 39481, name: "Greta Gerwig" },
  { id: 21684, name: "Bong Joon-ho" },
  { id: 5655, name: "Wes Anderson" },
  { id: 7467, name: "David Fincher" },
  { id: 578, name: "Ridley Scott" },
  { id: 2710, name: "James Cameron" },
  { id: 96901, name: "Jordan Peele" },
  { id: 55934, name: "Taika Waititi" },
  { id: 1769, name: "Sofia Coppola" },
  { id: 12691, name: "Guillermo del Toro" },
  { id: 21605, name: "Christopher McQuarrie" },
];

export function directorName(id: number): string {
  return DIRECTORS.find((d) => d.id === id)?.name ?? "";
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/directors.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/directors.ts src/lib/directors.test.ts
git commit -m "feat: add curated director filter list"
```

---

## Task 5: Expand discovery country list

**Files:**
- Modify: `src/lib/countries.ts`
- Create: `src/lib/discovery-countries.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `DISCOVERY_COUNTRIES: string[]` exported from `src/lib/countries.ts` (a curated list of ~20-25 major-market ISO country codes).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/discovery-countries.test.ts
import { describe, it, expect } from "vitest";
import { DISCOVERY_COUNTRIES } from "./countries";

describe("DISCOVERY_COUNTRIES", () => {
  it("includes the previous default set of countries", () => {
    for (const code of ["US", "GB", "JP", "KR", "DE", "CA", "AU"]) {
      expect(DISCOVERY_COUNTRIES).toContain(code);
    }
  });

  it("has no duplicate codes", () => {
    expect(new Set(DISCOVERY_COUNTRIES).size).toBe(DISCOVERY_COUNTRIES.length);
  });

  it("has between 15 and 30 countries", () => {
    expect(DISCOVERY_COUNTRIES.length).toBeGreaterThanOrEqual(15);
    expect(DISCOVERY_COUNTRIES.length).toBeLessThanOrEqual(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/discovery-countries.test.ts`
Expected: FAIL — `DISCOVERY_COUNTRIES` is not exported from `./countries`

- [ ] **Step 3: Add DISCOVERY_COUNTRIES to countries.ts**

Add this export to `src/lib/countries.ts` (after the existing `COUNTRIES` map, before `countryName`):

```ts
export const DISCOVERY_COUNTRIES: string[] = [
  "US", "GB", "JP", "KR", "DE", "CA", "AU",
  "FR", "ES", "IT", "NL", "SE", "BR", "MX",
  "IN", "PH", "ID", "MY", "TH", "NZ", "IE",
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/discovery-countries.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/countries.ts src/lib/discovery-countries.test.ts
git commit -m "feat: expand discovery country list and add All-countries set"
```

---

## Task 6: Extend TMDB discover layer with new filter params

**Files:**
- Modify: `src/lib/tmdb.ts:100-140`
- Create: `src/lib/tmdb.test.ts`

**Interfaces:**
- Consumes: `DiscoverSortBy` from `src/lib/sort-options.ts` (Task 2).
- Produces: `discoverTitles` gains optional params `genreIds?: number[]`, `sortBy?: DiscoverSortBy`, `voteCountGte?: number`, `dateGte?: string`, `dateLte?: string`, `crewId?: number`. Existing required params (`mediaType`, `watchRegion`, `providerIds`, `page`) and return shape (`{ results: SearchResult[]; totalPages: number }`) are unchanged. **Task 7 (`/api/discover` route) calls this extended signature.**

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/tmdb.test.ts
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { discoverTitles } from "./tmdb";

const originalFetch = global.fetch;
const originalEnv = process.env.TMDB_API_READ_ACCESS_TOKEN;

function mockFetchOnce(body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.TMDB_API_READ_ACCESS_TOKEN = "test-token";
});

afterAll(() => {
  global.fetch = originalFetch;
  process.env.TMDB_API_READ_ACCESS_TOKEN = originalEnv;
});

describe("discoverTitles", () => {
  it("builds a base URL with only the required params by default", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({ mediaType: "movie", watchRegion: "US", providerIds: [8], page: 1 });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("watch_region=US");
    expect(calledUrl).toContain("with_watch_providers=8");
    expect(calledUrl).toContain("sort_by=popularity.desc");
    expect(calledUrl).not.toContain("with_genres");
    expect(calledUrl).not.toContain("with_crew");
  });

  it("adds with_genres when genreIds is provided", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "movie",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      genreIds: [28, 53],
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("with_genres=28%7C53");
  });

  it("overrides sort_by and adds vote_count.gte when provided", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "movie",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      sortBy: "vote_average.desc",
      voteCountGte: 100,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("sort_by=vote_average.desc");
    expect(calledUrl).toContain("vote_count.gte=100");
  });

  it("adds a movie-specific date range param", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "movie",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      dateGte: "2010-01-01",
      dateLte: "2019-12-31",
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("primary_release_date.gte=2010-01-01");
    expect(calledUrl).toContain("primary_release_date.lte=2019-12-31");
  });

  it("adds a tv-specific date range param", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "tv",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      dateGte: "2010-01-01",
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("first_air_date.gte=2010-01-01");
  });

  it("adds with_crew for movie when crewId is provided", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "movie",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      crewId: 525,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("with_crew=525");
  });

  it("ignores crewId for tv (with_crew is a movie-only TMDB param)", async () => {
    mockFetchOnce({ results: [], total_pages: 1 });
    await discoverTitles({
      mediaType: "tv",
      watchRegion: "US",
      providerIds: [8],
      page: 1,
      crewId: 525,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("with_crew");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/tmdb.test.ts`
Expected: FAIL — `discoverTitles` does not accept `genreIds`/`sortBy`/etc. (TypeScript error) or assertions fail once compiled

- [ ] **Step 3: Extend discoverTitles in tmdb.ts**

Replace the existing `discoverTitles` function (lines 100-140) with:

```ts
import type { DiscoverSortBy } from "./sort-options";

export async function discoverTitles(params: {
  mediaType: "movie" | "tv";
  watchRegion: string;
  providerIds: number[];
  page: number;
  genreIds?: number[];
  sortBy?: DiscoverSortBy;
  voteCountGte?: number;
  dateGte?: string;
  dateLte?: string;
  crewId?: number;
}): Promise<{ results: SearchResult[]; totalPages: number }> {
  const {
    mediaType,
    watchRegion,
    providerIds,
    page,
    genreIds,
    sortBy,
    voteCountGte,
    dateGte,
    dateLte,
    crewId,
  } = params;

  const query = new URLSearchParams({
    watch_region: watchRegion,
    with_watch_providers: providerIds.join("|"),
    with_watch_monetization_types: "flatrate",
    sort_by: sortBy ?? "popularity.desc",
    page: String(page),
  });

  if (genreIds && genreIds.length > 0) {
    query.set("with_genres", genreIds.join("|"));
  }
  if (voteCountGte != null) {
    query.set("vote_count.gte", String(voteCountGte));
  }
  const dateField = mediaType === "movie" ? "primary_release_date" : "first_air_date";
  if (dateGte) {
    query.set(`${dateField}.gte`, dateGte);
  }
  if (dateLte) {
    query.set(`${dateField}.lte`, dateLte);
  }
  if (crewId != null && mediaType === "movie") {
    query.set("with_crew", String(crewId));
  }

  const url = `${BASE_URL}/discover/${mediaType}?${query.toString()}`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`TMDB discover failed: ${res.status}`);
  }

  const data = await res.json();

  const results: SearchResult[] = (data.results ?? []).map(
    (item: Record<string, unknown>): SearchResult => {
      const isMovie = mediaType === "movie";
      const title = (isMovie ? item.title : item.name) as string;
      const date = (isMovie ? item.release_date : item.first_air_date) as
        | string
        | null;

      return {
        id: item.id as number,
        title,
        mediaType,
        posterPath: item.poster_path as string | null,
        releaseYear: date ? date.substring(0, 4) : null,
        overview: item.overview as string | null,
        voteAverage: item.vote_average as number | null,
      };
    }
  );

  return { results, totalPages: (data.total_pages as number) ?? 1 };
}
```

Add `import type { DiscoverSortBy } from "./sort-options";` to the top of `src/lib/tmdb.ts` alongside the existing imports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/tmdb.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `npm run test`
Expected: All existing tests still PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/tmdb.ts src/lib/tmdb.test.ts
git commit -m "feat: extend TMDB discover call with genre/sort/date/crew filters"
```

---

## Task 7: Extend /api/discover route with new query params

**Files:**
- Modify: `src/app/api/discover/route.ts`

**Interfaces:**
- Consumes: extended `discoverTitles` from Task 6.
- Produces: `GET /api/discover` accepts new optional query params `genreIds` (comma-separated positive integers), `sortBy` (one of the four `DiscoverSortBy` literal values), `voteCountGte` (non-negative integer), `dateGte`/`dateLte` (`YYYY-MM-DD`), `crewId` (positive integer). Invalid values for any provided param return `400`. Missing/omitted params behave exactly as before (unchanged 400s for missing `mediaType`/`watchRegion`/`providerIds`).

- [ ] **Step 1: Replace route.ts with the extended version**

```ts
// src/app/api/discover/route.ts
import { NextRequest, NextResponse } from "next/server";
import { discoverTitles } from "@/lib/tmdb";
import { MAX_PAGES } from "@/lib/discovery-feed";
import { ALLOWED_PROVIDER_IDS } from "@/lib/providers";
import type { DiscoverSortBy } from "@/lib/sort-options";

const SORT_BY_VALUES = new Set<DiscoverSortBy>([
  "popularity.desc",
  "vote_average.desc",
  "primary_release_date.desc",
  "first_air_date.desc",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const mediaType = request.nextUrl.searchParams.get("mediaType");
  const watchRegion = request.nextUrl.searchParams.get("watchRegion");
  const providerIdsParam = request.nextUrl.searchParams.get("providerIds");
  const pageParam = request.nextUrl.searchParams.get("page");

  if (
    !mediaType ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    !watchRegion ||
    !providerIdsParam
  ) {
    return NextResponse.json(
      { error: "Missing or invalid mediaType/watchRegion/providerIds parameters" },
      { status: 400 }
    );
  }

  if (!/^[A-Z]{2}$/.test(watchRegion)) {
    return NextResponse.json(
      { error: "Invalid watchRegion" },
      { status: 400 }
    );
  }

  const providerIds = providerIdsParam
    .split(",")
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id) && ALLOWED_PROVIDER_IDS.has(id));

  if (providerIds.length === 0) {
    return NextResponse.json({ error: "Invalid providerIds" }, { status: 400 });
  }

  const parsedPage = parseInt(pageParam ?? "1", 10);
  const page = isNaN(parsedPage)
    ? 1
    : Math.min(Math.max(parsedPage, 1), MAX_PAGES);

  const genreIdsParam = request.nextUrl.searchParams.get("genreIds");
  let genreIds: number[] | undefined;
  if (genreIdsParam) {
    genreIds = genreIdsParam
      .split(",")
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id) && id > 0);
    if (genreIds.length === 0) {
      return NextResponse.json({ error: "Invalid genreIds" }, { status: 400 });
    }
  }

  const sortByParam = request.nextUrl.searchParams.get("sortBy");
  let sortBy: DiscoverSortBy | undefined;
  if (sortByParam) {
    if (!SORT_BY_VALUES.has(sortByParam as DiscoverSortBy)) {
      return NextResponse.json({ error: "Invalid sortBy" }, { status: 400 });
    }
    sortBy = sortByParam as DiscoverSortBy;
  }

  const voteCountGteParam = request.nextUrl.searchParams.get("voteCountGte");
  let voteCountGte: number | undefined;
  if (voteCountGteParam) {
    const parsed = parseInt(voteCountGteParam, 10);
    if (isNaN(parsed) || parsed < 0) {
      return NextResponse.json({ error: "Invalid voteCountGte" }, { status: 400 });
    }
    voteCountGte = parsed;
  }

  const dateGteParam = request.nextUrl.searchParams.get("dateGte");
  if (dateGteParam && !DATE_RE.test(dateGteParam)) {
    return NextResponse.json({ error: "Invalid dateGte" }, { status: 400 });
  }

  const dateLteParam = request.nextUrl.searchParams.get("dateLte");
  if (dateLteParam && !DATE_RE.test(dateLteParam)) {
    return NextResponse.json({ error: "Invalid dateLte" }, { status: 400 });
  }

  const crewIdParam = request.nextUrl.searchParams.get("crewId");
  let crewId: number | undefined;
  if (crewIdParam) {
    const parsed = parseInt(crewIdParam, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "Invalid crewId" }, { status: 400 });
    }
    crewId = parsed;
  }

  try {
    const { results, totalPages } = await discoverTitles({
      mediaType,
      watchRegion,
      providerIds,
      page,
      genreIds,
      sortBy,
      voteCountGte,
      dateGte: dateGteParam ?? undefined,
      dateLte: dateLteParam ?? undefined,
      crewId,
    });
    return NextResponse.json({ results, totalPages });
  } catch (error) {
    console.error("Discover error:", error);
    return NextResponse.json(
      { error: "Failed to load discovery feed. Please try again." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

Run: `npm run test`
Expected: All tests PASS (no test file targets this route directly, consistent with the existing codebase — the other two API routes have no dedicated test files either; verification happens via Task 14's manual browser pass)

- [ ] **Step 3: Manually verify the route with curl**

With the dev server running (`npm run dev` in a separate terminal):

```bash
curl -s "http://localhost:3000/api/discover?mediaType=movie&watchRegion=US&providerIds=8&page=1&genreIds=28&sortBy=vote_average.desc&voteCountGte=100" | head -c 500
```

Expected: a `200` JSON response with a non-empty `results` array of action movies. Then verify a validation error path:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/discover?mediaType=movie&watchRegion=US&providerIds=8&page=1&sortBy=not-a-real-sort"
```

Expected: `400`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/discover/route.ts
git commit -m "feat: accept genre/sort/date/crew filters in discover API route"
```

---

## Task 8: Multi-country merge/dedupe helper

**Files:**
- Modify: `src/lib/discovery-feed.ts`
- Modify: `src/lib/discovery-feed.test.ts`

**Interfaces:**
- Consumes: `SearchResult` from `src/lib/types.ts`.
- Produces: `mergeDiscoveryResults(resultSets: SearchResult[][]): SearchResult[]` — merges multiple per-country result arrays into one, deduped by `id`, preserving first-seen order.

- [ ] **Step 1: Write the failing test**

Add to the top of `src/lib/discovery-feed.test.ts` (after the existing imports, before the `title`/`availabilityWithSg` helpers):

```ts
import { fetchDiscoveryFeed, mergeDiscoveryResults, TARGET_COUNT, MAX_PAGES } from "./discovery-feed";
```

(This replaces the existing `import { fetchDiscoveryFeed, TARGET_COUNT, MAX_PAGES } from "./discovery-feed";` line.)

Add this new `describe` block after the `title`/`availabilityWithSg` helper functions, before the existing `describe("fetchDiscoveryFeed", ...)` block:

```ts
describe("mergeDiscoveryResults", () => {
  it("merges multiple result sets deduped by id, preserving first-seen order", () => {
    const merged = mergeDiscoveryResults([
      [title(1), title(2)],
      [title(2), title(3)],
      [title(4)],
    ]);

    expect(merged.map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });

  it("returns an empty array when given no result sets", () => {
    expect(mergeDiscoveryResults([])).toEqual([]);
  });

  it("handles a single result set unchanged", () => {
    const merged = mergeDiscoveryResults([[title(1), title(2)]]);
    expect(merged.map((r) => r.id)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/discovery-feed.test.ts -t "mergeDiscoveryResults"`
Expected: FAIL — `mergeDiscoveryResults` is not exported from `./discovery-feed`

- [ ] **Step 3: Add mergeDiscoveryResults to discovery-feed.ts**

Add this function to `src/lib/discovery-feed.ts`, after the `DiscoveryItem`/`FetchDiscoveryFeedParams`/`FetchDiscoveryFeedResult` type declarations and before `fetchDiscoveryFeed`:

```ts
export function mergeDiscoveryResults(resultSets: SearchResult[][]): SearchResult[] {
  const seen = new Set<number>();
  const merged: SearchResult[] = [];
  for (const results of resultSets) {
    for (const result of results) {
      if (seen.has(result.id)) continue;
      seen.add(result.id);
      merged.push(result);
    }
  }
  return merged;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/discovery-feed.test.ts -t "mergeDiscoveryResults"`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/discovery-feed.ts src/lib/discovery-feed.test.ts
git commit -m "feat: add multi-country result merge/dedupe helper"
```

---

## Task 9: Extend fetchDiscoveryFeed for multi-region and new filters

**Files:**
- Modify: `src/lib/discovery-feed.ts`
- Modify: `src/lib/discovery-feed.test.ts`

**Interfaces:**
- Consumes: `mergeDiscoveryResults` from Task 8; `DiscoverSortBy` from `src/lib/sort-options.ts`.
- Produces: `FetchDiscoveryFeedParams.watchRegion: string` is replaced with `watchRegions: string[]` (single-country mode passes a one-element array). New optional fields `genreIds?: number[]`, `sortBy?: DiscoverSortBy`, `voteCountGte?: number`, `dateGte?: string`, `dateLte?: string`, `crewId?: number`. `fetchDiscoverPage` signature changes from `(page: number) => ...` to `(watchRegion: string, page: number) => ...`. Return shape (`FetchDiscoveryFeedResult`) is unchanged. **Task 10 (`use-discovery-feed.ts`) calls this extended signature.**

This task replaces `watchRegion` with `watchRegions` throughout `fetchDiscoveryFeed`, which means every existing call site in `discovery-feed.test.ts` must be updated. Rather than patching individual lines, replace the whole test file.

- [ ] **Step 1: Replace discovery-feed.test.ts with the extended version**

```ts
// src/lib/discovery-feed.test.ts
import { describe, it, expect, vi } from "vitest";
import { fetchDiscoveryFeed, mergeDiscoveryResults, TARGET_COUNT, MAX_PAGES } from "./discovery-feed";
import type { CountryAvailability, SearchResult } from "./types";

function title(id: number): SearchResult {
  return {
    id,
    title: `Title ${id}`,
    mediaType: "movie",
    posterPath: null,
    releaseYear: "2024",
    overview: null,
    voteAverage: 7,
  };
}

function availabilityWithSg(
  providerId: number | null,
  usProviderId: number
): CountryAvailability[] {
  const countries: CountryAvailability[] = [
    {
      countryCode: "US",
      countryName: "United States",
      flagEmoji: "🇺🇸",
      providers: [
        { providerId: usProviderId, providerName: "Netflix", logoPath: "/n.jpg", providerType: "flatrate" },
      ],
    },
  ];
  if (providerId !== null) {
    countries.push({
      countryCode: "SG",
      countryName: "Singapore",
      flagEmoji: "🇸🇬",
      providers: [
        { providerId, providerName: "Netflix", logoPath: "/n.jpg", providerType: "flatrate" },
      ],
    });
  }
  return countries;
}

describe("mergeDiscoveryResults", () => {
  it("merges multiple result sets deduped by id, preserving first-seen order", () => {
    const merged = mergeDiscoveryResults([
      [title(1), title(2)],
      [title(2), title(3)],
      [title(4)],
    ]);

    expect(merged.map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });

  it("returns an empty array when given no result sets", () => {
    expect(mergeDiscoveryResults([])).toEqual([]);
  });

  it("handles a single result set unchanged", () => {
    const merged = mergeDiscoveryResults([[title(1), title(2)]]);
    expect(merged.map((r) => r.id)).toEqual([1, 2]);
  });
});

describe("fetchDiscoveryFeed", () => {
  it("keeps only unlockable titles and reports pagination state", async () => {
    const page1 = { results: [title(1), title(2), title(3)], totalPages: 2 };
    const page2 = { results: [title(4)], totalPages: 2 };
    const fetchDiscoverPage = vi
      .fn()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const fetchProviders = vi.fn(async (id: number) => {
      // title 2 already streams the selected provider (8) in SG -> locked
      if (id === 2) return availabilityWithSg(8, 8);
      return availabilityWithSg(null, 8);
    });

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 3,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items.map((i) => i.id)).toEqual([1, 3, 4]);
    expect(result.items[0].matchedProviderLabel).toBe("Netflix");
    expect(result.items[0].countryCode).toBe("US");
    expect(result.lastPage).toBe(2);
    expect(result.hasMore).toBe(false);
    expect(fetchDiscoverPage).toHaveBeenCalledTimes(2);
    expect(fetchDiscoverPage).toHaveBeenNthCalledWith(1, "US", 1);
    expect(fetchDiscoverPage).toHaveBeenNthCalledWith(2, "US", 2);
  });

  it("stops paginating once the target count is reached", async () => {
    const page1 = {
      results: [title(1), title(2), title(3), title(4)],
      totalPages: 5,
    };
    const fetchDiscoverPage = vi.fn().mockResolvedValue(page1);
    const fetchProviders = vi.fn(async () => availabilityWithSg(null, 8));

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 3,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items).toHaveLength(4);
    expect(fetchDiscoverPage).toHaveBeenCalledTimes(1);
    expect(result.hasMore).toBe(true);
  });

  it("reuses cached provider lookups instead of refetching", async () => {
    const page1 = { results: [title(1)], totalPages: 1 };
    const fetchDiscoverPage = vi.fn().mockResolvedValue(page1);
    const fetchProviders = vi.fn(async () => availabilityWithSg(null, 8));
    const cache = new Map<string, CountryAvailability[]>();
    cache.set("movie-1", availabilityWithSg(8, 8));

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 3,
      selectedProviderIds: [8],
      cache,
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(fetchProviders).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(0); // title 1 is cached as already-in-SG
  });

  it("stops without error when a page returns no results", async () => {
    const fetchDiscoverPage = vi.fn().mockResolvedValue({ results: [], totalPages: 1 });
    const fetchProviders = vi.fn();

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: TARGET_COUNT,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("deduplicates items across pages when TMDB returns overlapping results", async () => {
    const page1 = { results: [title(1), title(2)], totalPages: 2 };
    const page2 = { results: [title(2), title(3)], totalPages: 2 };
    const fetchDiscoverPage = vi
      .fn()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const fetchProviders = vi.fn(async () => availabilityWithSg(null, 8));

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 5,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items.map((i) => i.id)).toEqual([1, 2, 3]);
    expect(result.items).toHaveLength(3);
  });

  it("merges results across multiple watch regions and attributes each item to the first matching region", async () => {
    const fetchDiscoverPage = vi.fn(async (region: string) => {
      if (region === "US") return { results: [title(1), title(2)], totalPages: 1 };
      if (region === "GB") return { results: [title(2), title(3)], totalPages: 1 };
      return { results: [], totalPages: 1 };
    });

    // title 2 streams the selected provider in GB but not US; title 1 and 3 stream in US-only
    const fetchProviders = vi.fn(async (id: number) => {
      if (id === 2) {
        return [
          { countryCode: "GB", countryName: "United Kingdom", flagEmoji: "🇬🇧", providers: [
            { providerId: 8, providerName: "Netflix", logoPath: "/n.jpg", providerType: "flatrate" },
          ] },
        ];
      }
      return availabilityWithSg(null, 8);
    });

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US", "GB"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 5,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items.map((i) => i.id).sort()).toEqual([1, 2, 3]);
    const item2 = result.items.find((i) => i.id === 2)!;
    expect(item2.countryCode).toBe("GB");
    expect(item2.matchedProviderLabel).toBe("Netflix");
    expect(fetchDiscoverPage).toHaveBeenCalledWith("US", 1);
    expect(fetchDiscoverPage).toHaveBeenCalledWith("GB", 1);
  });

  it("proceeds with successful regions when some regions fail", async () => {
    const fetchDiscoverPage = vi.fn(async (region: string) => {
      if (region === "US") return { results: [title(1)], totalPages: 1 };
      throw new Error("network error");
    });
    const fetchProviders = vi.fn(async () => availabilityWithSg(null, 8));

    const result = await fetchDiscoveryFeed({
      mediaType: "movie",
      watchRegions: ["US", "GB"],
      startPage: 1,
      maxPages: MAX_PAGES,
      targetCount: 5,
      selectedProviderIds: [8],
      cache: new Map(),
      fetchDiscoverPage,
      fetchProviders,
    });

    expect(result.items.map((i) => i.id)).toEqual([1]);
  });

  it("throws when every region fails", async () => {
    const fetchDiscoverPage = vi.fn().mockRejectedValue(new Error("network error"));
    const fetchProviders = vi.fn();

    await expect(
      fetchDiscoveryFeed({
        mediaType: "movie",
        watchRegions: ["US", "GB"],
        startPage: 1,
        maxPages: MAX_PAGES,
        targetCount: 5,
        selectedProviderIds: [8],
        cache: new Map(),
        fetchDiscoverPage,
        fetchProviders,
      })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/discovery-feed.test.ts`
Expected: FAIL — type errors on `watchRegions` not existing on `FetchDiscoveryFeedParams`, and `fetchDiscoverPage` call-shape mismatches

- [ ] **Step 3: Rewrite fetchDiscoveryFeed in discovery-feed.ts**

Replace the full contents of `src/lib/discovery-feed.ts` with:

```ts
import type { CountryAvailability, MediaType, SearchResult } from "./types";
import { isUnlockable } from "./discovery-eligibility";
import { serviceLabelForProviderId } from "./providers";
import type { DiscoverSortBy } from "./sort-options";

export const TARGET_COUNT = 12;
export const MAX_PAGES = 5;

export interface DiscoveryItem extends SearchResult {
  countryCode: string;
  matchedProviderLabel: string;
}

export interface FetchDiscoveryFeedParams {
  mediaType: MediaType;
  /** Countries to search, in priority order. A single-element array is the
   * existing single-country mode; multiple entries fan out one discover
   * call per country per page and merge the results. The first region in
   * this list whose availability has a matching flatrate provider is used
   * to attribute each item's badge (countryCode/matchedProviderLabel),
   * independent of which region's discover page it was found on. */
  watchRegions: string[];
  startPage: number;
  maxPages: number;
  targetCount: number;
  selectedProviderIds: number[];
  genreIds?: number[];
  sortBy?: DiscoverSortBy;
  voteCountGte?: number;
  dateGte?: string;
  dateLte?: string;
  crewId?: number;
  /** Mutated in place: populated with cache misses as they are fetched. The
   * caller (hook) owns a session-lifetime cache and passes it in by reference
   * intentionally, so this map's contents change as a side effect of the call. */
  cache: Map<string, CountryAvailability[]>;
  fetchDiscoverPage: (
    watchRegion: string,
    page: number
  ) => Promise<{ results: SearchResult[]; totalPages: number }>;
  fetchProviders: (
    id: number,
    mediaType: MediaType
  ) => Promise<CountryAvailability[]>;
}

export interface FetchDiscoveryFeedResult {
  items: DiscoveryItem[];
  lastPage: number;
  hasMore: boolean;
}

export function mergeDiscoveryResults(resultSets: SearchResult[][]): SearchResult[] {
  const seen = new Set<number>();
  const merged: SearchResult[] = [];
  for (const results of resultSets) {
    for (const result of results) {
      if (seen.has(result.id)) continue;
      seen.add(result.id);
      merged.push(result);
    }
  }
  return merged;
}

export async function fetchDiscoveryFeed(
  params: FetchDiscoveryFeedParams
): Promise<FetchDiscoveryFeedResult> {
  const {
    mediaType,
    watchRegions,
    startPage,
    maxPages,
    targetCount,
    selectedProviderIds,
    cache,
    fetchDiscoverPage,
    fetchProviders,
  } = params;

  const items: DiscoveryItem[] = [];
  const seenItems = new Set<string>();
  let page = startPage;
  let lastFetchedPage = startPage - 1;
  let totalPages = Infinity;
  let emptyPageReached = false;

  while (items.length < targetCount && page <= Math.min(totalPages, maxPages)) {
    const pageResultsPerRegion = await Promise.allSettled(
      watchRegions.map((region) => fetchDiscoverPage(region, page))
    );

    pageResultsPerRegion.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(
          `Discovery feed: failed to fetch region ${watchRegions[i]} page ${page}:`,
          r.reason
        );
      }
    });

    const fulfilled = pageResultsPerRegion.filter(
      (r): r is PromiseFulfilledResult<{ results: SearchResult[]; totalPages: number }> =>
        r.status === "fulfilled"
    );

    if (fulfilled.length === 0) {
      throw new Error("Failed to load discovery feed for any region");
    }

    totalPages = Math.min(...fulfilled.map((r) => r.value.totalPages));
    lastFetchedPage = page;

    const merged = mergeDiscoveryResults(fulfilled.map((r) => r.value.results));

    if (merged.length === 0) {
      emptyPageReached = true;
      break;
    }

    const misses = merged.filter((r) => !cache.has(`${mediaType}-${r.id}`));
    // Fires up to one /api/providers request per cache miss (up to ~20 per discover
    // page, multiplied by however many regions are being searched in "All countries"
    // mode) concurrently with no throttling and no server-side caching. Acceptable
    // for a single-user pilot; revisit with chunked concurrency or a short-TTL
    // server cache before this sees concurrent users.
    const fetched = await Promise.all(
      misses.map((r) => fetchProviders(r.id, mediaType))
    );
    misses.forEach((r, i) => cache.set(`${mediaType}-${r.id}`, fetched[i]));

    for (const result of merged) {
      const itemKey = `${mediaType}-${result.id}`;
      if (seenItems.has(itemKey)) continue;

      const availability = cache.get(itemKey) ?? [];
      if (!isUnlockable(availability, selectedProviderIds)) continue;

      const sourceCountry = watchRegions
        .map((region) => availability.find((c) => c.countryCode === region))
        .find((c) =>
          c?.providers.some(
            (p) => p.providerType === "flatrate" && selectedProviderIds.includes(p.providerId)
          )
        );
      const matchedProviderId = sourceCountry?.providers
        .filter((p) => p.providerType === "flatrate")
        .find((p) => selectedProviderIds.includes(p.providerId))?.providerId;

      seenItems.add(itemKey);
      items.push({
        ...result,
        countryCode: sourceCountry?.countryCode ?? watchRegions[0],
        matchedProviderLabel:
          matchedProviderId != null
            ? serviceLabelForProviderId(matchedProviderId)
            : "",
      });
    }

    page += 1;
  }

  const hasMore =
    !emptyPageReached && lastFetchedPage < Math.min(totalPages, maxPages);

  return { items, lastPage: lastFetchedPage, hasMore };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/discovery-feed.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/discovery-feed.ts src/lib/discovery-feed.test.ts
git commit -m "feat: support multi-region fan-out and new filters in discovery feed pipeline"
```

---

## Task 10: Extend useDiscoveryFeed hook

**Files:**
- Modify: `src/lib/use-discovery-feed.ts`

**Interfaces:**
- Consumes: extended `fetchDiscoveryFeed`/`mergeDiscoveryResults` from Task 9; `DiscoverSortBy` from `src/lib/sort-options.ts`.
- Produces: `useDiscoveryFeed(mediaType: MediaType, watchRegions: string[], providerIds: number[], filters?: DiscoveryFilterParams)` where `DiscoveryFilterParams = { genreIds?: number[]; sortBy?: DiscoverSortBy; voteCountGte?: number; dateGte?: string; dateLte?: string; crewId?: number }`. Return shape (`{ items, loading, error, hasMore, loadMore }`) is unchanged. **Task 14 (`discovery/page.tsx`) calls this extended signature.** No automated test — this codebase has no React Testing Library installed, so hook wiring is verified manually in Task 14's browser pass, consistent with how the existing hook has no dedicated test file today (only the pure `fetchDiscoveryFeed` it wraps is unit tested).

- [ ] **Step 1: Replace use-discovery-feed.ts**

```ts
// src/lib/use-discovery-feed.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchDiscoveryFeed,
  MAX_PAGES,
  TARGET_COUNT,
  type DiscoveryItem,
} from "./discovery-feed";
import type { CountryAvailability, MediaType } from "./types";
import type { DiscoverSortBy } from "./sort-options";

export interface DiscoveryFilterParams {
  genreIds?: number[];
  sortBy?: DiscoverSortBy;
  voteCountGte?: number;
  dateGte?: string;
  dateLte?: string;
  crewId?: number;
}

async function fetchDiscoverPage(
  mediaType: MediaType,
  watchRegion: string,
  providerIds: number[],
  page: number,
  filters: DiscoveryFilterParams
) {
  const query = new URLSearchParams({
    mediaType,
    watchRegion,
    providerIds: providerIds.join(","),
    page: String(page),
  });
  if (filters.genreIds && filters.genreIds.length > 0) {
    query.set("genreIds", filters.genreIds.join(","));
  }
  if (filters.sortBy) query.set("sortBy", filters.sortBy);
  if (filters.voteCountGte != null) query.set("voteCountGte", String(filters.voteCountGte));
  if (filters.dateGte) query.set("dateGte", filters.dateGte);
  if (filters.dateLte) query.set("dateLte", filters.dateLte);
  if (filters.crewId != null) query.set("crewId", String(filters.crewId));

  const res = await fetch(`/api/discover?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to load discovery feed");
  return res.json();
}

async function fetchProviders(
  id: number,
  mediaType: MediaType
): Promise<CountryAvailability[]> {
  const res = await fetch(`/api/providers?id=${id}&type=${mediaType}`);
  if (!res.ok) throw new Error("Failed to load providers");
  const data = await res.json();
  return data.availability;
}

export function useDiscoveryFeed(
  mediaType: MediaType,
  watchRegions: string[],
  providerIds: number[],
  filters: DiscoveryFilterParams = {}
) {
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cacheRef = useRef<Map<string, CountryAvailability[]>>(new Map());
  const nextPageRef = useRef(1);
  const generationRef = useRef<number>(0);
  const watchRegionsKey = watchRegions.join(",");
  const providerIdsKey = providerIds.join(",");
  const genreIdsKey = (filters.genreIds ?? []).join(",");
  const filtersKey = [
    filters.sortBy ?? "",
    filters.voteCountGte ?? "",
    filters.dateGte ?? "",
    filters.dateLte ?? "",
    filters.crewId ?? "",
  ].join("|");

  const run = useCallback(
    async (reset: boolean) => {
      const requestId = ++generationRef.current;
      setLoading(true);
      setError(null);
      try {
        const startPage = reset ? 1 : nextPageRef.current;
        const result = await fetchDiscoveryFeed({
          mediaType,
          watchRegions,
          startPage,
          maxPages: MAX_PAGES,
          targetCount: TARGET_COUNT,
          selectedProviderIds: providerIds,
          genreIds: filters.genreIds,
          sortBy: filters.sortBy,
          voteCountGte: filters.voteCountGte,
          dateGte: filters.dateGte,
          dateLte: filters.dateLte,
          crewId: filters.crewId,
          cache: cacheRef.current,
          fetchDiscoverPage: (watchRegion, page) =>
            fetchDiscoverPage(mediaType, watchRegion, providerIds, page, filters),
          fetchProviders,
        });
        if (requestId === generationRef.current) {
          setItems((prev) => {
            if (reset) return result.items;
            const seen = new Set(prev.map((i) => `${i.mediaType}-${i.id}`));
            return [
              ...prev,
              ...result.items.filter((i) => !seen.has(`${i.mediaType}-${i.id}`)),
            ];
          });
          nextPageRef.current = result.lastPage + 1;
          setHasMore(result.hasMore);
        }
      } catch {
        if (requestId === generationRef.current) {
          setError("Failed to load the discovery feed. Please try again.");
        }
      } finally {
        if (requestId === generationRef.current) {
          setLoading(false);
        }
      }
    },
    // watchRegionsKey/providerIdsKey/genreIdsKey/filtersKey stand in for their
    // corresponding array/object args (identity is unstable across renders)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaType, watchRegionsKey, providerIdsKey, genreIdsKey, filtersKey]
  );

  useEffect(() => {
    cacheRef.current = new Map();
    nextPageRef.current = 1;
    run(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, watchRegionsKey, providerIdsKey, genreIdsKey, filtersKey]);

  const loadMore = useCallback(() => run(false), [run]);

  return { items, loading, error, hasMore, loadMore };
}
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

Run: `npm run test`
Expected: All tests PASS (this file has no dedicated test suite; unaffected pure-logic tests continue passing)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/use-discovery-feed.ts
git commit -m "feat: extend useDiscoveryFeed hook for multi-region and new filters"
```

---

## Task 11: ActiveFilterChips component

**Files:**
- Create: `src/components/active-filter-chips.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `FilterChip` interface `{ key: string; label: string; onRemove: () => void }`; default export `ActiveFilterChips({ chips }: { chips: FilterChip[] })` — renders nothing when `chips` is empty. **Task 14 (`discovery/page.tsx`) renders this.**

- [ ] **Step 1: Write active-filter-chips.tsx**

```tsx
// src/components/active-filter-chips.tsx
"use client";

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export default function ActiveFilterChips({ chips }: { chips: FilterChip[] }) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/25 text-accent rounded-full px-3 py-1 text-xs hover:bg-accent/20 transition-colors"
        >
          {chip.label}
          <span aria-hidden="true">&times;</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/active-filter-chips.tsx
git commit -m "feat: add ActiveFilterChips component"
```

---

## Task 12: MoreFiltersSheet component

**Files:**
- Create: `src/components/more-filters-sheet.tsx`

**Interfaces:**
- Consumes: `SERVICES` from `src/lib/providers.ts`; `DECADES` from `src/lib/decades.ts` (Task 3); `DIRECTORS` from `src/lib/directors.ts` (Task 4); `MediaType` from `src/lib/types.ts`.
- Produces: default export `MoreFiltersSheet(props: MoreFiltersSheetProps)` where `MoreFiltersSheetProps = { open: boolean; onClose: () => void; mediaType: MediaType; serviceKey: string; onServiceChange: (key: string) => void; decadeLabel: string | null; onDecadeChange: (label: string | null) => void; directorId: number | null; onDirectorChange: (id: number | null) => void }`. Renders `null` when `open` is false. Director picker is replaced with an explanatory message when `mediaType === "tv"`. **Task 14 (`discovery/page.tsx`) renders this.**

- [ ] **Step 1: Write more-filters-sheet.tsx**

```tsx
// src/components/more-filters-sheet.tsx
"use client";

import { SERVICES } from "@/lib/providers";
import { DECADES } from "@/lib/decades";
import { DIRECTORS } from "@/lib/directors";
import type { MediaType } from "@/lib/types";

export interface MoreFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  mediaType: MediaType;
  serviceKey: string;
  onServiceChange: (key: string) => void;
  decadeLabel: string | null;
  onDecadeChange: (label: string | null) => void;
  directorId: number | null;
  onDirectorChange: (id: number | null) => void;
}

export default function MoreFiltersSheet({
  open,
  onClose,
  mediaType,
  serviceKey,
  onServiceChange,
  decadeLabel,
  onDecadeChange,
  directorId,
  onDirectorChange,
}: MoreFiltersSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative glass rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">More filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-dim hover:text-accent transition-colors text-sm"
          >
            Done
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-text-dim uppercase tracking-wide">Service</p>
          <div className="flex flex-wrap gap-1.5">
            {[{ key: "all", label: "All My Services" }, ...SERVICES].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onServiceChange(s.key)}
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
        </div>

        <div className="space-y-2">
          <p className="text-xs text-text-dim uppercase tracking-wide">Decade</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onDecadeChange(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                decadeLabel === null
                  ? "bg-accent text-white"
                  : "bg-surface border border-border text-text-dim hover:border-accent/40"
              }`}
            >
              Any
            </button>
            {DECADES.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => onDecadeChange(d.label)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  decadeLabel === d.label
                    ? "bg-accent text-white"
                    : "bg-surface border border-border text-text-dim hover:border-accent/40"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-text-dim uppercase tracking-wide">Director</p>
          {mediaType === "tv" ? (
            <p className="text-xs text-text-dim">
              Director filtering is only available for movies.
            </p>
          ) : (
            <select
              value={directorId ?? ""}
              onChange={(e) => onDirectorChange(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Any director</option>
              {DIRECTORS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/more-filters-sheet.tsx
git commit -m "feat: add MoreFiltersSheet component"
```

---

## Task 13: DiscoveryFilters component

**Files:**
- Create: `src/components/discovery-filters.tsx`

**Interfaces:**
- Consumes: `DISCOVERY_COUNTRIES`, `countryName`, `flagEmoji` from `src/lib/countries.ts`; `genresForMediaType` from `src/lib/genres.ts` (Task 1); `MOODS` from `src/lib/moods.ts` (Task 1); `SORT_LABELS`, `SortKey` from `src/lib/sort-options.ts` (Task 2); `MediaType` from `src/lib/types.ts`.
- Produces: default export `DiscoveryFilters(props: DiscoveryFiltersProps)` where `DiscoveryFiltersProps = { mediaType: MediaType; country: string; onCountryChange: (code: string) => void; genreMode: "genre" | "mood"; onGenreModeChange: (mode: "genre" | "mood") => void; genreId: number | null; onGenreChange: (id: number | null) => void; moodKey: string | null; onMoodChange: (key: string | null) => void; sortKey: SortKey; onSortChange: (key: SortKey) => void; activeMoreFiltersCount: number; onOpenMoreFilters: () => void }`. The country `<select>` uses the sentinel value `"ALL"` for "All countries". **Task 14 (`discovery/page.tsx`) renders this and owns the `country`/`"ALL"` sentinel convention.**

- [ ] **Step 1: Write discovery-filters.tsx**

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/discovery-filters.tsx
git commit -m "feat: add DiscoveryFilters primary pills component"
```

---

## Task 14: Wire the redesigned filters into the Discovery page

**Files:**
- Modify: `src/app/discovery/page.tsx`

**Interfaces:**
- Consumes: `DiscoveryFilters` (Task 13), `MoreFiltersSheet` (Task 12), `ActiveFilterChips` (Task 11), `useDiscoveryFeed`/`DiscoveryFilterParams` (Task 10), `resolveSortBy`/`SortKey`/`TOP_RATED_VOTE_COUNT_GTE` (Task 2), `DECADES`/`dateRangeForDecade` (Task 3), `directorName` (Task 4), `genreLabel` (Task 1), `MOODS` (Task 1), `DISCOVERY_COUNTRIES` (Task 5).
- Produces: the final page — no other task depends on this one.

- [ ] **Step 1: Replace discovery/page.tsx**

```tsx
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

  const { items, loading, error, hasMore, loadMore } = useDiscoveryFeed(
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
```

- [ ] **Step 2: Update ActiveFilterChips to export FilterChip as a named export**

`FilterChip` is already exported from Task 11's `active-filter-chips.tsx` (`export interface FilterChip`), so no change is needed there — this step just confirms the import in Step 1 above resolves. Skip to Step 3.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 5: Run the linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 6: Manual browser verification**

Start the dev server (`npm run dev`) and open `/discovery`. Walk through:
- Default load (Movies, US, Trending) shows results.
- Switch Country to "🌐 All countries" — confirm results load (may take longer, fanning out ~21 calls) and badges show varied country flags.
- Switch back to a single country (e.g. GB) — confirm results reset and reload.
- Genre picker: select a genre (e.g. Horror) — confirm results narrow and skew toward that genre.
- Toggle to Mood, select a mood (e.g. "Feel-good") — confirm results update; toggle back to Genre — confirm the previous genre selection is still applied.
- Sort: switch to "Top Rated" — confirm results skew toward higher `voteAverage` badges shown on cards. Switch to "Newest" — confirm release years skew recent.
- Open "More filters" — confirm the badge count matches active Service/Decade/Director selections. Pick a Decade (e.g. "1990s") — confirm results' release years fall in that range. Pick a Director (movies only) — confirm results are plausible for that director. Switch Movie/TV toggle to TV — confirm the Director control shows the "movies only" message and the director filter chip disappears from the active-chips row while TV is selected; switch back to Movies — confirm the director filter reapplies.
- Remove an active filter via its chip's ✕ — confirm it clears and results reload.
- Trigger a request failure (e.g. temporarily disconnect network) and confirm the existing error/retry UI still works.

- [ ] **Step 7: Commit**

```bash
git add src/app/discovery/page.tsx
git commit -m "feat: wire redesigned two-tier filter UI into discovery page"
```

---

## Post-Implementation

- [ ] Re-read the spec (`docs/superpowers/specs/2026-08-26-discovery-filters-redesign-design.md`) end to end and confirm every section has a corresponding completed task.
- [ ] Run `npm run test`, `npx tsc --noEmit`, and `npm run lint` one final time on the full branch.
- [ ] Use the superpowers:requesting-code-review skill before merging.
