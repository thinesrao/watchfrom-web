# Discovery Filters Redesign — Design

## Summary

Enhance the existing Discovery page without replacing its core "unlockable
titles" concept: every result must still pass `isUnlockable()` (available via
a subscribed service in the browsed country/countries, not yet on that
service in Singapore). On top of that foundation, add richer browsing —
Genre, Mood, Sort, Decade, and Director filters, an expanded/curated country
list with an "All countries" option, and a mobile-friendly two-tier filter UI
(primary pills + a "more filters" sheet) replacing the current flat control
row.

## Filter UI Structure

Two tiers, no tabs, single page (same grid as today):

- **Primary pills row** (always visible): **Country** (expanded list, default
  US, plus an "All" option), **Genre** (includes a Mood/Genre toggle — see
  below), **Sort**.
- **"More filters"** button (shows active-count badge) opens a bottom
  sheet/side panel containing: **Service** (existing pills, moved here),
  **Decade**, **Director** (movies only — disabled/hidden when the Movie/TV
  toggle is set to TV).
- **Active filter chips** row above the grid, summarizing all non-default
  filters currently applied, each removable inline without opening the
  sheet.

Country stays in the primary row (not tucked into "more filters") because it
drives the core unlockability check, not just a refinement.

## New/Changed Filter Semantics

### Country ("All" option)
"All" does not mean every TMDB region. It means a curated list of ~20-25
major markets (extend the existing 7-country list in `src/lib/countries.ts`'s
consuming code — a new exported `DISCOVERY_COUNTRIES` array, e.g. the current
7 plus FR, ES, IT, NL, SE, BR, MX, IN, SG-adjacent APAC markets, etc., final
list decided at implementation time). Broader coverage than today, bounded to
avoid unbounded fan-out cost.

### Genre
TMDB's genre list is fixed and does not require an API call. New
`src/lib/genres.ts` exports static `MOVIE_GENRES` / `TV_GENRES` maps (id →
label). Selected genre id is passed to TMDB discover as `with_genres`.

### Mood
No native TMDB concept — implemented as a curated mapping layer, not a new
filter mechanism. New `src/lib/moods.ts` exports a list of moods (e.g.
"Feel-good", "Intense", "Mind-bending", "Dark", "Light & Easy"), each mapped
to one or more genre ids. The Genre pill has a Genre/Mood toggle; selecting a
mood resolves to its underlying genre id(s) and is passed through the same
`with_genres` mechanism — no separate query param or backend logic.

### Sort
Maps directly to TMDB `sort_by`:
- **Trending** (default) → `popularity.desc`
- **Top Rated** → `vote_average.desc` with a `vote_count.gte` floor (e.g.
  100) so low-vote outliers don't dominate
- **Newest** → `primary_release_date.desc` (movie) / `first_air_date.desc`
  (tv)

### Decade
Maps to TMDB date-range params: `primary_release_date.gte` /
`primary_release_date.lte` (movie), `first_air_date.gte` / `first_air_date.lte`
(tv), computed from the selected decade (e.g. "2010s" → 2010-01-01 to
2019-12-31).

### Director (movies only)
New `src/lib/directors.ts` exports a static curated list (~15-20 popular
directors spanning genres — e.g. Nolan, Spielberg, Scorsese, Tarantino,
Villeneuve, Gerwig, Bong Joon-ho, Wes Anderson, Fincher, Ridley Scott,
Cameron, Jordan Peele, Taika Waititi, Sofia Coppola, del Toro, McQuarrie),
each with a TMDB person id (resolved at implementation time). Passed to TMDB
discover as `with_crew` — a `/discover/movie`-only parameter. The Director
control is disabled/hidden whenever the Movie/TV toggle is set to TV, since
`/discover/tv` has no equivalent and TV doesn't have a single consistent
per-show director credit.

## Data Flow

```
Primary pills: Country [+All] · Genre/Mood · Sort
More filters sheet: Service · Decade · Director (movies only)
                    │
                    ▼
   Single country          "All" countries
   → 1 discoverTitles    → discoverTitles call per curated
     call with genre/       country (parallel), merge +
     sort/decade/crew         dedupe results by id
     params                            │
                    └────────┬─────────┘
                              ▼
              Provider-availability check (existing
              per-title cache, already fetches every
              country's availability in one call)
                              ▼
              isUnlockable() filter → grid
```

Filter state lives in the Discovery page component (local `useState`, same
pattern as today — no URL persistence in this pass). Any filter change resets
`useDiscoveryFeed` and refetches from page 1, matching the existing
reset-on-change behavior for country/service/mediaType.

### "All countries" mode

`discovery-feed.ts`'s `fetchDiscoveryFeed` gains a multi-country path: fan out
one `fetchDiscoverPage` call per curated country in parallel, merge the
returned results deduped by `id`, then continue through the existing
cache/`isUnlockable` pipeline unchanged (the provider-availability cache is
already country-agnostic, so this adds no extra provider-lookup cost beyond
today's per-title fetch). Still bounded by the existing `TARGET_COUNT` /
`MAX_PAGES` guards, applied to the merged set.

## Extended TMDB Layer

`discoverTitles` in `src/lib/tmdb.ts` gains optional params: `genreId`,
`sortBy`, `voteCountGte`, `dateGte`/`dateLte`, `crewId`. All are appended to
the existing discover URL only when present — omitted filters fall back to
today's defaults (`sort_by=popularity.desc`, no genre/date/crew constraint).

`GET /api/discover` (`src/app/api/discover/route.ts`) gains matching optional
query params, validated the same way existing params are (type/range checks,
400 on invalid input) before being forwarded to `discoverTitles`.

## Components

- **`DiscoveryFilters`** (new) — primary pills row: Country (+ All), Genre/Mood
  toggle + picker, Sort. Plus the "More filters" trigger button with an
  active-count badge.
- **`MoreFiltersSheet`** (new) — bottom sheet (mobile) / panel (desktop):
  Service pills (existing, relocated), Decade picker, Director picker
  (disabled for TV).
- **`ActiveFilterChips`** (new) — renders currently-non-default filters as
  removable chips above the grid.
- **`DiscoveryCard`** — unchanged.
- **`src/lib/genres.ts`**, **`src/lib/moods.ts`**, **`src/lib/directors.ts`**
  (new) — static data, same pattern as existing `src/lib/providers.ts`.
- **`src/lib/discovery-feed.ts`** — extended params on
  `FetchDiscoveryFeedParams` (genre/mood/sort/decade/director/multi-country);
  new merge/dedupe helper for the "All countries" path.
- **`src/lib/use-discovery-feed.ts`** — extended to accept and key its
  fetch/reset effect on the new filter values.

## Error Handling

Same single `error` string + retry-button pattern as today. For "All
countries" mode specifically: if some per-country `discoverTitles` calls
fail while others succeed, proceed with the successful results rather than
failing the whole batch (`console.error` the individual failures, consistent
with existing pilot-scope error handling elsewhere in the codebase). Only
surface the page-level error state if *every* country call fails.

## Testing

- Extend `src/lib/tmdb.ts`-adjacent tests (or add if none exist for
  `discoverTitles`) covering URL/query-param construction for each new
  filter combination.
- Unit tests for the mood → genre-id mapping in `moods.ts`.
- Unit tests for the multi-country merge/dedupe logic added to
  `discovery-feed.ts`, extending the existing `discovery-feed.test.ts`.
- Extend `discovery-eligibility.test.ts` only if `isUnlockable` itself
  changes (it shouldn't — the new filters narrow the input result set, not
  the eligibility check itself).
- Manual verification in the browser: exercise every new filter
  individually and in combination, confirm "All countries" mode returns
  merged/deduped results, confirm Director control disables on TV, confirm
  partial-failure handling in "All countries" mode (simulate one country
  call failing).

## Out of Scope

- Cast filtering (only Director, from a curated list).
- URL-persisted/shareable filter state.
- Server-side/shared caching across users (existing pilot-scope limitation,
  unchanged by this work — "All countries" mode increases per-load fan-out
  and should be revisited alongside that existing limitation before
  multi-user traffic).
- Genuinely global "all TMDB regions" coverage — "All" means the curated
  country list only.
